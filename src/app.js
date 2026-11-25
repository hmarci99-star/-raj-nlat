import { parseMunkadijTabla } from './csv.js';
import { KIALLAS_TIPUSOK, SZERELVENY_KODOK, szamolMunkadij, uresProjekt } from './munkadij.js';
import { parseKonyvtar, gyujtAnyaglista, anyaglistaSzoveg } from './anyaglista.js';
import { boltValaszBeolvasas, ajanlat, tetelKulcs, parseSzam } from './arak.js';
import { bovitettKonyvtar, bennVanAzAlapban, konyvtarCsv } from './konyvtar.js';
import { ugyfelAjanlatHtml, belsoOsszesitoHtml, fajlnev } from './sablonok.js';
import { pdfSzoveg } from './pdfszoveg.js';

const MENTES_KULCS = 'arajanlat.projekt';
const ARAK_KULCS = 'arajanlat.arak';
const ADATOK_KULCS = 'arajanlat.adatok';
const PLUSZ_KULCS = 'arajanlat.plusz';
const BOVITES_KULCS = 'arajanlat.konyvtar-bovites';
const ft = new Intl.NumberFormat('hu-HU', { useGrouping: 'always' });
const $ = (id) => document.getElementById(id);
const form = $('projekt');

const allapot = {
  tabla: null,
  alapKonyvtar: null,
  konyvtar: null,
  bovitesek: [], // a könyvtárhoz a felületen hozzáadott sorok (az eszközön tárolva)
  plusz: [], // az ajánlathoz kézzel vagy a bolt PDF-jéből hozzáadott tételek
  jeloltek: {}, // a bolt válaszában talált, listán nem szereplő tételek, forrásonként
  projekt: null,
  konyvtarbaNyitva: null,
  munkadij: null,
  anyag: { sorok: [], figyelmeztetesek: [] },
  arak: {},
  arTablaAlairas: '',
  adatok: {},
};

