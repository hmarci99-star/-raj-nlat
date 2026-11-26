import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseKonyvtar } from '../src/anyaglista.js';
import { bovitettKonyvtar, konyvtarCsv, bennVanAzAlapban } from '../src/konyvtar.js';

const csv = readFileSync(new URL('../data/kiallas-konyvtar.csv', import.meta.url), 'utf8');
const alap = parseKonyvtar(csv);
const uj = { kiallas: 'WC-tartály', cikk: 'Geberit nyomólap, fehér', mennyiseg: 1, egyseg: 'db' };

test('bővítés: új sor a kiállás csomagjában, az alap nem változik', () => {
  const k = bovitettKonyvtar(alap, [uj]);
  assert.equal(k.get('WC-tartály').length, alap.get('WC-tartály').length + 1);
  assert.equal(k.get('WC-tartály').at(-1).cikk, 'Geberit nyomólap, fehér');
  assert.ok(!alap.get('WC-tartály').some((s) => s.cikk === uj.cikk));
});

test('ami már benne van, nem duplázódik', () => {
  const meglevo = { kiallas: 'Mosógép', cikk: 'RPP 1/2 col próbadugó', mennyiseg: 5, egyseg: 'db' };
  assert.ok(bennVanAzAlapban(alap, meglevo));
  assert.equal(bovitettKonyvtar(alap, [meglevo]).get('Mosógép').length, alap.get('Mosógép').length);
});

test('CSV export: a beolvasással visszaolvasható, vesszős és tizedes értékkel is', () => {
  const k = bovitettKonyvtar(alap, [uj, { kiallas: 'Konyha', cikk: 'Cső "extra"', mennyiseg: 0.5, egyseg: 'fm' }]);
  const vissza = parseKonyvtar(konyvtarCsv(k));
  assert.deepEqual([...vissza], [...k]);
  assert.equal(konyvtarCsv(alap), csv);
});

test('kiállás-csomag szerkesztése: a felülírás lecseréli a csomagot, a többi változatlan', async () => {
  const { felulirtKonyvtar } = await import('../src/konyvtar.js');
  const k = felulirtKonyvtar(alap, { 'WC-tartály': [{ cikk: 'Geberit Duofix', mennyiseg: 1, egyseg: 'db' }] });
  assert.deepEqual(k.get('WC-tartály'), [{ cikk: 'Geberit Duofix', mennyiseg: 1, egyseg: 'db' }]);
  assert.deepEqual(k.get('Mosógép'), alap.get('Mosógép'));
  assert.ok(alap.get('WC-tartály').length > 1);
});
