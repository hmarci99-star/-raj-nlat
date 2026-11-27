import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diktaltTetelek, szamszo } from '../src/diktalas.js';

const t = (cikk, mennyiseg, egyseg) => ({ cikk, mennyiseg, egyseg });

test('számszavak', () => {
  assert.equal(szamszo('három'), 3);
  assert.equal(szamszo('két'), 2);
  assert.equal(szamszo('tizenkettő'), 12);
  assert.equal(szamszo('huszonöt'), 25);
  assert.equal(szamszo('fél'), 0.5);
  assert.equal(szamszo('2,5'), 2.5);
  assert.equal(szamszo('cső'), null);
});

test('egy tétel: mennyiség és egység a végén', () => {
  assert.deepEqual(diktaltTetelek('teflon szalag két darab'), [t('Teflon szalag', 2, 'db')]);
  assert.deepEqual(diktaltTetelek('Kaiflex csőhéj 4x22 6 méter'), [t('Kaiflex csőhéj 4x22', 6, 'fm')]);
});

test('mennyiség az elején', () => {
  assert.deepEqual(diktaltTetelek('három darab golyóscsap'), [t('Golyóscsap', 3, 'db')]);
  assert.deepEqual(diktaltTetelek('két és fél méter 20-as cső'), [t('20-as cső', 2.5, 'fm')]);
});

test('több tétel egy mondatban, col-méretek', () => {
  assert.deepEqual(
    diktaltTetelek('teflon szalag két darab, golyóscsap fél col három darab és sarokszelep háromnegyed col 2 db'),
    [t('Teflon szalag', 2, 'db'), t('Golyóscsap 1/2 col', 3, 'db'), t('Sarokszelep 3/4 col', 2, 'db')],
  );
});

test('mennyiség nélkül 1 db; szám a végén egység nélkül', () => {
  assert.deepEqual(diktaltTetelek('szifon'), [t('Szifon', 1, 'db')]);
  assert.deepEqual(diktaltTetelek('mosdószifon 3'), [t('Mosdószifon', 3, 'db')]);
  assert.deepEqual(diktaltTetelek('golyóscsap fél col'), [t('Golyóscsap 1/2 col', 1, 'db')]);
});

test('"következő" és "meg" is elválaszt, üres részek kimaradnak', () => {
  assert.deepEqual(
    diktaltTetelek('kender egy csomag következő tétel tömítőpaszta egy doboz meg csavar tíz darab.'),
    [t('Kender', 1, 'csomag'), t('Tömítőpaszta', 1, 'doboz'), t('Csavar', 10, 'db')],
  );
  assert.deepEqual(diktaltTetelek(' , és '), []);
});
