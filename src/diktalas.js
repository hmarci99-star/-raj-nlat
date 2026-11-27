// Diktálás a plusz tételekhez: a böngésző beszédfelismerője (Web Speech API)
// és a diktált mondat értelmezése tételekre (megnevezés, mennyiség, egység).

const SZAMNEVEK = {
  nulla: 0, egy: 1, kettő: 2, két: 2, három: 3, négy: 4, öt: 5, hat: 6, hét: 7, nyolc: 8, kilenc: 9,
  tíz: 10, húsz: 20, harminc: 30, negyven: 40, ötven: 50, hatvan: 60, hetven: 70, nyolcvan: 80, kilencven: 90,
  száz: 100, fél: 0.5, másfél: 1.5,
};
const TIZESEK = { tizen: 10, huszon: 20, harminc: 30, negyven: 40, ötven: 50, hatvan: 60, hetven: 70, nyolcvan: 80, kilencven: 90 };
const EGYESEK = { egy: 1, kettő: 2, két: 2, három: 3, négy: 4, öt: 5, hat: 6, hét: 7, nyolc: 8, kilenc: 9 };

// "három" -> 3, "tizenkettő" -> 12, "huszonöt" -> 25, "2,5" -> 2.5; egyébként null.
export function szamszo(szo) {
  const s = szo.toLowerCase();
  if (/^\d+([.,]\d+)?$/.test(s)) return Number(s.replace(',', '.'));
  if (s in SZAMNEVEK) return SZAMNEVEK[s];
  for (const [elo, ertek] of Object.entries(TIZESEK)) {
    if (s.startsWith(elo) && s.slice(elo.length) in EGYESEK) return ertek + EGYESEK[s.slice(elo.length)];
  }
  return null;
}

const EGYSEG_SZAVAK = {
  db: 'db', darab: 'db', darabot: 'db',
  m: 'fm', méter: 'fm', métert: 'fm', fm: 'fm', folyóméter: 'fm', folyómétert: 'fm',
  pár: 'pár', párat: 'pár',
  csomag: 'csomag', csomagot: 'csomag', szett: 'szett', szettet: 'szett',
  kg: 'kg', kiló: 'kg', kilót: 'kg', kilogramm: 'kg',
  tekercs: 'tekercs', tekercset: 'tekercs', doboz: 'doboz', dobozt: 'doboz',
};
const egysegSzo = (szo) => EGYSEG_SZAVAK[szo?.toLowerCase()] ?? null;

const kerek = (x) => Math.round(x * 100) / 100;

// A diktált szövegben a csőméret szavai: "fél col" -> "1/2 col".
function colMeretek(s) {
  return s
    .replace(/\bháromnegyed(?:es)?\s+col(?:os)?/gi, '3/4 col')
    .replace(/(^|\s)fél\s+col(?:os)?/gi, '$11/2 col')
    .replace(/(^|\s)(?:egy|egész)\s+col(?:os)?/gi, '$11 col');
}

