// Szöveg kinyerése a bolt PDF-jéből, soronként, hogy az árbeolvasás
// (arak.js) ugyanúgy feldolgozhassa, mint a bemásolt szöveget.

const PDFJS = '../vendor/pdfjs-4.10.38/';

const SZAM = /^\d[\d\s .]*(,\d+)?(\s*ft\.?)?$/i;
const szamszeru = (s) => SZAM.test(s.trim());

// Egy sor darabjaiból oszlopok (szegmensek): a kis rés szóköz, a nagy rés
// (kb. egy betűmagasságnál nagyobb) oszlophatár.
function szegmensek(ds) {
  ds.sort((a, b) => a.x - b.x);
  const segs = [];
  let akt = null;
  for (const d of ds) {
    const res = akt ? d.x - akt.x1 : Infinity;
    // Két egymás melletti szám (pl. egységár és érték) kisebb réssel is külön oszlop.
    const szamUtanSzam = akt && /(\d|ft\.?|db|fm|pár)$/i.test(akt.szoveg.trim()) && /^\d/.test(d.str.trim());
    if (!akt || res > d.h * (szamUtanSzam ? 0.6 : 1.2)) {
      akt = { x0: d.x, x1: d.x + d.w, szoveg: d.str };
      segs.push(akt);
    } else {
      if (res > d.h * 0.12 && !akt.szoveg.endsWith(' ') && !d.str.startsWith(' ')) akt.szoveg += ' ';
      akt.szoveg += d.str;
      akt.x1 = Math.max(akt.x1, d.x + d.w);
    }
  }
  for (const s of segs) s.szoveg = s.szoveg.replace(/\s+/g, ' ').trim();
  return segs.filter((s) => s.szoveg);
}

// Táblázatsor: legalább 3 oszlop, az utolsó kettő szám (pl. két ár).
const teljesSor = (sor) => sor.segs.length >= 3 && sor.segs.slice(-2).every((s) => szamszeru(s.szoveg));

const atfed = (a, b) => a.x0 < b.x1 + 2 && b.x0 < a.x1 + 2;

// Egy táblázatsor és a hozzá tartozó, cellán belül tördelt sorok összefésülése
// oszloponként, fentről lefelé. Ahol a táblázatsorban szám áll, oda csak szám
// kerülhet (így a fejléc tördelt szavai nem rontják el az árakat).
function osszefesul(sor, extrak) {
  const oszlopok = sor.segs.map((s) => ({ x0: s.x0, x1: s.x1, szam: szamszeru(s.szoveg), darabok: [{ y: sor.y, szoveg: s.szoveg }] }));
  for (const e of extrak) {
    for (const s of e.segs) {
      const o = oszlopok.find((c) => atfed(c, s));
      if (o) {
        if (o.szam && !szamszeru(s.szoveg)) continue;
        o.darabok.push({ y: e.y, szoveg: s.szoveg });
        o.x0 = Math.min(o.x0, s.x0);
        o.x1 = Math.max(o.x1, s.x1);
      } else {
        oszlopok.push({ x0: s.x0, x1: s.x1, szam: false, darabok: [{ y: e.y, szoveg: s.szoveg }] });
      }
    }
  }
  oszlopok.sort((a, b) => a.x0 - b.x0);
  return oszlopok.map((o) => o.darabok.sort((a, b) => b.y - a.y).map((d) => d.szoveg).join(' ')).join('\t');
}

// A PDF-ben nincsenek sorok, csak koordinátás szövegdarabok.
// items: [{ str, x, y, w, h }] – y felfelé nő (PDF-koordináta).
export function sorokbaRendez(items) {
  const darabok = items
    .filter((d) => d.str && d.str.trim())
    .map((d) => ({ ...d, h: d.h > 0 ? d.h : 10 }))
    .sort((a, b) => b.y - a.y || a.x - b.x);

  const sorok = [];
  for (const d of darabok) {
    const sor = sorok.find((s) => Math.abs(s.y - d.y) <= Math.min(s.h, d.h) * 0.5);
    if (sor) sor.darabok.push(d);
    else sorok.push({ y: d.y, h: d.h, darabok: [d] });
  }
  sorok.sort((a, b) => b.y - a.y);
  for (const s of sorok) s.segs = szegmensek(s.darabok);

  // A tördelt (nem teljes) sorokat a legközelebbi táblázatsorhoz kötjük,
  // ha legfeljebb kb. másfél sornyira van tőle.
  const tablazatSorok = sorok.filter(teljesSor);
  const extrak = new Map(tablazatSorok.map((s) => [s, []]));
  const elnyelt = new Set();
  for (const s of sorok) {
    if (extrak.has(s)) continue;
    let legjobb = null;
    for (const t of tablazatSorok) {
      const tav = Math.abs(t.y - s.y);
      if (tav <= Math.max(t.h, s.h) * 1.45 && (!legjobb || tav < Math.abs(legjobb.y - s.y))) legjobb = t;
    }
    if (legjobb) {
      extrak.get(legjobb).push(s);
      elnyelt.add(s);
    }
  }

  return sorok
    .filter((s) => !elnyelt.has(s))
    .map((s) => (extrak.has(s) ? osszefesul(s, extrak.get(s)) : s.segs.map((g) => g.szoveg).join('\t')))
    .filter(Boolean)
    .join('\n');
}

let pdfjsBetoltes = null;
function pdfjs() {
  pdfjsBetoltes ??= import(new URL(`${PDFJS}pdf.min.mjs`, import.meta.url).href).then((lib) => {
    lib.GlobalWorkerOptions.workerSrc = new URL(`${PDFJS}pdf.worker.min.mjs`, import.meta.url).href;
    return lib;
  });
  return pdfjsBetoltes;
}

export async function pdfSzoveg(fajl) {
  const lib = await pdfjs();
  const doc = await lib.getDocument({ data: new Uint8Array(await fajl.arrayBuffer()) }).promise;
  const oldalak = [];
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const oldal = await doc.getPage(i);
      const tartalom = await oldal.getTextContent();
      oldalak.push(sorokbaRendez(tartalom.items.map((it) => ({
        str: it.str,
        x: it.transform[4],
        y: it.transform[5],
        w: it.width,
        h: it.height || Math.abs(it.transform[3]),
      }))));
    }
  } finally {
    doc.destroy();
  }
  return oldalak.filter(Boolean).join('\n');
}
