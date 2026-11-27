import { test } from 'node:test';
import assert from 'node:assert/strict';
import { osszevetes, memoriaRogzit, dragulasok, dragulasJel, becsles, mentesEsedekes } from '../src/boltok.js';

const sorok = [
  { kulcs: 'a', cikk: 'Cső', mennyiseg: 10, egyseg: 'fm' },
  { kulcs: 'b', cikk: 'T-idom', mennyiseg: 4, egyseg: 'db' },
  { kulcs: 'c', cikk: 'Csap', mennyiseg: 1, egyseg: 'db' },
];

test('összevetés: oszlopösszegek, közös tételek, legolcsóbb tételenként', () => {
  const e = osszevetes(sorok, [
    { nev: 'Jelenlegi', arak: { a: 1000, b: 2000, c: 5000 } },
    { nev: 'B bolt', arak: { a: 900, b: 2100 } },
  ]);
  assert.deepEqual(e.osszesek.map((o) => [o.osszeg, o.db, o.kozosOsszeg]), [[23000, 3, 18000], [17400, 2, 17400]]);
  assert.equal(e.kozosDb, 2);
  assert.deepEqual(e.tetelek[0].legolcsobb, [false, true]);
  assert.deepEqual(e.tetelek[1].legolcsobb, [true, false]);
  assert.deepEqual(e.tetelek[2].legolcsobb, [false, false]); // csak egy ár van: nincs mihez hasonlítani
  assert.equal(e.legolcsobbOsszeg, 9000 + 8000 + 5000);
});

test('ármemória: rögzítés, előző ár megőrzése, régebbi dátum nem ír felül', () => {
  let m = memoriaRogzit({}, { a: { bolti: 1000, kedvezmenyes: 800 } }, '2026-10-01');
  m = memoriaRogzit(m, { a: { bolti: 1200 } }, '2026-11-20');
  assert.deepEqual(m.a, { bolti: 1200, kedvezmenyes: 800, datum: '2026-11-20', elozo: { bolti: 1000, datum: '2026-10-01' } });
  const regi = memoriaRogzit(m, { a: { bolti: 900 } }, '2026-09-01');
  assert.equal(regi.a.bolti, 1200);
  assert.equal(memoriaRogzit(m, { a: { bolti: 1200 } }, '2026-11-25'), m); // nincs változás
});

test('drágulás: 15% felett jelez, a nagyobb elöl', () => {
  const m = { a: { bolti: 1000, datum: '2026-10-01' }, b: { bolti: 2000, kedvezmenyes: 1500, datum: '2026-10-01' } };
  const d = dragulasok(m, { a: { bolti: 1100 }, b: { bolti: 2600, kedvezmenyes: 1800 }, c: { bolti: 5 } });
  assert.deepEqual(d.map((x) => [x.kulcs, x.mezo, Math.round(x.arany * 100)]), [['b', 'bolti', 30], ['b', 'kedvezmenyes', 20]]);
  const bej = memoriaRogzit(m, { b: { bolti: 2600 } }, '2026-11-20').b;
  assert.equal(Math.round(dragulasJel(bej, 'bolti', 2600).arany * 100), 30);
  assert.equal(dragulasJel(bej, 'bolti', 2500), null); // kézzel átírva: már nem az, amit a memória mutat
});

test('becslés: jelenlegi ár, különben a korábbi', () => {
  const e = becsles(sorok, { a: { bolti: 1000 } }, { a: { bolti: 1 }, b: { bolti: 2000 } });
  assert.deepEqual(e, { osszeg: 10000 + 8000, jelenlegi: 1, korabbi: 1, hianyzik: 1 });
});

test('mentésre emlékeztetés: 7 nap után, halasztással', () => {
  const nap = 86400000;
  const most = 100 * nap;
  assert.equal(mentesEsedekes({ vanAdat: false, most }), false);
  assert.equal(mentesEsedekes({ vanAdat: true, most }), true);
  assert.equal(mentesEsedekes({ vanAdat: true, utolso: most - 3 * nap, most }), false);
  assert.equal(mentesEsedekes({ vanAdat: true, utolso: most - 8 * nap, most }), true);
  assert.equal(mentesEsedekes({ vanAdat: true, utolso: most - 8 * nap, halasztva: most + nap, most }), false);
});
