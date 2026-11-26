import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSzam, boltValaszBeolvasas, ajanlat, tetelKulcs, ujTetelJelolt, nemTetelNev } from '../src/arak.js';

const sorok = [
  { cikk: 'Rehau PX 20-16-20 T-idom', egyseg: 'db', mennyiseg: 4 },
  { cikk: 'Rehau PX 20 T-idom', egyseg: 'db', mennyiseg: 2 },
  { cikk: 'Rehau Rautitan Stabil cső 16,2x2,6 mm', egyseg: 'fm', mennyiseg: 6 },
  { cikk: 'Kaiflex csőhéj 4x18 mm', egyseg: 'fm', mennyiseg: 6 },
  { cikk: 'Grohe Rapid SL WC-tartály (nyomólap nélkül)', egyseg: 'db', mennyiseg: 1 },
];
const ar = (e, i) => e.arak.get(tetelKulcs(sorok[i]));

test('számformátumok', () => {
  assert.equal(parseSzam('12 345'), 12345);
  assert.equal(parseSzam('12 345,50'), 12345.5);
  assert.equal(parseSzam('12.345'), 12345);
  assert.equal(parseSzam('1.234,5 Ft'), 1234.5);
  assert.equal(parseSzam('890'), 890);
  assert.ok(Number.isNaN(parseSzam('20-16-20')));
});

test('tabulált válasz: menny., bolti, kedvezményes, összeg', () => {
  const v = [
    'Megnevezés\tMenny.\tBolti ár\tKedv. ár\tÖsszeg',
    'Rehau PX 20-16-20 T-idom\t4\t2 450\t1 890\t9 800',
    'Rehau PX 20 T-idom\t2\t2 100\t1 600\t4 200',
    'Rehau Rautitan Stabil cső 16,2x2,6 mm\t6 fm\t890\t690\t5 340',
  ].join('\n');
  const e = boltValaszBeolvasas(v, sorok);
  assert.deepEqual(ar(e, 0), { bolti: 2450, kedvezmenyes: 1890 });
  assert.deepEqual(ar(e, 1), { bolti: 2100, kedvezmenyes: 1600 });
  assert.deepEqual(ar(e, 2), { bolti: 890, kedvezmenyes: 690 });
  assert.deepEqual(e.nemIllesztett, []);
});

test('a 20-as és a 20-16-20-as T-idom nem keveredik', () => {
  const e = boltValaszBeolvasas('Rehau PX 20 T-idom; 2100; 1600', sorok);
  assert.equal(ar(e, 0), undefined);
  assert.deepEqual(ar(e, 1), { bolti: 2100, kedvezmenyes: 1600 });
});

test('szóközzel tagolt PDF-szöveg, kedvezményes elöl', () => {
  const e = boltValaszBeolvasas('Kaiflex csőhéj 4x18mm 2m     310 Ft    420 Ft', sorok);
  assert.deepEqual(ar(e, 3), { bolti: 420, kedvezmenyes: 310 });
});

test('a bolt cikkszáma a megnevezés elől levágódik, az illesztés a névre megy', () => {
  const e = boltValaszBeolvasas('38340001 Grohe Rapid SL WC-tartály nyomólap nélkül  1  48 900  41 500', sorok);
  assert.deepEqual(ar(e, 4), { bolti: 48900, kedvezmenyes: 41500 });
});

test('listán nem szereplő tétel új tétel javaslat lesz, a szöveges sor kimarad', () => {
  const e = boltValaszBeolvasas('Szállítási díj\t1\t5 000\t5 000\nKöszönjük a megkeresést!', sorok);
  assert.equal(e.arak.size, 0);
  assert.deepEqual(e.jeloltek.map((j) => [j.cikk, j.mennyiseg, j.ar.bolti]), [['Szállítási díj', 1, 5000]]);
  assert.deepEqual(e.nemIllesztett, []);
});

test('ajánlat: végösszeg bolti áron, haszon a különbség', () => {
  const munkadij = { sorok: [], osszesen: 100000 };
  const arak = {
    [tetelKulcs(sorok[0])]: { bolti: 2450, kedvezmenyes: 1890 },
    [tetelKulcs(sorok[2])]: { bolti: 890, kedvezmenyes: null },
  };
  const a = ajanlat(munkadij, sorok, arak);
  assert.equal(a.anyagBolti, 4 * 2450 + 6 * 890);
  assert.equal(a.vegosszeg, 100000 + 4 * 2450 + 6 * 890);
  assert.equal(a.haszon, 4 * (2450 - 1890));
  assert.equal(a.hianyzoBolti, 3);
  assert.equal(a.hianyzoKedvezmenyes, 4);
});

