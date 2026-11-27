// AI anyagjavaslat – Cloudflare Worker (köztes szerver).
//
// Ezt a fájlt kell bemásolni a Cloudflare-ben a Worker szerkesztőjébe (Workers & Pages → a worker → Edit code).
// A titkok a Worker beállításai között vannak (Settings → Variables and Secrets), NEM ebben a fájlban:
//   ANTHROPIC_API_KEY  – az Anthropic API-kulcs (Secret)
//   APP_JELSZO         – saját jelszó, ugyanezt kell beírni az appban (Secret)
//   ENGEDETT_OLDAL     – (nem kötelező) az app címe, alapból https://hmarci99-star.github.io
//
// A Worker csak az engedett oldalról és a helyes jelszóval fogad kérést, és csak a két engedett
// modellt hívja. A kulcs soha nem kerül ki a böngészőbe.
//
// A Cloudflare szerkesztőjében nincs csomagkezelő, ezért itt közvetlen HTTP-hívás megy az
// Anthropic Messages API-ra (az SDK-t nem lehet ide betenni).

const MODELLEK = ['claude-opus-5-5', 'claude-sonnet-5-5'];
const ALAP_MODELL = 'claude-opus-5-5';
const MAX_KERES = 200_000; // bájt

const RENDSZER = `Magyar víz-, gáz- és fűtésszerelő vállalkozó árajánlat-készítő alkalmazásában dolgozol.
A feladatod: a munka leírása, a megadott kiállások / szerelvények / munkák és a már meglévő anyaglista alapján
javasolni, milyen anyag HIÁNYZIK még a listáról, vagy miből kevés.

Szabályok:
- Csak a hiányzó vagy kevés tételeket add vissza. Amit a lista már tartalmaz megfelelő mennyiségben, azt ne.
- Ha egy tétel szerepel az "Ismert tételnevek" között, PONTOSAN azt a nevet és egységet használd (különben
  a lista kétszer számolná). Ha a listán már van, de kevés, a hiányzó mennyiséget add meg (nem az összeset).
- Új tételnél a magyar szakmai, kereskedelmi megnevezést használd méretekkel (pl. "Rehau PX 20 könyök"),
  a meglévő tételek stílusában és márkáival, ha van rá minta.
- Reális, rendelhető mennyiségek és egységek (db, fm, pár, csomag, szett, kg, tekercs).
- Az indok legyen rövid (egy mondat), szakmai: miért kell.
- Ne javasolj szerszámot, munkadíjat, szolgáltatást; csak beépülő anyagot és szerelési segédanyagot.
- Ha bizonytalan vagy (pl. a leírásból nem derül ki a méret), írd bele az indokba.
- A "megjegyzes" mezőbe 1-3 rövid mondatban írd az általános észrevételt (vagy hagyd üresen).
- Ha minden rendben van, üres listát adj.`;

const SEMA = {
  type: 'object',
  properties: {
    javaslatok: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          cikk: { type: 'string' },
          mennyiseg: { type: 'number' },
          egyseg: { type: 'string' },
          indok: { type: 'string' },
          ismert: { type: 'boolean', description: 'igaz, ha a név az ismert tételnevek egyike' },
        },
        required: ['cikk', 'mennyiseg', 'egyseg', 'indok', 'ismert'],
        additionalProperties: false,
      },
    },
    megjegyzes: { type: 'string' },
  },
  required: ['javaslatok', 'megjegyzes'],
  additionalProperties: false,
};

const felsorol = (sorok) => (sorok?.length ? sorok.map((s) => `- ${s}`).join('\n') : '(nincs)');

function uzenetSzoveg(k) {
  const lista = (k.anyaglista ?? []).map((s) => `${s.cikk} – ${s.mennyiseg} ${s.egyseg}`);
  const ismert = (k.ismertNevek ?? []).map((s) => `${s.cikk} [${s.egyseg}]`);
  return `A munka leírása (a szerelő szavaival):
${String(k.leiras ?? '').trim() || '(nincs leírás)'}

Megadott kiállások, szerelvények, munkák (mennyiséggel):
${felsorol(k.projekt)}

A mostani anyaglista:
${felsorol(lista)}

Ismert tételnevek (ezeket használd pontosan, ha illik):
${felsorol(ismert)}`;
}

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
    if (nyers.length > MAX_KERES) return valasz({ hiba: 'Túl nagy kérés.' }, 413, origin);
    let k;
    try { k = JSON.parse(nyers); } catch { return valasz({ hiba: 'Hibás kérés.' }, 400, origin); }
    if (!egyezik(k.jelszo ?? '', env.APP_JELSZO)) return valasz({ hiba: 'Hibás jelszó.' }, 401, origin);

    const modell = MODELLEK.includes(k.modell) ? k.modell : ALAP_MODELL;
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
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: SEMA } },
        system: RENDSZER,
        messages: [{ role: 'user', content: uzenetSzoveg(k) }],
      }),
    });
    const adat = await api.json().catch(() => null);
    if (!api.ok) {
      const ok = adat?.error?.message || `HTTP ${api.status}`;
      return valasz({ hiba: `Az AI szolgáltatás hibát adott: ${ok}` }, 502, origin);
    }
    if (adat.stop_reason === 'refusal') return valasz({ hiba: 'Az AI ezt a kérést nem válaszolta meg.' }, 502, origin);
    if (adat.stop_reason === 'max_tokens') return valasz({ hiba: 'A válasz túl hosszú lett, próbáld rövidebb leírással.' }, 502, origin);
    const szoveg = (adat.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    let eredmeny;
    try { eredmeny = JSON.parse(szoveg); } catch { return valasz({ hiba: 'Az AI válasza nem értelmezhető.' }, 502, origin); }
    return valasz({ ...eredmeny, modell: adat.model, tokenek: adat.usage }, 200, origin);
  },
};
