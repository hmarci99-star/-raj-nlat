// A bolt válaszának beolvasása és az ajánlat összeállítása.
// Az árak csak az adott ajánlathoz tartoznak, a könyvtárba nem kerülnek.
// A bolt által hozzáírt, listán nem szereplő tételekből javaslat készül (ujTetelJelolt).

export const tetelKulcs = (s) => `${s.cikk}|${s.egyseg}`;

// Magyar formátumú szám: "12 345", "12.345", "12 345,50", "1234 Ft".
export function parseSzam(s) {
  let t = String(s).replace(/ft\.?/gi, '').replace(/[\s ]/g, '');
  if (!t) return NaN;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, '');
  t = t.replace(',', '.');
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
}

function normal(s) {
  return s.toLowerCase().normalize('NFC').replace(/[()"„”]/g, ' ');
}

function szavak(s) {
  return normal(s).split(/[\s,;/]+/).filter((w) => w.length > 1);
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
      if (/^(db|fm|m|pár|kör|ft)\.?$/i.test(o)) continue;
      // Egy cellába csúszott több "Ft"-os összeg: "12 990 Ft 12 990 Ft".
      const reszek = o.replace(/\s*(db|fm|m|pár)\.?$/i, '').split(/(?<=ft\.?)\s+(?=\d)/i);
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
  // a PX 25 T-idom nem lehet a PX 20 T-idom. "4x18" egyezik "4x18mm"-rel, de "20" nem "200"-zal.
  const szamosSzoMegvan = (x) => sorSzavaiLista.some((t) => t === x || (t.startsWith(x) && !/\d/.test(t[x.length])));
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
  return pont[0] >= 0.7 && jobb(pont, masodik) > 0 ? legjobb : null;
}

// Egységár(ak) a sor végi számokból. A mennyiséget és a soronkénti összeget
// (ár × mennyiség) kihagyja.
// mezo nélkül: két ár esetén a nagyobb a bolti, a kisebb a kedvezményes.
// mezo = 'bolti' / 'kedvezmenyes': a PDF csak ezt az árat tartalmazza; ha mégis
// két ár van a sorban, a bolti a nagyobb, a kedvezményes a kisebb.
function arakSzamokbol(szamok, mennyiseg, mezo = null) {
  let n = [...szamok];
  if (n.length >= 2 && n[0] === mennyiseg) n = n.slice(1);
  const arak = n.filter((x, i) => !n.slice(0, i).some((a) => Math.abs(a * mennyiseg - x) < 1 && mennyiseg !== 1));
  if (arak.length === 0) return null;
  if (mezo) {
    const [a, b = a] = arak;
    return { [mezo]: mezo === 'kedvezmenyes' ? Math.min(a, b) : Math.max(a, b) };
  }
  if (arak.length === 1) return { bolti: arak[0], kedvezmenyes: null };
  const [a, b] = arak;
  return { bolti: Math.max(a, b), kedvezmenyes: Math.min(a, b) };
}

const EGYSEGEK = 'db|fm|m|pár|kg|cs|csomag|szett|tekercs|doboz|zsák|l';
const NEM_TETEL = /összesen|végösszeg|fizetendő|részösszeg|árajánlat|kelt|dátum|oldal|érvényes|bankszámla|adószám|telefon/i;

// Egy tételhez nem köthető sorból új tétel javaslata: megnevezés, mennyiség,
// egység, cikkszám és ár(ak). Ha a sor nem tételnek látszik, null.
export function ujTetelJelolt(sor, mezo = null) {
  const { szamok, szoveg } = sorVegiSzamok(sor);
  if (szamok.length === 0) return null;
  // Mennyiség és egység: az utolsó "szám egység" a sorban (a megnevezésben is
  // lehet ilyen, pl. "lefolyócső 110/0,5 m", de a mennyiség oszlop utána jön).
  const talalatok = [...sor.matchAll(new RegExp(`(?:^|[\\s\\t])(\\d+(?:[.,]\\d+)?)\\s*(${EGYSEGEK})\\.?(?=[\\s\\t;|]|$)`, 'gi'))];
  const utolso = talalatok.at(-1);
  const mennyiseg = utolso ? parseSzam(utolso[1]) : 1;
  const egyseg = utolso ? utolso[2].toLowerCase() : 'db';
  const ar = arakSzamokbol(szamok, mennyiseg, mezo);
  if (!ar || !Object.values(ar).some((v) => v >= 10)) return null;

  let nev = szoveg;
  if (utolso && nev.endsWith(utolso[0].trim())) nev = nev.slice(0, -utolso[0].trim().length);
  let cikkszam = '';
  const csz = nev.match(/^(\d{4,})\s+(.*)$/);
  if (csz) [, cikkszam, nev] = csz;
  nev = nev.replace(/^\d+[.)]\s+/, '').replace(/[\s–:-]+$/, '').replace(/\s+/g, ' ').trim();
  if ((nev.match(/\p{L}/gu) ?? []).length < 3 || NEM_TETEL.test(nev)) return null;
  return { cikk: nev, cikkszam, mennyiseg, egyseg, ar, sor };
}

// text: a bolt válasza (szövegként, akár PDF-ből kimásolva).
// mezo: null (mindkét ár a szövegben), 'bolti' vagy 'kedvezmenyes' (külön PDF).
// Eredmény: { arak: Map(kulcs -> {bolti?, kedvezmenyes?}), jeloltek: [új tétel], nemIllesztett: [sor] }.
export function boltValaszBeolvasas(text, sorok, mezo = null) {
  const arak = new Map();
  const jeloltek = [];
  const nemIllesztett = [];
  for (const nyers of text.split(/\r?\n/)) {
    const sor = nyers.trim();
    if (!sor) continue;
    const { szamok, szoveg } = sorVegiSzamok(sor);
    if (szamok.length === 0) continue;
    const tetel = illeszt(szoveg, sorok);
    const ar = tetel && arakSzamokbol(szamok, tetel.mennyiseg, mezo);
    if (tetel && ar) {
      arak.set(tetelKulcs(tetel), ar);
      continue;
    }
    const jelolt = ujTetelJelolt(sor, mezo);
    if (jelolt) jeloltek.push(jelolt);
    else nemIllesztett.push(sor);
  }
  return { arak, jeloltek, nemIllesztett };
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
