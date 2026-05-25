// AutoDNA — fipe-investigate Edge Function
// Para cada car_model sem fipe_brand_code mapeado, investiga a FIPE e
// retorna candidatos. Útil pra resolver mapeamentos manuais em batch.
//
// POST /functions/v1/fipe-investigate
// Returns:
//   {
//     unmapped: [
//       {
//         id, brand, model, version, year, fuel,
//         candidates: [
//           {
//             fipe_brand_code, fipe_brand_name,
//             models: [
//               { code, name, available_years: [{code, name}] }
//             ]
//           }
//         ]
//       }
//     ]
//   }

import { createClient } from 'jsr:@supabase/supabase-js@2';

const PARALLELUM = 'https://parallelum.com.br/fipe/api/v1/carros';

interface FipeBrand { codigo: string; nome: string; }
interface FipeModel { codigo: number | string; nome: string; }
interface FipeYear { codigo: string; nome: string; }
interface FipeModelsResponse { modelos: FipeModel[]; }

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9\s.]/g, ' ').replace(/\s+/g, ' ').trim();
}

const BRAND_ALIASES: Record<string, string[]> = {
  Chevrolet: ['gm chevrolet', 'gm', 'chevrolet'],
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

function findBrand(ourBrand: string, fipeBrands: FipeBrand[]): FipeBrand | null {
  const aliases = (BRAND_ALIASES[ourBrand] ?? [ourBrand]).map(normalize);
  for (const fb of fipeBrands) {
    const fbName = normalize(fb.nome);
    for (const a of aliases) {
      if (fbName === a || fbName.includes(a) || a.includes(fbName)) return fb;
    }
  }
  return null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return (await res.json()) as T;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return new Response('Server misconfigured', { status: 500 });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: models } = await admin
    .from('car_models')
    .select('id, brand, model, version, year, fuel')
    .is('fipe_brand_code', null);

  if (!models?.length) {
    return new Response(JSON.stringify({ unmapped: [] }), {
      headers: { 'content-type': 'application/json' },
    });
  }

  let fipeBrands: FipeBrand[];
  try {
    fipeBrands = await fetchJson<FipeBrand[]>(`${PARALLELUM}/marcas`);
  } catch (err) {
    return new Response(`brands fetch failed: ${(err as Error).message}`, { status: 502 });
  }

  const modelsByBrand = new Map<string, FipeModel[]>();
  async function getModelsForBrand(brandCode: string): Promise<FipeModel[]> {
    if (!modelsByBrand.has(brandCode)) {
      const resp = await fetchJson<FipeModelsResponse>(`${PARALLELUM}/marcas/${brandCode}/modelos`);
      modelsByBrand.set(brandCode, resp.modelos ?? []);
    }
    return modelsByBrand.get(brandCode)!;
  }

  const out: Array<Record<string, unknown>> = [];
  for (const m of models as Array<{ id: string; brand: string; model: string; version: string; year: number; fuel: string }>) {
    const brand = findBrand(m.brand, fipeBrands);
    const ourEntry: Record<string, unknown> = {
      id: m.id,
      ours: { brand: m.brand, model: m.model, version: m.version, year: m.year, fuel: m.fuel },
      fipe_brand_code: brand?.codigo ?? null,
      fipe_brand_name: brand?.nome ?? null,
    };

    if (!brand) {
      ourEntry.candidates = [];
      out.push(ourEntry);
      continue;
    }

    try {
      const fipeMods = await getModelsForBrand(brand.codigo);
      // Score por sobreposição de tokens (mais permissivo, queremos candidatos)
      const ourTokens = normalize(`${m.model} ${m.version}`).split(' ').filter((t) => t.length >= 2);
      const scored = fipeMods.map((fm) => {
        const ftoks = normalize(fm.nome).split(' ').filter(Boolean);
        let score = 0;
        for (const t of ourTokens) {
          if (ftoks.some((f) => f === t || f.startsWith(t) || t.startsWith(f))) score++;
        }
        return { fm, score };
      }).filter((s) => s.score >= 1).sort((a, b) => b.score - a.score).slice(0, 8);

      const candidates: Array<Record<string, unknown>> = [];
      for (const c of scored) {
        try {
          const years = await fetchJson<FipeYear[]>(`${PARALLELUM}/marcas/${brand.codigo}/modelos/${c.fm.codigo}/anos`);
          candidates.push({
            fipe_model_code: String(c.fm.codigo),
            fipe_model_name: c.fm.nome,
            score: c.score,
            available_years: years.slice(0, 8).map((y) => ({ code: y.codigo, name: y.nome })),
          });
        } catch (err) {
          candidates.push({
            fipe_model_code: String(c.fm.codigo),
            fipe_model_name: c.fm.nome,
            score: c.score,
            error: (err as Error).message,
          });
        }
      }
      ourEntry.candidates = candidates;
    } catch (err) {
      ourEntry.error = (err as Error).message;
      ourEntry.candidates = [];
    }
    out.push(ourEntry);
  }

  return new Response(JSON.stringify({ unmapped: out }), {
    headers: { 'content-type': 'application/json' },
  });
});
