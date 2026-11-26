import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  parseKonyvtar, gyujtAnyaglista, idomHuvelyei, huvelyEltetesek, anyaglistaSzoveg,
} from '../src/anyaglista.js';
import { KIALLAS_TIPUSOK, uresProjekt } from '../src/munkadij.js';

const konyvtar = parseKonyvtar(readFileSync(new URL('../data/kiallas-konyvtar.csv', import.meta.url), 'utf8'));

const projekt = (kiallasok, egyeb = {}) => ({
  ...uresProjekt(),
  kiallasok: { ...uresProjekt().kiallasok, ...kiallasok },
  ...egyeb,
});
const tetel = (e, cikk) => e.sorok.find((s) => s.cikk === cikk);

test('minden kiállástípusnak van csomagja', () => {
  for (const { nev } of KIALLAS_TIPUSOK) assert.ok(konyvtar.has(nev), nev);
  assert.equal(konyvtar.size, 9);
});

test('hüvelyszabály: idomok', () => {
  assert.deepEqual(idomHuvelyei('Rehau PX 20-16-20 T-idom'), [20, 16, 20]);
  assert.deepEqual(idomHuvelyei('Rehau PX 20 T-idom'), [20, 20, 20]);
  assert.deepEqual(idomHuvelyei('Rehau RX+ 16-os falikorong (1/2 col)'), [16]);
  assert.deepEqual(idomHuvelyei('Rehau RX 20-as falikorong (1/2 col)'), [20]);
  assert.deepEqual(idomHuvelyei('Rehau PX 20 könyök'), [20, 20]);
  assert.deepEqual(idomHuvelyei('Rehau PX 20-16 toldóidom'), [20, 16]);
  assert.deepEqual(idomHuvelyei('Rehau PX 20 toldóhüvely'), []);
});

test('a könyvtár minden csomagja megfelel a hüvelyszabálynak', () => {
  for (const [nev, csomag] of konyvtar) assert.deepEqual(huvelyEltetesek(csomag), [], nev);
});

test('mennyiségek a kiállások számával szorzódnak és összeadódnak', () => {
  const e = gyujtAnyaglista(projekt({ wc_tartaly: 2, mosdo: 1 }), konyvtar);
  assert.deepEqual(e.figyelmeztetesek, []);
  // WC: 2 × 1 T-idom, mosdó: 2 T-idom
  assert.equal(tetel(e, 'Rehau PX 20-16-20 T-idom').mennyiseg, 4);
  // WC: 2 × 2 fm, mosdó: 2 fm
  assert.equal(tetel(e, 'Rehau Rautitan Stabil cső 16,2x2,6 mm').mennyiseg, 6);
  assert.equal(tetel(e, 'Grohe Rapid SL WC-tartály (nyomólap nélkül)').mennyiseg, 2);
  assert.equal(tetel(e, 'Grohe Rapid SL fali rögzítő idom').egyseg, 'pár');
});

test('gerinc: cső és csőhéj méterben, a csomagokhoz adva', () => {
  const e = gyujtAnyaglista(projekt({ mosogep: 1 }, { gerinc: { 16: 0, 20: 15 } }), konyvtar);
  assert.equal(tetel(e, 'Rehau Rautitan Stabil cső 20x2,9 mm').mennyiseg, 15);
  assert.equal(tetel(e, 'Kaiflex csőhéj 4x22 mm').mennyiseg, 15);
  assert.equal(tetel(e, 'Rehau Rautitan Stabil cső 16,2x2,6 mm').mennyiseg, 2);
});

