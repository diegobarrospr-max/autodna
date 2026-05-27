// AutoDNA — recommend-cars Edge Function
// Recebe respostas do quiz, filtra candidatos por regras, chama Gemini
// para escolher top 3 com explicação narrativa em PT-BR, persiste em
// matches e devolve o ranking para o cliente.
//
// Deploy:
//   supabase functions deploy recommend-cars --project-ref eaorpeaszqkahjlukncr
// Secrets (pelo dashboard Supabase ou CLI):
//   supabase secrets set GEMINI_API_KEY=AIza... --project-ref eaorpeaszqkahjlukncr
//
// Gemini API key: criar em https://aistudio.google.com/apikey (grátis)

import { createClient } from 'jsr:@supabase/supabase-js@2';

const GEMINI_MODEL = 'gemini-2.5-flash';
const MAX_CANDIDATES_TO_AI = 12;
const TOP_N = 3;

const FUEL_PRICE = 6.0;
const AFFORDABLE_RATIO = 0.35;

// CORS obrigatório pra invocar do browser via supabase-js (PWA/web).
// Sem isso a fetch é abortada com TypeError → "Failed to send a request
// to the Edge Function" mesmo com 200 OK no servidor.
const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers':
    'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-max-age': '86400',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  });
}

function textResponse(body: string, status: number) {
  return new Response(body, {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'text/plain' },
  });
}

type ConditionType = 'new' | 'used';
type BodyType = 'hatch' | 'sedan' | 'suv' | 'pickup' | 'minivan' | 'crossover';
type CarConditionPreference = 'new' | 'used' | 'both';
type PaymentMode = 'cash' | 'financed';
type TransmissionPreference = 'manual' | 'automatic' | 'any';

interface QuizInput {
  monthly_income: number;
  household_size: number;
  monthly_km: number;
  car_condition_preference: CarConditionPreference;
  max_mileage_km: number | null;
  priorities: string[];
  payment_mode: PaymentMode;
  down_payment_pct: number;
  financing_months: number;
  monthly_interest: number;
  max_budget: number | null;
  transmission_preference: TransmissionPreference;
}

interface Candidate {
  listing_id: string;
  model_id: string;
  brand: string;
  model: string;
  version: string;
  year: number;
  body_type: BodyType;
  fuel: string;
  transmission: string;
  seats: number;
  trunk_liters: number | null;
  fuel_consumption_avg: number;
  tags: string[];
  condition: ConditionType;
  manufacture_year: number;
  mileage_km: number | null;
  asking_price: number;
  city: string | null;
  state: string | null;
  tco: {
    installment: number;
    fuel: number;
    insurance: number;
    maintenance: number;
    ipva: number;
    depreciation: number;
    total: number;
  };
}

interface AiRecommendation {
  listing_id: string;
  score: number;
  reason: string;
}

// ---------- helpers ----------

