// Hangos árajánlat: a kérdések sora és a kimondott válaszok értelmezése.
// A felület és a beszéd (felolvasás, hangfelismerés) a hangosfelulet.js-ben van;
// ez a modul tiszta logika, ezért tesztelhető.

import { szamszo, diktaltTetelek } from './diktalas.js';

const kisbetu = (s) => String(s ?? '').toLocaleLowerCase('hu').normalize('NFC');
const szavak = (s) => kisbetu(s).replace(/[.,;:!?„”"]/g, ' ').split(/\s+/).filter(Boolean);
const van = (s, ...minta) => minta.some((m) => new RegExp(`(^|\\s)${m}`, 'i').test(kisbetu(s)));

// ---- Válaszok ----

// Bármikor kimondható parancsok. Szabad szöveges kérdésnél (pl. név) csak akkor
// számít parancsnak, ha a válasz maga a parancs; máshol elég, ha benne van.
const PARANCSOK = {
  vissza: ['vissza', 'előző', 'az előző', 'menjünk vissza'],
  kihagy: ['kihagy', 'kihagyás', 'hagyd ki', 'ugorj', 'ugrás', 'tovább', 'következő', 'nem tudom', 'később'],
  ismet: ['ismételd', 'ismételd meg', 'még egyszer', 'mit kérdeztél', 'mi volt a kérdés', 'nem értettem', 'tessék'],
  stop: ['állj', 'álljunk meg', 'vége', 'befejezés', 'befejez', 'fejezzük be', 'kilépés', 'leállítás', 'stop'],
  osszeg: ['összeg', 'összegzés', 'végösszeg', 'mennyi a végösszeg', 'mennyi lesz', 'hol tartunk', 'mennyi az ára'],
};

export function parancs(szoveg, csakTeljes = false) {
  const t = szavak(szoveg).join(' ');
  if (!t) return null;
  for (const [nev, kifejezesek] of Object.entries(PARANCSOK)) {
    for (const k of kifejezesek) {
      if (t === k) return nev;
      if (!csakTeljes && ` ${t} `.includes(` ${k} `)) return nev;
    }
  }
  return null;
}

const NULLA = /(^|\s)(nincs|nem lesz|nem kell|egy sem|egyet sem|semmi|nulla|zéró|egyik sem)(\s|$)/;
const ELFOGAD = /(^|\s)(jó|igen|oké|ok|rendben|maradhat|marad|stimmel|ugyanannyi|annyi|pontosan|persze)(\s|$)/;

// Az első szám a szövegben ("két és fél" -> 2.5, "fél" -> 0.5), vagy null.
export function szamKeres(szoveg) {
  const w = szavak(szoveg);
  for (let i = 0; i < w.length; i++) {
    const a = szamszo(w[i]);
    if (a === null) continue;
    if (w[i + 1] === 'és' && w[i + 2] === 'fél') return a + 0.5;
    return a;
  }
  return null;
}

export function igenNem(szoveg) {
  const t = szavak(szoveg).join(' ');
  if (/(^|\s)(nem|nincs|ne|semmiképp|felesleges|nem kell)(\s|$)/.test(t)) return false;
  if (/(^|\s)(igen|ja|aha|persze|kell|lesz|van|oké|ok|jó|rendben|természetesen|naná|legyen)(\s|$)/.test(t)) return true;
  return null;
}

// Egy kérdésre adott válasz értelmezése.
// Eredmény: { parancs } | { ertek } | { ismeretlen: true }
export function valaszErtelmez(szoveg, kerdes, alap = null) {
  const p = parancs(szoveg, kerdes.tipus === 'szabad');
  if (p) return { parancs: p };
  const t = szavak(szoveg).join(' ');
  switch (kerdes.tipus) {
    case 'szam': {
      if (NULLA.test(t) || /^nem$/.test(t)) return { ertek: 0 };
      const n = szamKeres(szoveg);
      if (n !== null) return { ertek: n };
      if (alap !== null && ELFOGAD.test(t)) return { ertek: alap };
      return { ismeretlen: true };
    }
    case 'igennem': {
      const v = igenNem(szoveg);
      return v === null ? { ismeretlen: true } : { ertek: v };
    }
    case 'valasztas': {
      for (const o of kerdes.opciok) if (o.szavak.some((m) => van(t, m))) return { ertek: o.ertek };
      if (alap !== null && ELFOGAD.test(t)) return { ertek: alap };
      return { ismeretlen: true };
    }
    case 'szabad': {
      const s = String(szoveg).trim().replace(/\s+/g, ' ');
      if (!s) return { ismeretlen: true };
      if (/^(nincs|nem|semmi|hagyjuk)$/i.test(t)) return { ertek: '' };
      return { ertek: s[0].toLocaleUpperCase('hu') + s.slice(1) };
    }
    default:
      return { ismeretlen: true };
  }
}

// ---- Több adat egy mondatban ----

const KULCSSZAVAK = [
  ['kiallasok.wc_tartaly', 'WC-tartály', ['wc', 'vécé', 'toalett', 'tartály']],
  ['kiallasok.kad', 'fürdőkád', ['kád', 'fürdőkád']],
  ['kiallasok.zuhanyzo', 'zuhanyzó', ['zuhany']],
  ['kiallasok.bojler', 'bojler', ['bojler']],
  ['kiallasok.mosogep', 'mosógép', ['mosógép']],
  ['kiallasok.mosdo', 'mosdó', ['mosdó']],
  ['kiallasok.konyha', 'konyha', ['konyha']],
  ['kiallasok.kerti_csap', 'kerti csap', ['kerti']],
  ['radiatorKiallas', 'radiátor', ['radiátor']],
  ['padlofutesKor', 'padlófűtési kör', ['padlófűtés']],
];

// "két WC, egy mosógép, hat radiátor" -> [{ mezo, ertek, cimke }]
// A szám a kulcsszó előtt (legfeljebb egy szóval, pl. "két darab wc") vagy közvetlenül utána áll.
export function tobbAdat(szoveg) {
  const w = szavak(szoveg);
  const talalat = new Map();
  for (let i = 0; i < w.length; i++) {
    const kulcs = KULCSSZAVAK.find(([, , k]) => k.some((m) => w[i].startsWith(m)));
    if (!kulcs) continue;
    let n = null;
    for (const j of [i - 1, i - 2]) {
      if (j >= 0 && szamszo(w[j]) !== null && (j === i - 1 || /^(darab|db|kör|kiállás)/.test(w[i - 1]))) { n = szamszo(w[j]); break; }
    }
    if (n === null && i + 1 < w.length && szamszo(w[i + 1]) !== null) n = szamszo(w[i + 1]);
    if (n === null) continue;
    talalat.set(kulcs[0], { mezo: kulcs[0], ertek: n, cimke: kulcs[1] });
  }
  return [...talalat.values()];
}

// ---- A kérdések sora ----

const KIALLASOK = [
  ['wc_tartaly', 'WC-tartály'], ['kad', 'fürdőkád'], ['zuhanyzo', 'zuhanyzó'], ['bojler', 'bojler'],
  ['mosogep', 'mosógép'], ['hoszivattyu', 'hőszivattyú'], ['mosdo', 'mosdó'], ['konyha', 'konyha'], ['kerti_csap', 'kerti csap'],
];

const db = (p, kod) => Number(p.kiallasok?.[kod]) || 0;
const nincsOpcio = { ertek: 'nincs', szavak: ['nincs', 'nem kell', 'nem lesz', 'egyik sem', 'semmilyen'] };

// Típusválasztás, ami egy szerelvénycsoport egyik tagját állítja be a kiállások számára.
const tipusAlkalmaz = (csoport, kiallas) => (ertek, p) =>
  csoport.map((kod) => [`szerelvenyek.${kod}`, kod === ertek ? db(p, kiallas) : 0]);

// Minden kérdés: { id, szakasz, tipus, mezo?, kerdes(p), alap?(p), feltetel?(p), opciok?, alkalmaz?(ertek, p), kovetkezo?(ertek) }
// p: a projekt aktuális adatai (olvas()), a.adatok: az ajánlat adatai.
export const KERDESEK = [
  ...KIALLASOK.map(([kod, nev]) => ({
    id: `kiallas-${kod}`, szakasz: 'projekt', tipus: 'szam', mezo: `kiallasok.${kod}`,
    kerdes: () => `Hány ${nev} kiállás lesz?`,
  })),
  { id: 'radiator', szakasz: 'projekt', tipus: 'szam', mezo: 'radiatorKiallas', kerdes: () => 'Hány radiátor kiállás lesz?' },
  {
    id: 'radiator-fel', szakasz: 'projekt', tipus: 'szam', mezo: 'radiatorFelszereles',
    feltetel: (p) => p.radiatorKiallas > 0,
    alap: (p) => p.radiatorKiallas,
    kerdes: (p) => `Hány radiátort szerelünk fel? Ha ${p.radiatorKiallas} darabot, mondd: jó.`,
  },
  { id: 'padlo', szakasz: 'projekt', tipus: 'szam', mezo: 'padlofutesKor', kerdes: () => 'Hány padlófűtési kör lesz?' },
  {
    id: 'hotermelo', szakasz: 'projekt', tipus: 'valasztas', mezo: 'hotermelo',
    kerdes: () => 'Milyen hőtermelő lesz: gázkazán, vegyes tüzelésű kazán, hőszivattyú, vagy nincs?',
    opciok: [
      nincsOpcio,
      { ertek: 'hoszivattyu', szavak: ['hőszivattyú', 'hő szivattyú', 'levegő'] },
      { ertek: 'vegyes', szavak: ['vegyes', 'fatüzel', 'fás', 'szilárd', 'kandalló'] },
      { ertek: 'gaz', szavak: ['gáz', 'kondenz', 'cirkó'] },
    ],
  },
  {
    id: 'puffer', szakasz: 'projekt', tipus: 'igennem', mezo: 'puffer',
    feltetel: (p) => p.hotermelo === 'vegyes', kerdes: () => 'Kell puffertartály?',
  },
  {
    id: 'felar-hsz', szakasz: 'projekt', tipus: 'igennem', mezo: 'felarHoszivattyunal',
    feltetel: (p) => p.hotermelo === 'hoszivattyu' && p.radiatorKiallas > 0 && p.padlofutesKor > 0,
    kerdes: () => 'Radiátoros és padlófűtéses kör is van. Hőszivattyúnál is felszámoljuk a felárat?',
  },
  {
    id: 'wc', szakasz: 'projekt', tipus: 'szam', mezo: 'szerelvenyek.wc',
    feltetel: (p) => db(p, 'wc_tartaly') > 0, alap: (p) => db(p, 'wc_tartaly'),
    kerdes: (p) => `Hány WC-t szerelünk fel? Ha ${db(p, 'wc_tartaly')} darabot, mondd: jó.`,
  },
  {
    id: 'mosdo-tipus', szakasz: 'projekt', tipus: 'valasztas', mezo: 'szerelvenyek.mosdo_sima',
    feltetel: (p) => db(p, 'mosdo') > 0,
    kerdes: () => 'Milyen mosdó lesz: sima, bútoros vagy dupla?',
    opciok: [nincsOpcio, { ertek: 'mosdo_dupla', szavak: ['dupla', 'kettős', 'iker'] },
      { ertek: 'mosdo_butoros', szavak: ['bútor', 'szekrény'] }, { ertek: 'mosdo_sima', szavak: ['sima', 'fali', 'falra', 'egyszerű', 'normál'] }],
    alkalmaz: tipusAlkalmaz(['mosdo_sima', 'mosdo_butoros', 'mosdo_dupla'], 'mosdo'),
  },
  {
    id: 'kad-tipus', szakasz: 'projekt', tipus: 'valasztas', mezo: 'szerelvenyek.kad_hagyomanyos',
    feltetel: (p) => db(p, 'kad') > 0,
    kerdes: () => 'Milyen kád lesz: hagyományos, előfalazott, vagy előlapos?',
    opciok: [nincsOpcio, { ertek: 'kad_elolapos', szavak: ['előlap', 'elő lap', 'panel'] },
      { ertek: 'kad_hagyomanyos', szavak: ['hagyományos', 'előfalaz', 'falazott', 'normál', 'sima'] }],
    alkalmaz: tipusAlkalmaz(['kad_hagyomanyos', 'kad_elolapos'], 'kad'),
  },
  {
    id: 'kabin', szakasz: 'projekt', tipus: 'valasztas', mezo: 'szerelvenyek.zuhanykabin_konnyu',
    feltetel: (p) => db(p, 'zuhanyzo') > 0,
    kerdes: () => 'Milyen zuhanykabin lesz: könnyű, közepes, nehéz, vagy nincs kabin?',
    opciok: [nincsOpcio, { ertek: 'zuhanykabin_nehez', szavak: ['nehéz', 'hidromasszázs', 'gőz', 'masszázs'] },
      { ertek: 'zuhanykabin_kozepes', szavak: ['közepes', 'üveg', 'tolóajt'] },
      { ertek: 'zuhanykabin_konnyu', szavak: ['könnyű', 'egyszerű', 'sarok', 'keretes'] }],
    alkalmaz: tipusAlkalmaz(['zuhanykabin_konnyu', 'zuhanykabin_kozepes', 'zuhanykabin_nehez'], 'zuhanyzo'),
  },
  {
    id: 'sullyesztett', szakasz: 'projekt', tipus: 'igennem', mezo: 'szerelvenyek.zuhanycsaptelep_sullyesztett',
    feltetel: (p) => db(p, 'zuhanyzo') > 0,
    kerdes: () => 'Süllyesztett zuhanycsaptelep lesz?',
    alkalmaz: (ertek, p) => [['szerelvenyek.zuhanycsaptelep_sullyesztett', ertek ? db(p, 'zuhanyzo') : 0]],
  },
  {
    id: 'csaptelep', szakasz: 'projekt', tipus: 'szam', mezo: 'szerelvenyek.csaptelep',
    feltetel: (p) => db(p, 'kad') + db(p, 'konyha') + db(p, 'zuhanyzo') > 0,
    alap: (p) => db(p, 'kad') + db(p, 'konyha') + ((p.szerelvenyek?.zuhanycsaptelep_sullyesztett || 0) > 0 ? 0 : db(p, 'zuhanyzo')),
    kerdes: (p, alap) => `Hány fali vagy pultos csaptelepet szerelünk fel, zuhanyhoz, kádhoz, mosogatóhoz? A javaslat ${alap}, ha jó, mondd: jó.`,
  },
  {
    id: 'bojler-tipus', szakasz: 'projekt', tipus: 'valasztas', mezo: 'szerelvenyek.bojler_egyszeru',
    feltetel: (p) => db(p, 'bojler') > 0,
    kerdes: () => 'Milyen bojler lesz: egyszerű villanybojler, vagy fűtésről üzemelt?',
    opciok: [nincsOpcio, { ertek: 'bojler_futesrol', szavak: ['fűtés', 'indirekt', 'cirkuláció', 'kombi'] },
      { ertek: 'bojler_egyszeru', szavak: ['egyszerű', 'villany', 'elektromos', 'sima'] }],
    alkalmaz: tipusAlkalmaz(['bojler_egyszeru', 'bojler_futesrol'], 'bojler'),
  },
  {
    id: 'mosogep-bekotes', szakasz: 'projekt', tipus: 'szam', mezo: 'szerelvenyek.mosogep_bekotes',
    feltetel: (p) => db(p, 'mosogep') + db(p, 'konyha') > 0,
    alap: (p) => db(p, 'mosogep'),
    kerdes: (p, alap) => `Hány mosógép vagy mosogatógép bekötés lesz? A javaslat ${alap}.`,
  },
  { id: 'gerinc16', szakasz: 'projekt', tipus: 'szam', mezo: 'gerinc.16', kerdes: () => 'Hány méter 16-os gerinccső kell?' },
  { id: 'gerinc20', szakasz: 'projekt', tipus: 'szam', mezo: 'gerinc.20', kerdes: () => 'Hány méter 20-as gerinccső kell?' },
  { id: 'kulso-viz', szakasz: 'projekt', tipus: 'szam', mezo: 'kulsoVizFm', kerdes: () => 'Hány méter külső vízbekötés lesz?' },
  { id: 'kulso-szenny', szakasz: 'projekt', tipus: 'szam', mezo: 'kulsoSzennyvizFm', kerdes: () => 'Hány méter külső szennyvízszerelés lesz?' },

  { id: 'plusz-van', szakasz: 'anyag', tipus: 'igennem', kerdes: () => 'Van plusz tétel, amit az anyaglistára fel kell venni?', kovetkezo: (v) => (v ? 'plusz-mondd' : 'ugyfel-nev') },
  { id: 'plusz-mondd', szakasz: 'anyag', tipus: 'szabad', plusz: true, kerdes: () => 'Mondd a tételeket, például: teflonszalag két darab, golyóscsap fél col három darab.', kovetkezo: () => 'plusz-meg' },
  { id: 'plusz-meg', szakasz: 'anyag', tipus: 'igennem', kerdes: () => 'Van még plusz tétel?', kovetkezo: (v) => (v ? 'plusz-mondd' : 'ugyfel-nev') },

  { id: 'ugyfel-nev', szakasz: 'ajanlat', tipus: 'szabad', adat: 'ugyfel.nev', kerdes: () => 'Mi a megrendelő neve?' },
  { id: 'ugyfel-cim', szakasz: 'ajanlat', tipus: 'szabad', adat: 'ugyfel.cim', kerdes: () => 'Mi a megrendelő címe?' },
];

export const kerdesIndex = (id) => KERDESEK.findIndex((k) => k.id === id);

// Az aktuális érték a mezőben (a kérdés "most ennyi van" részéhez és az alapértékhez).
export function mezoErtek(p, mezo) {
  if (!mezo) return null;
  const [a, b] = mezo.split('.');
  return b ? p[a]?.[b] : p[a];
}

// A kérdés alapértéke: a mezőben már szereplő érték, vagy a javaslat.
export function alapErtek(k, p) {
  const most = mezoErtek(p, k.mezo);
  if (k.tipus === 'szam') {
    if (Number(most) > 0) return Number(most);
    return k.alap ? k.alap(p) : null;
  }
  if (k.tipus === 'valasztas' && k.mezo === 'hotermelo') return p.hotermelo !== 'nincs' ? p.hotermelo : null;
  return null;
}

// A kérdés felolvasandó szövege; ha a mezőben már van érték, jelzi.
export function kerdesSzoveg(k, p) {
  const alap = alapErtek(k, p);
  let s = k.kerdes(p, alap);
  const most = mezoErtek(p, k.mezo);
  if (k.tipus === 'szam' && !k.alap && Number(most) > 0) s += ` Most ${most} van; ha marad, mondd: jó.`;
  return s;
}

// A válasz alapján beállítandó mezők: [[mezo, ertek], ...]
export function beallitasok(k, ertek, p) {
  if (k.alkalmaz) return k.alkalmaz(ertek, p);
  if (k.mezo) return [[k.mezo, ertek]];
  return [];
}

// A következő kérdés indexe: az aktuális utáni első, aminek teljesül a feltétele
// és még nem kapott választ egy több adatot tartalmazó mondatból.
export function kovetkezoIndex(i, p, ertek, megvalaszolt = new Set()) {
  const k = KERDESEK[i];
  if (k?.kovetkezo && ertek !== undefined) {
    const j = kerdesIndex(k.kovetkezo(ertek));
    if (j >= 0) return j;
  }
  for (let j = i + 1; j < KERDESEK.length; j++) {
    const kj = KERDESEK[j];
    if (kj.id === 'plusz-mondd' || kj.id === 'plusz-meg') continue; // csak a "plusz-van" ágon
    if (kj.feltetel && !kj.feltetel(p)) continue;
    if (kj.tipus !== 'valasztas' && kj.mezo && p?.rejtett?.includes(kj.mezo)) continue; // a listából eltávolított tétel
    if (kj.mezo && megvalaszolt.has(kj.mezo)) continue;
    return j;
  }
  return -1;
}

export function elozoIndex(i, p) {
  for (let j = i - 1; j >= 0; j--) {
    const kj = KERDESEK[j];
    if (kj.id === 'plusz-mondd' || kj.id === 'plusz-meg') continue;
    if (kj.feltetel && !kj.feltetel(p)) continue;
    if (kj.tipus !== 'valasztas' && kj.mezo && p?.rejtett?.includes(kj.mezo)) continue; // a listából eltávolított tétel
    return j;
  }
  return 0;
}

export { diktaltTetelek };
