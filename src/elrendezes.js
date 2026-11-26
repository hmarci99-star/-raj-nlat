// Választható elrendezések a Projekt lépéshez. Mindegyik ugyanazokat a (rejtett)
// űrlapmezőket állítja, így a számítás, a mentés és a hangos mód változatlan.
//   lista    – az eredeti kártyás lista
//   csempe   – nagy ikonos csempék: koppintás = +1, a − jel elvesz, hosszan nyomva szerkesztés
//   varazslo – egyszerre egy kérdés, Vissza / Tovább
//   kosar    – keresés és kategóriák, alatta csak a felvett tételek

export const ELRENDEZESEK = [
  { kod: 'lista', nev: 'Lista' },
  { kod: 'csempe', nev: 'Csempék' },
  { kod: 'varazslo', nev: 'Lépésenként' },
  { kod: 'kosar', nev: 'Kosár' },
];
const KULCS = 'arajanlat.elrendezes';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const szam = (v) => Number(String(v ?? '').replace(',', '.')) || 0;
const formaz = (n) => String(Math.round(n * 100) / 100).replace('.', ',');

let form; let doboz; let opciok;
let mod = 'lista';
const allapot = { lepes: null, kereses: '', szakasz: '' };

export function aktualisElrendezes() { return mod; }

export function elrendezesInit(urlap, beallitasok) {
  form = urlap;
  opciok = beallitasok; // { kesz: () => void } – a varázsló végén
  doboz = document.createElement('div');
  doboz.id = 'elrendezes-nezet';
  form.before(doboz);
  try { mod = localStorage.getItem(KULCS) || 'lista'; } catch { /* alap */ }
  if (!ELRENDEZESEK.some((e) => e.kod === mod)) mod = 'lista';
  doboz.addEventListener('click', kattintas);
  doboz.addEventListener('change', valtozas);
  doboz.addEventListener('input', (ev) => {
    if (ev.target.id !== 'kosar-kereso') return;
    allapot.kereses = ev.target.value;
    kosarLista();
  });
  form.addEventListener('click', kattintas);
  form.addEventListener('change', valtozas);
  hosszuNyomas(doboz); hosszuNyomas(form);
  alkalmaz();
}

export function elrendezesValtas(uj) {
  if (!ELRENDEZESEK.some((e) => e.kod === uj)) return;
  mod = uj;
  try { localStorage.setItem(KULCS, uj); } catch { /* nem kötelező */ }
  alkalmaz();
}

function alkalmaz() {
  for (const e of ELRENDEZESEK) document.body.classList.toggle(`elr-${e.kod}`, e.kod === mod);
  doboz.innerHTML = '';
  for (const r of form.querySelectorAll('.csempe-racs')) r.remove();
  if (mod === 'kosar') {
    doboz.innerHTML = `<div class="kosar-fej">
        <label class="kosar-kereso"><span class="vh">Tétel keresése</span>
          <input id="kosar-kereso" type="search" placeholder="Tétel keresése… (pl. mosdó)" autocomplete="off" value="${esc(allapot.kereses)}"></label>
        <div class="kosar-chipek" role="group" aria-label="Kategória"></div>
      </div>
      <div class="kosar-lista"></div>
      <h3 class="kosar-alcim">Kategóriák, beállítások, új tételek</h3>`;
  }
  elrendezesFrissit();
}

// Minden számmező a Projekt űrlapon, a kártyája (szakasza) szerint.
function tetelek() {
  const lista = [];
  for (const kartya of form.querySelectorAll('.kartya')) {
    const szakasz = kartya.querySelector('h2')?.textContent.trim() ?? '';
    for (const label of kartya.querySelectorAll('.mezolista > label')) {
      const input = label.querySelector('input[type=number]');
      if (!input) continue;
      const nevEl = label.querySelector('.mezo-nev')?.cloneNode(true);
      nevEl?.querySelector('small')?.remove();
      lista.push({
        label, input, szakasz, kartya,
        nev: (nevEl?.textContent ?? input.name).trim(),
        ikon: label.querySelector('.mezo-ikon')?.innerHTML ?? '',
        ertek: szam(input.value),
        lepes: Number(input.step) || 1,
        egyseg: /\(fm\)/.test(nevEl?.textContent ?? '') ? 'fm' : 'db',
      });
    }
  }
  return lista;
}

const keres = (nev) => tetelek().find((t) => t.input.name === nev);

function beallit(t, ertek) {
  const uj = Math.max(0, Math.round(ertek * 100) / 100);
  t.input.value = uj ? String(uj) : '';
  t.input.dispatchEvent(new Event('input', { bubbles: true }));
}

const tortLepes = (t) => t.lepes !== 1;

