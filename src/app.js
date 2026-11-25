import { parseMunkadijTabla } from './csv.js';
import { KIALLAS_TIPUSOK, SZERELVENY_KODOK, szamolMunkadij, uresProjekt } from './munkadij.js';
import { parseKonyvtar, gyujtAnyaglista, anyaglistaSzoveg } from './anyaglista.js';

const MENTES_KULCS = 'arajanlat.projekt';
const ft = new Intl.NumberFormat('hu-HU');
const form = document.getElementById('projekt');
const eredmenyEl = document.getElementById('eredmeny');

function escape(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

function szamMezo(nev, cimke) {
  return `<label><span>${escape(cimke)}</span><input type="number" min="0" name="${nev}"></label>`;
}

function felepit(tabla) {
  document.getElementById('kiallasok').innerHTML = KIALLAS_TIPUSOK
    .map((t) => szamMezo(`kiallasok.${t.kod}`, t.nev)).join('');
  document.getElementById('szerelvenyek').innerHTML = SZERELVENY_KODOK
    .map((kod) => szamMezo(`szerelvenyek.${kod}`, tabla.get(kod).tetel)).join('');
}

function olvas() {
  const p = uresProjekt();
  for (const el of form.elements) {
    if (!el.name) continue;
    const ertek = el.type === 'checkbox' ? el.checked
      : el.type === 'number' ? Number(el.value || 0)
      : el.value;
    const [a, b] = el.name.split('.');
    if (b) p[a][b] = ertek; else p[a] = ertek;
  }
  return p;
}

function kitolt(p) {
  for (const el of form.elements) {
    if (!el.name) continue;
    const [a, b] = el.name.split('.');
    const ertek = b ? p[a]?.[b] : p[a];
    if (ertek === undefined) continue;
    if (el.type === 'checkbox') el.checked = Boolean(ertek);
    else if (el.type === 'number') el.value = ertek ? ertek : '';
    else el.value = ertek;
  }
}

function megjelenit(e) {
  const figy = e.figyelmeztetesek.map((f) => `<p class="warn">${escape(f)}</p>`).join('');
  if (e.sorok.length === 0) {
    eredmenyEl.innerHTML = figy + '<p class="muted">Adj meg legalább egy tételt.</p>';
    return;
  }
  const sorok = e.sorok.map((s) => `
    <tr>
      <td>${escape(s.tetel)}${s.megjegyzes ? `<div class="muted">${escape(s.megjegyzes)}</div>` : ''}</td>
      <td class="num">${ft.format(s.mennyiseg)} ${escape(s.egyseg)}</td>
      <td class="num hide-sm">${ft.format(s.egysegar)}</td>
      <td class="num">${ft.format(s.osszeg)} Ft</td>
    </tr>`).join('');
  eredmenyEl.innerHTML = `${figy}
    <table>
      <thead><tr><th>Tétel</th><th class="num">Menny.</th><th class="num hide-sm">Egységár</th><th class="num">Összeg</th></tr></thead>
      <tbody>${sorok}</tbody>
      <tfoot><tr><td colspan="2">Összesen</td><td class="hide-sm"></td><td class="num">${ft.format(e.osszesen)} Ft</td></tr></tfoot>
    </table>`;
}

const anyagEl = document.getElementById('anyaglista');
let anyagSzoveg = '';

function megjelenitAnyag(e) {
  const figy = e.figyelmeztetesek.map((f) => `<p class="warn">${escape(f)}</p>`).join('');
  anyagSzoveg = anyaglistaSzoveg(e.sorok);
  const email = document.getElementById('email');
  email.href = `mailto:?subject=${encodeURIComponent('Árajánlatkérés – anyaglista')}`
    + `&body=${encodeURIComponent(`Kérem az alábbi tételek bolti és kedvezményes árát:\n\n${anyagSzoveg}\n`)}`;
  document.querySelector('#anyaglista + .actions').hidden = e.sorok.length === 0;
  if (e.sorok.length === 0) {
    anyagEl.innerHTML = figy + '<p class="muted">Adj meg kiállást vagy gerincet.</p>';
    return;
  }
  const vanCikkszam = e.sorok.some((s) => s.cikkszam);
  const sorok = e.sorok.map((s) => `
    <tr>
      ${vanCikkszam ? `<td>${escape(s.cikkszam)}</td>` : ''}
      <td>${escape(s.cikk)}</td>
      <td class="num">${ft.format(s.mennyiseg)} ${escape(s.egyseg)}</td>
    </tr>`).join('');
  anyagEl.innerHTML = `${figy}
    <table>
      <thead><tr>${vanCikkszam ? '<th>Cikkszám</th>' : ''}<th>Cikk</th><th class="num">Mennyiség</th></tr></thead>
      <tbody>${sorok}</tbody>
    </table>`;
}

function frissit(tabla, konyvtar) {
  const p = olvas();
  document.getElementById('puffer-sor').hidden = p.hotermelo !== 'vegyes';
  document.getElementById('felar-hsz-sor').hidden = p.hotermelo !== 'hoszivattyu';
  try { localStorage.setItem(MENTES_KULCS, JSON.stringify(p)); } catch { /* nem kötelező */ }
  try {
    megjelenit(szamolMunkadij(p, tabla));
  } catch (err) {
    eredmenyEl.innerHTML = `<p class="error">${escape(err.message)}</p>`;
  }
  try {
    megjelenitAnyag(gyujtAnyaglista(p, konyvtar));
  } catch (err) {
    anyagEl.innerHTML = `<p class="error">${escape(err.message)}</p>`;
  }
}

async function betolt(utvonal, nev) {
  const valasz = await fetch(utvonal);
  if (!valasz.ok) throw new Error(`A(z) ${nev} nem tölthető be (${valasz.status}).`);
  return valasz.text();
}

async function indit() {
  try {
    const [tablaCsv, konyvtarCsv] = await Promise.all([
      betolt('data/munkadij.csv', 'munkadíj-táblázat'),
      betolt('data/kiallas-konyvtar.csv', 'kiállás-könyvtár'),
    ]);
    const tabla = parseMunkadijTabla(tablaCsv);
    const konyvtar = parseKonyvtar(konyvtarCsv);
    felepit(tabla);
    let mentett = null;
    try { mentett = JSON.parse(localStorage.getItem(MENTES_KULCS)); } catch { /* nincs mentés */ }
    if (mentett) kitolt(mentett);
    form.addEventListener('input', () => frissit(tabla, konyvtar));
    document.getElementById('masol').addEventListener('click', async () => {
      const uzenet = document.getElementById('masol-uzenet');
      try {
        await navigator.clipboard.writeText(anyagSzoveg);
        uzenet.textContent = 'Vágólapra másolva.';
      } catch {
        uzenet.textContent = 'A másolás nem sikerült; használd az E-mail gombot.';
      }
    });
    frissit(tabla, konyvtar);
  } catch (err) {
    eredmenyEl.innerHTML = `<p class="error">${escape(err.message)}</p>`;
    anyagEl.innerHTML = '';
  }
}

indit();
