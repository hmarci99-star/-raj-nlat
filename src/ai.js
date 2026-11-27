// AI anyagjavaslat: az utasítás, a kérés szövege és a válasz utófeldolgozása.
// (A hívás a saját Cloudflare Workeren át megy; ez a modul csak tiszta függvényeket tartalmaz.)

import { hasonloNevek } from './nevek.js';

export const AI_RENDSZER = `Magyar víz-, gáz- és fűtésszerelő vállalkozó árajánlat-alkalmazásában dolgozol.
A feladatod: megtalálni, milyen anyag HIÁNYZIK még BIZTOSAN a munka anyaglistájáról.

Háttér:
- Minden kiállásnak (WC-tartály, mosdó, zuhanyzó…) és munkának van egy bevált anyagcsomagja, amit a szerelő maga
  állított össze. Ezek a csomagok TELJESEK. A bennük lévő anyagot, annak más méretű vagy más nevű változatát és
  a szokásos kiegészítőit (cső mellé idom, idom mellé hüvely, cső mellé csőhéj) NE javasold, és ne javasolj
  "ráhagyást" sem. A mennyiségek már a darabszámmal szorozva vannak.

Mikor javasolj:
- Ha a leírásból vagy a megadott munkákból olyan feladat következik, amihez a csomagokban és a listán NINCS anyag
  (pl. "a mosógép a konyhába kerül", de nincs mosógép-kiállás; "a gerincet is cseréljük", de nincs gerinc megadva).
- Ha egy megadott szerelvényhez vagy munkához egyértelműen kell valami, ami sehol nincs a listán.

Ne javasolj:
- szerszámot, munkadíjat, szolgáltatást;
- fogyóanyagot (teflon, kender, tömítőpaszta, csavar, tipli, ragasztó, szilikon), hacsak a leírás nem kéri;
- általános "jó, ha van" tételeket, és amit csak sejtesz.

Elnevezés (nagyon fontos):
- Csak a "Használt rendszerek és márkák" között szereplő gyártókat és rendszereket használd. Más gyártót, más
  csőrendszert vagy idomrendszert NE (pl. ha Rehau PX préselt rendszer van, ne javasolj menetes vagy más márkájú idomot).
- Ha a tétel az "Ismert tételnevek" között van (vagy annak megfelelője), pontosan azt a nevet és egységet írd, ismert=true.
- Új tételnél kövesd a meglévő nevek felépítését: márka, rendszer, méret, típus (pl. "Rehau PX 20 könyök"),
  a méretet ugyanazzal a jelöléssel (16, 20, 50/45°…).

Biztosság: "biztos" = egyértelműen kell, és nincs a listán; "valoszinu" = a leírás alapján valószínű, de a szerelő
döntse el. Kétes esetben inkább ne javasold. Inkább kevesebb, de pontos javaslat – az üres lista is jó válasz.
A "megjegyzes" legfeljebb két rövid mondat; ha hiányzó adat miatt nem tudsz dönteni (pl. méret), azt írd oda.
Az "Elutasított javaslatok" tételeit (és azok változatait) soha ne javasold.`;

export const AI_SEMA = {
  type: 'object',
  properties: {
    javaslatok: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          cikk: { type: 'string' },
          mennyiseg: { type: 'number' },
          egyseg: { type: 'string' },
          indok: { type: 'string' },
          ismert: { type: 'boolean' },
          biztos: { type: 'string', enum: ['biztos', 'valoszinu'] },
        },
        required: ['cikk', 'mennyiseg', 'egyseg', 'indok', 'ismert', 'biztos'],
        additionalProperties: false,
      },
    },
    megjegyzes: { type: 'string' },
  },
  required: ['javaslatok', 'megjegyzes'],
  additionalProperties: false,
};

const szam = (n) => String(Math.round(Number(n) * 100) / 100).replace('.', ',');
const felsorol = (sorok) => (sorok.length ? sorok.map((s) => `- ${s}`).join('\n') : '(nincs)');
const anyagSzoveg = (a) => `${a.cikk} ${szam(a.mennyiseg)} ${a.egyseg}`;

