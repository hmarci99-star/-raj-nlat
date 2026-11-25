import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sorokbaRendez } from '../src/pdfszoveg.js';

const d = (str, x, y, w, h = 10) => ({ str, x, y, w, h });

test('sorok fentről lefelé, oszlopok tabulátorral', () => {
  const items = [
    d('2 100', 400, 680, 25),
    d('Rehau PX 20 T-idom', 50, 680, 90),
    d('1 600', 470, 681, 25), // kicsit eltérő alapvonal, ugyanaz a sor
    d('Rehau PX 20-16-20 T-idom', 50, 700, 120),
    d('2 450', 400, 700, 25),
    d('1 890', 470, 700, 25),
  ];
  assert.equal(sorokbaRendez(items),
    'Rehau PX 20-16-20 T-idom\t2 450\t1 890\nRehau PX 20 T-idom\t2 100\t1 600');
});

test('szétdarabolt szó és szóköz', () => {
  const items = [d('Kaiflex', 50, 500, 35), d('csőhéj', 87, 500, 30), d('4x', 120, 500, 10), d('18 mm', 130, 500, 25)];
  assert.equal(sorokbaRendez(items), 'Kaiflex csőhéj 4x18 mm');
});

test('üres darabok kimaradnak', () => {
  assert.equal(sorokbaRendez([d(' ', 10, 10, 3), d('', 20, 10, 0)]), '');
});

test('cellán belül tördelt megnevezés és szám visszakerül a sorába', () => {
  const items = [
    // előző teljes sor (y=600)
    d('31502', 40, 600, 25), d('Kaiflex csőhéj 4x18 mm', 90, 600, 100), d('2 fm', 260, 600, 18),
    d('420', 320, 600, 15), d('310', 380, 600, 15), d('620', 440, 600, 15),
    // tördelt sor: felső rész (y=582), középső (y=570), alsó (y=558)
    d('HL 440 mosógép-csatlakozó, golyós', 90, 582, 150), d('10', 440, 582, 10),
    d('55120', 40, 570, 25), d('1 db', 260, 570, 18), d('12 990', 320, 570, 28), d('10 500', 380, 570, 28),
    d('bűzzárral', 90, 558, 40), d('500', 440, 558, 15),
    // lábléc messzebb
    d('Összesen: 19 260 Ft', 40, 520, 90),
  ];
  assert.equal(sorokbaRendez(items), [
    '31502\tKaiflex csőhéj 4x18 mm\t2 fm\t420\t310\t620',
    '55120\tHL 440 mosógép-csatlakozó, golyós bűzzárral\t1 db\t12 990\t10 500\t10 500',
    'Összesen: 19 260 Ft',
  ].join('\n'));
});

test('a fejléc tördelt szava nem kerül az árak közé', () => {
  const items = [
    d('Lista', 320, 640, 20), d('Egyedi', 380, 640, 28),
    d('ár', 320, 628, 10), d('ár', 380, 628, 10),
    d('Rehau PX 20 T-idom', 90, 615, 90), d('2 db', 260, 615, 18), d('2 100', 320, 615, 25), d('1 600', 380, 615, 25),
  ];
  assert.equal(sorokbaRendez(items), 'Lista\tEgyedi\nRehau PX 20 T-idom\t2 db\t2 100\t1 600');
});