export function elrendezesFrissit() {
  if (!form) return;
  if (mod === 'csempe') csempek();
  else if (mod === 'varazslo') varazslo();
  else if (mod === 'kosar') kosarLista();
}

// ---- Csempék ----

function csempeHtml(t) {
  const van = t.ertek > 0;
  const tort = tortLepes(t);
  return `<div class="csempe${van ? ' van' : ''}" data-elr-nev="${esc(t.input.name)}" ${tort ? '' : 'role="button" tabindex="0"'}
      aria-label="${esc(t.nev)}: ${formaz(t.ertek)}${tort ? '' : ', koppintásra +1'}">
    ${van && !tort ? `<button type="button" class="csempe-minusz" data-elr-lep="-1" aria-label="Egyet elvesz: ${esc(t.nev)}">−</button>
      <span class="csempe-db">${formaz(t.ertek)}</span>` : ''}
    <svg class="ikon csempe-ikon" viewBox="0 0 24 24" aria-hidden="true">${t.ikon.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>
    <span class="csempe-nev">${esc(t.nev.replace(/\s*\(fm\)/, ''))}</span>
    ${tort ? `<label class="csempe-fm"><input type="number" min="0" step="${t.lepes}" inputmode="decimal" data-elr-ertek
      value="${t.ertek || ''}" placeholder="0"> fm</label>` : ''}
  </div>`;
}

function csempek() {
  const csoport = new Map();
  for (const t of tetelek()) {
    if (!csoport.has(t.kartya)) csoport.set(t.kartya, []);
    csoport.get(t.kartya).push(t);
  }
  for (const [kartya, lista] of csoport) {
    let racs = kartya.querySelector(':scope > .csempe-racs');
    if (!racs) {
      racs = document.createElement('div');
      racs.className = 'csempe-racs';
      kartya.querySelector('.mezolista').before(racs);
    }
    // A fókuszban lévő fm-mezőt nem építjük újra (különben gépelés közben elveszne).
    if (racs.contains(document.activeElement) && document.activeElement.matches('[data-elr-ertek]')) continue;
    racs.innerHTML = lista.map(csempeHtml).join('');
  }
}

// ---- Varázsló ----

function lepesek() {
  const lista = [];
  for (const kartya of form.querySelectorAll('.kartya')) {
    const szakasz = kartya.querySelector('h2')?.textContent.trim() ?? '';
    for (const el of kartya.querySelectorAll('.mezolista > label, :scope > label.check')) {
      if (el.hidden) continue;
      const mezo = el.querySelector('input, select');
      if (!mezo?.name) continue;
      lista.push({ szakasz, el, mezo });
    }
  }
  return lista;
}

