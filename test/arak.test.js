import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSzam, boltValaszBeolvasas, ajanlat, tetelKulcs, ujTetelJelolt } from '../src/arak.js';

const sorok = [
  { cikk: 'Rehau PX 20-16-20 T-idom', egyseg: 'db', mennyiseg: 4, cikkszam: '' },
  { cikk: 'Rehau PX 20 T-idom', egyseg: 'db', mennyiseg: 2, cikkszam: '' },
  { cikk: 'Rehau Rautitan Stabil cső 16,2x2,6 mm', egyseg: 'fm', mennyiseg: 6, cikkszam: '' },
  { cikk: 'Kaiflex csőhéj 4x18 mm', egyseg: 'fm', mennyiseg: 6, cikkszam: '' },
  { cikk: 'Grohe Rapid SL WC-tartály (nyomólap nélkül)', egyseg: 'db', mennyiseg: 1, cikkszam: '38340001' },
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

test('cikkszám alapján, eltérő megnevezéssel', () => {
  const e = boltValaszBeolvasas('38340001 GROHE nyomóöblítő tartály  1  48 900  41 500', sorok);
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

test('új tétel javaslat: cikkszám, mennyiség, egység, ár', () => {
  assert.deepEqual(
    { ...ujTetelJelolt('55120\tGeberit Duofix szerelőelem\t1 db\t89 900\t79 500'), sor: undefined },
    { cikk: 'Geberit Duofix szerelőelem', cikkszam: '55120', mennyiseg: 1, egyseg: 'db',
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
