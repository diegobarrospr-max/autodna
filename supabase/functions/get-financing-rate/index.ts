// AutoDNA — get-financing-rate Edge Function
// Busca a taxa média de juros do mercado para CDC veículos PF a partir da
// série SGS do Bacen (série 20712). Faz cache em memória por 12 horas
// para reduzir hits e custo de cold-start.
//
// API:
//   GET /functions/v1/get-financing-rate
// Response:
//   { annual_rate: number, monthly_rate: number, source: string, as_of: string }
//
// Sem segredos necessários — a API do Bacen é pública.

const BACEN_URL =
  'https://api.bcb.gov.br/dados/serie/bcdata.sgs.20712/dados/ultimos/1?formato=json';
const SERIES_LABEL = 'BACEN SGS 20712 (CDC aquisição de veículos - PF)';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h

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
  const annualPct = Number(row.valor);
  if (!Number.isFinite(annualPct) || annualPct <= 0) {
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

Deno.serve(async (_req) => {
  try {
    if (cached && cached.expiresAt > Date.now()) {
      return new Response(JSON.stringify(cached.data), {
        headers: {
          'content-type': 'application/json',
          'cache-control': 'public, max-age=43200',
        },
      });
    }

    const data = await fetchFromBacen();
    cached = { data, expiresAt: Date.now() + CACHE_TTL_MS };
    return new Response(JSON.stringify(data), {
      headers: {
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
        headers: { 'content-type': 'application/json' },
      },
    );
  }
});
