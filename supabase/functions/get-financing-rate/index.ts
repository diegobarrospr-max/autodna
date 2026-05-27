// AutoDNA — get-financing-rate Edge Function
// Busca a taxa média de juros do mercado para CDC veículos PF a partir da
// série SGS do Bacen (série 20712). Faz cache em memória por 12 horas
// para reduzir hits e custo de cold-start.
//
// API:
//   POST /functions/v1/get-financing-rate
// Response:
//   { annual_rate: number, monthly_rate: number, source: string, as_of: string }
//
// Sem segredos necessários — a API do Bacen é pública.

const BACEN_URL =
  'https://api.bcb.gov.br/dados/serie/bcdata.sgs.20712/dados/ultimos/1?formato=json';
const SERIES_LABEL = 'BACEN SGS 20712 (CDC aquisição de veículos - PF)';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h

// CORS: sem esses headers o browser bloqueia a leitura da resposta no JS
// mesmo quando o servidor retorna 200, e o supabase-js reporta como
// "Failed to send a request to the Edge Function". OPTIONS é tratado abaixo.
const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers':
    'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, GET, OPTIONS',
  'access-control-max-age': '86400',
};

interface BacenRow {
  data: string; // DD/MM/AAAA
  valor: string; // ex "24.65"
}

interface RateResult {
  annual_rate: number;
  monthly_rate: number;
  source: string;
  as_of: string; // YYYY-MM-DD
  fetched_at: string; // ISO
}

let cached: { data: RateResult; expiresAt: number } | null = null;

function ddmmyyyyToIso(s: string): string {
  const [d, m, y] = s.split('/');
  return `${y}-${m}-${d}`;
}

async function fetchFromBacen(): Promise<RateResult> {
  const res = await fetch(BACEN_URL, {
    headers: { accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Bacen returned ${res.status}`);
  }
  const json = (await res.json()) as BacenRow[];
  if (!Array.isArray(json) || json.length === 0) {
    throw new Error('Bacen returned empty payload');
  }
  const row = json[json.length - 1];
  // Bacen historicamente retornava "24.65" (% a.a. com ponto) mas em 2026
  // mudou pra inteiro sem decimal ("1221" significando 12.21% a.a.). Cobrir
  // os 2 formatos: se vier vírgula ou ponto, parse direto; se for inteiro
  // grande, divide por 100 pra recuperar as 2 casas decimais implícitas.
  const raw = String(row.valor).replace(',', '.');
  let annualPct: number;
  if (raw.includes('.')) {
    annualPct = Number(raw);
  } else {
    const n = Number(raw);
    annualPct = n > 100 ? n / 100 : n;
  }
  if (!Number.isFinite(annualPct) || annualPct <= 0 || annualPct > 200) {
    throw new Error(`Invalid Bacen value: ${row.valor}`);
  }
  const monthly = Math.pow(1 + annualPct / 100, 1 / 12) - 1;
  return {
    annual_rate: annualPct,
    monthly_rate: monthly,
    source: SERIES_LABEL,
    as_of: ddmmyyyyToIso(row.data),
    fetched_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  try {
    if (cached && cached.expiresAt > Date.now()) {
      return new Response(JSON.stringify(cached.data), {
        headers: {
          ...CORS_HEADERS,
          'content-type': 'application/json',
          'cache-control': 'public, max-age=43200',
        },
      });
    }

    const data = await fetchFromBacen();
    cached = { data, expiresAt: Date.now() + CACHE_TTL_MS };
    return new Response(JSON.stringify(data), {
      headers: {
        ...CORS_HEADERS,
        'content-type': 'application/json',
        'cache-control': 'public, max-age=43200',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: (err as Error).message,
        source: SERIES_LABEL,
      }),
      {
        status: 502,
        headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
      },
    );
  }
});