test('felülírás: a projekt saját csomagja a könyvtári helyett, hüvely-ellenőrzéssel', () => {
  const sajat = [
    { cikk: 'Más WC-tartály', mennyiseg: 1, egyseg: 'db' },
    { cikk: 'Rehau PX 20-16-20 T-idom', mennyiseg: 1, egyseg: 'db' },
    { cikk: 'Rehau PX 20 toldóhüvely', mennyiseg: 2, egyseg: 'db' },
  ];
  const e = gyujtAnyaglista(projekt({ wc_tartaly: 1 }, { felulirasok: { 'WC-tartály': sajat } }), konyvtar);
  assert.ok(tetel(e, 'Más WC-tartály'));
  assert.equal(tetel(e, 'Grohe Rapid SL WC-tartály (nyomólap nélkül)'), undefined);
  assert.equal(e.figyelmeztetesek.length, 1);
  assert.match(e.figyelmeztetesek[0], /1 db 16-as/);
});

test('a könyvtár nem változik a felülírástól', () => {
  const elotte = JSON.stringify([...konyvtar]);
  gyujtAnyaglista(projekt({ wc_tartaly: 3 }, { felulirasok: { 'WC-tartály': [] } }), konyvtar);
  assert.equal(JSON.stringify([...konyvtar]), elotte);
});

test('e-mail szöveg', () => {
  assert.equal(
    anyaglistaSzoveg([
      { cikk: 'Cső', mennyiseg: 2.5, egyseg: 'fm' },
      { cikk: 'Idom', mennyiseg: 3, egyseg: 'db' },
    ]),
    '1. Cső – 2,5 fm\n\n2. Idom – 3 db',
  );
});

test('egyéb munkához rendelt anyag a mennyiséggel szorozva kerül a listára', () => {
  const sajat = [{ kod: 'sajat-hocserelo', tetel: 'Hőcserélő csere', anyag: [{ cikk: 'Lemezes hőcserélő', mennyiseg: 1, egyseg: 'db' }, { cikk: 'Tömítés', mennyiseg: 2, egyseg: 'db' }] }];
  const e = gyujtAnyaglista(projekt({}, { egyeb: { 'sajat-hocserelo': 3 } }), konyvtar, sajat);
  assert.equal(tetel(e, 'Lemezes hőcserélő').mennyiseg, 3);
  assert.equal(tetel(e, 'Tömítés').mennyiseg, 6);
  assert.equal(gyujtAnyaglista(projekt({}), konyvtar, sajat).sorok.length, 0);
});

test('gerinc anyaga módosítható (1 fm-re számolva)', async () => {
  const { gerincAlapAnyag } = await import('../src/anyaglista.js');
  assert.equal(gerincAlapAnyag(20).length, 2);
  const e = gyujtAnyaglista(projekt({}, { gerinc: { 16: 0, 20: 10 } }), konyvtar, [],
    { 20: [{ cikk: 'Rehau Rautitan Stabil cső 20x2,9 mm', mennyiseg: 1, egyseg: 'fm' }, { cikk: 'Csőbilincs 20', mennyiseg: 2, egyseg: 'db' }] });
  assert.equal(tetel(e, 'Csőbilincs 20').mennyiseg, 20);
  assert.equal(tetel(e, 'Kaiflex csőhéj 4x22 mm'), undefined);
});

test('saját kiállás: a csomagja a mennyiséggel szorozva, és alapszerelés jár utána', async () => {
  const { szamolMunkadij } = await import('../src/munkadij.js');
  const { parseMunkadijTabla } = await import('../src/csv.js');
  const tabla = parseMunkadijTabla(readFileSync(new URL('../data/munkadij.csv', import.meta.url), 'utf8'));
  const k = new Map(konyvtar);
  k.set('Bidé', [{ cikk: 'Bidé csaptelep bekötő', mennyiseg: 1, egyseg: 'db' }]);
  const p = projekt({ 'sajat-k-bide': 2 });
  const e = gyujtAnyaglista(p, k, [], {}, [{ kod: 'sajat-k-bide', nev: 'Bidé' }]);
  assert.equal(tetel(e, 'Bidé csaptelep bekötő').mennyiseg, 2);
  assert.equal(szamolMunkadij(p, tabla).osszesen, 2 * 45000);
});
