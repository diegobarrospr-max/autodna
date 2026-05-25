// AutoDNA — fipe-autopilot Edge Function
// Mapeia automaticamente os códigos FIPE (marca/modelo/ano) para cada
// car_model do catálogo que ainda não tem esses campos preenchidos.
// Estratégia:
//   1. Lista marcas da FIPE via Parallelum
//   2. Para cada marca distinta do nosso catálogo, faz match fuzzy
//   3. Para cada modelo do catálogo, lista modelos FIPE da marca e
//      escolhe o melhor match por sobreposição de palavras-chave
//   4. Para cada modelo mapeado, lista anos FIPE e seleciona o ano+combustível
//      que bate com o nosso (flex → "1", diesel → "3")
//   5. Salva fipe_brand_code, fipe_model_code, fipe_year_code em car_models
//
// API:
//   POST /functions/v1/fipe-autopilot
//     body: { only_unmapped?: boolean }  // default true
//
// Retorna o status de mapeamento de cada modelo.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const PARALLELUM = 'https://parallelum.com.br/fipe/api/v2/carros';

interface FipeBrand { code: string; name: string; }
interface FipeModel { code: string; name: string; }
interface FipeYear { code: string; name: string; }

interface OurModel {
  id: string;
  brand: string;
  model: string;
  version: string;
  year: number;
  fuel: string;
  fipe_brand_code: string | null;
  fipe_model_code: string | null;
  fipe_year_code: string | null;
}

interface MappingResult {
  id: string;
  brand: string;
  model: string;
  version: string;
  year: number;
  status: 'mapped' | 'no_brand_match' | 'no_model_match' | 'no_year_match' | 'error';
  fipe_brand_code?: string;
  fipe_brand_name?: string;
  fipe_model_code?: string;
  fipe_model_name?: string;
  fipe_year_code?: string;
  fipe_year_name?: string;
  match_score?: number;
  error?: string;
}

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const BRAND_ALIASES: Record<string, string[]> = {
  Chevrolet: ['gm', 'gm chevrolet', 'chevrolet'],
  Volkswagen: ['vw', 'volkswagen'],
  Fiat: ['fiat'],
  Hyundai: ['hyundai'],
  Toyota: ['toyota'],
  Honda: ['honda'],
  Nissan: ['nissan'],
  Renault: ['renault'],
  Peugeot: ['peugeot'],
  Jeep: ['jeep'],
  'Caoa Chery': ['caoa chery', 'chery', 'caoa'],
  GWM: ['gwm', 'great wall'],
};

const FUEL_TO_CODE: Record<string, string> = {
  flex: '1',
  gasolina: '1',
  diesel: '3',
  hibrido: '1',
  eletrico: '4',
};

function matchBrand(ourBrand: string, fipeBrands: FipeBrand[]): FipeBrand | null {
  const aliases = (BRAND_ALIASES[ourBrand] ?? [ourBrand]).map(normalize);
  let best: { brand: FipeBrand; score: number } | null = null;
  for (const fb of fipeBrands) {
    const fbName = normalize(fb.name);
    for (const a of aliases) {
      if (fbName === a) return fb;
      if (fbName.includes(a) || a.includes(fbName)) {
        const score = Math.min(a.length, fbName.length) / Math.max(a.length, fbName.length);
        if (!best || score > best.score) best = { brand: fb, score };
      }
    }
  }
  return best?.brand ?? null;
}

function scoreModelMatch(model: string, version: string, fipeName: string): number {
  const ours = normalize(`${model} ${version}`).split(' ').filter(Boolean);
  const fipe = normalize(fipeName).split(' ').filter(Boolean);
  if (ours.length === 0) return 0;
  let matches = 0;
  for (const t of ours) {
    if (t.length < 2) continue;
    if (fipe.some((f) => f === t || f.startsWith(t) || t.startsWith(f))) matches++;
  }
  return matches / ours.length;
}

function pickBestModel(
  ourModel: string,
  ourVersion: string,
  fipeModels: FipeModel[],
): { model: FipeModel; score: number } | null {
  let best: { model: FipeModel; score: number } | null = null;
  for (const fm of fipeModels) {
    const score = scoreModelMatch(ourModel, ourVersion, fm.name);
    if (!best || score > best.score) best = { model: fm, score };
  }
  if (!best || best.score < 0.4) return null;
  return best;
}

