import { parseMunkadijTabla } from './csv.js';
import { KIALLAS_TIPUSOK, SZERELVENY_KODOK, szamolMunkadij, uresProjekt } from './munkadij.js';

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

function frissit(tabla) {
  const p = olvas();
  document.getElementById('puffer-sor').hidden = p.hotermelo !== 'vegyes';
  document.getElementById('felar-hsz-sor').hidden = p.hotermelo !== 'hoszivattyu';
  try { localStorage.setItem(MENTES_KULCS, JSON.stringify(p)); } catch { /* nem kötelező */ }
  try {
    megjelenit(szamolMunkadij(p, tabla));
  } catch (err) {
    eredmenyEl.innerHTML = `<p class="error">${escape(err.message)}</p>`;
  }
}

async function indit() {
  try {
    const valasz = await fetch('data/munkadij.csv');
    if (!valasz.ok) throw new Error(`A munkadíj-táblázat nem tölthető be (${valasz.status}).`);
    const tabla = parseMunkadijTabla(await valasz.text());
    felepit(tabla);
    let mentett = null;
    try { mentett = JSON.parse(localStorage.getItem(MENTES_KULCS)); } catch { /* nincs mentés */ }
    if (mentett) kitolt(mentett);
    form.addEventListener('input', () => frissit(tabla));
    frissit(tabla);
  } catch (err) {
    eredmenyEl.innerHTML = `<p class="error">${escape(err.message)}</p>`;
  }
}

indit();
