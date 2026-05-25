// AutoDNA — fipe-search Edge Function
// Ajuda no mapeamento manual: dado uma marca FIPE e (opcionalmente) um termo
// de busca, lista modelos. Se model_code for fornecido, lista os anos.
// Pública (verify_jwt=false) — só consulta a FIPE pública.
//
// POST /functions/v1/fipe-search
//   { brand_code: "23", query?: "onix premier" }       → modelos filtrados
//   { brand_code: "23", model_code: "8949" }            → anos do modelo
//   { list_brands: true, query?: "chery" }              → marcas filtradas

const PARALLELUM = 'https://parallelum.com.br/fipe/api/v1/carros';

interface FipeBrand { codigo: string; nome: string; }
interface FipeModelsResponse { modelos: { codigo: number | string; nome: string }[]; anos: { codigo: string; nome: string }[]; }
interface FipeYear { codigo: string; nome: string; }

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return (await res.json()) as T;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body: {
    brand_code?: string;
    model_code?: string;
    query?: string;
    list_brands?: boolean;
  };
  try { body = await req.json(); } catch { body = {}; }

  try {
    if (body.list_brands) {
      const brands = await fetchJson<FipeBrand[]>(`${PARALLELUM}/marcas`);
      const q = body.query ? normalize(body.query) : null;
      const filtered = q
        ? brands.filter((b) => normalize(b.nome).includes(q))
        : brands;
      return new Response(JSON.stringify({ brands: filtered }), {
        headers: { 'content-type': 'application/json' },
      });
    }

    if (!body.brand_code) {
      return new Response('Missing brand_code', { status: 400 });
    }

    if (body.model_code) {
      const years = await fetchJson<FipeYear[]>(
        `${PARALLELUM}/marcas/${body.brand_code}/modelos/${body.model_code}/anos`,
      );
      return new Response(JSON.stringify({ years }), {
        headers: { 'content-type': 'application/json' },
      });
    }

    const resp = await fetchJson<FipeModelsResponse>(
      `${PARALLELUM}/marcas/${body.brand_code}/modelos`,
    );
    const models = resp.modelos ?? [];
    const q = body.query ? normalize(body.query).split(' ').filter(Boolean) : null;
    const filtered = q
      ? models.filter((m) => {
          const n = normalize(m.nome);
          return q.every((token) => n.includes(token));
        })
      : models;
    return new Response(JSON.stringify({ models: filtered.slice(0, 50) }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 502, headers: { 'content-type': 'application/json' } },
    );
  }
});
