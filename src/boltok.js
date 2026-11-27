// Több bolt árainak összevetése és az ármemória (a korábban látott árak).
// Tiszta függvények: a felület (app.js) adja a tételeket és az árakat.

const kerek = (n) => Math.round(n);
const ervenyes = (v) => Number.isFinite(v) && v > 0;

// sorok: [{ kulcs, cikk, mennyiseg, egyseg }]
// oszlopok: [{ nev, arak: { kulcs: egységár } }] – az első általában a jelenlegi beszerzési ár.
// Eredmény: soronként az árak és a legolcsóbb oszlop(ok), oszloponként az összeg és a lefedettség,
// valamint a „mindent a legolcsóbb helyről” összeg.
export function osszevetes(sorok, oszlopok) {
  const tetelek = sorok.map((s) => {
    const arak = oszlopok.map((o) => (ervenyes(o.arak?.[s.kulcs]) ? o.arak[s.kulcs] : null));
    const vannak = arak.filter((a) => a !== null);
    const min = vannak.length ? Math.min(...vannak) : null;
    return { ...s, arak, min, legolcsobb: vannak.length > 1 ? arak.map((a) => a !== null && a === min) : arak.map(() => false) };
  });
  const kozos = tetelek.filter((t) => t.arak.every((a) => a !== null));
  const osszesek = oszlopok.map((o, i) => {
    const arazott = tetelek.filter((t) => t.arak[i] !== null);
    return {
      nev: o.nev,
      db: arazott.length,
      osszeg: kerek(arazott.reduce((s, t) => s + t.arak[i] * t.mennyiseg, 0)),
      kozosOsszeg: kerek(kozos.reduce((s, t) => s + t.arak[i] * t.mennyiseg, 0)),
    };
  });
  const arazott = tetelek.filter((t) => t.min !== null);
  return {
    tetelek,
    osszesek,
    kozosDb: kozos.length,
    legolcsobbOsszeg: kerek(arazott.reduce((s, t) => s + t.min * t.mennyiseg, 0)),
    legolcsobbDb: arazott.length,
  };
}

// ---- Ármemória ----
// memoria: { kulcs: { bolti, kedvezmenyes, datum, elozo: { bolti?, kedvezmenyes?, datum } } }

const MEZOK = ['bolti', 'kedvezmenyes'];

// Új árak rögzítése. Ha egy ár változik, a régi az „elozo” alá kerül (a drágulás jelzéséhez).
// datum: ISO dátum; régebbi dátummal (pl. egy régi ajánlat betöltésekor) nem ír felül újabbat.
export function memoriaRogzit(memoria, arak, datum) {
  const uj = { ...memoria };
  let valtozott = false;
  for (const [kulcs, ar] of Object.entries(arak ?? {})) {
    const regi = uj[kulcs] ?? {};
    if (regi.datum && regi.datum > datum) continue;
    const bejegyzes = { ...regi };
    let itt = false;
    for (const m of MEZOK) {
      if (!ervenyes(ar?.[m])) continue;
      if (bejegyzes[m] === ar[m]) continue;
      if (ervenyes(bejegyzes[m])) bejegyzes.elozo = { ...bejegyzes.elozo, [m]: bejegyzes[m], datum: bejegyzes.datum };
      bejegyzes[m] = ar[m];
      itt = true;
    }
    if (!itt) continue;
    bejegyzes.datum = datum;
    uj[kulcs] = bejegyzes;
    valtozott = true;
  }
  return valtozott ? uj : memoria;
}

// Az új árak közül azok, amelyek a memóriában lévőnél legalább `kuszob` aránnyal drágábbak.
export function dragulasok(memoria, ujArak, kuszob = 0.15) {
  const lista = [];
  for (const [kulcs, ar] of Object.entries(ujArak ?? {})) {
    const regi = memoria[kulcs];
    if (!regi) continue;
    for (const m of MEZOK) {
      if (!ervenyes(ar?.[m]) || !ervenyes(regi[m])) continue;
      const arany = ar[m] / regi[m] - 1;
      if (arany >= kuszob) lista.push({ kulcs, mezo: m, regi: regi[m], uj: ar[m], arany, datum: regi.datum });
    }
  }
  return lista.sort((a, b) => b.arany - a.arany);
}

// A jelenlegi ár drágulása a memóriában tárolt előző árhoz képest (a táblázat jelzéséhez).
export function dragulasJel(bejegyzes, mezo, jelenlegi, kuszob = 0.15) {
  const elozo = bejegyzes?.elozo?.[mezo];
  if (!ervenyes(elozo) || !ervenyes(jelenlegi) || bejegyzes[mezo] !== jelenlegi) return null;
  const arany = jelenlegi / elozo - 1;
  return arany >= kuszob ? { elozo, arany, datum: bejegyzes.elozo.datum } : null;
}

// Becsült anyagköltség: a jelenlegi ár, ha van, különben a memóriában lévő.
// sorok: [{ kulcs, mennyiseg }]
export function becsles(sorok, arak, memoria, mezo = 'bolti') {
  let osszeg = 0;
  let jelenlegi = 0;
  let korabbi = 0;
  for (const s of sorok) {
    const most = arak?.[s.kulcs]?.[mezo];
    const regi = memoria?.[s.kulcs]?.[mezo];
    if (ervenyes(most)) { osszeg += most * s.mennyiseg; jelenlegi += 1; } else if (ervenyes(regi)) { osszeg += regi * s.mennyiseg; korabbi += 1; }
  }
  return { osszeg: kerek(osszeg), jelenlegi, korabbi, hianyzik: sorok.length - jelenlegi - korabbi };
}

// Mentésre emlékeztetés: van-e mit menteni, és mikor volt az utolsó mentés.
export function mentesEsedekes({ vanAdat, utolso, halasztva, most = Date.now(), napok = 7 }) {
  if (!vanAdat) return false;
  if (halasztva && most < halasztva) return false;
  if (!utolso) return true;
  return most - utolso >= napok * 86400000;
}
