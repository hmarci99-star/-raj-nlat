import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALLAPOTOK, elfogadott, osszesites, szur, evek, profit, exportAdat, importAdat, javasoltAllapot,
} from '../src/ajanlatok.js';

const aj = (id, allapot, datum, munkadij, anyagHaszon, vegosszeg, modositva = datum) =>
  ({ id, allapot, datum, letrehozva: datum, modositva, osszeg: { munkadij, anyagHaszon, vegosszeg } });

const lista = [
  aj('a', 'elfogadva', '2026-03-01', 300000, 50000, 900000),
  aj('b', 'kesz', '2026-05-10', 200000, 30000, 600000),
  aj('c', 'elkuldve', '2026-06-01', 100000, 20000, 400000),
  aj('d', 'elutasitva', '2026-07-01', 150000, 25000, 500000),
  aj('e', 'felmeres', '2026-08-01', 0, 0, 0),
  aj('f', 'kivitelezes', '2025-11-20', 400000, 80000, 1500000),
];

test('állapotok: az elfogadott, kivitelezés és kész számít elfogadottnak', () => {
  assert.equal(ALLAPOTOK.length, 8);
  assert.ok(elfogadott('elfogadva') && elfogadott('kivitelezes') && elfogadott('kesz'));
  assert.ok(!elfogadott('elkuldve') && !elfogadott('elutasitva') && !elfogadott('felmeres'));
});

test('profit = munkadíj + anyagon maradó haszon', () => {
  assert.equal(profit({ munkadij: 300000, anyagHaszon: 50000 }), 350000);
  assert.equal(profit(undefined), 0);
});

test('összesítés évre és összesen', () => {
  const o26 = osszesites(lista, '2026');
  assert.equal(o26.elfogadottDb, 2);
  assert.equal(o26.profit, 300000 + 50000 + 200000 + 30000);
  assert.equal(o26.bevetel, 1500000);
  assert.equal(o26.fuggoDb, 1);
  assert.equal(o26.fuggoErtek, 400000);
  assert.equal(o26.elfogadasiArany, 2 / 3);
  const mind = osszesites(lista);
  assert.equal(mind.elfogadottDb, 3);
  assert.equal(mind.profit, 580000 + 480000);
  assert.equal(osszesites([]).elfogadasiArany, null);
});

test('szűrés és rendezés (legutóbb módosított elöl), évek', () => {
  assert.deepEqual(szur(lista, 'elfogadva').map((a) => a.id), ['b', 'a', 'f']);
  assert.deepEqual(szur(lista, 'mind', '2025').map((a) => a.id), ['f']);
  assert.deepEqual(evek(lista), ['2026', '2025']);
  assert.equal(javasoltAllapot(true), 'arak-megjottek');
});

test('mentés fájlba és vissza: összefésülés, a frissebb marad', () => {
  const fajl = exportAdat([aj('a', 'kesz', '2026-03-01', 1, 1, 1, '2026-09-01'), aj('z', 'elkuldve', '2026-09-02', 1, 1, 1)]);
  const r = importAdat(fajl, lista);
  assert.equal(r.uj, 1);
  assert.equal(r.frissitett, 1);
  assert.equal(r.ajanlatok.find((a) => a.id === 'a').allapot, 'kesz');
  assert.equal(r.ajanlatok.length, lista.length + 1);
  assert.throws(() => importAdat('{"x":1}', lista), /mentésfájl/);
  assert.throws(() => importAdat('nem json', lista), /mentésfájl/);
});