function monthlyInstallment(price: number, quiz: QuizInput) {
  if (quiz.payment_mode === 'cash') return 0;
  const financed = price * (1 - quiz.down_payment_pct / 100);
  if (financed <= 0) return 0;
  const r = quiz.monthly_interest;
  const n = quiz.financing_months;
  if (r <= 0) return financed / n;
  const factor = (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return financed * factor;
}

function computeTco(
  price: number,
  quiz: QuizInput,
  consumption: number,
  insurance_yearly: number,
  maintenance_yearly: number,
  ipva_yearly: number,
  depreciation_yearly: number,
) {
  const installment = monthlyInstallment(price, quiz);
  const fuel = consumption > 0 ? (quiz.monthly_km / consumption) * FUEL_PRICE : 0;
  const insurance = insurance_yearly / 12;
  const maintenance = maintenance_yearly / 12;
  const ipva = ipva_yearly / 12;
  const depreciation = depreciation_yearly / 12;
  return {
    installment,
    fuel,
    insurance,
    maintenance,
    ipva,
    depreciation,
    total: installment + fuel + insurance + maintenance + ipva + depreciation,
  };
}

const BODY_FOR_HOUSEHOLD: Record<number, BodyType[]> = {
  1: ['hatch', 'sedan', 'crossover', 'suv', 'pickup'],
  2: ['hatch', 'sedan', 'crossover', 'suv', 'pickup'],
  3: ['hatch', 'sedan', 'crossover', 'suv', 'minivan'],
  4: ['sedan', 'crossover', 'suv', 'minivan'],
  5: ['suv', 'minivan'],
};

// ---------- main ----------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return textResponse('Method not allowed', 405);
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return textResponse('Unauthorized', 401);
  }
  const jwt = authHeader.slice(7);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (!supabaseUrl || !serviceKey || !geminiKey) {
    return textResponse('Server misconfigured', 500);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) {
    return textResponse('Unauthorized', 401);
  }
  const userId = userData.user.id;

  let body: { quiz?: QuizInput };
  try {
    body = await req.json();
  } catch {
    return textResponse('Invalid JSON', 400);
  }
  const quiz = body.quiz;
  if (!quiz || !quiz.monthly_income || !quiz.priorities) {
    return textResponse('Missing quiz answers', 400);
  }

  // ----- fetch catalog -----
  const { data: listings, error: lErr } = await admin
    .from('car_listings')
    .select(
      'id, model_id, condition, manufacture_year, mileage_km, asking_price, city, state',
    )
    .eq('active', true);
  if (lErr) {
    return textResponse(`listings error: ${lErr.message}`, 500);
  }
  if (!listings?.length) {
    return jsonResponse({ recommendations: [] });
  }

  const modelIds = Array.from(new Set(listings.map((l: any) => l.model_id)));

  const [{ data: models }, { data: costs }] = await Promise.all([
    admin
      .from('car_models')
      .select(
        'id, brand, model, version, year, body_type, fuel, transmission, seats, trunk_liters, fuel_consumption_city, fuel_consumption_road, tags',
      )
      .in('id', modelIds),
    admin
      .from('car_costs')
      .select(
        'car_id, insurance_yearly, maintenance_yearly, ipva_yearly, depreciation_yearly',
      )
      .in('car_id', modelIds),
  ]);

  const modelById = new Map<string, any>();
  for (const m of models ?? []) modelById.set(m.id, m);
  const costsById = new Map<string, any>();
  for (const c of costs ?? []) costsById.set(c.car_id, c);

  // ----- pre-filter to keep prompt small -----
  const bodyAllow = BODY_FOR_HOUSEHOLD[Math.min(quiz.household_size, 5)] ?? BODY_FOR_HOUSEHOLD[5];
  const candidates: Candidate[] = [];

  for (const l of listings) {
    if (quiz.car_condition_preference !== 'both' && l.condition !== quiz.car_condition_preference) continue;
    if (l.condition === 'used' && quiz.max_mileage_km && (l.mileage_km ?? 0) > quiz.max_mileage_km) continue;
    const m = modelById.get(l.model_id);
    const c = costsById.get(l.model_id);
    if (!m || !c) continue;
    if (!bodyAllow.includes(m.body_type)) continue;
    if (quiz.household_size > m.seats) continue;
    if (quiz.max_budget && Number(l.asking_price) > quiz.max_budget) continue;
    if (quiz.transmission_preference === 'manual' && m.transmission !== 'manual') continue;
    if (
      quiz.transmission_preference === 'automatic' &&
      m.transmission === 'manual'
    ) {
      continue;
    }

    const city = Number(m.fuel_consumption_city ?? 0);
    const road = Number(m.fuel_consumption_road ?? 0);
    const consumption = city && road ? city * 0.6 + road * 0.4 : Math.max(city, road, 1);

    const tco = computeTco(
      Number(l.asking_price),
      quiz,
      consumption,
      Number(c.insurance_yearly),
      Number(c.maintenance_yearly),
      Number(c.ipva_yearly),
      Number(c.depreciation_yearly),
    );

    if (tco.total > quiz.monthly_income * AFFORDABLE_RATIO) continue;

    candidates.push({
      listing_id: l.id,
      model_id: m.id,
      brand: m.brand,
      model: m.model,
      version: m.version,
      year: m.year,
      body_type: m.body_type,
      fuel: m.fuel,
      transmission: m.transmission,
      seats: m.seats,
      trunk_liters: m.trunk_liters,
      fuel_consumption_avg: Math.round(consumption * 10) / 10,
      tags: m.tags ?? [],
      condition: l.condition,
      manufacture_year: l.manufacture_year,
      mileage_km: l.mileage_km,
      asking_price: Number(l.asking_price),
      city: l.city,
      state: l.state,
      tco: {
        installment: Math.round(tco.installment),
        fuel: Math.round(tco.fuel),
        insurance: Math.round(tco.insurance),
        maintenance: Math.round(tco.maintenance),
        ipva: Math.round(tco.ipva),
        depreciation: Math.round(tco.depreciation),
        total: Math.round(tco.total),
      },
    });
  }

  if (candidates.length === 0) {
    return jsonResponse({ recommendations: [] });
  }

  // Sort by lowest TCO and take top N candidates for Gemini
  candidates.sort((a, b) => a.tco.total - b.tco.total);
  const finalists = candidates.slice(0, MAX_CANDIDATES_TO_AI);

  // ----- call Gemini -----
  const systemPrompt = `Você é o AutoDNA, um consultor brasileiro especialista em carros. Sua missão é ajudar uma pessoa a escolher o carro certo para o estilo de vida e o bolso dela.

Você recebe o perfil do usuário e uma lista de carros que já passaram pelos filtros básicos (cabem no orçamento, número de assentos suficiente, tipo de carroceria compatível). Sua tarefa é escolher os 3 melhores e explicar PORQUÊ, em português brasileiro casual e direto.

Regras:
- Considere prioridades declaradas, TCO mensal versus renda, eficiência de combustível para quem roda muito, espaço para famílias grandes, e adequação do tipo de carroceria.
- Seja objetivo: 2-3 frases curtas por recomendação, falando como quem conversa.
- NÃO invente carros que não estão na lista.
- NÃO ofereça mais de 3 carros.
- Atribua um score de 0 a 100 que reflete o quanto o carro combina com a pessoa.
- Use APENAS os listing_id que aparecem na lista de candidatos.`;

  const userPayload = {
    perfil: {
      renda_mensal_liquida: quiz.monthly_income,
      pessoas_no_carro: quiz.household_size,
      km_por_mes: quiz.monthly_km,
      preferencia_condicao: quiz.car_condition_preference,
      km_maximo_aceitavel: quiz.max_mileage_km,
      prioridades: quiz.priorities,
    },
    candidatos: finalists.map((c) => ({
      listing_id: c.listing_id,
      carro: `${c.brand} ${c.model} ${c.version} ${c.year}`,
      condicao: c.condition,
      ano_fabricacao: c.manufacture_year,
      km: c.mileage_km,
      preco: c.asking_price,
      carroceria: c.body_type,
      combustivel: c.fuel,
      cambio: c.transmission,
      assentos: c.seats,
      porta_malas_l: c.trunk_liters,
      consumo_medio_km_por_l: c.fuel_consumption_avg,
      tags: c.tags,
      tco_mensal_total: c.tco.total,
      tco_breakdown: c.tco,
    })),
  };

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`;
  const geminiRes = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [
        {
          role: 'user',
          parts: [{ text: JSON.stringify(userPayload) }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            recommendations: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  listing_id: { type: 'STRING' },
                  score: { type: 'INTEGER' },
                  reason: { type: 'STRING' },
                },
                required: ['listing_id', 'score', 'reason'],
              },
            },
          },
          required: ['recommendations'],
        },
        temperature: 0.3,
        maxOutputTokens: 1500,
      },
    }),
  });

  if (!geminiRes.ok) {
    const text = await geminiRes.text();
    return textResponse(`Gemini error: ${text}`, 502);
  }

  const geminiJson = (await geminiRes.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const textBlock = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  let parsed: { recommendations: AiRecommendation[] };
  try {
    parsed = JSON.parse(textBlock);
  } catch {
    return textResponse(`Could not parse Gemini output: ${textBlock}`, 502);
  }

  const top = parsed.recommendations.slice(0, TOP_N);
  const finalistsById = new Map(finalists.map((f) => [f.listing_id, f]));
  const enriched = top
    .map((r, idx) => {
      const f = finalistsById.get(r.listing_id);
      if (!f) return null;
      return {
        ...f,
        score: Math.max(0, Math.min(100, Math.round(r.score))),
        rank: idx + 1,
        reason: r.reason,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // persist matches
  await admin.from('matches').delete().eq('user_id', userId);
  if (enriched.length > 0) {
    await admin.from('matches').insert(
      enriched.map((m) => ({
        user_id: userId,
        car_id: m.model_id,
        score: m.score,
        rank: m.rank,
        reason: m.reason,
      })),
    );
  }

  return jsonResponse({ recommendations: enriched });
});
