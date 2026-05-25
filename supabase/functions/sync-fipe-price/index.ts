// AutoDNA — sync-fipe-price Edge Function
// Sincroniza o preço FIPE atual de um (ou todos os) modelo(s) do catálogo:
// faz fetch na Parallelum FIPE API (wrapper público da tabela oficial),
// atualiza car_models.price_fipe e cria uma linha em fipe_snapshots
// (histórico para calcular depreciação real ao longo do tempo).
//
// API:
//   POST /functions/v1/sync-fipe-price
//     body: { model_id?: string }   // se ausente, sincroniza todos os
//                                   //   modelos com códigos FIPE mapeados
//
// Pré-requisito: car_models.fipe_brand_code, fipe_model_code, fipe_year_code
// preenchidos para os modelos que se quer sincronizar.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const PARALLELUM_BASE = 'https://parallelum.com.br/fipe/api/v2/carros';
const SOURCE_LABEL = 'parallelum';

interface FipeResponse {
  vehicleType: number;
  value: string;          // "R$ 89.990,00"
  brand: string;
  model: string;
  modelYear: number;
  fuel: string;
  codeFipe: string;
  referenceMonth: string; // "maio/2026"
  authentication: string;
  fuelAcronym: string;
}

function parseBrl(s: string): number {
  // "R$ 89.990,00" → 89990.00
  const cleaned = s.replace(/[^\d,]/g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

async function fetchFipePrice(
  brandCode: string,
  modelCode: string,
  yearCode: string,
): Promise<FipeResponse> {
  const url = `${PARALLELUM_BASE}/marcas/${brandCode}/modelos/${modelCode}/anos/${yearCode}`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`Parallelum returned ${res.status} for ${url}`);
  }
  return (await res.json()) as FipeResponse;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return new Response('Server misconfigured', { status: 500 });
  }
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  let body: { model_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine — sync all
  }

  let query = admin
    .from('car_models')
    .select('id, brand, model, version, year, price_fipe, fipe_brand_code, fipe_model_code, fipe_year_code')
    .not('fipe_brand_code', 'is', null)
    .not('fipe_model_code', 'is', null)
    .not('fipe_year_code', 'is', null);

  if (body.model_id) {
    query = query.eq('id', body.model_id);
  }

  const { data: models, error: mErr } = await query;
  if (mErr) {
    return new Response(`models query error: ${mErr.message}`, { status: 500 });
  }
  if (!models?.length) {
    return new Response(
      JSON.stringify({
        synced: 0,
        message: body.model_id
          ? 'Model not found or missing FIPE codes'
          : 'No models with FIPE codes mapped yet',
      }),
      { headers: { 'content-type': 'application/json' } },
    );
  }

  const results: Array<{
    model_id: string;
    brand: string;
    model: string;
    status: 'ok' | 'error';
    price?: number;
    reference_month?: string;
    error?: string;
  }> = [];

  for (const m of models as Array<{
    id: string;
    brand: string;
    model: string;
    version: string;
    year: number;
    price_fipe: number;
    fipe_brand_code: string;
    fipe_model_code: string;
    fipe_year_code: string;
  }>) {
    try {
      const fipe = await fetchFipePrice(
        m.fipe_brand_code,
        m.fipe_model_code,
        m.fipe_year_code,
      );
      const price = parseBrl(fipe.value);
      if (price <= 0) {
        throw new Error(`Could not parse price from ${fipe.value}`);
      }

      const { error: snapErr } = await admin.from('fipe_snapshots').upsert({
        model_id: m.id,
        fipe_brand_code: m.fipe_brand_code,
        fipe_model_code: m.fipe_model_code,
        fipe_year_code: m.fipe_year_code,
        fipe_reference_month: fipe.referenceMonth,
        price,
        snapshot_date: new Date().toISOString().slice(0, 10),
        source: SOURCE_LABEL,
      }, { onConflict: 'model_id,snapshot_date' });
      if (snapErr) throw snapErr;

      const { error: updErr } = await admin
        .from('car_models')
        .update({ price_fipe: price })
        .eq('id', m.id);
      if (updErr) throw updErr;

      results.push({
        model_id: m.id,
        brand: m.brand,
        model: m.model,
        status: 'ok',
        price,
        reference_month: fipe.referenceMonth,
      });
    } catch (err) {
      results.push({
        model_id: m.id,
        brand: m.brand,
        model: m.model,
        status: 'error',
        error: (err as Error).message,
      });
    }
  }

  const synced = results.filter((r) => r.status === 'ok').length;
  return new Response(
    JSON.stringify({
      synced,
      failed: results.length - synced,
      details: results,
    }),
    { headers: { 'content-type': 'application/json' } },
  );
});