test('a bolt a saját (számozott) listánkra válaszol árakkal', () => {
  const v = [
    '1. Rehau PX 20-16-20 T-idom – 4 db  2 450 Ft  1 890 Ft',
    '',
    '2. Rehau PX 20 T-idom – 2 db 2100 1600',
    '',
    '3. Kaiflex csőhéj 4x18 mm – 6 fm: 420 Ft / 310 Ft',
  ].join('\n');
  const e = boltValaszBeolvasas(v, sorok);
  assert.deepEqual(ar(e, 0), { bolti: 2450, kedvezmenyes: 1890 });
  assert.deepEqual(ar(e, 1), { bolti: 2100, kedvezmenyes: 1600 });
  assert.deepEqual(ar(e, 3), { bolti: 420, kedvezmenyes: 310 });
});

test('külön PDF: csak bolti ár, mennyiség és összeg oszloppal', () => {
  const v = [
    'Rehau PX 20-16-20 T-idom\t4 db\t2 450\t9 800',
    'Rehau PX 20 T-idom\t2\t2 100',
    'Grohe Rapid SL WC-tartály (nyomólap nélkül)\t1 db\t48 900\t48 900',
  ].join('\n');
  const e = boltValaszBeolvasas(v, sorok, 'bolti');
  assert.deepEqual(ar(e, 0), { bolti: 2450 });
  assert.deepEqual(ar(e, 1), { bolti: 2100 });
  assert.deepEqual(ar(e, 4), { bolti: 48900 });
});

test('külön PDF: kedvezményes ár; ha két ár van a sorban, a kisebbet veszi', () => {
  const v = [
    'Rehau PX 20-16-20 T-idom\t4 db\t1 890\t7 560',
    'Rehau PX 20 T-idom\t2 db\t2 100\t1 600\t3 200',
  ].join('\n');
  const e = boltValaszBeolvasas(v, sorok, 'kedvezmenyes');
  assert.deepEqual(ar(e, 0), { kedvezmenyes: 1890 });
  assert.deepEqual(ar(e, 1), { kedvezmenyes: 1600 });
});

test('egy cellába csúszott két Ft-os összeg', () => {
  const e = boltValaszBeolvasas('Rehau PX 20 T-idom\t2 db\t2 100 Ft 4 200 Ft', sorok, 'bolti');
  assert.deepEqual(ar(e, 1), { bolti: 2100 });
});

test('más méret nem keveredik: a PX 25 T-idom új tétel, nem a PX 20', () => {
  const e = boltValaszBeolvasas('Rehau PX 25 T-idom\t2 db\t3 450\t2 890', sorok);
  assert.equal(ar(e, 1), undefined);
  assert.equal(e.jeloltek.length, 1);
  assert.equal(e.jeloltek[0].cikk, 'Rehau PX 25 T-idom');
});

test('új tétel javaslat: megnevezés (cikkszám nélkül), mennyiség, egység, ár', () => {
  assert.deepEqual(
    { ...ujTetelJelolt('55120\tGeberit Duofix szerelőelem\t1 db\t89 900\t79 500'), sor: undefined },
    { cikk: 'Geberit Duofix szerelőelem', mennyiseg: 1, egyseg: 'db',
      ar: { bolti: 89900, kedvezmenyes: 79500 }, sor: undefined },
  );
  const l = ujTetelJelolt('Pipelife KAEM lefolyócső 110/0,5 m\t3 db\t1 200\t3 600', 'kedvezmenyes');
  assert.equal(l.cikk, 'Pipelife KAEM lefolyócső 110/0,5 m');
  assert.equal(l.mennyiseg, 3);
  assert.deepEqual(l.ar, { kedvezmenyes: 1200 });
});

test('nem tétel sorokból nincs javaslat', () => {
  for (const l of ['Árajánlat – 2026. november 26.', 'Összesen: 19 260 Ft', 'Végösszeg\t24 470', 'Oldal 1 / 2']) {
    assert.equal(ujTetelJelolt(l), null, l);
  }
});

test('a beolvasás az ismert és az új tételeket szétválasztja', () => {
  const v = 'Rehau PX 20 T-idom\t2 db\t2 100\t1 600\nGolyóscsap 1/2 col\t4 db\t2 100\t1 600\nÖsszesen: 12 000 Ft';
  const e = boltValaszBeolvasas(v, sorok);
  assert.deepEqual(ar(e, 1), { bolti: 2100, kedvezmenyes: 1600 });
  assert.deepEqual(e.jeloltek.map((j) => j.cikk), ['Golyóscsap 1/2 col']);
  assert.deepEqual(e.nemIllesztett, ['Összesen: 12 000 Ft']);
});

