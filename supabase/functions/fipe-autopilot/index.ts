// AutoDNA — fipe-autopilot Edge Function
// Mapeia automaticamente os códigos FIPE (marca/modelo/ano) para cada
// car_model do catálogo que ainda não tem esses campos preenchidos.
// Usa a API v1 da Parallelum (paths em português, campos codigo/nome).

import { createClient } from 'jsr:@supabase/supabase-js@2';

const PARALLELUM = 'https://parallelum.com.br/fipe/api/v1/carros';

interface FipeBrand { codigo: string; nome: string; }
interface FipeModelsResponse { modelos: FipeModel[]; anos: FipeYear[]; }
interface FipeModel { codigo: number | string; nome: string; }
interface FipeYear { codigo: string; nome: string; }

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

// FIPE fuel codes: 1 = Gasolina, 2 = Álcool, 3 = Diesel, 4 = Elétrico,
// 5 = Flex, 6 = Híbrido. A nossa enum 'flex' pode aparecer como '1' OU '5'
// dependendo do ano/modelo, então listamos como fallback.
const FUEL_TO_CODES: Record<string, string[]> = {
  flex: ['5', '1'],
  gasolina: ['1', '2'],
  diesel: ['3'],
  hibrido: ['6', '5', '1'],
  eletrico: ['4'],
};

function matchBrand(ourBrand: string, fipeBrands: FipeBrand[]): FipeBrand | null {
  const aliases = (BRAND_ALIASES[ourBrand] ?? [ourBrand]).map(normalize);
  let best: { brand: FipeBrand; score: number } | null = null;
  for (const fb of fipeBrands) {
    const fbName = normalize(fb.nome);
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
  // Garantir que o nome principal do modelo bate. Sem isso, descartamos
  // o candidato — evita "Onix" virar "Tracker", "T-Cross" virar "Nivus".
  const modelTokens = normalize(model).split(' ').filter((t) => t.length >= 2);
  const versionTokens = normalize(version).split(' ').filter((t) => t.length >= 2);
  const fipe = normalize(fipeName).split(' ').filter(Boolean);
  if (modelTokens.length === 0) return 0;

  const tokenMatchesAny = (t: string) =>
    fipe.some((f) => f === t || f.startsWith(t) || t.startsWith(f));

  // Hard requirement: TODA palavra do model name precisa aparecer no FIPE name.
  for (const t of modelTokens) {
    if (!tokenMatchesAny(t)) return 0;
  }

  // Bonus por palavras de versão (Premier, LT, Turbo, Hybrid, ...).
  let bonus = 0;
  for (const t of versionTokens) {
    if (tokenMatchesAny(t)) bonus += 1;
  }
  return 0.5 + Math.min(0.5, bonus * 0.15); // base 0.5 (model OK) + até 0.5 de versão
}

function pickBestModel(
  ourModel: string,
  ourVersion: string,
  fipeModels: FipeModel[],
): { model: FipeModel; score: number } | null {
  let best: { model: FipeModel; score: number } | null = null;
  for (const fm of fipeModels) {
    const score = scoreModelMatch(ourModel, ourVersion, fm.nome);
    if (!best || score > best.score) best = { model: fm, score };
  }
  if (!best || best.score < 0.55) return null;
  return best;
}

function pickYear(ourYear: number, ourFuel: string, fipeYears: FipeYear[]): FipeYear | null {
  const acceptableFuelCodes = FUEL_TO_CODES[ourFuel] ?? ['5', '1'];
  for (const fc of acceptableFuelCodes) {
    const expected = `${ourYear}-${fc}`;
    const exact = fipeYears.find((y) => y.codigo === expected);
    if (exact) return exact;
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

  let body: { only_unmapped?: boolean } = { only_unmapped: true };
  try { body = { only_unmapped: true, ...(await req.json()) }; } catch {}

  let query = admin
    .from('car_models')
    .select('id, brand, model, version, year, fuel, fipe_brand_code, fipe_model_code, fipe_year_code');
  if (body.only_unmapped) query = query.is('fipe_brand_code', null);
  const { data: models, error: mErr } = await query;
  if (mErr) return new Response(`models error: ${mErr.message}`, { status: 500 });
  if (!models?.length) {
    return new Response(JSON.stringify({ mapped: 0, total: 0, details: [] }), {
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
  const yearsByModel = new Map<string, FipeYear[]>();
  const results: MappingResult[] = [];

  for (const m of models as OurModel[]) {
    try {
      const fipeBrand = matchBrand(m.brand, fipeBrands);
      if (!fipeBrand) {
        results.push({ ...modelMeta(m), status: 'no_brand_match' });
        continue;
      }

      if (!modelsByBrand.has(fipeBrand.codigo)) {
        const resp = await fetchJson<FipeModelsResponse>(
          `${PARALLELUM}/marcas/${fipeBrand.codigo}/modelos`,
        );
        modelsByBrand.set(fipeBrand.codigo, resp.modelos ?? []);
      }
      const fipeMods = modelsByBrand.get(fipeBrand.codigo)!;
      const picked = pickBestModel(m.model, m.version, fipeMods);
      if (!picked) {
        results.push({
          ...modelMeta(m),
          status: 'no_model_match',
          fipe_brand_code: fipeBrand.codigo,
          fipe_brand_name: fipeBrand.nome,
        });
        continue;
      }

      const cacheKey = `${fipeBrand.codigo}:${picked.model.codigo}`;
      if (!yearsByModel.has(cacheKey)) {
        const yrs = await fetchJson<FipeYear[]>(
          `${PARALLELUM}/marcas/${fipeBrand.codigo}/modelos/${picked.model.codigo}/anos`,
        );
        yearsByModel.set(cacheKey, yrs);
      }
      const fipeYrs = yearsByModel.get(cacheKey)!;
      const yearMatch = pickYear(m.year, m.fuel, fipeYrs);
      if (!yearMatch) {
        results.push({
          ...modelMeta(m),
          status: 'no_year_match',
          fipe_brand_code: fipeBrand.codigo,
          fipe_brand_name: fipeBrand.nome,
          fipe_model_code: String(picked.model.codigo),
          fipe_model_name: picked.model.nome,
          match_score: Number(picked.score.toFixed(2)),
        });
        continue;
      }

      const modelCodeStr = String(picked.model.codigo);
      const { error: upErr } = await admin
        .from('car_models')
        .update({
          fipe_brand_code: fipeBrand.codigo,
          fipe_model_code: modelCodeStr,
          fipe_year_code: yearMatch.codigo,
        })
        .eq('id', m.id);
      if (upErr) throw upErr;

      results.push({
        ...modelMeta(m),
        status: 'mapped',
        fipe_brand_code: fipeBrand.codigo,
        fipe_brand_name: fipeBrand.nome,
        fipe_model_code: modelCodeStr,
        fipe_model_name: picked.model.nome,
        fipe_year_code: yearMatch.codigo,
        fipe_year_name: yearMatch.nome,
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
