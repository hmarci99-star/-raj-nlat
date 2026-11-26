// Munkadíj-számítás a projekt adataiból.
//
// Szabályok:
// - Vízszerelés alapszerelés: annyi, ahány vízszerelési kiállás van összesen.
// - Hőtermelő: gáz- vagy vegyes kazán, illetve hőszivattyú gépészete 1 db.
// - Felár (1 db), ha radiátoros és padlófűtéses kör is van. Kazánnál mindig jár,
//   hőszivattyúnál csak akkor, ha a projektben be van kapcsolva (nyitott kérdés).
// - Puffertartály csak vegyes tüzelésű kazánhoz vehető fel; hőszivattyúnál
//   benne van a gépészet díjában.
// - A szerelvények (WC, mosdó, kabin, kád, bojler stb.) darabszámát
//   közvetlenül a projekt adja meg.

export const KIALLAS_TIPUSOK = [
  { kod: 'wc_tartaly', nev: 'WC-tartály' },
  { kod: 'kad', nev: 'Fürdőkád' },
  { kod: 'zuhanyzo', nev: 'Zuhanyzó' },
  { kod: 'bojler', nev: 'Bojler' },
  { kod: 'mosogep', nev: 'Mosógép' },
  { kod: 'hoszivattyu', nev: 'Hőszivattyú' },
  { kod: 'mosdo', nev: 'Mosdó' },
  { kod: 'konyha', nev: 'Konyha' },
  { kod: 'kerti_csap', nev: 'Kerti csap' },
];

export const HOTERMELOK = {
  nincs: null,
  gaz: 'gazkazan',
  vegyes: 'vegyes_kazan',
  hoszivattyu: 'hoszivattyu',
};

export const SZERELVENY_KODOK = [
  'wc',
  'mosdo_sima',
  'mosdo_butoros',
  'mosdo_dupla',
  'csaptelep',
  'zuhanycsaptelep_sullyesztett',
  'mosogep_bekotes',
  'zuhanykabin_konnyu',
  'zuhanykabin_kozepes',
  'zuhanykabin_nehez',
  'kad_hagyomanyos',
  'kad_elolapos',
  'bojler_egyszeru',
  'bojler_futesrol',
];

export function uresProjekt() {
  return {
    kiallasok: Object.fromEntries(KIALLAS_TIPUSOK.map((t) => [t.kod, 0])),
    radiatorKiallas: 0,
    radiatorFelszereles: 0,
    padlofutesKor: 0,
    kulsoVizFm: 0,
    kulsoSzennyvizFm: 0,
    gerinc: { 16: 0, 20: 0 },
    hotermelo: 'nincs',
    puffer: false,
    felarHoszivattyunal: false,
    szerelvenyek: Object.fromEntries(SZERELVENY_KODOK.map((k) => [k, 0])),
    egyeb: {}, // saját (egyéb) munkák mennyisége: kód -> mennyiség
  };
}

function szam(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function szamolMunkadij(projekt, tabla) {
  const mennyisegek = [];
  const figyelmeztetesek = [];
  const add = (kod, mennyiseg) => {
    const m = szam(mennyiseg);
    if (m > 0) mennyisegek.push([kod, m]);
  };

  // Fűtés
  const radiator = szam(projekt.radiatorKiallas);
  const padlo = szam(projekt.padlofutesKor);
  add('radiator_kiallas', radiator);
  add('radiator_felszereles', projekt.radiatorFelszereles);
  add('padlofutes_kor', padlo);

  // Víz
  // Minden kiállás után alapszerelés jár. Ha egy kiállásnak saját munkadíja van
  // (a táblázatban "alapszereles:<kód>" sorként), az külön sorban szerepel.
  let kiallasOsszesen = 0;
  for (const [kod, v] of Object.entries(projekt.kiallasok ?? {})) {
    if (tabla.has(`alapszereles:${kod}`)) add(`alapszereles:${kod}`, v);
    else kiallasOsszesen += szam(v);
  }
  add('viz_alapszereles', kiallasOsszesen);
  add('kulso_viz', projekt.kulsoVizFm);
  add('kulso_szennyviz', projekt.kulsoSzennyvizFm);

  // Szerelvények
  for (const kod of SZERELVENY_KODOK) add(kod, projekt.szerelvenyek?.[kod]);

  // Egyéb (saját) munkák: a táblázatba a felületen felvett tételekből kerülnek.
  for (const [kod, m] of Object.entries(projekt.egyeb ?? {})) {
    if (!tabla.has(kod)) {
      if (szam(m) > 0) figyelmeztetesek.push('Egy egyéb munka már nincs a listában, ezért kimaradt.');
      continue;
    }
    add(kod, m);
  }

  // Hőtermelő és kazánház
  const hotermelo = projekt.hotermelo ?? 'nincs';
  if (!(hotermelo in HOTERMELOK)) throw new Error(`Ismeretlen hőtermelő: ${hotermelo}`);
  const gepeszetKod = HOTERMELOK[hotermelo];
  if (gepeszetKod) add(gepeszetKod, 1);

  const vegyesKor = radiator > 0 && padlo > 0;
  if (vegyesKor) {
    if (hotermelo === 'gaz' || hotermelo === 'vegyes') {
      add('felar_vegyes_kor', 1);
    } else if (hotermelo === 'hoszivattyu') {
      if (projekt.felarHoszivattyunal) add('felar_vegyes_kor', 1);
    }
  }

  if (projekt.puffer) {
    if (hotermelo === 'vegyes') {
      add('puffer', 1);
    } else if (hotermelo === 'hoszivattyu') {
      figyelmeztetesek.push('Hőszivattyúnál a puffer a gépészet díjában van, külön nem számoltam fel.');
    } else {
      figyelmeztetesek.push('Puffertartály csak vegyes tüzelésű kazánhoz vehető fel, nem számoltam fel.');
    }
  }

  if ((radiator > 0 || padlo > 0) && !gepeszetKod) {
    figyelmeztetesek.push('Van fűtési kör, de nincs hőtermelő kiválasztva.');
  }

  const sorok = mennyisegek.map(([kod, mennyiseg]) => {
    const t = tabla.get(kod);
    if (!t) throw new Error(`Hiányzik a munkadíj-táblázatból: ${kod}`);
    return { ...t, mennyiseg, osszeg: t.egysegar * mennyiseg };
  });
  const osszesen = sorok.reduce((s, r) => s + r.osszeg, 0);
  return { sorok, osszesen, figyelmeztetesek };
}