test('a PDF-ben más mennyiség: azt jelzi, és nem keveri össze az árral', () => {
  // listán 4 db, a PDF-ben 6 db
  const e = boltValaszBeolvasas('Rehau PX 20-16-20 T-idom\t6 db\t2 450\t1 890\t14 700', sorok);
  assert.deepEqual(ar(e, 0), { bolti: 2450, kedvezmenyes: 1890 });
  assert.equal(e.mennyisegek.get(tetelKulcs(sorok[0])), 6);
  // azonos mennyiségnél nincs eltérés
  const f = boltValaszBeolvasas('Rehau PX 20-16-20 T-idom\t4 db\t2 450\t1 890', sorok);
  assert.equal(f.mennyisegek.size, 0);
  // a megnevezésben lévő méret nem mennyiség
  const g = boltValaszBeolvasas('Kaiflex csőhéj 4x18 mm\t420\t310', sorok);
  assert.equal(g.mennyisegek.size, 0);
  assert.deepEqual(ar(g, 3), { bolti: 420, kedvezmenyes: 310 });
});

test('új tétel: a megnevezésben lévő "0,5 m" nem mennyiség', () => {
  const j = ujTetelJelolt('Pipelife KAEM lefolyócső 110/0,5 m\t1 200\t950');
  assert.equal(j.cikk, 'Pipelife KAEM lefolyócső 110/0,5 m');
  assert.equal(j.mennyiseg, 1);
  assert.deepEqual(j.ar, { bolti: 1200, kedvezmenyes: 950 });
});

test('összesítő sorok (nettó, bruttó, ÁFA, kedvezmény) nem lesznek tételek', () => {
  const osszesitok = [
    'Nettó összesen: 107 811 Ft', 'Bruttó végösszeg: 136 920 Ft', 'ÁFA 27%: 29 109 Ft', 'Nettó érték\t107 811',
    'Bruttó\t136 920', 'Összesen nettó / bruttó 107 811 136 920', 'Kedvezmény (10%) 12 000', 'Kerekítés\t2',
    'Fizetendő: 136 920 Ft', 'Áfa alap\t107 811', 'Nettó:\t107 811', 'Brutto osszesen 136 920', 'Végösszeg (bruttó) 136 920 Ft',
    'Szállítás: 5 000 Ft', 'Részösszeg 98 000',
  ];
  for (const l of osszesitok) assert.equal(ujTetelJelolt(l), null, l);
  const e = boltValaszBeolvasas(osszesitok.join('\n'), sorok);
  assert.equal(e.jeloltek.length, 0);
  assert.equal(e.arak.size, 0);
});

test('valódi tételek továbbra is felismerhetők', () => {
  for (const l of ['Szállítási díj\t1 db\t5 000', 'Golyóscsap 1/2 col\t2 db\t2 100\t1 600', 'Geberit Sigma01 nyomólap, fehér\t1 db\t12 500']) {
    assert.ok(ujTetelJelolt(l), l);
  }
  assert.equal(nemTetelNev('Nettó összesen'), true);
  assert.equal(nemTetelNev('Sarokszelep 1/2 col'), false);
});

// Valódi bolti PDF sorai (Gravitáció Kft. ajánlat formátum, a programmal kiolvasva).
const valodi = [
  '1.\tFIS_79815 Fischer ED 18 beütőszeg 200 db/doboz\t200,000 db\t58\t11 684 Ft',
  '3.\tKAI_4013299 Kaimann Kaiflex PE-DWS csőhéj, tekercses, 4x18mm (régi: KAI_4002664) (600m/karton)\t30,000 fm\t366\t10 973 Ft',
  '19.\tREH_11600311001 Rehau PX 16 T-idom\t1,000 db\t3 557\t3 557 Ft',
  '20.\tREH_11600011001 Rehau PX 16 toldóhüvely (100db/doboz)\t25,000 db\t485\t12 129 Ft',
  '22.\tREH_11600811001 Rehau PX 20-16-16 T-idom\t2,000 db\t3 551\t7 102 Ft',
  '23.\tREH_11600321001 Rehau PX 20 T-idom\t4,000 db\t4 684\t18 735 Ft',
  '30.\tREH_13608451002 Rehau Rautitan Stabil PEXa/Al/PEHD ötrétegű cső, 20x2.9mm, 100m/tek\t20,000 fm\t2 369\t47 371 Ft',
  '41.\tRTB_071534D Rothenberger Profi Plus 125x1x22 mm vágókorong (10 db)\t0,300 cs\t9 315\t2 795 Ft',
];

