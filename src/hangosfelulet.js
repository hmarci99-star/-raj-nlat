// Hangos árajánlat: panel, felolvasás és hangfelismerés. A kérdések és a válaszok
// értelmezése a hangos.js-ben van; ez a modul vezeti a beszélgetést.
//
// api: {
//   projekt() -> a projekt adatai, mezoBeallit(nev, ertek), adatBeallit(nev, ertek),
//   pluszFelvesz(tetelek), osszegek() -> { munkadij, anyag, vegosszeg }, nezet(nev), mezoElem(nev)
// }

import {
  KERDESEK, valaszErtelmez, tobbAdat, kovetkezoIndex, elozoIndex, beallitasok,
  kerdesSzoveg, alapErtek, parancs, diktaltTetelek,
} from './hangos.js';
import { vanDiktalas, diktalas } from './diktalas.js';

const $ = (id) => document.getElementById(id);
const ft = new Intl.NumberFormat('hu-HU', { useGrouping: 'always' });
const kerekszam = (x) => String(Math.round(x)); // felolvasáshoz szóköz nélkül

const SZAKASZ_BEVEZETES = {
  anyag: 'A projekt adatai megvannak, az anyaglista elkészült. ',
  ajanlat: 'Most az ajánlat adatai jönnek. ',
};

const SUGO = {
  szam: 'Mondj egy számot, vagy azt, hogy nincs.',
  igennem: 'Mondd, hogy igen vagy nem.',
  valasztas: 'Mondd a felsoroltak egyikét.',
  szabad: 'Mondd újra, vagy azt, hogy kihagyás.',
};

