// A bolt válaszának beolvasása és az ajánlat összeállítása.
// Az árak csak az adott ajánlathoz tartoznak, a könyvtárba nem kerülnek.
// A bolt által hozzáírt, listán nem szereplő tételekből javaslat készül (ujTetelJelolt).

export const tetelKulcs = (s) => `${s.cikk}|${s.egyseg}`;

// Mértékegységek a bolti listákban (a hosszabbak előre, hogy a "csomag" ne "cs" legyen).
const EGYSEGEK = 'csomag|tekercs|doboz|szett|karton|zsák|pár|db|fm|kg|cs|m|l';

// Magyar formátumú szám: "12 345", "12.345", "12 345,50", "1234 Ft".
export function parseSzam(s) {
  let t = String(s).replace(/ft\.?/gi, '').replace(/[\s ]/g, '');
  if (!t) return NaN;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, '');
  t = t.replace(',', '.');
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
}

// Kisbetű, zárójelek nélkül, a tizedespont és -vessző egységesen vessző ("20x2.9" = "20x2,9").
function normal(s) {
  return s.toLowerCase().normalize('NFC').replace(/[()"„”]/g, ' ').replace(/(\d)[.,](\d)/g, '$1,$2');
}

// Szavak; a számok közti vessző (tizedesvessző) nem választ el.
function szavak(s) {
  return normal(s).split(/[\s;/]+|,(?!\d)/).filter((w) => w.length > 1);
}

// Egy sor végén álló számoszlopok: tabulátor, pontosvessző, | vagy legalább két
// szóköz választja el őket; ha nincs ilyen tagolás, a sor végi számok.
function sorVegiSzamok(sor) {
  const oszlopok = sor.split(/\t|;|\||\s{2,}/).map((o) => o.trim()).filter(Boolean);
  const szamok = [];
  if (oszlopok.length >= 2) {
    let i = oszlopok.length - 1;
    for (; i > 0; i--) {
      const o = oszlopok[i];
      if (new RegExp(`^(${EGYSEGEK}|kör|ft)\\.?$`, 'i').test(o)) continue;
      // Egy cellába csúszott több "Ft"-os összeg: "12 990 Ft 12 990 Ft".
      const reszek = o.replace(new RegExp(`\\s*(${EGYSEGEK})\\.?$`, 'i'), '').split(/(?<=ft\.?)\s+(?=\d)/i);
      const n = reszek.map(parseSzam);
      if (n.some(Number.isNaN)) break;
      szamok.unshift(...n);
    }
    return { szamok, szoveg: oszlopok.slice(0, i + 1).join(' ') };
  }
  const m = sor.match(/((?:[\s/:–-]+\d[\d .]*(?:,\d+)?\s*(?:ft|db|fm)?\.?)+)\s*$/i);
  if (!m) return { szamok: [], szoveg: sor };
  for (const r of m[1].matchAll(/\d{1,3}(?:[ .]\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g)) szamok.push(parseSzam(r[0]));
  return { szamok, szoveg: sor.slice(0, m.index) };
}

// A sor szövegéhez legjobban illő tétel: cikkszám egyezés, vagy a megnevezés
// szavainak legalább 70%-a megtalálható és egyértelműen ez a legjobb.
function illeszt(szoveg, sorok) {
  const nsz = normal(szoveg);
  const cikkszamos = sorok.find((s) => s.cikkszam && new RegExp(`(^|\\D)${s.cikkszam}(\\D|$)`).test(szoveg));
  if (cikkszamos) return cikkszamos;
  const sorSzavaiLista = szavak(szoveg);
  const sorSzavai = new Set(sorSzavaiLista);
  // Pontszám: [a tétel szavaiból mennyi van a sorban, a sor szavaiból mennyi van a tételben].
  // Az utóbbi dönt, ha az egyik megnevezés a másik része (PX 20 T-idom / PX 20-16-20 T-idom).
  const jobb = (a, b) => a[0] - b[0] || a[1] - b[1];
  let legjobb = null;
  let pont = [0, 0];
  let masodik = [0, 0];
  // A számot tartalmazó szavaknak (méret, átmérő) pontosan egyezniük kell:
  // a PX 25 T-idom nem lehet a PX 20 T-idom. "4x18" egyezik "4x18mm"-rel (utána csak betű, pl.
  // mértékegység jöhet), de "20" nem "200"-zal és nem "20-16-16"-tal.
  const szamosSzoMegvan = (x) => sorSzavaiLista.some((t) => t === x || (t.startsWith(x) && /\p{L}/u.test(t[x.length])));
  for (const s of sorok) {
    const w = szavak(s.cikk);
    if (w.length === 0) continue;
    if (!w.filter((x) => /\d/.test(x)).every(szamosSzoMegvan)) continue;
    const tetelSzavai = new Set(w);
    const p = [
      w.filter((x) => sorSzavai.has(x) || nsz.includes(x)).length / w.length,
      sorSzavaiLista.length ? sorSzavaiLista.filter((x) => tetelSzavai.has(x)).length / sorSzavaiLista.length : 0,
    ];
    if (jobb(p, pont) > 0) {
      masodik = pont;
      pont = p;
      legjobb = s;
    } else if (jobb(p, masodik) > 0) {
      masodik = p;
    }
  }
  return pont[0] >= 0.8 && jobb(pont, masodik) > 0 ? legjobb : null;
}

// Egységár(ak) a sor végi számokból. A mennyiséget és a soronkénti összeget
// (ár × mennyiség) kihagyja.
// mezo nélkül: két ár esetén a nagyobb a bolti, a kisebb a kedvezményes.
// mezo = 'bolti' / 'kedvezmenyes': a PDF csak ezt az árat tartalmazza; ha mégis
// két ár van a sorban, a bolti a nagyobb, a kedvezményes a kisebb.
function arakSzamokbol(szamok, mennyiseg, mezo = null) {
  let n = [...szamok];
  if (n.length >= 2 && n[0] === mennyiseg) n = n.slice(1);
  // Soronkénti összeg (érték) felismerése: ár × mennyiség. A boltok az egységárat
  // gyakran kerekítve írják ki (pl. 58 Ft, valójában 58,42), ezért a tűrés a kerekítés
  // mértékéig terjed; ilyenkor a pontos egységár az összegből számolódik (11 684 / 200).
  if (mennyiseg !== 1 && mennyiseg > 0) {
    const arak = [];
    for (let i = 0; i < n.length; i++) {
      const x = n[i];
      const j = arak.findIndex((a) => Math.abs(a.ertek * mennyiseg - x) <= mennyiseg * 0.5 + 1 && !a.osszeg);
      if (j >= 0) {
        arak[j] = { ertek: Math.round((x / mennyiseg) * 100) / 100, osszeg: true };
      } else {
        arak.push({ ertek: x });
      }
    }
    n = arak.map((a) => a.ertek);
  }
  const arak = n;
  if (arak.length === 0) return null;
  if (mezo) {
    const [a, b = a] = arak;
    return { [mezo]: mezo === 'kedvezmenyes' ? Math.min(a, b) : Math.max(a, b) };
  }
  if (arak.length === 1) return { bolti: arak[0], kedvezmenyes: null };
  const [a, b] = arak;
  return { bolti: Math.max(a, b), kedvezmenyes: Math.min(a, b) };
}

const egysegNormal = (e) => ({ m: 'fm' }[e.toLowerCase()] ?? e.toLowerCase());

// A sorban szereplő mennyiség ("6 db", "12 fm"): az utolsó szám+egység, ami nem a
// megnevezés része (pl. "lefolyócső 110/0,5 m" nem mennyiség). Ha nincs, null.
function mennyisegASorban(sor, szoveg) {
  const talalatok = [...sor.matchAll(new RegExp(`(?:^|[\\s\\t])(\\d+(?:[.,]\\d+)?)\\s*(${EGYSEGEK})\\.?(?=[\\s\\t;|]|$)`, 'gi'))]
    .filter((m) => !szoveg.includes(m[0].trim()));
  const m = talalatok.at(-1);
  return m ? { mennyiseg: parseSzam(m[1]), egyseg: egysegNormal(m[2]), nyers: m[0].trim() } : null;
}

// Összesítő és fejléc/lábléc sorok szavai: ezek nem tételek (nettó/bruttó végösszeg, ÁFA, kedvezmény…).
const NEM_TETEL = new RegExp('(^|[\\s(/:-])(' + [
  'össze(sen|g)', 'végösszeg', 'fizetendő', 'részösszeg', 'nettó', 'netto', 'bruttó', 'brutto', 'áfa', 'afa', 'adó(alap|tartalom)?',
  'kedvezmény', 'engedmény', 'kerekítés', 'egyenleg', 'előleg', 'total', 'subtotal', 'sum', 'árajánlat', 'ajánlat',
  'kelt', 'dátum', 'oldal', 'érvényes', 'bankszámla', 'adószám', 'telefon', 'e-?mail', 'fizetési', 'határidő',
].join('|') + ')', 'i');

// Igaz, ha a megnevezés összesítő vagy egyéb nem-tétel sornak látszik.
export const nemTetelNev = (nev) => NEM_TETEL.test(` ${nev}`) || nev.includes('%');

// Egy tételhez nem köthető sorból új tétel javaslata: megnevezés, mennyiség,
// egység, cikkszám és ár(ak). Ha a sor nem tételnek látszik, null.
export function ujTetelJelolt(sor, mezo = null) {
  const { szamok, szoveg } = sorVegiSzamok(sor);
  if (szamok.length === 0) return null;
  const menny = mennyisegASorban(sor, szoveg);
  // "Nettó: 107 811 Ft" – kettősponttal záródó felirat, mennyiség nélkül: összesítő sor.
  if (!menny && (/:\s*$/.test(szoveg.trim()) || /:[\s\t]*[\d][\d\s.,]*(ft)?\.?[\s\t\d.,ft]*$/i.test(sor))) return null;
  // Mennyiség (egységgel) nélkül legalább két szám kell (pl. mennyiség és ár);
  // egyetlen szám a sor végén inkább cím vagy dátum ("Batthyány utca 20").
  if (!menny && szamok.length < 2) return null;
  const mennyiseg = menny?.mennyiseg ?? 1;
  const egyseg = menny?.egyseg ?? 'db';
  const ar = arakSzamokbol(szamok, mennyiseg, mezo);
  if (!ar || !Object.values(ar).some((v) => v >= 10)) return null;

  let nev = szoveg.replace(/\s+/g, ' ').trim()
    .replace(/^\d+[.)]\s+/, '') // tételsorszám: "12."
    .replace(/^hivatkozás:\s*/i, '');
  let cikkszam = '';
  // Cikkszám a megnevezés elején: csupa szám ("38340001") vagy bolti kód ("FIS_79815", "UH-499811", "PIP_KAB32-45").
  const csz = nev.match(/^(\d{4,}|(?=[A-Z0-9_./-]*\d)[A-Z][A-Z0-9]*[_-][A-Z0-9_./-]+)\s+(.*)$/);
  if (csz) [, cikkszam, nev] = csz;
  nev = nev.replace(/[\s–:-]+$/, '').trim();
  if ((nev.match(/\p{L}/gu) ?? []).length < 3 || nemTetelNev(nev)) return null;
  return { cikk: nev, cikkszam, mennyiseg, egyseg, ar, sor };
}

// text: a bolt válasza (szövegként, akár PDF-ből kimásolva).
// mezo: null (mindkét ár a szövegben), 'bolti' vagy 'kedvezmenyes' (külön PDF).
// Eredmény: { arak: Map(kulcs -> {bolti?, kedvezmenyes?}), mennyisegek: Map(kulcs -> PDF szerinti mennyiség,
// ha eltér a listától), jeloltek: [új tétel], nemIllesztett: [sor] }.
export function boltValaszBeolvasas(text, sorok, mezo = null) {
  const arak = new Map();
  const mennyisegek = new Map();
  const jeloltek = [];
  const nemIllesztett = [];
  const osszesitett = new Map(); // tétel -> { q: PDF-mennyiség eddig, ar }
  for (const nyers of text.split(/\r?\n/)) {
    const sor = nyers.trim();
    if (!sor) continue;
    const { szamok, szoveg } = sorVegiSzamok(sor);
    if (szamok.length === 0) continue;
    const tetel = illeszt(szoveg, sorok);
    // A PDF-ben szereplő mennyiség (ha azonos egységben van); ez alapján hagyja ki
    // a mennyiség- és az összegoszlopot az árak közül.
    const menny = tetel && mennyisegASorban(sor, szoveg);
    const pdfMenny = menny && menny.egyseg === egysegNormal(tetel.egyseg) ? menny.mennyiseg : null;
    const ar = tetel && arakSzamokbol(szamok, pdfMenny ?? tetel.mennyiseg, mezo);
    if (tetel && ar) {
      const k = tetelKulcs(tetel);
      const q = pdfMenny ?? tetel.mennyiseg;
      if (osszesitett.has(k)) {
        // Ugyanaz a tétel több sorban: a mennyiség összeadódik, az ár súlyozott átlag (az érték nem vész el).
        const elozo = osszesitett.get(k);
        const ossz = elozo.q + q;
        const uj = {};
        for (const m of Object.keys({ ...elozo.ar, ...ar })) {
          const a = elozo.ar[m];
          const b = ar[m];
          uj[m] = a == null ? b : b == null ? a : Math.round(((a * elozo.q + b * q) / ossz) * 100) / 100;
        }
        osszesitett.set(k, { q: ossz, ar: uj });
        arak.set(k, uj);
        if (ossz !== tetel.mennyiseg) mennyisegek.set(k, ossz); else mennyisegek.delete(k);
      } else {
        osszesitett.set(k, { q, ar });
        arak.set(k, ar);
        if (pdfMenny !== null && pdfMenny !== tetel.mennyiseg) mennyisegek.set(k, pdfMenny);
      }
      continue;
    }
    const jelolt = ujTetelJelolt(sor, mezo);
    if (jelolt) jeloltek.push(jelolt);
    else nemIllesztett.push(sor);
  }
  return { arak, mennyisegek, jeloltek, nemIllesztett };
}

// Ügyfélajánlat és belső összesítő adatai.
export function ajanlat(munkadij, anyagSorok, arak) {
  const kerek = (x) => Math.round(x);
  const anyag = anyagSorok.map((s) => {
    const ar = arak[tetelKulcs(s)] ?? {};
    const bolti = Number.isFinite(ar.bolti) ? ar.bolti : null;
    const kedv = Number.isFinite(ar.kedvezmenyes) ? ar.kedvezmenyes : null;
    const boltiOsszeg = bolti === null ? null : kerek(bolti * s.mennyiseg);
    const kedvOsszeg = kedv === null ? null : kerek(kedv * s.mennyiseg);
    const haszon = boltiOsszeg === null || kedvOsszeg === null ? null : boltiOsszeg - kedvOsszeg;
    return { ...s, bolti, kedvezmenyes: kedv, boltiOsszeg, kedvOsszeg, haszon };
  });
  const osszeg = (k) => anyag.reduce((t, s) => t + (s[k] ?? 0), 0);
  const anyagBolti = osszeg('boltiOsszeg');
  return {
    munkadij,
    anyag,
    anyagBolti,
    anyagKedvezmenyes: osszeg('kedvOsszeg'),
    haszon: osszeg('haszon'),
    vegosszeg: munkadij.osszesen + anyagBolti,
    hianyzoBolti: anyag.filter((s) => s.bolti === null).length,
    hianyzoKedvezmenyes: anyag.filter((s) => s.kedvezmenyes === null).length,
  };
}
