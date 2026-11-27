// AI köztes szerver – Cloudflare Worker (2. változat).
//
// Ezt a fájlt kell bemásolni a Cloudflare-ben a Worker szerkesztőjébe (Workers & Pages → a worker → Edit code → Deploy).
// A titkok a Worker beállításai között vannak (Settings → Variables and Secrets), NEM ebben a fájlban:
//   ANTHROPIC_API_KEY  – az Anthropic API-kulcs (Secret)
//   APP_JELSZO         – saját jelszó, ugyanezt kell beírni az appban (Secret)
//   ENGEDETT_OLDAL     – (nem kötelező) az app címe, alapból https://hmarci99-star.github.io
//
// A Worker csak az engedett oldalról és a helyes jelszóval fogad kérést, csak a két engedett modellt hívja,
// és korlátozza a kérés méretét és a képek számát. A kulcs soha nem kerül ki a böngészőbe.
// A szakmai utasításokat (mit kérdezzen az AI) az app küldi, így azok finomításához ezt a fájlt nem kell cserélni.
//
// A Cloudflare szerkesztőjében nincs csomagkezelő, ezért itt közvetlen HTTP-hívás megy az
// Anthropic Messages API-ra (az SDK-t nem lehet ide betenni).

const VERZIO = 2;
const MODELLEK = ['claude-opus-5-5', 'claude-sonnet-5-5'];
const ALAP_MODELL = 'claude-opus-5-5';
const EROFESZITES = ['low', 'medium', 'high'];
const KEPTIPUSOK = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_KERES = 12_000_000; // bájt (képekkel együtt)
const MAX_KEP = 6;

const corsFejlec = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
});

function valasz(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsFejlec(origin) },
  });
}

// Időzítés-független összehasonlítás a jelszóhoz.
function egyezik(a, b) {
  const x = new TextEncoder().encode(String(a));
  const y = new TextEncoder().encode(String(b));
  let kulonbseg = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) kulonbseg |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return kulonbseg === 0;
}

export default {
  async fetch(request, env) {
    const engedett = (env.ENGEDETT_OLDAL || 'https://hmarci99-star.github.io').replace(/\/$/, '');
    const origin = request.headers.get('Origin') || '';
    if (origin !== engedett) return new Response('Nem engedélyezett.', { status: 403 });
    // Előkérés (a böngésző küldés előtt engedélyt kér): törzs nélküli 204-es válasz.
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsFejlec(origin) });
    if (request.method !== 'POST') return valasz({ hiba: 'Csak POST.' }, 405, origin);
    if (!env.ANTHROPIC_API_KEY || !env.APP_JELSZO) {
      return valasz({ hiba: 'A Workerben nincs beállítva az ANTHROPIC_API_KEY vagy az APP_JELSZO.' }, 500, origin);
    }
    const nyers = await request.text();
    if (nyers.length > MAX_KERES) return valasz({ hiba: 'Túl nagy kérés (túl sok vagy túl nagy kép).' }, 413, origin);
    let k;
    try { k = JSON.parse(nyers); } catch { return valasz({ hiba: 'Hibás kérés.' }, 400, origin); }
    if (!egyezik(k.jelszo ?? '', env.APP_JELSZO)) return valasz({ hiba: 'Hibás jelszó.' }, 401, origin);
    if (typeof k.rendszer !== 'string' || typeof k.uzenet !== 'string' || !k.sema || typeof k.sema !== 'object') {
      return valasz({ hiba: 'Ehhez a Workerhez frissebb app kell (rendszer, uzenet, sema hiányzik).', verzio: VERZIO }, 400, origin);
    }
    const kepek = Array.isArray(k.kepek) ? k.kepek : [];
    if (kepek.length > MAX_KEP) return valasz({ hiba: `Legfeljebb ${MAX_KEP} kép küldhető egyszerre.` }, 400, origin);
    for (const kep of kepek) {
      if (!KEPTIPUSOK.includes(kep?.media_type) || typeof kep?.data !== 'string') return valasz({ hiba: 'Ismeretlen képformátum.' }, 400, origin);
    }

    const modell = MODELLEK.includes(k.modell) ? k.modell : ALAP_MODELL;
    const tartalom = [
      ...kepek.map((kep) => ({ type: 'image', source: { type: 'base64', media_type: kep.media_type, data: kep.data } })),
      { type: 'text', text: k.uzenet },
    ];
    const api = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2026-10-21',
        // Ha a modell biztonsági okból elutasítaná, a szerver ugyanazon a hívásban egy másik modellel próbálja.
        'anthropic-beta': 'server-side-fallback-2026-07-01',
      },
      body: JSON.stringify({
        model: modell,
        max_tokens: 16000,
        fallbacks: 'default',
        output_config: {
          effort: EROFESZITES.includes(k.erofeszites) ? k.erofeszites : 'medium',
          format: { type: 'json_schema', schema: k.sema },
        },
        system: k.rendszer,
        messages: [{ role: 'user', content: tartalom }],
      }),
    });
    const adat = await api.json().catch(() => null);
    if (!api.ok) {
      const ok = adat?.error?.message || `HTTP ${api.status}`;
      return valasz({ hiba: `Az AI szolgáltatás hibát adott: ${ok}` }, 502, origin);
    }
    if (adat.stop_reason === 'refusal') return valasz({ hiba: 'Az AI ezt a kérést nem válaszolta meg.' }, 502, origin);
    if (adat.stop_reason === 'max_tokens') return valasz({ hiba: 'A válasz túl hosszú lett, próbáld kevesebb adattal.' }, 502, origin);
    const szoveg = (adat.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    let eredmeny;
    try { eredmeny = JSON.parse(szoveg); } catch { return valasz({ hiba: 'Az AI válasza nem értelmezhető.' }, 502, origin); }
    return valasz({ eredmeny, modell: adat.model, tokenek: adat.usage, verzio: VERZIO }, 200, origin);
  },
};
