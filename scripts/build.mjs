// A program egy fájlba csomagolása (dist/app.js), és a hivatkozás frissítése
// az index.html-ben a tartalomból számolt verzióval. Így a telefon böngészője
// nem keverhet régi és új fájlokat: minden frissítés új címen töltődik be.
//
// Használat: npm run build   (minden módosítás után, feltöltés előtt)

import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const gyoker = new URL('..', import.meta.url);
const ut = (p) => new URL(p, gyoker).pathname;

await build({
  entryPoints: [ut('src/app.js')],
  bundle: true,
  format: 'esm',
  target: ['es2020', 'safari14'],
  minify: true,
  outfile: ut('dist/app.js'),
  logLevel: 'warning',
});

const verzio = createHash('sha256').update(readFileSync(ut('dist/app.js'))).digest('hex').slice(0, 10);
const indexUt = ut('index.html');
const index = readFileSync(indexUt, 'utf8');
const uj = index.replace(/src="dist\/app\.js(\?v=[\w]+)?"/, `src="dist/app.js?v=${verzio}"`);
if (uj === index && !index.includes(`dist/app.js?v=${verzio}`)) {
  throw new Error('Az index.html-ben nincs dist/app.js hivatkozás.');
}
writeFileSync(indexUt, uj);
console.log(`dist/app.js kész, verzió: ${verzio}`);
