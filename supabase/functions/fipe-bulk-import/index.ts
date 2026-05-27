// AutoDNA — fipe-bulk-import Edge Function
// Importa o catálogo FIPE inteiro em fases, idempotente, com auto-continue.
// Cliente chama em loop até receber { done: true }.
//
// Fases:
//   1. brands   — popula fipe_catalog_brands (uma chamada à Parallelum)
//   2. models   — para cada brand sem modelos importados, busca modelos
//   3. years    — para cada model sem anos importados, busca anos (filtra >=2018)
//   4. promote  — cria car_models + car_costs + car_listings para cada
//                  (brand, model, year) que ainda não virou car_model
//
// API:
//   POST /functions/v1/fipe-bulk-import
//     body: { batch?: number }   // tamanho do lote (default 30, max 100)

import { createClient } from 'jsr:@supabase/supabase-js@2';

const PARALLELUM = 'https://parallelum.com.br/fipe/api/v1/carros';
const MIN_YEAR = 2018;
const CURRENT_YEAR = 2026;
const ZERO_KM_CODE = 32000; // a FIPE usa 32000 como "Zero KM"
const AVG_KM_PER_YEAR = 12000;

type BodyType = 'hatch' | 'sedan' | 'suv' | 'pickup' | 'minivan' | 'crossover';
type FuelType = 'flex' | 'gasolina' | 'diesel' | 'hibrido' | 'eletrico';
type Transmission = 'manual' | 'automatico' | 'cvt' | 'automatizado';

interface FipeBrand { codigo: string; nome: string; }
interface FipeModel { codigo: number | string; nome: string; }
interface FipeYear { codigo: string; nome: string; }
interface FipeModelsResponse { modelos: FipeModel[]; }

// ---------- Parser do nome FIPE ----------

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function parseBodyType(brand: string, modelName: string): BodyType {
  const n = normalize(`${brand} ${modelName}`);
  if (/\bhatch\b/.test(n)) return 'hatch';
  if (/\bsedan?\b|\bsed\.|\bs\.dn\b/.test(n)) return 'sedan';
  if (/\bsuv\b/.test(n)) return 'suv';
  if (/\bcd\b|\bcs\b|\bce\b|cab(\.|ine)|pick.?up/.test(n)) return 'pickup';
  if (/\bvan\b|minivan|kombi|spin|caravan/.test(n)) return 'minivan';

  const containsAny = (arr: string[]) => arr.some((m) => n.includes(m));
  if (containsAny(['hilux','strada','toro','saveiro','montana','ranger','s10','frontier','amarok','l200','dakota','rampage','maverick','oroch'])) return 'pickup';
  if (containsAny(['nivus','pulse','fastback','tera','c4 cactus','captur'])) return 'crossover';
  if (containsAny(['creta','tracker','tiggo','haval','renegade','compass','t-cross','t cross','tcross','taos','corolla cross','hr-v','hrv','kicks','duster','3008','2008','5008','q3','q5','x1','x3','tucson','sorento','sportage','ecosport','territory','bronco','rav4','outlander','asx','pajero','jimny','mokka','equinox','trailblazer','wrangler','grand cherokee','commander','song','yuan','byd'])) return 'suv';
  if (containsAny(['doblo','grand siena','livina','grand c4','sienna','odyssey','sharan','touran','meriva','zafira','xterra'])) return 'minivan';
  if (containsAny(['onix plus','virtus','voyage','cobalt','prisma','siena','versa','sentra','altima','accord','jetta','passat','vento','polo sedan','hb20s','cronos','logan','fluence','corolla','civic','etios sedan','yaris sedan'])) return 'sedan';
  return 'hatch';
}

function parseTransmission(modelName: string): Transmission {
  const n = normalize(modelName);
  if (/\bcvt\b/.test(n)) return 'cvt';
  if (/automatizad/.test(n)) return 'automatizado';
  if (/\baut(\.|omatic|omat)/.test(n)) return 'automatico';
  if (/\bmec(\.|anic)?/.test(n)) return 'manual';
  return 'manual';
}

function parseFuelFromYearCode(yearCode: string, modelName: string): FuelType {
  const fc = yearCode.split('-')[1];
  if (fc === '3') return 'diesel';
  if (fc === '4') return 'eletrico';
  if (fc === '6') return 'hibrido';
  if (fc === '5') return 'flex';
  if (/\bflex\b/i.test(modelName)) return 'flex';
  return 'gasolina';
}

function parseDisplacement(modelName: string): number | null {
  const m = modelName.match(/(?<![Vv\d])(\d\.\d)(?!\d)/);
  return m ? Number(m[1]) : null;
}

function parseSeats(modelName: string, body: BodyType): number {
  const m = modelName.match(/(\d+)p\b/i);
  if (m) return Math.min(9, Math.max(2, Number(m[1])));
  if (body === 'minivan') return 7;
  if (body === 'pickup') {
    if (/\bcs\b/i.test(modelName)) return 2;
    return 5;
  }
  return 5;
}