// Egy tétel szövegéből: mennyiség és egység a végén ("… három darab") vagy az
// elején ("két méter …"), különben a végén álló szám, különben 1 db.
function tetelbol(resz) {
  const szavak = resz.split(/\s+/).map((w) => w.replace(/[.,;:!?]+$/, '')).filter(Boolean);
  // "két és fél méter" -> 2,5 méter
  for (let i = 0; i + 2 < szavak.length; i++) {
    const a = szamszo(szavak[i]);
    if (a !== null && a >= 1 && szavak[i + 1].toLowerCase() === 'és' && szavak[i + 2].toLowerCase() === 'fél') {
      szavak.splice(i, 3, String(a + 0.5));
    }
  }
  let mennyiseg = null;
  let egyseg = null;
  let nev = szavak;
  const n = szavak.length;
  if (n >= 2 && egysegSzo(szavak[n - 1]) && szamszo(szavak[n - 2]) !== null) {
    mennyiseg = szamszo(szavak[n - 2]);
    egyseg = egysegSzo(szavak[n - 1]);
    nev = szavak.slice(0, n - 2);
  } else if (n >= 3 && szamszo(szavak[0]) !== null && egysegSzo(szavak[1])) {
    mennyiseg = szamszo(szavak[0]);
    egyseg = egysegSzo(szavak[1]);
    nev = szavak.slice(2);
  } else if (n >= 2 && szamszo(szavak[n - 1]) !== null && !/col$/i.test(szavak[n - 1])) {
    mennyiseg = szamszo(szavak[n - 1]);
    nev = szavak.slice(0, n - 1);
  } else if (n >= 2 && szamszo(szavak[0]) !== null && szavak[0].toLowerCase() !== 'fél') {
    mennyiseg = szamszo(szavak[0]);
    nev = szavak.slice(1);
  }
  let cikk = nev.join(' ').replace(/^(?:a|az|és|meg)\s+/i, '').replace(/[.,;:]+$/, '').trim();
  if (!cikk || /^(?:és|meg|aztán|következő|tétel|a|az)$/i.test(cikk)) return null;
  cikk = cikk[0].toLocaleUpperCase('hu') + cikk.slice(1);
  return { cikk, mennyiseg: kerek(mennyiseg && mennyiseg > 0 ? mennyiseg : 1), egyseg: egyseg ?? 'db' };
}

// A teljes diktált szövegből tételek listája. Elválasztó: vessző, pontosvessző,
// pont, vagy az "és", "meg", "aztán", "következő" szó (a "két és fél" kivételével).
export function diktaltTetelek(szoveg) {
  const s = colMeretek(String(szoveg).replace(/\s+/g, ' ').trim())
    .replace(/(\S+) és fél\b/gi, (m, elotte) => (szamszo(elotte) !== null ? `${elotte}§fél` : m));
  return s
    .split(/\s*[,;]\s*|\.\s+|\s+(?:és|meg|aztán|következő(?:\s+tétel)?)\s+/i)
    .map((r) => r.replace(/§/g, ' és ').trim())
    .filter(Boolean)
    .map(tetelbol)
    .filter(Boolean);
}

// ---- Böngésző: beszédfelismerés ----

export function vanDiktalas() {
  return typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

// Egy menetnyi diktálás. Visszaad egy leállító függvényt.
// esemenyek: { kozben(szoveg), kesz(szoveg), hiba(uzenet), vege() }
// folyamatos: hosszabb, szünetekkel tagolt szöveghez (nem áll le az első szünetnél; a Leállítás gomb zárja le).
export function diktalas(esemenyek, { folyamatos = false } = {}) {
  const Felismero = window.SpeechRecognition || window.webkitSpeechRecognition;
  const f = new Felismero();
  f.lang = 'hu-HU';
  f.interimResults = true;
  f.continuous = folyamatos;
  f.maxAlternatives = 1;
  let vegleges = '';
  f.onresult = (ev) => {
    let kozbenso = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const r = ev.results[i];
      if (r.isFinal) vegleges += `${r[0].transcript} `;
      else kozbenso += r[0].transcript;
    }
    esemenyek.kozben?.((vegleges + kozbenso).trim());
  };
  f.onerror = (ev) => {
    const uzenetek = {
      'not-allowed': 'A mikrofon használata nincs engedélyezve. Engedélyezd a böngésző beállításaiban.',
      'service-not-allowed': 'A beszédfelismerés nincs engedélyezve ezen az eszközön (iPhone-on: Beállítások → Siri).',
      'no-speech': 'Nem hallottam semmit. Próbáld újra, és beszélj közelebb a telefonhoz.',
      'audio-capture': 'Nem érem el a mikrofont.',
      network: 'A beszédfelismeréshez internetkapcsolat kell.',
      aborted: '',
    };
    const u = uzenetek[ev.error] ?? `A diktálás nem sikerült (${ev.error}).`;
    if (u) esemenyek.hiba?.(u);
  };
  f.onend = () => {
    if (vegleges.trim()) esemenyek.kesz?.(vegleges.trim());
    esemenyek.vege?.();
  };
  f.start();
  return () => f.stop();
}
