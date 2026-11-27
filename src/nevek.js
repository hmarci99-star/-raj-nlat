// Hasonló tételnevek keresése, hogy ugyanaz a tétel ne kerüljön kétféle néven a listára
// ("20-as Rehau cső" ≈ "Rehau Rautitan Stabil cső 20x2,9 mm").
// A számoknak (méretek) mind egyezniük kell; a szavaknál elég a többség, a sorrend mindegy,
// és a ragozott / rövidített alak is egyezik ("csövet" ≈ "cső", "Rehau" ≈ "rehau").

const ekezetNelkul = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const TOLTELEK = new Set(['as', 'os', 'es', 'ös', 'mm', 'col', 'db', 'fm', 'cm', 'm', 'a', 'az', 'es', 'és']);

// Méretek: "20-as" -> 20, "20x2,9" -> 20 és 2.9, "1/2" -> 1/2, "16,2" -> 16.2
function szamok(s) {
  return [...s.matchAll(/\d+\/\d+|\d+(?:[.,]\d+)?/g)].map((m) => m[0].replace(',', '.'))
    .map((x) => (x.includes('/') ? x : String(Number(x))));
}

function szavak(s) {
  return ekezetNelkul(s.toLowerCase())
    .replace(/\d+\/\d+|\d+(?:[.,]\d+)?/g, ' ')
    .split(/[^a-z+]+/)
    .filter((w) => w.length > 1 && !TOLTELEK.has(w));
}

// Két szó egyezik, ha azonos, vagy az egyik a másik eleje (min. 3 betű): "cso" ~ "csovet", "rautitan" ~ "rautit".
const szoEgyezik = (a, b) => a === b || (Math.min(a.length, b.length) >= 3 && (a.startsWith(b) || b.startsWith(a)));

// "16" egyezik a "16,2"-vel (a 16-os cső valójában 16,2 mm), de a "16,2" csak önmagával.
const szamEgyezik = (n, j) => n === j || (/^\d+$/.test(n) && j.split('.')[0] === n);

export function nevKulcs(nev) {
  return [...szavak(nev)].sort().join(' ') + '|' + [...szamok(nev)].sort().join(' ');
}

// A beírt névhez hasonló ismert nevek, a legjobb elöl. Pontosan azonos (kis-nagybetűtől
// eltekintve) név esetén üres lista: nincs mit javasolni.
export function hasonloNevek(nev, ismertek, max = 3) {
  const beirt = String(nev ?? '').trim();
  if (beirt.length < 3) return [];
  const kisbetus = beirt.toLowerCase();
  if (ismertek.some((x) => x.toLowerCase() === kisbetus)) return [];
  const bSzam = szamok(beirt);
  const bSzo = szavak(beirt);
  if (!bSzo.length) return [];
  const talalatok = [];
  for (const jelolt of new Set(ismertek)) {
    const jSzam = szamok(jelolt);
    if (!bSzam.every((n) => jSzam.some((j) => szamEgyezik(n, j)))) continue;
    const jSzo = szavak(jelolt);
    const egyezo = bSzo.filter((w) => jSzo.some((j) => szoEgyezik(w, j))).length;
    if (!egyezo) continue;
    const arany = egyezo / bSzo.length;
    if (arany < 0.6) continue;
    // Ha a beírtban nincs méret, a jelöltben pedig van, kevésbé biztos (pl. "Rehau cső" -> 16-os vagy 20-as?).
    const pont = arany - (bSzam.length === 0 && jSzam.length ? 0.1 : 0) - 0.01 * Math.max(0, jSzo.length - egyezo);
    talalatok.push({ nev: jelolt, pont });
  }
  return talalatok.sort((a, b) => b.pont - a.pont || a.nev.length - b.nev.length).slice(0, max).map((t) => t.nev);
}
