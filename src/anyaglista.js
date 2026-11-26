// Anyaglista összegyűjtése a kiállás-könyvtárból és a gerincből.
// Árakat nem kezel, csak cikket és mennyiséget.

import { parseCsv } from './csv.js';
import { KIALLAS_TIPUSOK } from './munkadij.js';

function tizedes(s) {
  return Number(String(s).trim().replace(',', '.'));
}

// Kiállás neve -> [{ cikk, mennyiseg, egyseg }]
export function parseKonyvtar(text) {
  const [, ...rows] = parseCsv(text.replace(/^﻿/, ''));
  const konyvtar = new Map();
  for (const [kiallas, cikk, menny, egyseg] of rows) {
    const mennyiseg = tizedes(menny);
    if (!kiallas || !cikk || !Number.isFinite(mennyiseg)) {
      throw new Error(`Hibás sor a kiállás-könyvtárban: ${[kiallas, cikk, menny].join(', ')}`);
    }
    if (!konyvtar.has(kiallas)) konyvtar.set(kiallas, []);
    konyvtar.get(kiallas).push({ cikk, mennyiseg, egyseg });
  }
  return konyvtar;
}

// Gerinc: csőátmérő -> cső és hozzá tartozó csőhéj (a könyvtár párosítása szerint).
// A gerinc idomai (PX 25 T-idomok, falikorongok) még nincsenek szabályba öntve.
export const GERINC = {
  16: { cso: 'Rehau Rautitan Stabil cső 16,2x2,6 mm', csohej: 'Kaiflex csőhéj 4x18 mm' },
  20: { cso: 'Rehau Rautitan Stabil cső 20x2,9 mm', csohej: 'Kaiflex csőhéj 4x22 mm' },
};

// A gerinc alapanyaga 1 fm-re: a cső és a hozzá illő csőhéj.
export function gerincAlapAnyag(atmero) {
  const g = GERINC[atmero];
  return g ? [{ cikk: g.cso, mennyiseg: 1, egyseg: 'fm' }, { cikk: g.csohej, mennyiseg: 1, egyseg: 'fm' }] : [];
}

// Hüvelyszabály: idomonként hány toldóhüvely kell, átmérő szerint.
// T-idom 3, falikorong 1, könyök 2, toldóidom 2. Egy 20-16-20 T-idomhoz
// két 20-as és egy 16-os hüvely tartozik.
export function idomHuvelyei(cikk) {
  let m;
  if ((m = cikk.match(/PX ([\d-]+) T-idom/))) {
    const d = m[1].split('-').map(Number);
    return d.length === 3 ? d : [d[0], d[0], d[0]];
  }
  if ((m = cikk.match(/(\d+)-(?:os|as|es) falikorong/))) return [Number(m[1])];
  if ((m = cikk.match(/PX (\d+)(?:-(\d+))? (?:könyök|toldóidom)/))) {
    const a = Number(m[1]);
    return [a, m[2] ? Number(m[2]) : a];
  }
  return [];
}

function huvelyAtmero(cikk) {
  const m = cikk.match(/PX (\d+) toldóhüvely/);
  return m ? Number(m[1]) : null;
}

// Összeveti a sorokban szereplő hüvelyeket a szabály szerint szükségessel.
// Eredmény: [{ atmero, szukseges, megadott }] az eltérésekre.
export function huvelyEltetesek(sorok) {
  const szukseges = new Map();
  const megadott = new Map();
  const novel = (map, k, n) => map.set(k, (map.get(k) ?? 0) + n);
  for (const s of sorok) {
    for (const d of idomHuvelyei(s.cikk)) novel(szukseges, d, s.mennyiseg);
    const h = huvelyAtmero(s.cikk);
    if (h) novel(megadott, h, s.mennyiseg);
  }
  const atmerok = new Set([...szukseges.keys(), ...megadott.keys()]);
  return [...atmerok]
    .map((atmero) => ({ atmero, szukseges: szukseges.get(atmero) ?? 0, megadott: megadott.get(atmero) ?? 0 }))
    .filter((e) => e.szukseges !== e.megadott)
    .sort((a, b) => a.atmero - b.atmero);
}

// projekt.kiallasok: { kod: darab }, projekt.gerinc: { 16: fm, 20: fm },
// projekt.felulirasok: { kiallasNev: [sorok] } – a könyvtári csomag helyett.
// sajatMunkak: [{ kod, tetel, anyag: [{ cikk, mennyiseg, egyseg }] }] – az egyéb munkákhoz rendelt anyag.
// gerincAnyag: { 16: [sorok 1 fm-re], 20: [...] } – a felületen módosított gerinc-anyag (alapból cső + csőhéj).
// sajatKiallasok: [{ kod, nev }] – a felületen felvett kiállástípusok (csomagjuk a könyvtárban, a nevükön).
export function gyujtAnyaglista(projekt, konyvtar, sajatMunkak = [], gerincAnyag = {}, sajatKiallasok = []) {
  const tetelek = new Map();
  const figyelmeztetesek = [];
  const hozzaad = (s, szorzo) => {
    const kulcs = `${s.cikk}|${s.egyseg}`;
    const t = tetelek.get(kulcs) ?? { cikk: s.cikk, egyseg: s.egyseg, mennyiseg: 0 };
    t.mennyiseg += s.mennyiseg * szorzo;
    tetelek.set(kulcs, t);
  };

  for (const { kod, nev } of [...KIALLAS_TIPUSOK, ...sajatKiallasok]) {
    const darab = Number(projekt.kiallasok?.[kod]) || 0;
    if (darab <= 0) continue;
    const csomag = projekt.felulirasok?.[nev] ?? konyvtar.get(nev);
    if (!csomag) {
      figyelmeztetesek.push(`Nincs anyagcsomag a kiálláshoz: ${nev}`);
      continue;
    }
    for (const e of huvelyEltetesek(csomag)) {
      figyelmeztetesek.push(
        `${nev}: a hüvelyszabály szerint ${e.szukseges} db ${e.atmero}-as toldóhüvely kellene, a csomagban ${e.megadott} van.`,
      );
    }
    for (const s of csomag) hozzaad(s, darab);
  }

  for (const m of sajatMunkak) {
    const db = Number(projekt.egyeb?.[m.kod]) || 0;
    if (db <= 0) continue;
    for (const a of m.anyag ?? []) {
      if (a?.cikk && Number(a.mennyiseg) > 0) hozzaad({ cikk: a.cikk, egyseg: a.egyseg || 'db', mennyiseg: Number(a.mennyiseg) }, db);
    }
  }

  for (const [atmero, { cso, csohej }] of Object.entries(GERINC)) {
    const fm = Number(projekt.gerinc?.[atmero]) || 0;
    if (fm <= 0) continue;
    const sorok = gerincAnyag?.[atmero] ?? gerincAlapAnyag(atmero);
    for (const a of sorok) hozzaad({ cikk: a.cikk, egyseg: a.egyseg || 'fm', mennyiseg: Number(a.mennyiseg) || 0 }, fm);
  }

  const sorok = [...tetelek.values()].map((t) => ({ ...t, mennyiseg: Math.round(t.mennyiseg * 100) / 100 }));
  return { sorok, figyelmeztetesek };
}

// E-mailbe másolható szöveg a boltnak.
// Számozott sorok, köztük üres sorral, hogy levélben is jól olvasható legyen.
export function anyaglistaSzoveg(sorok) {
  return sorok
    .map((s, i) => `${i + 1}. ${s.cikk} – ${String(s.mennyiseg).replace('.', ',')} ${s.egyseg}`)
    .join('\n\n');
}