function parseTags(brand: string, modelName: string, body: BodyType, fuel: FuelType): string[] {
  const n = normalize(`${brand} ${modelName}`);
  const tags: string[] = [body];
  if (fuel === 'hibrido') tags.push('hibrido', 'sustentavel', 'economico');
  if (fuel === 'eletrico') tags.push('eletrico', 'sustentavel');
  if (fuel === 'diesel') tags.push('diesel', 'robusto');
  if (/\bturbo\b|\btb\b|\btsi\b|\btgdi\b/.test(n)) tags.push('turbo');
  if (/\b4x4\b|\bawd\b|\b4motion\b|\bxdrive\b|\bquattro\b/.test(n)) tags.push('4x4');
  if (/\b(premier|highline|exclusive|premium|comfort plus|limited|platinum|titanium|exec)/.test(n)) tags.push('premium');
  if (/\b(sport|gti|abarth)\b/.test(n)) tags.push('esportivo');
  return Array.from(new Set(tags));
}

// ---------- Estimativa de custos ----------

function estimateCosts(price: number, body: BodyType, fuel: FuelType) {
  const base: Record<BodyType, { ins: number; man: number; ipva: number; dep: number }> = {
    hatch:     { ins: 0.050, man: 0.030, ipva: 0.040, dep: 0.13 },
    sedan:     { ins: 0.050, man: 0.030, ipva: 0.040, dep: 0.11 },
    suv:       { ins: 0.050, man: 0.035, ipva: 0.040, dep: 0.11 },
    pickup:    { ins: 0.045, man: 0.040, ipva: 0.040, dep: 0.09 },
    crossover: { ins: 0.050, man: 0.035, ipva: 0.040, dep: 0.12 },
    minivan:   { ins: 0.050, man: 0.035, ipva: 0.040, dep: 0.12 },
  };
  const b = base[body];
  let depMult = 1;
  if (fuel === 'diesel') depMult = 0.75;
  else if (fuel === 'hibrido') depMult = 1.05;
  else if (fuel === 'eletrico') depMult = 1.15;

  return {
    insurance_yearly:   Math.round(price * b.ins * 100) / 100,
    maintenance_yearly: Math.round(price * b.man * 100) / 100,
    ipva_yearly:        Math.round(price * b.ipva * 100) / 100,
    depreciation_yearly: Math.round(price * b.dep * depMult * 100) / 100,
  };
}

// ---------- HTTP ----------

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return (await res.json()) as T;
}