test('valódi PDF: az egységár a kerekített helyett az értékből (11 684 / 200 = 58,42)', () => {
  const j = ujTetelJelolt(valodi[0], 'bolti');
  assert.deepEqual([j.cikk, j.cikkszam, j.mennyiseg, j.egyseg, j.ar], ['Fischer ED 18 beütőszeg 200 db/doboz', undefined, 200, 'db', { bolti: 58.42 }]);
  const k = ujTetelJelolt(valodi[7], 'bolti');
  assert.equal(k.mennyiseg, 0.3);
  assert.equal(Math.round(k.mennyiseg * k.ar.bolti), 2795);
});

test('valódi PDF: méretek pontosan, a "20" nem "20-16-16", tizedespont = vessző', () => {
  const lista = [
    { cikk: 'Kaiflex csőhéj 4x18 mm', egyseg: 'fm', mennyiseg: 12 },
    { cikk: 'Rehau PX 16 toldóhüvely', egyseg: 'db', mennyiseg: 19 },
    { cikk: 'Rehau PX 20 T-idom', egyseg: 'db', mennyiseg: 8 },
    { cikk: 'Rehau Rautitan Stabil cső 20x2,9 mm', egyseg: 'fm', mennyiseg: 4 },
  ];
  const e = boltValaszBeolvasas(valodi.join('\n'), lista, 'bolti');
  const ertek = (i) => Math.round(e.mennyisegek.get(tetelKulcs(lista[i])) * e.arak.get(tetelKulcs(lista[i])).bolti);
  assert.equal(ertek(0), 10973);
  assert.equal(ertek(1), 12129); // a "PX 16 T-idom" nem a toldóhüvely
  assert.equal(ertek(2), 18735); // a "PX 20-16-16 T-idom" nem a "PX 20 T-idom"
  assert.equal(ertek(3), 47371); // "20x2.9mm" = "20x2,9 mm"
  const ossz = [...e.arak].reduce((t, [k, a]) => t + (e.mennyisegek.get(k) ?? lista.find((s) => tetelKulcs(s) === k).mennyiseg) * a.bolti, 0)
    + e.jeloltek.reduce((t, j) => t + j.mennyiseg * j.ar.bolti, 0);
  assert.equal(Math.round(ossz), 11684 + 10973 + 3557 + 12129 + 7102 + 18735 + 47371 + 2795);
});

test('ugyanaz a tétel két sorban: a mennyiségek összeadódnak', () => {
  const lista = [{ cikk: 'Rehau PX 20 T-idom', egyseg: 'db', mennyiseg: 2 }];
  const e = boltValaszBeolvasas('Rehau PX 20 T-idom\t2 db\t4 000\t8 000 Ft\nRehau PX 20 T-idom\t3 db\t5 000\t15 000 Ft', lista, 'bolti');
  const k = tetelKulcs(lista[0]);
  assert.equal(e.mennyisegek.get(k), 5);
  assert.equal(Math.round(e.mennyisegek.get(k) * e.arak.get(k).bolti), 23000);
});

test('anyagszükséglet PDF-ből: megnevezés, mennyiség, egység, árak nélkül is', async () => {
  const { anyagListaBeolvasas } = await import('../src/arak.js');
  const t = anyagListaBeolvasas([
    'Anyagszükséglet – hőcserélő csere',
    'Lemezes hőcserélő 30 lemezes 1 db',
    'Tömítés 3/4 col\t2 db',
    '3 db golyóscsap 3/4 col',
    'Pipelife KAEM lefolyócső 110/0,5 m\t3 db\t1 200\t3 600',
    ...valodi,
    'Nettó összesen: 107 811 Ft',
    'Batthyány utca 20',
  ].join('\n'));
  const nevek = t.map((x) => [x.cikk, x.mennyiseg, x.egyseg]);
  assert.deepEqual(nevek.slice(0, 4), [
    ['Lemezes hőcserélő 30 lemezes', 1, 'db'], ['Tömítés 3/4 col', 2, 'db'], ['Golyóscsap 3/4 col', 3, 'db'],
    ['Pipelife KAEM lefolyócső 110/0,5 m', 3, 'db']]);
  assert.equal(t.length, 4 + valodi.length);
  const fischer = t.find((x) => x.cikk.startsWith('Fischer'));
  assert.deepEqual([fischer.cikk, fischer.cikkszam, fischer.mennyiseg], ['Fischer ED 18 beütőszeg 200 db/doboz', undefined, 200]);
  assert.deepEqual(t.find((x) => x.cikk.startsWith('Rothenberger')).mennyiseg, 0.3);
});