function escape(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
const penz = (x) => (x === null || x === undefined ? '–' : `${ft.format(x)} Ft`);
const figyelmeztetesHtml = (lista) => lista.map((f) => `<p class="warn">${escape(f)}</p>`).join('');

function ment(kulcs, ertek) {
  try { localStorage.setItem(kulcs, JSON.stringify(ertek)); } catch { /* nem kötelező */ }
}
function betoltMentett(kulcs) {
  try { return JSON.parse(localStorage.getItem(kulcs)); } catch { return null; }
}

// ---- Projekt űrlap ----

function szamMezo(nev, cimke) {
  return `<label><span>${escape(cimke)}</span><input type="number" min="0" name="${nev}"></label>`;
}

function felepit() {
  $('kiallasok').innerHTML = KIALLAS_TIPUSOK.map((t) => szamMezo(`kiallasok.${t.kod}`, t.nev)).join('');
  $('szerelvenyek').innerHTML = SZERELVENY_KODOK
    .map((kod) => szamMezo(`szerelvenyek.${kod}`, allapot.tabla.get(kod).tetel)).join('');
  leptetok();
}

// − és + gomb minden számmező mellé. A lépés a mező step értéke (alapból 1), nulla alá nem megy.
function leptetok() {
  for (const input of form.querySelectorAll('input[type=number]')) {
    if (input.parentElement.classList.contains('lepteto')) continue;
    const cimke = input.closest('label')?.querySelector('span')?.textContent ?? '';
    const doboz = document.createElement('span');
    doboz.className = 'lepteto';
    input.replaceWith(doboz);
    const gomb = (jel, irany, felirat) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lepes';
      b.textContent = jel;
      b.setAttribute('aria-label', `${felirat}: ${cimke}`);
      b.addEventListener('click', (ev) => {
        ev.preventDefault();
        const lepes = Number(input.step) || 1;
        const uj = Math.max(0, Math.round(((Number(input.value) || 0) + irany * lepes) / lepes) * lepes);
        input.value = uj ? String(uj) : '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      return b;
    };
    doboz.append(gomb('−', -1, 'Csökkentés'), input, gomb('+', 1, 'Növelés'));
  }
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

// ---- Munkadíj ----

function munkadijHtml(e) {
  if (e.sorok.length === 0) return '<p class="muted">Adj meg legalább egy tételt.</p>';
  const sorok = e.sorok.map((s) => `
    <tr>
      <td>${escape(s.tetel)}${s.megjegyzes ? `<div class="muted">${escape(s.megjegyzes)}</div>` : ''}</td>
      <td class="num">${ft.format(s.mennyiseg)} ${escape(s.egyseg)}</td>
      <td class="num hide-sm">${ft.format(s.egysegar)}</td>
      <td class="num">${penz(s.osszeg)}</td>
    </tr>`).join('');
  return `
    <table>
      <thead><tr><th>Tétel</th><th class="num">Menny.</th><th class="num hide-sm">Egységár</th><th class="num">Összeg</th></tr></thead>
      <tbody>${sorok}</tbody>
      <tfoot><tr><td colspan="2">Munkadíj összesen</td><td class="hide-sm"></td><td class="num">${penz(e.osszesen)}</td></tr></tfoot>
    </table>`;
}

// ---- Anyaglista ----

const levelSzoveg = (lista) => `Szia!

A következő tételekről szeretnék kérni árajánlatot.
Köszönöm szépen előre is.

${lista}
`;

function megjelenitAnyag() {
  const e = allapot.anyag;
  const szoveg = anyaglistaSzoveg(e.sorok);
  $('email').href = `mailto:?subject=${encodeURIComponent('Árajánlatkérés – anyaglista')}`
    + `&body=${encodeURIComponent(levelSzoveg(szoveg))}`;
  $('anyag-gombok').hidden = e.sorok.length === 0;
  if (e.sorok.length === 0) {
    $('anyaglista').innerHTML = figyelmeztetesHtml(e.figyelmeztetesek)
      + '<p class="muted">Adj meg kiállást vagy gerincet.</p>';
    return;
  }
  const vanCikkszam = e.sorok.some((s) => s.cikkszam);
  const sorok = e.sorok.map((s) => `
    <tr>
      ${vanCikkszam ? `<td>${escape(s.cikkszam)}</td>` : ''}
      <td>${escape(s.cikk)}${s.plusz ? ' <span class="cimke">plusz</span>' : ''}</td>
      <td class="num">${ft.format(s.mennyiseg)} ${escape(s.egyseg)}</td>
    </tr>`).join('');
  $('anyaglista').innerHTML = `${figyelmeztetesHtml(e.figyelmeztetesek)}
    <table>
      <thead><tr>${vanCikkszam ? '<th>Cikkszám</th>' : ''}<th>Cikk</th><th class="num">Mennyiség</th></tr></thead>
      <tbody>${sorok}</tbody>
    </table>`;
}

// ---- Árak ----

const arMezo = (kulcs, mezo, ertek) => `<input type="text" inputmode="decimal" class="ar"
  data-kulcs="${escape(kulcs)}" data-mezo="${mezo}" value="${ertek ?? ''}" aria-label="${mezo === 'bolti' ? 'Bolti ár' : 'Kedvezményes ár'}">`;

// Csak akkor rajzolja újra, ha a tételek változtak, hogy gépelés közben ne vesszen el a fókusz.
function megjelenitArTabla(kenyszer = false) {
  const sorok = allapot.anyag.sorok;
  const alairas = sorok.map((s) => `${tetelKulcs(s)}=${s.mennyiseg}`).join('\n');
  if (!kenyszer && alairas === allapot.arTablaAlairas) return;
  allapot.arTablaAlairas = alairas;
  $('ar-szakasz').hidden = sorok.length === 0;
  $('ar-tabla').innerHTML = `
    <table class="ar-tabla">
      <thead><tr><th>Cikk</th><th class="num">Bolti ár<br>(bruttó)</th><th class="num">Kedv. ár<br>(bruttó)</th></tr></thead>
      <tbody>${sorok.map((s) => {
        const k = tetelKulcs(s);
        const ar = allapot.arak[k] ?? {};
        return `<tr>
          <td>${escape(s.cikk)}<div class="muted">${ft.format(s.mennyiseg)} ${escape(s.egyseg)}</div></td>
          <td class="num">${arMezo(k, 'bolti', ar.bolti)}</td>
          <td class="num">${arMezo(k, 'kedvezmenyes', ar.kedvezmenyes)}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
}

const MEZO_NEV = { bolti: 'bolti', kedvezmenyes: 'kedvezményes' };

// Beolvasott árak beírása. mezo: null (mindkét ár a szövegben) vagy 'bolti' / 'kedvezmenyes'.
function arakAtvetele(szoveg, mezo) {
  if (allapot.anyag.sorok.length === 0) {
    return '<p class="warn">Még nincs anyaglista. Előbb add meg a kiállásokat, utána töltsd fel az árakat.</p>';
  }
  const { arak, jeloltek, nemIllesztett } = boltValaszBeolvasas(szoveg, allapot.anyag.sorok, mezo);
  for (const [k, ar] of arak) arBeiras(k, ar);
  ment(ARAK_KULCS, allapot.arak);
  megjelenitArTabla(true);
  megjelenitKimenetek();
  const forras = mezo ?? 'szoveg';
  allapot.jeloltek[forras] = jeloltek;

  const hianyzik = (m) => allapot.anyag.sorok.filter((s) => !Number.isFinite(allapot.arak[tetelKulcs(s)]?.[m])).length;
  const hianyok = (mezo ? [mezo] : ['bolti', 'kedvezmenyes'])
    .map((m) => [m, hianyzik(m)]).filter(([, n]) => n > 0)
    .map(([m, n]) => `${n} tételnek még nincs ${MEZO_NEV[m]} ára.`).join(' ');
  const reszek = [];
  if (arak.size === 0 && jeloltek.length === 0) {
    reszek.push(`<p class="warn">Egy tétel árát sem találtam. Nézd meg a kiolvasott szöveget. Ha abban látszanak a tételek és az árak,
      küldd el a PDF-et, és hozzáigazítom a beolvasást.</p>`);
  } else {
    reszek.push(`<p><strong>${arak.size} / ${allapot.anyag.sorok.length} tétel</strong> ára beolvasva.${hianyok ? ` ${hianyok}` : ''}</p>`);
  }
  // A részletek alapból csukva vannak, csak a darabszám látszik.
  if (jeloltek.length) reszek.push(`<details class="reszlet"><summary>Új tételek (${jeloltek.length})</summary>
    <ul class="jeloltek">${jeloltek.map((j, i) => jeloltHtml(j, forras, i)).join('')}</ul></details>`);
  if (nemIllesztett.length) reszek.push(`<details class="reszlet"><summary>Nem értelmezett sorok (${nemIllesztett.length})</summary>
    <ul class="nem-illesztett">${nemIllesztett.map((s) => `<li>${escape(s)}</li>`).join('')}</ul></details>`);
  return reszek.join('');
}

function arBeiras(kulcs, ar) {
  const uj = { ...allapot.arak[kulcs] };
  for (const [m, v] of Object.entries(ar)) if (v !== null && v !== undefined) uj[m] = v;
  allapot.arak[kulcs] = uj;
}

function jeloltHtml(j, forras, i) {
  const arak = Object.entries(j.ar).filter(([, v]) => v !== null)
    .map(([m, v]) => `${MEZO_NEV[m]} ${penz(v)}`).join(', ');
  const mar = allapot.plusz.some((p) => tetelKulcs(p) === tetelKulcs(j));
  return `<li>
    <span><strong>${escape(j.cikk)}</strong>${j.cikkszam ? ` <span class="muted">(${escape(j.cikkszam)})</span>` : ''}<br>
      <span class="muted">${ft.format(j.mennyiseg)} ${escape(j.egyseg)} · ${arak}</span></span>
    <button type="button" class="kicsi jelolt-hozzaad" data-forras="${forras}" data-i="${i}" ${mar ? 'disabled' : ''}>${mar ? 'Hozzáadva' : '+ Ajánlatba'}</button>
  </li>`;
}

function beolvas() {
  $('beolvasas-eredmeny').innerHTML = arakAtvetele($('bolt-valasz').value, null);
}

async function pdfFeltoltes(mezo, fajl) {
  const el = $(`eredmeny-${mezo}`);
  el.innerHTML = `<p class="muted">${escape(fajl.name)} beolvasása…</p>`;
  try {
    const szoveg = await Promise.race([
      pdfSzoveg(fajl),
      new Promise((_, elutasit) => setTimeout(() => elutasit(new Error('40 másodperc alatt sem sikerült (lassú kapcsolat vagy túl nagy fájl).')), 40000)),
    ]);
    if (!szoveg.trim()) {
      el.innerHTML = '<p class="warn">Ebben a PDF-ben nincs kiolvasható szöveg (valószínűleg szkennelt kép). Írd be az árakat kézzel.</p>';
      return;
    }
    el.innerHTML = `<p class="muted fajlnev">${escape(fajl.name)}</p>${arakAtvetele(szoveg, mezo)}
      <details class="reszlet"><summary>Kiolvasott szöveg</summary><pre>${escape(szoveg)}</pre></details>`;
  } catch (err) {
    el.innerHTML = `<p class="error">A PDF nem olvasható be: ${escape(err.message)}</p>`;
  }
}

// ---- Plusz tételek és a könyvtár bővítése ----

const EGYSEG_VALASZTEK = ['db', 'fm', 'pár', 'csomag', 'szett', 'kg', 'tekercs'];

function pluszHozzaad(t) {
  const k = tetelKulcs(t);
  const meglevo = allapot.plusz.find((p) => tetelKulcs(p) === k);
  if (!meglevo) allapot.plusz.push({ cikk: t.cikk, egyseg: t.egyseg, mennyiseg: t.mennyiseg, cikkszam: t.cikkszam ?? '' });
  if (t.ar) arBeiras(k, t.ar);
  ment(PLUSZ_KULCS, allapot.plusz);
  ment(ARAK_KULCS, allapot.arak);
}

function kiallasDarab(nev) {
  const kod = KIALLAS_TIPUSOK.find((t) => t.nev === nev)?.kod;
  return Number(allapot.projekt?.kiallasok?.[kod]) || 0;
}

function javasoltMennyiseg(t, kiallas) {
  const db = kiallasDarab(kiallas);
  return db > 0 ? Math.round((t.mennyiseg / db) * 100) / 100 : t.mennyiseg;
}

function megjelenitPlusz() {
  const sorok = allapot.plusz.map((t, i) => {
    const nyitva = allapot.konyvtarbaNyitva === i;
    const alapKiallas = KIALLAS_TIPUSOK.find((k) => kiallasDarab(k.nev) > 0)?.nev ?? KIALLAS_TIPUSOK[0].nev;
    return `<li class="plusz-sor">
      <div class="plusz-fej">
        <span class="plusz-nev">${escape(t.cikk)}${t.cikkszam ? ` <span class="muted">(${escape(t.cikkszam)})</span>` : ''}</span>
        <span class="plusz-menny"><input type="number" min="0" step="any" class="plusz-mennyiseg" data-i="${i}"
          value="${t.mennyiseg}" aria-label="Mennyiség: ${escape(t.cikk)}"> ${escape(t.egyseg)}</span>
      </div>
      <div class="actions kicsi-gombok">
        <button type="button" class="kicsi button plusz-konyvtarba" data-i="${i}" aria-expanded="${nyitva}">Könyvtárba…</button>
        <button type="button" class="kicsi button plusz-torles" data-i="${i}">Törlés</button>
      </div>
      ${nyitva ? `<div class="konyvtarba">
        <label>Melyik kiálláshoz?
          <select id="kb-kiallas">${KIALLAS_TIPUSOK.map((k) => `<option${k.nev === alapKiallas ? ' selected' : ''}>${escape(k.nev)}</option>`).join('')}</select></label>
        <label>Mennyiség kiállásonként
          <span class="nowrap"><input id="kb-mennyiseg" type="number" min="0" step="any" value="${javasoltMennyiseg(t, alapKiallas)}"> ${escape(t.egyseg)}</span></label>
        <div class="actions">
          <button type="button" class="kicsi" id="kb-mentes" data-i="${i}">Mentés a könyvtárba</button>
          <button type="button" class="kicsi button" id="kb-megse">Mégse</button>
        </div>
      </div>` : ''}
    </li>`;
  }).join('');

  const bovitesek = allapot.bovitesek.map((b, i) => `<li>
      <span><strong>${escape(b.kiallas)}:</strong> ${escape(b.cikk)} – ${ft.format(b.mennyiseg)} ${escape(b.egyseg)}
        ${bennVanAzAlapban(allapot.alapKonyvtar, b) ? ' <span class="muted">(már benne van az alapkönyvtárban, törölhető)</span>' : ''}</span>
      <button type="button" class="kicsi button bovites-torles" data-i="${i}" aria-label="Törlés: ${escape(b.cikk)}">×</button>
    </li>`).join('');

  $('plusz').innerHTML = `
    <h3>Plusz tételek ehhez az ajánlathoz</h3>
    ${allapot.plusz.length ? `<ul class="plusz-lista">${sorok}</ul>`
      : '<p class="muted">A bolt PDF-jében talált új tételek, vagy amit kézzel adsz hozzá. A „Könyvtárba…” gombbal egy kiállás csomagjába is elmenthető, így legközelebb magától benne lesz.</p>'}
    <form id="plusz-uj" class="plusz-uj">
      <input id="plusz-uj-cikk" placeholder="Új tétel megnevezése" aria-label="Új tétel megnevezése" required>
      <input id="plusz-uj-menny" type="number" min="0" step="any" value="1" aria-label="Mennyiség">
      <select id="plusz-uj-egyseg" aria-label="Egység">${EGYSEG_VALASZTEK.map((e) => `<option>${e}</option>`).join('')}</select>
      <button type="submit" class="kicsi">Hozzáadás</button>
    </form>
    <details class="bovitesek"${allapot.bovitesek.length ? '' : ' hidden'}>
      <summary>A könyvtárhoz hozzáadott tételek (${allapot.bovitesek.length})</summary>
      <p class="muted">Ezek csak ezen az eszközön vannak meg. Töltsd le a teljes könyvtárat, és küldd el, hogy bekerüljön az alkalmazásba, és minden eszközön meglegyen.</p>
      <ul class="bovites-lista">${bovitesek}</ul>
      <button type="button" class="kicsi" id="konyvtar-letoltes">Könyvtár letöltése (CSV)</button>
    </details>
    <p id="plusz-uzenet" class="muted" aria-live="polite"></p>`;
}

function konyvtarFrissites() {
  allapot.konyvtar = bovitettKonyvtar(allapot.alapKonyvtar, allapot.bovitesek);
  ment(BOVITES_KULCS, allapot.bovitesek);
}

function pluszEsemenyek() {
  const doboz = $('plusz');
  doboz.addEventListener('input', (ev) => {
    if (!ev.target.classList.contains('plusz-mennyiseg')) return;
    const t = allapot.plusz[Number(ev.target.dataset.i)];
    t.mennyiseg = Math.max(0, Number(ev.target.value) || 0);
    ment(PLUSZ_KULCS, allapot.plusz);
    frissit();
  });
  doboz.addEventListener('change', (ev) => {
    if (ev.target.id !== 'kb-kiallas') return;
    const t = allapot.plusz[allapot.konyvtarbaNyitva];
    if (t) $('kb-mennyiseg').value = javasoltMennyiseg(t, ev.target.value);
  });
  doboz.addEventListener('submit', (ev) => {
    if (ev.target.id !== 'plusz-uj') return;
    ev.preventDefault();
    const cikk = $('plusz-uj-cikk').value.trim().replace(/\s+/g, ' ');
    if (!cikk) return;
    pluszHozzaad({ cikk, mennyiseg: Math.max(0, Number($('plusz-uj-menny').value) || 1), egyseg: $('plusz-uj-egyseg').value });
    frissit();
    megjelenitPlusz();
    megjelenitArTabla(true);
  });
  doboz.addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    const i = Number(b.dataset.i);
    if (b.classList.contains('plusz-torles')) {
      allapot.plusz.splice(i, 1);
      allapot.konyvtarbaNyitva = null;
      ment(PLUSZ_KULCS, allapot.plusz);
      frissit();
      megjelenitPlusz();
    } else if (b.classList.contains('plusz-konyvtarba')) {
      allapot.konyvtarbaNyitva = allapot.konyvtarbaNyitva === i ? null : i;
      megjelenitPlusz();
    } else if (b.id === 'kb-megse') {
      allapot.konyvtarbaNyitva = null;
      megjelenitPlusz();
    } else if (b.id === 'kb-mentes') {
      const t = allapot.plusz[i];
      const kiallas = $('kb-kiallas').value;
      const mennyiseg = Number($('kb-mennyiseg').value);
      if (!(mennyiseg > 0)) { $('kb-mennyiseg').focus(); return; }
      allapot.bovitesek.push({ kiallas, cikk: t.cikk, mennyiseg, egyseg: t.egyseg, cikkszam: t.cikkszam ?? '' });
      konyvtarFrissites();
      // Ha a projektben van ilyen kiállás, a tételt mostantól a csomag adja, plusz tételként már nem kell.
      const db = kiallasDarab(kiallas);
      if (db > 0) allapot.plusz.splice(i, 1);
      ment(PLUSZ_KULCS, allapot.plusz);
      allapot.konyvtarbaNyitva = null;
      frissit();
      megjelenitPlusz();
      $('plusz-uzenet').textContent = db > 0
        ? `Elmentve: ${kiallas} – ${t.cikk}. Az anyaglistán mostantól a csomag adja (${db} kiállás × ${ft.format(mennyiseg)} ${t.egyseg}).`
        : `Elmentve: ${kiallas} – ${t.cikk}. Ebben az ajánlatban plusz tételként marad, mert nincs ${kiallas} kiállás.`;
    } else if (b.classList.contains('bovites-torles')) {
      allapot.bovitesek.splice(i, 1);
      konyvtarFrissites();
      frissit();
      megjelenitPlusz();
      $('plusz').querySelector('details.bovitesek')?.setAttribute('open', '');
    } else if (b.id === 'konyvtar-letoltes') {
      const blob = new Blob(['\uFEFF', konyvtarCsv(allapot.konyvtar)], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'kiallas-konyvtar.csv';
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    }
  });

  // A bolt válaszában talált új tétel felvétele az ajánlatba.
  $('ar-szakasz').addEventListener('click', (ev) => {
    const b = ev.target.closest('.jelolt-hozzaad');
    if (!b) return;
    const j = allapot.jeloltek[b.dataset.forras]?.[Number(b.dataset.i)];
    if (!j) return;
    pluszHozzaad(j);
    frissit();
    megjelenitPlusz();
    megjelenitArTabla(true);
    // Ugyanaz a tétel a másik PDF listájában is "Hozzáadva" lesz, és ott a másik árat hozzáadja.
    for (const gomb of document.querySelectorAll('.jelolt-hozzaad')) {
      const masik = allapot.jeloltek[gomb.dataset.forras]?.[Number(gomb.dataset.i)];
      if (masik && tetelKulcs(masik) === tetelKulcs(j)) {
        if (masik !== j) arBeiras(tetelKulcs(masik), masik.ar);
        gomb.disabled = true;
        gomb.textContent = 'Hozzáadva';
      }
    }
    ment(ARAK_KULCS, allapot.arak);
    megjelenitArTabla(true);
    megjelenitKimenetek();
  });
}

// ---- Kimenetek ----

function megjelenitKimenetek() {
  if (!allapot.munkadij) return;
  const a = ajanlat(allapot.munkadij, allapot.anyag.sorok, allapot.arak);

  const anyagSorok = a.anyag.map((s) => `
    <tr>
      <td>${escape(s.cikk)}</td>
      <td class="num">${ft.format(s.mennyiseg)} ${escape(s.egyseg)}</td>
      <td class="num hide-sm">${penz(s.bolti)}</td>
      <td class="num">${penz(s.boltiOsszeg)}</td>
    </tr>`).join('');
  $('ugyfel').innerHTML = `
    ${a.hianyzoBolti ? `<p class="warn">${a.hianyzoBolti} anyagtételnek nincs bolti ára, az összeg hiányos.</p>` : ''}
    <h3>Munkadíj</h3>
    ${munkadijHtml(a.munkadij)}
    ${a.anyag.length ? `<h3>Anyag</h3>
    <table>
      <thead><tr><th>Cikk</th><th class="num">Menny.</th><th class="num hide-sm">Egységár</th><th class="num">Összeg</th></tr></thead>
      <tbody>${anyagSorok}</tbody>
      <tfoot><tr><td colspan="2">Anyag összesen</td><td class="hide-sm"></td><td class="num">${penz(a.anyagBolti)}</td></tr></tfoot>
    </table>` : ''}
    <p class="vegosszeg"><span>Végösszeg</span><span>${penz(a.vegosszeg)}</span></p>
    <p class="muted">Alanyi adómentes, ÁFA nélkül.</p>`;

  const belsoSorok = a.anyag.map((s) => `
    <tr>
      <td>${escape(s.cikk)}<div class="muted">${ft.format(s.mennyiseg)} ${escape(s.egyseg)}</div></td>
      <td class="num">${penz(s.kedvOsszeg)}</td>
      <td class="num hide-sm">${penz(s.boltiOsszeg)}</td>
      <td class="num">${penz(s.haszon)}</td>
    </tr>`).join('');
  $('belso').innerHTML = a.anyag.length === 0 ? '<p class="muted">Nincs anyagtétel.</p>' : `
    ${a.hianyzoKedvezmenyes ? `<p class="warn">${a.hianyzoKedvezmenyes} tételnek nincs kedvezményes ára, a haszon hiányos.</p>` : ''}
    <table>
      <thead><tr><th>Cikk</th><th class="num">Beszerzés</th><th class="num hide-sm">Bolti</th><th class="num">Haszon</th></tr></thead>
      <tbody>${belsoSorok}</tbody>
      <tfoot><tr><td>Összesen</td><td class="num">${penz(a.anyagKedvezmenyes)}</td><td class="num hide-sm">${penz(a.anyagBolti)}</td><td class="num">${penz(a.haszon)}</td></tr></tfoot>
    </table>
    <dl class="osszesito">
      <dt>Munkadíj</dt><dd>${penz(a.munkadij.osszesen)}</dd>
      <dt>Haszon az anyagon</dt><dd>${penz(a.haszon)}</dd>
      <dt>Ügyfél fizet</dt><dd>${penz(a.vegosszeg)}</dd>
      <dt>Anyagbeszerzés</dt><dd>${penz(a.anyagKedvezmenyes)}</dd>
    </dl>`;
}

// ---- Ajánlat adatai és PDF ----

const adatokForm = $('adatok');
const maISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function olvasAdatok() {
  const adatok = { vallalkozo: {}, ugyfel: {}, ajanlat: {} };
  for (const el of adatokForm.elements) {
    if (!el.name) continue;
    const [a, b] = el.name.split('.');
    adatok[a][b] = el.type === 'number' ? Number(el.value || 0) : el.value.trim();
  }
  return adatok;
}

function kitoltAdatok(adatok) {
  for (const el of adatokForm.elements) {
    if (!el.name) continue;
    const [a, b] = el.name.split('.');
    const ertek = adatok?.[a]?.[b];
    if (ertek !== undefined && ertek !== null) el.value = ertek;
  }
}

const eredetiCim = document.title;
function nyomtat(tipus) {
  if (!allapot.munkadij) return;
  const a = ajanlat(allapot.munkadij, allapot.anyag.sorok, allapot.arak);
  const adatok = olvasAdatok();
  $('nyomtat').innerHTML = tipus === 'belso' ? belsoOsszesitoHtml(a, adatok) : ugyfelAjanlatHtml(a, adatok);
  document.title = fajlnev(tipus === 'belso' ? 'Belso_osszesito' : 'Arajanlat', adatok);
}

// ---- Frissítés ----

function frissit() {
  const p = olvas();
  $('puffer-sor').hidden = p.hotermelo !== 'vegyes';
  $('felar-hsz-sor').hidden = p.hotermelo !== 'hoszivattyu';
  ment(MENTES_KULCS, p);
  try {
    allapot.munkadij = szamolMunkadij(p, allapot.tabla);
    $('eredmeny').innerHTML = figyelmeztetesHtml(allapot.munkadij.figyelmeztetesek) + munkadijHtml(allapot.munkadij);
  } catch (err) {
    allapot.munkadij = null;
    $('eredmeny').innerHTML = `<p class="error">${escape(err.message)}</p>`;
  }
  allapot.projekt = p;
  try {
    allapot.anyag = gyujtAnyaglista(p, allapot.konyvtar);
    for (const t of allapot.plusz) {
      if (!(t.mennyiseg > 0)) continue;
      const meglevo = allapot.anyag.sorok.find((s) => tetelKulcs(s) === tetelKulcs(t));
      if (meglevo) meglevo.mennyiseg = Math.round((meglevo.mennyiseg + t.mennyiseg) * 100) / 100;
      else allapot.anyag.sorok.push({ ...t, plusz: true });
    }
    megjelenitAnyag();
  } catch (err) {
    allapot.anyag = { sorok: [], figyelmeztetesek: [] };
    $('anyaglista').innerHTML = `<p class="error">${escape(err.message)}</p>`;
  }
  megjelenitArTabla();
  megjelenitKimenetek();
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
    allapot.tabla = parseMunkadijTabla(tablaCsv);
    allapot.alapKonyvtar = parseKonyvtar(konyvtarCsv);
  } catch (err) {
    $('eredmeny').innerHTML = `<p class="error">${escape(err.message)}</p>`;
    $('anyaglista').innerHTML = '';
    return;
  }
  felepit();
  const mentett = betoltMentett(MENTES_KULCS);
  if (mentett) kitolt(mentett);
  allapot.arak = betoltMentett(ARAK_KULCS) ?? {};
  allapot.plusz = (betoltMentett(PLUSZ_KULCS) ?? []).filter((t) => t?.cikk && t?.egyseg);
  allapot.bovitesek = (betoltMentett(BOVITES_KULCS) ?? []).filter((b) => b?.kiallas && b?.cikk && b?.egyseg && b.mennyiseg > 0);
  allapot.konyvtar = bovitettKonyvtar(allapot.alapKonyvtar, allapot.bovitesek);
  pluszEsemenyek();

  form.addEventListener('input', frissit);
  $('masol').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(levelSzoveg(anyaglistaSzoveg(allapot.anyag.sorok)));
      $('masol-uzenet').textContent = 'Vágólapra másolva.';
    } catch {
      $('masol-uzenet').textContent = 'A másolás nem sikerült; használd az E-mail gombot.';
    }
  });
  $('beolvas').addEventListener('click', beolvas);
  for (const mezo of ['bolti', 'kedvezmenyes']) {
    $(`pdf-${mezo}`).addEventListener('change', (ev) => {
      const fajl = ev.target.files?.[0];
      ev.target.value = '';
      if (fajl) pdfFeltoltes(mezo, fajl);
    });
  }
  $('ar-tabla').addEventListener('input', (ev) => {
    const el = ev.target;
    if (!el.dataset.kulcs) return;
    const n = parseSzam(el.value);
    const ar = { ...allapot.arak[el.dataset.kulcs] };
    if (el.value.trim() === '' || Number.isNaN(n)) delete ar[el.dataset.mezo];
    else ar[el.dataset.mezo] = n;
    allapot.arak[el.dataset.kulcs] = ar;
    el.classList.toggle('hibas', el.value.trim() !== '' && Number.isNaN(n));
    ment(ARAK_KULCS, allapot.arak);
    megjelenitKimenetek();
  });
  $('arak-torlese').addEventListener('click', () => {
    if (!confirm('Törlöd az összes beírt árat?')) return;
    allapot.arak = {};
    ment(ARAK_KULCS, allapot.arak);
    for (const id of ['beolvasas-eredmeny', 'eredmeny-bolti', 'eredmeny-kedvezmenyes']) $(id).innerHTML = '';
    megjelenitArTabla(true);
    megjelenitKimenetek();
  });
  const mentettAdatok = betoltMentett(ADATOK_KULCS) ?? {};
  kitoltAdatok({ ...mentettAdatok, ajanlat: { datum: maISO(), ervenyesNap: 15, ...mentettAdatok.ajanlat } });
  adatokForm.addEventListener('input', () => ment(ADATOK_KULCS, olvasAdatok()));
  adatokForm.addEventListener('submit', (ev) => ev.preventDefault());

  // A böngésző saját Nyomtatás menüjéből az ügyfélajánlat készül.
  let gombbol = false;
  const pdf = (tipus) => { gombbol = true; nyomtat(tipus); window.print(); };
  $('pdf-ugyfel').addEventListener('click', () => pdf('ugyfel'));
  $('pdf-belso').addEventListener('click', () => pdf('belso'));
  window.addEventListener('beforeprint', () => { if (!gombbol) nyomtat('ugyfel'); });
  window.addEventListener('afterprint', () => { gombbol = false; document.title = eredetiCim; });

  frissit();
  megjelenitPlusz();
}

indit();
