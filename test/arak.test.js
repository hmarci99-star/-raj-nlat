import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSzam, boltValaszBeolvasas, ajanlat, tetelKulcs } from '../src/arak.js';

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

test('ismeretlen tétel a nem illesztettek közé kerül', () => {
  const e = boltValaszBeolvasas('Szállítási díj\t1\t5 000\t5 000\nKöszönjük a megkeresést!', sorok);
  assert.equal(e.arak.size, 0);
  assert.deepEqual(e.nemIllesztett, ['Szállítási díj\t1\t5 000\t5 000']);
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
