import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCsv, parseMunkadijTabla } from '../src/csv.js';
import { szamolMunkadij, uresProjekt, SZERELVENY_KODOK, HOTERMELOK } from '../src/munkadij.js';

const tabla = parseMunkadijTabla(readFileSync(new URL('../data/munkadij.csv', import.meta.url), 'utf8'));

const projekt = (felulir) => ({ ...uresProjekt(), ...felulir });
const sor = (eredmeny, kod) => eredmeny.sorok.find((s) => s.kod === kod);

test('CSV: idézőjeles mező vesszővel', () => {
  assert.deepEqual(parseCsv('a,"b, c",d\n1,"x ""y""",3\n'), [
    ['a', 'b, c', 'd'],
    ['1', 'x "y"', '3'],
  ]);
});

test('a táblázat minden kódot tartalmaz, amit a számítás használ', () => {
  for (const kod of [...SZERELVENY_KODOK, ...Object.values(HOTERMELOK).filter(Boolean)]) {
    assert.ok(tabla.has(kod), kod);
  }
  assert.equal(tabla.get('mosdo_sima').tetel, 'Mosdó, sima, falra rögzített');
  assert.equal(tabla.get('hoszivattyu').egysegar, 240000);
});

test('üres projekt: nulla', () => {
  const e = szamolMunkadij(uresProjekt(), tabla);
  assert.equal(e.osszesen, 0);
  assert.equal(e.sorok.length, 0);
});

test('alapszerelés = kiállások összege', () => {
  const p = projekt({ kiallasok: { ...uresProjekt().kiallasok, wc_tartaly: 2, mosdo: 2, konyha: 1 } });
  const e = szamolMunkadij(p, tabla);
  assert.equal(sor(e, 'viz_alapszereles').mennyiseg, 5);
  assert.equal(e.osszesen, 5 * 45000);
});

test('gázkazán csak radiátorral: nincs felár', () => {
  const e = szamolMunkadij(projekt({ radiatorKiallas: 8, radiatorFelszereles: 8, hotermelo: 'gaz' }), tabla);
  assert.equal(sor(e, 'felar_vegyes_kor'), undefined);
  assert.equal(e.osszesen, 8 * 45000 + 8 * 5000 + 150000);
});

test('gázkazán radiátor + padlófűtés: felár egyszer', () => {
  const e = szamolMunkadij(projekt({ radiatorKiallas: 5, padlofutesKor: 4, hotermelo: 'gaz' }), tabla);
  assert.equal(sor(e, 'felar_vegyes_kor').mennyiseg, 1);
  assert.equal(e.osszesen, 5 * 45000 + 4 * 50000 + 150000 + 60000);
});

test('hőszivattyú vegyes körrel: felár csak bekapcsolva', () => {
  const alap = { radiatorKiallas: 2, padlofutesKor: 3, hotermelo: 'hoszivattyu' };
  assert.equal(sor(szamolMunkadij(projekt(alap), tabla), 'felar_vegyes_kor'), undefined);
  const e = szamolMunkadij(projekt({ ...alap, felarHoszivattyunal: true }), tabla);
  assert.equal(sor(e, 'felar_vegyes_kor').mennyiseg, 1);
});

test('puffer: vegyes kazánnál felszámolva, hőszivattyúnál nem', () => {
  const v = szamolMunkadij(projekt({ hotermelo: 'vegyes', puffer: true }), tabla);
  assert.equal(v.osszesen, 220000 + 80000);
  const h = szamolMunkadij(projekt({ hotermelo: 'hoszivattyu', puffer: true }), tabla);
  assert.equal(h.osszesen, 240000);
  assert.equal(h.figyelmeztetesek.length, 1);
});

test('fűtési kör hőtermelő nélkül: figyelmeztetés', () => {
  const e = szamolMunkadij(projekt({ padlofutesKor: 2 }), tabla);
  assert.equal(e.figyelmeztetesek.length, 1);
});

test('külső szerelés folyóméterrel, szerelvények', () => {
  const p = projekt({
    kulsoVizFm: 12,
    kulsoSzennyvizFm: 10,
    szerelvenyek: { ...uresProjekt().szerelvenyek, wc: 2, mosdo_butoros: 1, zuhanykabin_kozepes: 1 },
  });
  const e = szamolMunkadij(p, tabla);
  assert.equal(e.osszesen, 12 * 3000 + 10 * 6000 + 2 * 20000 + 30000 + 75000);
});

test('egyéb (saját) munkák: a táblázathoz adva számolódnak, ismeretlen kód kimarad', () => {
  const t = new Map(tabla);
  t.set('sajat-hocserelo', { kod: 'sajat-hocserelo', tetel: 'Hőcserélő csere', egyseg: 'db', egysegar: 35000, megjegyzes: '' });
  const p = projekt({ egyeb: { 'sajat-hocserelo': 2, 'sajat-torolt': 1 } });
  const e = szamolMunkadij(p, t);
  assert.equal(sor(e, 'sajat-hocserelo').osszeg, 70000);
  assert.equal(e.osszesen, 70000);
  assert.equal(e.figyelmeztetesek.length, 1);
});

test('kiállásonkénti munkadíj: a saját árú kiállás külön sorban, a többi együtt', () => {
  const t = new Map(tabla);
  t.set('alapszereles:konyha', { kod: 'alapszereles:konyha', tetel: 'Vízszerelés alapszerelés – Konyha', egyseg: 'kiállás', egysegar: 55000, megjegyzes: '' });
  const p = projekt({ kiallasok: { ...uresProjekt().kiallasok, wc_tartaly: 2, konyha: 1 } });
  const e = szamolMunkadij(p, t);
  assert.equal(sor(e, 'viz_alapszereles').mennyiseg, 2);
  assert.equal(sor(e, 'alapszereles:konyha').osszeg, 55000);
  assert.equal(e.osszesen, 2 * 45000 + 55000);
});