function varazslo() {
  const lista = lepesek();
  if (!lista.length) { doboz.innerHTML = ''; return; }
  let i = lista.findIndex((l) => l.mezo.name === allapot.lepes);
  if (allapot.lepes === '__kesz') i = lista.length;
  if (i < 0) i = 0;
  const szakaszok = [...new Set(lista.map((l) => l.szakasz))];
  const halad = szakaszok.map((sz) => {
    const elso = lista.findIndex((l) => l.szakasz === sz);
    const kesz = i >= lista.length || elso <= i;
    return `<i class="${kesz ? 'k' : ''}" title="${esc(sz)}"></i>`;
  }).join('');
  if (i >= lista.length) {
    const kitoltott = tetelek().filter((t) => t.ertek > 0);
    doboz.innerHTML = `<div class="varazs-halad">${halad}</div>
      <div class="varazs-kartya"><h3 class="varazs-kerdes">Kész a felmérés</h3>
        ${kitoltott.length ? `<ul class="varazs-osszegzes">${kitoltott.map((t) => `<li><span>${esc(t.nev)}</span><b>${formaz(t.ertek)}</b></li>`).join('')}</ul>`
          : '<p class="muted">Még nincs megadott tétel.</p>'}
      </div>
      <div class="varazs-gombok"><button type="button" class="kicsi button" data-elr-ugras="0">Elölről</button>
        <button type="button" class="kicsi" data-elr-kesz>Anyaglista →</button></div>`;
    return;
  }
  const l = lista[i];
  allapot.lepes = l.mezo.name;
  const kovetkezoSzakasz = lista.findIndex((x, j) => j > i && x.szakasz !== l.szakasz);
  const ikonHtml = l.el.querySelector('.mezo-ikon')?.innerHTML ?? '';
  const nevEl = (l.el.querySelector('.mezo-nev') ?? l.el.querySelector('span:not(.lepteto)'))?.cloneNode(true);
  nevEl?.querySelector('small')?.remove();
  const nev = (nevEl?.textContent ?? '').trim();
  let torzs;
  if (l.mezo.tagName === 'SELECT') {
    torzs = `<div class="varazs-opciok">${[...l.mezo.options].map((o) => `<button type="button" class="varazs-opcio"
      aria-pressed="${o.value === l.mezo.value}" data-elr-valaszt="${esc(o.value)}">${esc(o.textContent)}</button>`).join('')}</div>`;
  } else if (l.mezo.type === 'checkbox') {
    torzs = `<div class="varazs-opciok"><button type="button" class="varazs-opcio" aria-pressed="${l.mezo.checked}" data-elr-pipa="1">Igen</button>
      <button type="button" class="varazs-opcio" aria-pressed="${!l.mezo.checked}" data-elr-pipa="0">Nem</button></div>`;
  } else {
    const ertek = szam(l.mezo.value);
    const tort = (Number(l.mezo.step) || 1) !== 1;
    torzs = tort
      ? `<label class="varazs-fm"><input type="number" min="0" step="${l.mezo.step}" inputmode="decimal" data-elr-ertek value="${ertek || ''}" placeholder="0"> fm</label>`
      : `<div class="varazs-lepteto"><button type="button" data-elr-lep="-1" aria-label="Csökkentés">−</button>
          <b aria-live="polite">${formaz(ertek)}</b><button type="button" data-elr-lep="1" aria-label="Növelés">+</button></div>
        <div class="varazs-gyors">${[0, 1, 2, 3, 4].map((n) => `<button type="button" data-elr-beir="${n}"
          aria-pressed="${ertek === n}">${n === 0 ? 'Nincs' : n}</button>`).join('')}</div>`;
  }
  doboz.innerHTML = `<div class="varazs-halad">${halad}</div>
    <p class="varazs-hol">${i + 1}. / ${lista.length} · ${esc(l.szakasz)}</p>
    <div class="varazs-kartya" data-elr-nev="${esc(l.mezo.name)}">
      ${ikonHtml ? `<svg class="ikon varazs-ikon" viewBox="0 0 24 24" aria-hidden="true">${ikonHtml.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>` : ''}
      <h3 class="varazs-kerdes">${esc(nev)}</h3>
      ${torzs}
      ${l.el.querySelector('.mezo-nev') ? '<button type="button" class="link-gomb" data-elr-szerk>Tétel szerkesztése</button>' : ''}
    </div>
    <div class="varazs-gombok">
      <button type="button" class="kicsi button" data-elr-ugras="${i - 1}" ${i === 0 ? 'disabled' : ''}>← Vissza</button>
      ${kovetkezoSzakasz > 0 ? `<button type="button" class="link-gomb" data-elr-ugras="${kovetkezoSzakasz}">Szakasz átugrása</button>` : '<span></span>'}
      <button type="button" class="kicsi" data-elr-ugras="${i + 1}">Tovább →</button>
    </div>`;
}

// ---- Kosár ----

function kosarLista() {
  if (mod !== 'kosar') return;
  const minden = tetelek();
  const szakaszok = [...new Set(minden.map((t) => t.szakasz))];
  if (allapot.szakasz && !szakaszok.includes(allapot.szakasz)) allapot.szakasz = '';
  const chipek = doboz.querySelector('.kosar-chipek');
  chipek.innerHTML = [['', `Felvett (${minden.filter((t) => t.ertek > 0).length})`], ...szakaszok.map((s) => [s, s])]
    .map(([k, n]) => `<button type="button" class="szuro${allapot.szakasz === k ? ' aktiv' : ''}" aria-pressed="${allapot.szakasz === k}"
      data-elr-szakasz="${esc(k)}">${esc(n)}</button>`).join('');
  const q = allapot.kereses.trim().toLocaleLowerCase('hu');
  let lista = minden;
  if (allapot.szakasz) lista = lista.filter((t) => t.szakasz === allapot.szakasz);
  if (q) lista = lista.filter((t) => t.nev.toLocaleLowerCase('hu').includes(q));
  if (!q && !allapot.szakasz) lista = lista.filter((t) => t.ertek > 0);
  const hol = doboz.querySelector('.kosar-lista');
  hol.innerHTML = lista.length ? lista.map((t) => `<div class="kosar-tetel${t.ertek > 0 ? ' van' : ''}" data-elr-nev="${esc(t.input.name)}">
      <svg class="ikon" viewBox="0 0 24 24" aria-hidden="true">${t.ikon.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>
      <button type="button" class="kosar-nev" data-elr-szerk>${esc(t.nev)}<small>${esc(t.szakasz)}</small></button>
      ${tortLepes(t)
        ? `<label class="kosar-fm"><input type="number" min="0" step="${t.lepes}" inputmode="decimal" data-elr-ertek value="${t.ertek || ''}" placeholder="0"> fm</label>`
        : t.ertek > 0
          ? `<span class="lepteto"><button type="button" class="lepes" data-elr-lep="-1" aria-label="Csökkentés: ${esc(t.nev)}">−</button>
              <b class="kosar-db">${formaz(t.ertek)}</b>
              <button type="button" class="lepes" data-elr-lep="1" aria-label="Növelés: ${esc(t.nev)}">+</button></span>`
          : `<button type="button" class="kicsi button kosar-hozzaad" data-elr-lep="1" aria-label="Hozzáadás: ${esc(t.nev)}">+ Hozzáad</button>`}
    </div>`).join('')
    : `<p class="kosar-ures">${q || allapot.szakasz ? 'Nincs ilyen tétel. Újat a lenti kártyák „Új …” gombjával vehetsz fel.'
      : 'Még nincs felvett tétel. Keress rá, vagy válassz kategóriát.'}</p>`;
}

// ---- Események ----

function kattintas(ev) {
  const el = ev.target;
  if (!doboz.contains(el) && !el.closest('.csempe-racs')) return;
  if (el.closest('[data-elr-ertek], .csempe-fm')) return;
  if (hosszuVolt) { hosszuVolt = false; ev.preventDefault(); return; }
  const hely = el.closest('[data-elr-nev]');
  const t = hely && keres(hely.dataset.elrNev);
  const lepesGomb = el.closest('[data-elr-lep]');
  if (lepesGomb && t) { beallit(t, t.ertek + Number(lepesGomb.dataset.elrLep) * t.lepes); return; }
  if (el.closest('[data-elr-szerk]')) { szerkeszt(hely?.dataset.elrNev); return; }
  const beir = el.closest('[data-elr-beir]');
  if (beir && t) { beallit(t, Number(beir.dataset.elrBeir)); return; }
  const valaszt = el.closest('[data-elr-valaszt]');
  if (valaszt) {
    const mezo = form.elements[hely.dataset.elrNev];
    mezo.value = valaszt.dataset.elrValaszt;
    mezo.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  const pipa = el.closest('[data-elr-pipa]');
  if (pipa) {
    const mezo = form.elements[hely.dataset.elrNev];
    mezo.checked = pipa.dataset.elrPipa === '1';
    mezo.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  const ugras = el.closest('[data-elr-ugras]');
  if (ugras) {
    const lista = lepesek();
    const j = Number(ugras.dataset.elrUgras);
    allapot.lepes = j >= lista.length ? '__kesz' : lista[Math.max(0, j)].mezo.name;
    varazslo();
    window.scrollTo({ top: 0 });
    return;
  }
  if (el.closest('[data-elr-kesz]')) { opciok?.kesz?.(); return; }
  const sz = el.closest('[data-elr-szakasz]');
  if (sz) { allapot.szakasz = sz.dataset.elrSzakasz; kosarLista(); return; }
  // Csempe: koppintás = +1
  const csempe = el.closest('.csempe');
  if (csempe && t && !tortLepes(t)) beallit(t, t.ertek + t.lepes);
}

function valtozas(ev) {
  const el = ev.target;
  if (!el.matches('[data-elr-ertek]')) return;
  const t = keres(el.closest('[data-elr-nev]')?.dataset.elrNev);
  if (t) beallit(t, szam(el.value));
}

function szerkeszt(nev) {
  const label = form.elements[nev]?.closest('label');
  label?.querySelector('.mezo-nev')?.click();
}

// Csempén hosszan nyomva a tétel szerkesztője nyílik.
let hosszuVolt = false;
function hosszuNyomas(gyoker) {
  let idozito = null;
  const vege = () => { clearTimeout(idozito); idozito = null; };
  gyoker.addEventListener('pointerdown', (ev) => {
    const csempe = ev.target.closest('.csempe');
    if (!csempe || ev.target.closest('button, input')) return;
    hosszuVolt = false;
    idozito = setTimeout(() => { hosszuVolt = true; szerkeszt(csempe.dataset.elrNev); }, 550);
  });
  for (const e of ['pointerup', 'pointercancel', 'pointermove']) {
    gyoker.addEventListener(e, (ev) => { if (e !== 'pointermove' || Math.abs(ev.movementX) + Math.abs(ev.movementY) > 6) vege(); });
  }
  gyoker.addEventListener('contextmenu', (ev) => { if (ev.target.closest('.csempe')) ev.preventDefault(); });
  gyoker.addEventListener('keydown', (ev) => {
    const csempe = ev.target.closest?.('.csempe[role=button]');
    if (csempe && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); csempe.click(); }
  });
}