// A tételnevekből a használt gyártók és rendszerek (az első egy-két szó, pl. "Rehau PX", "Pipelife KAEM").
export function hasznaltRendszerek(nevek) {
  const db = new Map();
  for (const n of nevek) {
    const szavak = String(n).split(/\s+/).filter(Boolean);
    if (!szavak.length || !/^\p{Lu}/u.test(szavak[0])) continue;
    const kulcs = szavak[1] && /^[\p{Lu}\d][\p{Lu}\d+]*$/u.test(szavak[1]) ? `${szavak[0]} ${szavak[1]}` : szavak[0];
    db.set(kulcs, (db.get(kulcs) ?? 0) + 1);
  }
  return [...db].sort((a, b) => b[1] - a[1]).map(([k]) => k).slice(0, 40);
}

// adat: { leiras, projekt: [szöveg], csomagok: [{ nev, db, anyag }], munkak: [{ nev, mennyiseg, egyseg, anyag }],
//         anyaglista: [{ cikk, mennyiseg, egyseg }], ismertNevek: [{ cikk, egyseg }], elutasitott: [név] }
export function aiUzenet(adat) {
  const csomagok = (adat.csomagok ?? []).map((c) => `${c.nev} × ${szam(c.db)} – egy kiállás csomagja: ${c.anyag.length ? c.anyag.map(anyagSzoveg).join('; ') : '(üres)'}`);
  const munkak = (adat.munkak ?? []).map((m) => `${m.nev}: ${szam(m.mennyiseg)} ${m.egyseg}${m.anyag?.length ? ` – egységenként: ${m.anyag.map(anyagSzoveg).join('; ')}` : ''}`);
  const ismert = adat.ismertNevek ?? [];
  return `A munka leírása (a szerelő szavaival):
${String(adat.leiras ?? '').trim() || '(nincs leírás)'}

Megadott tételek (kiállások, szerelvények, fűtés, gerinc, mennyiséggel):
${felsorol(adat.projekt ?? [])}

A kiállások anyagcsomagjai (ezek teljesek):
${felsorol(csomagok)}

Munkák és szerelvények saját anyaggal:
${felsorol(munkak)}

A mostani anyaglista (összesítve):
${felsorol((adat.anyaglista ?? []).map(anyagSzoveg))}

Használt rendszerek és márkák:
${felsorol(hasznaltRendszerek(ismert.map((x) => x.cikk)))}

Ismert tételnevek [egység]:
${felsorol(ismert.map((x) => `${x.cikk} [${x.egyseg}]`))}

Elutasított javaslatok (ne javasold újra):
${felsorol(adat.elutasitott ?? [])}`;
}

// A válasz rendbetétele: ismert névre igazítás (hasonló név → pontos név és egység), az elutasítottak és a
// duplák kiszűrése. ismertek: Map(név -> egység).
export function aiUtofeldolgozas(javaslatok, ismertek, elutasitott = []) {
  const nevek = [...ismertek.keys()];
  const tilos = new Set(elutasitott.map((n) => n.toLowerCase()));
  const kesz = new Map();
  for (const j of javaslatok ?? []) {
    if (!j?.cikk || !(Number(j.mennyiseg) > 0)) continue;
    let cikk = j.cikk.trim();
    let egyseg = j.egyseg || 'db';
    let ismert = false;
    const pontos = nevek.find((n) => n.toLowerCase() === cikk.toLowerCase());
    if (pontos) { cikk = pontos; egyseg = ismertek.get(pontos); ismert = true; } else {
      const hasonlo = hasonloNevek(cikk, nevek, 1)[0];
      if (hasonlo) { cikk = hasonlo; egyseg = ismertek.get(hasonlo); ismert = true; }
    }
    if (tilos.has(cikk.toLowerCase()) || tilos.has(j.cikk.trim().toLowerCase())) continue;
    const kulcs = `${cikk}|${egyseg}`;
    const regi = kesz.get(kulcs);
    if (regi) { regi.mennyiseg += Number(j.mennyiseg); continue; }
    kesz.set(kulcs, { cikk, egyseg, mennyiseg: Number(j.mennyiseg), indok: j.indok ?? '', ismert, biztos: j.biztos === 'biztos' ? 'biztos' : 'valoszinu' });
  }
  return [...kesz.values()].sort((a, b) => (a.biztos === b.biztos ? 0 : a.biztos === 'biztos' ? -1 : 1));
}