// ---------- Main ----------

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return new Response('Server misconfigured', { status: 500 });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  let body: { batch?: number } = {};
  try { body = await req.json(); } catch {}
  const BATCH = Math.min(Math.max(body.batch ?? 30, 1), 100);

  // ---------- Phase 1: brands ----------
  const { count: brandsCount } = await admin
    .from('fipe_catalog_brands')
    .select('codigo', { count: 'exact', head: true });

  if ((brandsCount ?? 0) === 0) {
    const brands = await fetchJson<FipeBrand[]>(`${PARALLELUM}/marcas`);
    const rows = brands.map((b) => ({ codigo: b.codigo, nome: b.nome }));
    const { error } = await admin.from('fipe_catalog_brands').upsert(rows);
    if (error) throw error;
    return Response.json({
      phase: 'brands', processed: brands.length, next_phase: 'models', done: false,
    });
  }

  // ---------- Phase 2: models ----------
  const { data: pendingBrands } = await admin
    .rpc('fipe_pending_brands', { lim: Math.min(BATCH, 5) });

  if (pendingBrands && pendingBrands.length > 0) {
    let imported = 0;
    for (const b of pendingBrands as Array<{ codigo: string; nome: string }>) {
      try {
        await new Promise((r) => setTimeout(r, 250));
        const resp = await fetchJson<FipeModelsResponse>(`${PARALLELUM}/marcas/${b.codigo}/modelos`);
        const rows = (resp.modelos ?? []).map((m) => ({
          brand_code: b.codigo,
          codigo: String(m.codigo),
          nome: m.nome,
        }));
        if (rows.length > 0) {
          const { error } = await admin.from('fipe_catalog_models').upsert(rows);
          if (error) throw error;
        }
        imported += rows.length;
      } catch (err) {
        console.warn('brand failed', b.codigo, (err as Error).message);
      }
    }
    return Response.json({
      phase: 'models',
      processed_brands: pendingBrands.length,
      imported_models: imported,
      next_phase: 'models',
      done: false,
    });
  }

  // ---------- Phase 3: years ----------
  const { data: pendingModels } = await admin
    .rpc('fipe_pending_models', { lim: BATCH });

  if (pendingModels && pendingModels.length > 0) {
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];
    for (const m of pendingModels as Array<{ brand_code: string; codigo: string; nome: string }>) {
      try {
        // 250ms de espaçamento entre requests pra respeitar rate limit Parallelum
        await new Promise((r) => setTimeout(r, 250));
        const years = await fetchJson<FipeYear[]>(
          `${PARALLELUM}/marcas/${m.brand_code}/modelos/${m.codigo}/anos`,
        );
        const rows = years
          .filter((y) => {
            const yr = Number(y.codigo.split('-')[0]);
            if (!Number.isFinite(yr)) return false;
            if (yr === ZERO_KM_CODE) return true;
            return yr >= MIN_YEAR && yr <= CURRENT_YEAR + 1;
          })
          .map((y) => ({
            brand_code: m.brand_code,
            model_code: m.codigo,
            year_code: y.codigo,
            year_name: y.nome,
          }));
        if (rows.length > 0) {
          const { error } = await admin.from('fipe_catalog_years').upsert(rows);
          if (error) throw error;
        }
        imported += rows.length;
      } catch (err) {
        failed++;
        if (errors.length < 3) errors.push(`${m.brand_code}/${m.codigo}: ${(err as Error).message}`);
        console.warn('model years failed', m.brand_code, m.codigo, (err as Error).message);
      }
    }
    return Response.json({
      phase: 'years',
      processed_models: pendingModels.length,
      imported_years: imported,
      failed_models: failed,
      sample_errors: errors,
      next_phase: 'years',
      done: false,
    });
  }

  // ---------- Phase 4: promote ----------
  const { data: pendingYears } = await admin
    .rpc('fipe_pending_years', { lim: BATCH });

  if (!pendingYears || pendingYears.length === 0) {
    return Response.json({ phase: 'done', done: true });
  }

  let created = 0;
  let skipped = 0;
  for (const y of pendingYears as Array<{
    brand_code: string; model_code: string; year_code: string;
    year_name: string; brand_name: string; model_name: string;
  }>) {
    try {
      const rawYear = Number(y.year_code.split('-')[0]);
      const isZeroKm = rawYear === ZERO_KM_CODE;
      // Pra Zero KM, year do car_model é o ano corrente (carro de fábrica hoje)
      const yearNum = isZeroKm ? CURRENT_YEAR : rawYear;
      const fuel = parseFuelFromYearCode(y.year_code, y.model_name);
      const body = parseBodyType(y.brand_name, y.model_name);
      const transmission = parseTransmission(y.model_name);
      const displacement = parseDisplacement(y.model_name);
      const seats = parseSeats(y.model_name, body);
      const tags = parseTags(y.brand_name, y.model_name, body, fuel);
      if (isZeroKm) tags.push('zero-km');

      // Determina se é novo ou usado pelo ano efetivo
      const isNew = isZeroKm || yearNum >= CURRENT_YEAR;
      const condition: 'new' | 'used' = isNew ? 'new' : 'used';
      const ageYears = Math.max(0, CURRENT_YEAR - yearNum);
      const estimatedMileage = isNew ? null : ageYears * AVG_KM_PER_YEAR;

      let version = y.model_name;
      const brandShort = y.brand_name.split(' ').pop() ?? y.brand_name;
      version = version.replace(new RegExp(`^${brandShort}\\s+`, 'i'), '').trim();
      // Pra Zero KM, marca isso na version pra distinguir do ano corrente "envelhecido"
      if (isZeroKm && !/zero/i.test(version)) version = `${version} · 0 km`;
      const modelLabel = y.model_name.split(' ')[0] || y.model_name;

      const { data: inserted, error: insErr } = await admin
        .from('car_models')
        .insert({
          brand: y.brand_name,
          model: modelLabel,
          version,
          year: yearNum,
          body_type: body,
          fuel,
          transmission,
          engine_displacement: displacement,
          horsepower: null,
          price_fipe: 0,
          fuel_consumption_city: null,
          fuel_consumption_road: null,
          seats,
          trunk_liters: null,
          tags,
          data_source: 'fipe_auto',
          is_estimated: true,
          fipe_brand_code: y.brand_code,
          fipe_model_code: y.model_code,
          fipe_year_code: y.year_code,
        })
        .select('id')
        .single();

      if (insErr) {
        if (insErr.code === '23505') { skipped++; continue; }
        throw insErr;
      }
      if (!inserted) { skipped++; continue; }

      const costs = estimateCosts(0, body, fuel);
      await admin.from('car_costs').insert({
        car_id: inserted.id,
        insurance_yearly: costs.insurance_yearly,
        maintenance_yearly: costs.maintenance_yearly,
        ipva_yearly: costs.ipva_yearly,
        depreciation_yearly: costs.depreciation_yearly,
      });

      await admin.from('car_listings').insert({
        model_id: inserted.id,
        condition,
        manufacture_year: yearNum,
        mileage_km: estimatedMileage,
        asking_price: 1,
        source: 'catalog',
        active: true,
      });

      created++;
    } catch (err) {
      skipped++;
      console.warn('promote failed', y.year_code, (err as Error).message);
    }
  }

  return Response.json({
    phase: 'promote',
    processed: pendingYears.length,
    created,
    skipped,
    next_phase: 'promote',
    done: false,
  });
});