export function hangosModInit(api) {
  const allapot = {
    aktiv: false, index: 0, megvalaszolt: new Set(), leallit: null, felolvas: true,
    szakasz: null, kiemelt: null, nemHallott: 0,
  };

  // ---- Felolvasás ----
  let hang = null;
  const hangValasztas = () => {
    const hangok = window.speechSynthesis?.getVoices?.() ?? [];
    hang = hangok.find((v) => v.lang?.toLowerCase().startsWith('hu')) ?? null;
  };
  if ('speechSynthesis' in window) {
    hangValasztas();
    window.speechSynthesis.addEventListener?.('voiceschanged', hangValasztas);
  }

  function beszel(szoveg) {
    return new Promise((kesz) => {
      if (!allapot.felolvas || !('speechSynthesis' in window) || !szoveg) { kesz(); return; }
      const u = new SpeechSynthesisUtterance(szoveg);
      u.lang = 'hu-HU';
      if (hang) u.voice = hang;
      u.rate = 1.05;
      let vege = false;
      const lezar = () => { if (!vege) { vege = true; kesz(); } };
      u.onend = lezar;
      u.onerror = lezar;
      // Néhány böngésző nem jelzi a végét: biztonsági időkorlát a szöveg hosszából.
      setTimeout(lezar, 1500 + szoveg.length * 85);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    });
  }

  // ---- Felület ----
  const fab = document.createElement('button');
  fab.type = 'button';
  fab.id = 'hangos-inditas';
  fab.className = 'hangos-fab';
  fab.setAttribute('aria-label', 'Hangos árajánlat');
  fab.title = 'Hangos árajánlat';
  fab.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>`;
  document.body.append(fab);

  const panel = document.createElement('div');
  panel.id = 'hangos-panel';
  panel.className = 'hangos';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Hangos árajánlat');
  panel.hidden = true;
  panel.innerHTML = `
    <div class="hangos-fej">
      <span class="hangos-lepes" id="hangos-lepes"></span>
      <button type="button" class="kicsi button" id="hangos-felolvas" aria-pressed="true">Felolvasás: be</button>
      <button type="button" class="hangos-bezar" id="hangos-bezar" aria-label="Hangos árajánlat bezárása">×</button>
    </div>
    <p class="hangos-kerdes" id="hangos-kerdes"></p>
    <p class="hangos-hallott" id="hangos-hallott" aria-live="polite"></p>
    <p class="hangos-visszajelzes" id="hangos-visszajelzes" aria-live="polite"></p>
    <div class="hangos-also">
      <button type="button" class="kicsi button" id="hangos-vissza">Vissza</button>
      <button type="button" class="hangos-mic" id="hangos-mic" aria-label="Válaszolok (mikrofon)">
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button>
      <button type="button" class="kicsi button" id="hangos-kihagy">Kihagyás</button>
    </div>
    <div class="hangos-kesz-gombok">
      <button type="button" class="kicsi button" id="hangos-ujra">Újrakezdés</button>
      <button type="button" class="kicsi" id="hangos-kesz-bezar">Bezárás</button>
    </div>
    <form class="hangos-irott" id="hangos-irott">
      <input id="hangos-input" autocomplete="off" placeholder="Vagy írd be a választ" aria-label="Válasz beírása">
      <button type="submit" class="kicsi">OK</button>
    </form>
    <p class="hangos-tipp">Mondhatod: vissza, kihagyás, ismételd, mennyi a végösszeg, befejezés.</p>`;
  document.body.append(panel);

  const kiir = (id, s) => { $(id).textContent = s ?? ''; };
  const micAllapot = (hallgat) => {
    $('hangos-mic').classList.toggle('hallgat', hallgat);
    $('hangos-mic').setAttribute('aria-pressed', String(hallgat));
  };

  function kiemel(k) {
    allapot.kiemelt?.classList.remove('hangos-kiemelt');
    allapot.kiemelt = null;
    const nev = k.mezo ?? k.adat;
    const el = nev ? api.mezoElem(nev) : null;
    const cel = el?.closest('label') ?? (k.plusz || k.id.startsWith('plusz') ? $('plusz') : null);
    if (cel) {
      cel.classList.add('hangos-kiemelt');
      allapot.kiemelt = cel;
      cel.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  // ---- Beszélgetés ----
  function hallgat() {
    if (!allapot.aktiv) return;
    if (!vanDiktalas()) {
      kiir('hangos-hallott', 'Ez a böngésző nem ismeri fel a beszédet: írd be a választ.');
      return;
    }
    allapot.leallit?.();
    let kapott = false;
    micAllapot(true);
    kiir('hangos-hallott', 'Hallgatlak…');
    try {
      allapot.leallit = diktalas({
        kozben: (s) => kiir('hangos-hallott', `„${s}”`),
        kesz: (s) => { kapott = true; kiir('hangos-hallott', `„${s}”`); valasz(s); },
        hiba: (u) => kiir('hangos-hallott', u),
        vege: () => {
          allapot.leallit = null;
          micAllapot(false);
          if (!kapott && allapot.aktiv) {
            allapot.nemHallott += 1;
            if (allapot.nemHallott === 1) { hallgat(); return; } // egyszer magától újra
            kiir('hangos-hallott', 'Nem hallottam választ. Koppints a mikrofonra, vagy írd be.');
          }
        },
      });
    } catch (err) {
      micAllapot(false);
      kiir('hangos-hallott', `A mikrofon nem indult el: ${err.message}. Koppints a mikrofonra, vagy írd be a választ.`);
    }
  }

  async function kerdez(elotag = '') {
    if (!allapot.aktiv) return;
    const k = KERDESEK[allapot.index];
    if (k.szakasz !== allapot.szakasz) {
      if (allapot.szakasz && SZAKASZ_BEVEZETES[k.szakasz]) elotag = SZAKASZ_BEVEZETES[k.szakasz] + elotag;
      allapot.szakasz = k.szakasz;
      api.nezet(k.szakasz);
    }
    kiemel(k);
    const szoveg = kerdesSzoveg(k, api.projekt());
    kiir('hangos-kerdes', szoveg);
    kiir('hangos-lepes', { projekt: 'Projekt', anyag: 'Anyag', ajanlat: 'Ajánlat' }[k.szakasz]);
    kiir('hangos-hallott', '');
    allapot.nemHallott = 0;
    allapot.leallit?.();
    await beszel(elotag + szoveg);
    if (allapot.aktiv && KERDESEK[allapot.index] === k) hallgat();
  }

  // kijelzes: a képernyőre ezres tagolással, felolvasáshoz tagolás nélkül.
  function osszegSzoveg(kijelzes = false) {
    const o = api.osszegek();
    const f = kijelzes ? (x) => ft.format(Math.round(x)) : kerekszam;
    return `A munkadíj ${f(o.munkadij)} forint, az anyag ${o.anyag ? `${f(o.anyag)} forint` : 'még nincs beárazva'}, `
      + `a végösszeg ${f(o.vegosszeg)} forint.`;
  }

  function tovabb(ertek) {
    const j = kovetkezoIndex(allapot.index, api.projekt(), ertek, allapot.megvalaszolt);
    if (j < 0) { befejez(); return; }
    allapot.index = j;
    kerdez();
  }

  function visszajelzes(s) { kiir('hangos-visszajelzes', s); }

  function valasz(szoveg) {
    if (!allapot.aktiv) return;
    const k = KERDESEK[allapot.index];
    const p = api.projekt();

    // Plusz tételek: a mondat tételekre bontva kerül az anyaglistára.
    if (k.plusz) {
      const pr = parancs(szoveg, true);
      if (pr) { parancsVegrehajtas(pr); return; }
      const tetelek = diktaltTetelek(szoveg);
      if (!tetelek.length) { kerdez('Nem találtam benne tételt. '); return; }
      api.pluszFelvesz(tetelek);
      const lista = tetelek.map((t) => `${t.cikk} ${ft.format(t.mennyiseg)} ${t.egyseg}`).join(', ');
      visszajelzes(`Felvéve: ${lista}`);
      allapot.index = kovetkezoIndex(allapot.index, p, true, allapot.megvalaszolt);
      kerdez(`Felvettem: ${lista}. `);
      return;
    }

    // Több adat egy mondatban ("két WC, egy mosógép, hat radiátor").
    if (k.szakasz === 'projekt' && k.tipus === 'szam') {
      const tobb = tobbAdat(szoveg);
      if (tobb.length > 1 || (tobb.length === 1 && tobb[0].mezo !== k.mezo)) {
        for (const t of tobb) { api.mezoBeallit(t.mezo, t.ertek); allapot.megvalaszolt.add(t.mezo); }
        const lista = tobb.map((t) => `${ft.format(t.ertek)} ${t.cimke}`).join(', ');
        visszajelzes(`Beírva: ${lista}`);
        if (tobb.some((t) => t.mezo === k.mezo)) {
          const j = kovetkezoIndex(allapot.index, api.projekt(), undefined, allapot.megvalaszolt);
          if (j < 0) { befejez(); return; }
          allapot.index = j;
          kerdez(`Beírtam: ${lista}. `);
        } else {
          kerdez(`Beírtam: ${lista}. `);
        }
        return;
      }
    }

    const r = valaszErtelmez(szoveg, k, alapErtek(k, p));
    if (r.parancs) { parancsVegrehajtas(r.parancs); return; }
    if (r.ismeretlen) { kerdez(`Nem értettem. ${SUGO[k.tipus]} `); return; }

    if (k.adat) api.adatBeallit(k.adat, r.ertek);
    for (const [m, v] of beallitasok(k, r.ertek, p)) api.mezoBeallit(m, v);
    if (k.mezo) allapot.megvalaszolt.add(k.mezo);
    const kiirt = k.tipus === 'igennem' ? (r.ertek ? 'igen' : 'nem')
      : k.tipus === 'valasztas' ? (k.opciok.find((o) => o.ertek === r.ertek)?.szavak[0] ?? r.ertek)
        : (r.ertek === '' ? '(üres)' : String(r.ertek));
    visszajelzes(`${k.kerdes(p, alapErtek(k, p)).split('?')[0]}? → ${kiirt}`);
    tovabb(r.ertek);
  }

  async function parancsVegrehajtas(pr) {
    if (pr === 'vissza') { allapot.index = elozoIndex(allapot.index, api.projekt()); kerdez(); }
    else if (pr === 'kihagy') tovabb(undefined);
    else if (pr === 'ismet') kerdez();
    else if (pr === 'osszeg') { visszajelzes(osszegSzoveg(true)); await beszel(osszegSzoveg()); kerdez(); }
    else if (pr === 'stop') leall('Rendben, befejeztük. Az eddigi adatok megmaradtak.');
  }

  async function befejez() {
    allapot.leallit?.();
    api.nezet('ajanlat');
    const utana = ' Ha megjöttek a bolti árak, töltsd fel a PDF-eket az Árak lépésnél. Az ügyfélajánlat PDF gombja az Ajánlat lépésnél van.';
    const s = `Kész. ${osszegSzoveg()}${utana}`;
    kiir('hangos-kerdes', 'Kész az árajánlat.');
    kiir('hangos-hallott', '');
    visszajelzes(`${osszegSzoveg(true)}${utana}`);
    panel.classList.add('kesz');
    allapot.aktiv = false;
    micAllapot(false);
    allapot.kiemelt?.classList.remove('hangos-kiemelt');
    await beszel(s);
  }

  function leall(uzenet) {
    allapot.aktiv = false;
    allapot.leallit?.();
    allapot.leallit = null;
    window.speechSynthesis?.cancel();
    micAllapot(false);
    allapot.kiemelt?.classList.remove('hangos-kiemelt');
    if (uzenet) { kiir('hangos-kerdes', uzenet); beszel(uzenet); }
  }

  function bezar() {
    leall();
    panel.hidden = true;
    fab.hidden = false;
    document.body.classList.remove('hangos-nyitva');
  }

  // ---- Események ----
  fab.addEventListener('click', () => {
    panel.classList.remove('kesz');
    panel.hidden = false;
    fab.hidden = true;
    document.body.classList.add('hangos-nyitva');
    Object.assign(allapot, { aktiv: true, index: 0, megvalaszolt: new Set(), szakasz: null });
    visszajelzes('');
    kerdez('Hangos árajánlat. Bármikor mondhatod: vissza, kihagyás, ismételd, mennyi a végösszeg, vagy befejezés. ');
  });
  $('hangos-bezar').addEventListener('click', bezar);
  $('hangos-kesz-bezar').addEventListener('click', bezar);
  $('hangos-ujra').addEventListener('click', () => fab.click());
  $('hangos-felolvas').addEventListener('click', () => {
    allapot.felolvas = !allapot.felolvas;
    if (!allapot.felolvas) window.speechSynthesis?.cancel();
    $('hangos-felolvas').setAttribute('aria-pressed', String(allapot.felolvas));
    $('hangos-felolvas').textContent = `Felolvasás: ${allapot.felolvas ? 'be' : 'ki'}`;
  });
  $('hangos-mic').addEventListener('click', () => {
    if (!allapot.aktiv) { fab.click(); return; }
    if (allapot.leallit) { allapot.leallit(); return; }
    window.speechSynthesis?.cancel();
    allapot.nemHallott = 1; // kézi indításnál nincs automatikus újrapróba
    hallgat();
  });
  $('hangos-vissza').addEventListener('click', () => { if (allapot.aktiv) parancsVegrehajtas('vissza'); });
  $('hangos-kihagy').addEventListener('click', () => { if (allapot.aktiv) parancsVegrehajtas('kihagy'); });
  $('hangos-irott').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const s = $('hangos-input').value.trim();
    if (!s || !allapot.aktiv) return;
    $('hangos-input').value = '';
    allapot.leallit?.();
    window.speechSynthesis?.cancel();
    kiir('hangos-hallott', `„${s}”`);
    valasz(s);
  });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !panel.hidden) bezar(); });
}
