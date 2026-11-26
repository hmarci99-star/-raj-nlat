// Csempés megadás a Projekt lépésben. A csempék ugyanazokat a (rejtett) űrlapmezőket
// állítják, így a számítás, a mentés és a hangos mód változatlan.
//   koppintás = +1, a sarokban a − elvesz, hosszan nyomva a tétel szerkesztője nyílik;
//   a folyóméteres tételeknél (lépésköz ≠ 1) a hossz a csempén írható be.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const szam = (v) => Number(String(v ?? '').replace(',', '.')) || 0;
const formaz = (n) => String(Math.round(n * 100) / 100).replace('.', ',');
const svgBelso = (html) => html.replace(/^\s*<svg[^>]*>|<\/svg>\s*$/g, '');

let form;

export function csempekInit(urlap) {
  form = urlap;
  document.body.classList.add('elr-csempe');
  form.addEventListener('click', kattintas);
  form.addEventListener('change', valtozas);
  hosszuNyomas(form);
  csempekFrissit();
}

// Minden számmező a Projekt űrlapon, a kártyája szerint.
function tetelek() {
  const lista = [];
  for (const kartya of form.querySelectorAll('.kartya')) {
    for (const label of kartya.querySelectorAll('.mezolista > label')) {
      const input = label.querySelector('input[type=number]');
      if (!input) continue;
      const nevEl = label.querySelector('.mezo-nev')?.cloneNode(true);
      nevEl?.querySelector('small')?.remove();
      lista.push({
        input, kartya,
        nev: (nevEl?.textContent ?? input.name).trim(),
        ikon: label.querySelector('.mezo-ikon')?.innerHTML ?? '',
        ertek: szam(input.value),
        lepes: Number(input.step) || 1,
      });
    }
  }
  return lista;
}

const keres = (nev) => tetelek().find((t) => t.input.name === nev);
const tort = (t) => t.lepes !== 1;

function beallit(t, ertek) {
  const uj = Math.max(0, Math.round(ertek * 100) / 100);
  t.input.value = uj ? String(uj) : '';
  t.input.dispatchEvent(new Event('input', { bubbles: true }));
}

function csempeHtml(t) {
  const van = t.ertek > 0;
  const fm = tort(t);
  return `<div class="csempe${van ? ' van' : ''}" data-elr-nev="${esc(t.input.name)}" ${fm ? '' : 'role="button" tabindex="0"'}
      aria-label="${esc(t.nev)}: ${formaz(t.ertek)}${fm ? '' : ', koppintásra +1'}">
    ${van && !fm ? `<button type="button" class="csempe-minusz" data-elr-lep="-1" aria-label="Egyet elvesz: ${esc(t.nev)}">−</button>
      <span class="csempe-db">${formaz(t.ertek)}</span>` : ''}
    <svg class="ikon csempe-ikon" viewBox="0 0 24 24" aria-hidden="true">${svgBelso(t.ikon)}</svg>
    <span class="csempe-nev">${esc(t.nev.replace(/\s*\(fm\)/, ''))}</span>
    ${fm ? `<label class="csempe-fm"><input type="number" min="0" step="${t.lepes}" inputmode="decimal" data-elr-ertek
      value="${t.ertek || ''}" placeholder="0"> fm</label>` : ''}
  </div>`;
}

export function csempekFrissit() {
  if (!form) return;
  const csoport = new Map();
  for (const t of tetelek()) {
    if (!csoport.has(t.kartya)) csoport.set(t.kartya, []);
    csoport.get(t.kartya).push(t);
  }
  for (const racs of form.querySelectorAll('.csempe-racs')) {
    if (!csoport.has(racs.closest('.kartya'))) racs.remove();
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

function kattintas(ev) {
  const el = ev.target;
  const csempe = el.closest('.csempe');
  if (!csempe || el.closest('[data-elr-ertek], .csempe-fm')) return;
  if (hosszuVolt) { hosszuVolt = false; ev.preventDefault(); return; }
  const t = keres(csempe.dataset.elrNev);
  if (!t || tort(t)) return;
  const lepesGomb = el.closest('[data-elr-lep]');
  beallit(t, t.ertek + (lepesGomb ? Number(lepesGomb.dataset.elrLep) : 1) * t.lepes);
}

function valtozas(ev) {
  const el = ev.target;
  if (!el.matches('[data-elr-ertek]')) return;
  const t = keres(el.closest('[data-elr-nev]')?.dataset.elrNev);
  if (t) beallit(t, szam(el.value));
}

function szerkeszt(nev) {
  form.elements[nev]?.closest('label')?.querySelector('.mezo-nev')?.click();
}

// Hosszan nyomva a tétel szerkesztője nyílik.
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