function pickYear(ourYear: number, ourFuel: string, fipeYears: FipeYear[]): FipeYear | null {
  const expectedCode = `${ourYear}-${FUEL_TO_CODE[ourFuel] ?? '1'}`;
  const exact = fipeYears.find((y) => y.code === expectedCode);
  if (exact) return exact;
  // Fallback: only match by year prefix
  const sameYear = fipeYears.find((y) => y.code.startsWith(`${ourYear}-`));
  if (sameYear) return sameYear;
  // Fallback: closest year
  const sorted = [...fipeYears].sort(
    (a, b) => Math.abs(Number(a.code.split('-')[0]) - ourYear) - Math.abs(Number(b.code.split('-')[0]) - ourYear),
  );
  return sorted[0] ?? null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return (await res.json()) as T;
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

  let body: { only_unmapped?: boolean } = { only_unmapped: true };
  try {
    body = { only_unmapped: true, ...(await req.json()) };
  } catch {}

  let query = admin
    .from('car_models')
    .select('id, brand, model, version, year, fuel, fipe_brand_code, fipe_model_code, fipe_year_code');
  if (body.only_unmapped) {
    query = query.is('fipe_brand_code', null);
  }
  const { data: models, error: mErr } = await query;
  if (mErr) return new Response(`models error: ${mErr.message}`, { status: 500 });
  if (!models?.length) {
    return new Response(JSON.stringify({ mapped: 0, total: 0, details: [] }), {
      headers: { 'content-type': 'application/json' },
    });
  }

  // 1. Load FIPE brands once
  let fipeBrands: FipeBrand[];
  try {
    fipeBrands = await fetchJson<FipeBrand[]>(`${PARALLELUM}/marcas`);
  } catch (err) {
    return new Response(`brands fetch failed: ${(err as Error).message}`, {
      status: 502,
    });
  }

  // 2. Cache models per brand to avoid refetching
  const modelsByBrand = new Map<string, FipeModel[]>();
  const yearsByModel = new Map<string, FipeYear[]>();

  const results: MappingResult[] = [];

  for (const m of models as OurModel[]) {
    try {
      const fipeBrand = matchBrand(m.brand, fipeBrands);
      if (!fipeBrand) {
        results.push({ ...modelMeta(m), status: 'no_brand_match' });
        continue;
      }

      if (!modelsByBrand.has(fipeBrand.code)) {
        const mods = await fetchJson<FipeModel[]>(`${PARALLELUM}/marcas/${fipeBrand.code}/modelos`);
        modelsByBrand.set(fipeBrand.code, mods);
      }
      const fipeMods = modelsByBrand.get(fipeBrand.code)!;
      const picked = pickBestModel(m.model, m.version, fipeMods);
      if (!picked) {
        results.push({
          ...modelMeta(m),
          status: 'no_model_match',
          fipe_brand_code: fipeBrand.code,
          fipe_brand_name: fipeBrand.name,
        });
        continue;
      }

      const cacheKey = `${fipeBrand.code}:${picked.model.code}`;
      if (!yearsByModel.has(cacheKey)) {
        const yrs = await fetchJson<FipeYear[]>(
          `${PARALLELUM}/marcas/${fipeBrand.code}/modelos/${picked.model.code}/anos`,
        );
        yearsByModel.set(cacheKey, yrs);
      }
      const fipeYrs = yearsByModel.get(cacheKey)!;
      const yearMatch = pickYear(m.year, m.fuel, fipeYrs);
      if (!yearMatch) {
        results.push({
          ...modelMeta(m),
          status: 'no_year_match',
          fipe_brand_code: fipeBrand.code,
          fipe_brand_name: fipeBrand.name,
          fipe_model_code: picked.model.code,
          fipe_model_name: picked.model.name,
          match_score: Number(picked.score.toFixed(2)),
        });
        continue;
      }

      const { error: upErr } = await admin
        .from('car_models')
        .update({
          fipe_brand_code: fipeBrand.code,
          fipe_model_code: picked.model.code,
          fipe_year_code: yearMatch.code,
        })
        .eq('id', m.id);
      if (upErr) throw upErr;

      results.push({
        ...modelMeta(m),
        status: 'mapped',
        fipe_brand_code: fipeBrand.code,
        fipe_brand_name: fipeBrand.name,
        fipe_model_code: picked.model.code,
        fipe_model_name: picked.model.name,
        fipe_year_code: yearMatch.code,
        fipe_year_name: yearMatch.name,
        match_score: Number(picked.score.toFixed(2)),
      });
    } catch (err) {
      results.push({ ...modelMeta(m), status: 'error', error: (err as Error).message });
    }
  }

  const mapped = results.filter((r) => r.status === 'mapped').length;
  return new Response(
    JSON.stringify({ mapped, total: results.length, details: results }),
    { headers: { 'content-type': 'application/json' } },
  );
});

function modelMeta(m: OurModel) {
  return { id: m.id, brand: m.brand, model: m.model, version: m.version, year: m.year };
}
