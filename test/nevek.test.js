import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasonloNevek, nevKulcs } from '../src/nevek.js';

const ismert = [
  'Rehau Rautitan Stabil cső 16,2x2,6 mm',
  'Rehau Rautitan Stabil cső 20x2,9 mm',
  'Rehau PX 20 T-idom',
  'Rehau PX 20-16-20 T-idom',
  'Kaiflex csőhéj 4x22 mm',
  'Pipelife KAEM lefolyócső 50/0,5 m',
  'Rehau RX+ 16-os falikorong (1/2 col)',
];

test('másképp írt név: a méret dönt, a sorrend és a ragozás mindegy', () => {
  assert.equal(hasonloNevek('20-as rehau cső', ismert)[0], 'Rehau Rautitan Stabil cső 20x2,9 mm');
  assert.equal(hasonloNevek('Rehau 20-as cső', ismert)[0], 'Rehau Rautitan Stabil cső 20x2,9 mm');
  assert.equal(hasonloNevek('t-idom rehau 20', ismert)[0], 'Rehau PX 20 T-idom');
  assert.equal(hasonloNevek('rehau 16-os cső', ismert)[0], 'Rehau Rautitan Stabil cső 16,2x2,6 mm');
  assert.equal(hasonloNevek('16-os falikorong', ismert)[0], 'Rehau RX+ 16-os falikorong (1/2 col)');
  assert.equal(hasonloNevek('Kaiflex csohej 4x22', ismert)[0], 'Kaiflex csőhéj 4x22 mm');
});

test('más méret nem hasonló; pontos egyezésnél nincs javaslat', () => {
  assert.ok(!hasonloNevek('rehau 25-ös cső', ismert).length);
  assert.deepEqual(hasonloNevek('rehau px 20 t-idom', ismert), []);
  assert.deepEqual(hasonloNevek('Geberit nyomólap', ismert), []);
});

test('név kulcs: sorrendtől és írásmódtól független', () => {
  assert.equal(nevKulcs('Rehau 20-as cső'), nevKulcs('cső Rehau 20 as'));
});
