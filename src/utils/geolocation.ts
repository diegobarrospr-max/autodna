// AutoDNA — utilitário de geolocalização + reverse geocoding
// Web: navigator.geolocation + Nominatim (OSM) pra converter lat/long em
// cidade/UF. Sem chave de API. Rate limit Nominatim: 1 req/seg.

const STATE_TO_UF: Record<string, string> = {
  'Acre': 'AC',
  'Alagoas': 'AL',
  'Amapá': 'AP',
  'Amazonas': 'AM',
  'Bahia': 'BA',
  'Ceará': 'CE',
  'Distrito Federal': 'DF',
  'Espírito Santo': 'ES',
  'Goiás': 'GO',
  'Maranhão': 'MA',
  'Mato Grosso': 'MT',
  'Mato Grosso do Sul': 'MS',
  'Minas Gerais': 'MG',
  'Pará': 'PA',
  'Paraíba': 'PB',
  'Paraná': 'PR',
  'Pernambuco': 'PE',
  'Piauí': 'PI',
  'Rio de Janeiro': 'RJ',
  'Rio Grande do Norte': 'RN',
  'Rio Grande do Sul': 'RS',
  'Rondônia': 'RO',
  'Roraima': 'RR',
  'Santa Catarina': 'SC',
  'São Paulo': 'SP',
  'Sergipe': 'SE',
  'Tocantins': 'TO',
};

interface NominatimResponse {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    suburb?: string;
    state?: string;
    state_code?: string;
    country_code?: string;
  };
}

export interface DetectedLocation {
  city: string;
  state: string; // UF (2 letras)
}

function getBrowserPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocalização não suportada neste dispositivo'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 60_000,
    });
  });
}

async function reverseGeocode(lat: number, lon: number): Promise<DetectedLocation | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&accept-language=pt-BR`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`Nominatim retornou ${res.status}`);
  const data = (await res.json()) as NominatimResponse;

  const addr = data.address ?? {};
  const city = addr.city ?? addr.town ?? addr.municipality ?? addr.village ?? addr.suburb ?? null;
  const stateName = addr.state ?? null;
  if (!city || !stateName) return null;

  const uf = STATE_TO_UF[stateName] ?? null;
  if (!uf) return null;

  return { city, state: uf };
}

export async function detectLocation(): Promise<DetectedLocation> {
  const pos = await getBrowserPosition();
  const located = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
  if (!located) {
    throw new Error('Não conseguimos identificar sua cidade a partir da localização');
  }
  return located;
}
