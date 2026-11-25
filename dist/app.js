function F(e){let t=[],s=[],a="",n=!1;for(let o=0;o<e.length;o++){let l=e[o];n?l==='"'&&e[o+1]==='"'?(a+='"',o++):l==='"'?n=!1:a+=l:l==='"'?n=!0:l===","?(s.push(a),a=""):l===`
`||l==="\r"?(l==="\r"&&e[o+1]===`
`&&o++,s.push(a),a="",s.some(r=>r!=="")&&t.push(s),s=[]):a+=l}return s.push(a),s.some(o=>o!=="")&&t.push(s),t}function W(e){let[,...t]=F(e.replace(/^﻿/,"")),s=new Map;for(let[a,n,o,l,r=""]of t){let u=Number(l);if(!a||!Number.isFinite(u))throw new Error(`Hib\xE1s sor a munkad\xEDj-t\xE1bl\xE1zatban: ${[a,n,l].join(", ")}`);s.set(a,{kod:a,tetel:n,egyseg:o,egysegar:u,megjegyzes:r})}return s}var x=[{kod:"wc_tartaly",nev:"WC-tart\xE1ly"},{kod:"kad",nev:"F\xFCrd\u0151k\xE1d"},{kod:"zuhanyzo",nev:"Zuhanyz\xF3"},{kod:"bojler",nev:"Bojler"},{kod:"mosogep",nev:"Mos\xF3g\xE9p"},{kod:"hoszivattyu",nev:"H\u0151szivatty\xFA"},{kod:"mosdo",nev:"Mosd\xF3"},{kod:"konyha",nev:"Konyha"},{kod:"kerti_csap",nev:"Kerti csap"}],Y={nincs:null,gaz:"gazkazan",vegyes:"vegyes_kazan",hoszivattyu:"hoszivattyu"},B=["wc","mosdo_sima","mosdo_butoros","mosdo_dupla","csaptelep","zuhanycsaptelep_sullyesztett","mosogep_bekotes","zuhanykabin_konnyu","zuhanykabin_kozepes","zuhanykabin_nehez","kad_hagyomanyos","kad_elolapos","bojler_egyszeru","bojler_futesrol"];function J(){return{kiallasok:Object.fromEntries(x.map(e=>[e.kod,0])),radiatorKiallas:0,radiatorFelszereles:0,padlofutesKor:0,kulsoVizFm:0,kulsoSzennyvizFm:0,gerinc:{16:0,20:0},hotermelo:"nincs",puffer:!1,felarHoszivattyunal:!1,szerelvenyek:Object.fromEntries(B.map(e=>[e,0]))}}function _(e){let t=Number(e);return Number.isFinite(t)&&t>0?t:0}function X(e,t){let s=[],a=[],n=(v,h)=>{let $=_(h);$>0&&s.push([v,$])},o=_(e.radiatorKiallas),l=_(e.padlofutesKor);n("radiator_kiallas",o),n("radiator_felszereles",e.radiatorFelszereles),n("padlofutes_kor",l);let r=Object.values(e.kiallasok??{}).reduce((v,h)=>v+_(h),0);n("viz_alapszereles",r),n("kulso_viz",e.kulsoVizFm),n("kulso_szennyviz",e.kulsoSzennyvizFm);for(let v of B)n(v,e.szerelvenyek?.[v]);let u=e.hotermelo??"nincs";if(!(u in Y))throw new Error(`Ismeretlen h\u0151termel\u0151: ${u}`);let c=Y[u];c&&n(c,1),o>0&&l>0&&(u==="gaz"||u==="vegyes"||u==="hoszivattyu"&&e.felarHoszivattyunal)&&n("felar_vegyes_kor",1),e.puffer&&(u==="vegyes"?n("puffer",1):u==="hoszivattyu"?a.push("H\u0151szivatty\xFAn\xE1l a puffer a g\xE9p\xE9szet d\xEDj\xE1ban van, k\xFCl\xF6n nem sz\xE1moltam fel."):a.push("Puffertart\xE1ly csak vegyes t\xFCzel\xE9s\u0171 kaz\xE1nhoz vehet\u0151 fel, nem sz\xE1moltam fel.")),(o>0||l>0)&&!c&&a.push("Van f\u0171t\xE9si k\xF6r, de nincs h\u0151termel\u0151 kiv\xE1lasztva.");let g=s.map(([v,h])=>{let $=t.get(v);if(!$)throw new Error(`Hi\xE1nyzik a munkad\xEDj-t\xE1bl\xE1zatb\xF3l: ${v}`);return{...$,mennyiseg:h,osszeg:$.egysegar*h}}),y=g.reduce((v,h)=>v+h.osszeg,0);return{sorok:g,osszesen:y,figyelmeztetesek:a}}function Be(e){return Number(String(e).trim().replace(",","."))}function Q(e){let[,...t]=F(e.replace(/^﻿/,"")),s=new Map;for(let[a,n,o,l,r=""]of t){let u=Be(o);if(!a||!n||!Number.isFinite(u))throw new Error(`Hib\xE1s sor a ki\xE1ll\xE1s-k\xF6nyvt\xE1rban: ${[a,n,o].join(", ")}`);s.has(a)||s.set(a,[]),s.get(a).push({cikk:n,mennyiseg:u,egyseg:l,cikkszam:r.trim()})}return s}var Ce={16:{cso:"Rehau Rautitan Stabil cs\u0151 16,2x2,6 mm",csohej:"Kaiflex cs\u0151h\xE9j 4x18 mm"},20:{cso:"Rehau Rautitan Stabil cs\u0151 20x2,9 mm",csohej:"Kaiflex cs\u0151h\xE9j 4x22 mm"}};function Oe(e){let t;if(t=e.match(/PX ([\d-]+) T-idom/)){let s=t[1].split("-").map(Number);return s.length===3?s:[s[0],s[0],s[0]]}if(t=e.match(/(\d+)-(?:os|as|es) falikorong/))return[Number(t[1])];if(t=e.match(/PX (\d+)(?:-(\d+))? (?:könyök|toldóidom)/)){let s=Number(t[1]);return[s,t[2]?Number(t[2]):s]}return[]}function Fe(e){let t=e.match(/PX (\d+) toldóhüvely/);return t?Number(t[1]):null}function Ie(e){let t=new Map,s=new Map,a=(o,l,r)=>o.set(l,(o.get(l)??0)+r);for(let o of e){for(let r of Oe(o.cikk))a(t,r,o.mennyiseg);let l=Fe(o.cikk);l&&a(s,l,o.mennyiseg)}return[...new Set([...t.keys(),...s.keys()])].map(o=>({atmero:o,szukseges:t.get(o)??0,megadott:s.get(o)??0})).filter(o=>o.szukseges!==o.megadott).sort((o,l)=>o.atmero-l.atmero)}function ee(e,t){let s=new Map,a=[],n=(l,r)=>{let u=`${l.cikk}|${l.egyseg}`,c=s.get(u)??{cikk:l.cikk,egyseg:l.egyseg,cikkszam:l.cikkszam??"",mennyiseg:0};c.mennyiseg+=l.mennyiseg*r,!c.cikkszam&&l.cikkszam&&(c.cikkszam=l.cikkszam),s.set(u,c)};for(let{kod:l,nev:r}of x){let u=Number(e.kiallasok?.[l])||0;if(u<=0)continue;let c=e.felulirasok?.[r]??t.get(r);if(!c){a.push(`Nincs anyagcsomag a ki\xE1ll\xE1shoz: ${r}`);continue}for(let k of Ie(c))a.push(`${r}: a h\xFCvelyszab\xE1ly szerint ${k.szukseges} db ${k.atmero}-as told\xF3h\xFCvely kellene, a csomagban ${k.megadott} van.`);for(let k of c)n(k,u)}for(let[l,{cso:r,csohej:u}]of Object.entries(Ce)){let c=Number(e.gerinc?.[l])||0;c<=0||(n({cikk:r,egyseg:"fm",mennyiseg:c},1),n({cikk:u,egyseg:"fm",mennyiseg:c},1))}return{sorok:[...s.values()].map(l=>({...l,mennyiseg:Math.round(l.mennyiseg*100)/100})),figyelmeztetesek:a}}function I(e){return e.map((t,s)=>`${s+1}. ${t.cikk} \u2013 ${String(t.mennyiseg).replace(".",",")} ${t.egyseg}`+(t.cikkszam?` (cikksz\xE1m: ${t.cikkszam})`:"")).join(`

`)}var b=e=>`${e.cikk}|${e.egyseg}`;function L(e){let t=String(e).replace(/ft\.?/gi,"").replace(/[\s ]/g,"");return t?(/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)&&(t=t.replace(/\./g,"")),t=t.replace(",","."),/^\d+(\.\d+)?$/.test(t)?Number(t):NaN):NaN}function se(e){return e.toLowerCase().normalize("NFC").replace(/[()"„”]/g," ")}function te(e){return se(e).split(/[\s,;/]+/).filter(t=>t.length>1)}function ne(e){let t=e.split(/\t|;|\||\s{2,}/).map(n=>n.trim()).filter(Boolean),s=[];if(t.length>=2){let n=t.length-1;for(;n>0;n--){let o=t[n];if(/^(db|fm|m|pár|kör|ft)\.?$/i.test(o))continue;let r=o.replace(/\s*(db|fm|m|pár)\.?$/i,"").split(new RegExp("(?<=ft\\.?)\\s+(?=\\d)","i")).map(L);if(r.some(Number.isNaN))break;s.unshift(...r)}return{szamok:s,szoveg:t.slice(0,n+1).join(" ")}}let a=e.match(/((?:[\s/:–-]+\d[\d .]*(?:,\d+)?\s*(?:ft|db|fm)?\.?)+)\s*$/i);if(!a)return{szamok:[],szoveg:e};for(let n of a[1].matchAll(/\d{1,3}(?:[ .]\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g))s.push(L(n[0]));return{szamok:s,szoveg:e.slice(0,a.index)}}function Ue(e,t){let s=se(e),a=t.find(g=>g.cikkszam&&new RegExp(`(^|\\D)${g.cikkszam}(\\D|$)`).test(e));if(a)return a;let n=te(e),o=new Set(n),l=(g,y)=>g[0]-y[0]||g[1]-y[1],r=null,u=[0,0],c=[0,0],k=g=>n.some(y=>y===g||y.startsWith(g)&&!/\d/.test(y[g.length]));for(let g of t){let y=te(g.cikk);if(y.length===0||!y.filter($=>/\d/.test($)).every(k))continue;let v=new Set(y),h=[y.filter($=>o.has($)||s.includes($)).length/y.length,n.length?n.filter($=>v.has($)).length/n.length:0];l(h,u)>0?(c=u,u=h,r=g):l(h,c)>0&&(c=h)}return u[0]>=.7&&l(u,c)>0?r:null}function ae(e,t,s=null){let a=[...e];a.length>=2&&a[0]===t&&(a=a.slice(1));let n=a.filter((r,u)=>!a.slice(0,u).some(c=>Math.abs(c*t-r)<1&&t!==1));if(n.length===0)return null;if(s){let[r,u=r]=n;return{[s]:s==="kedvezmenyes"?Math.min(r,u):Math.max(r,u)}}if(n.length===1)return{bolti:n[0],kedvezmenyes:null};let[o,l]=n;return{bolti:Math.max(o,l),kedvezmenyes:Math.min(o,l)}}var De="db|fm|m|p\xE1r|kg|cs|csomag|szett|tekercs|doboz|zs\xE1k|l",Pe=/összesen|végösszeg|fizetendő|részösszeg|árajánlat|kelt|dátum|oldal|érvényes|bankszámla|adószám|telefon/i;function Re(e,t=null){let{szamok:s,szoveg:a}=ne(e);if(s.length===0)return null;let o=[...e.matchAll(new RegExp(`(?:^|[\\s\\t])(\\d+(?:[.,]\\d+)?)\\s*(${De})\\.?(?=[\\s\\t;|]|$)`,"gi"))].at(-1),l=o?L(o[1]):1,r=o?o[2].toLowerCase():"db",u=ae(s,l,t);if(!u||!Object.values(u).some(y=>y>=10))return null;let c=a;o&&c.endsWith(o[0].trim())&&(c=c.slice(0,-o[0].trim().length));let k="",g=c.match(/^(\d{4,})\s+(.*)$/);return g&&([,k,c]=g),c=c.replace(/^\d+[.)]\s+/,"").replace(/[\s–:-]+$/,"").replace(/\s+/g," ").trim(),(c.match(new RegExp("\\p{L}","gu"))??[]).length<3||Pe.test(c)?null:{cikk:c,cikkszam:k,mennyiseg:l,egyseg:r,ar:u,sor:e}}function oe(e,t,s=null){let a=new Map,n=[],o=[];for(let l of e.split(/\r?\n/)){let r=l.trim();if(!r)continue;let{szamok:u,szoveg:c}=ne(r);if(u.length===0)continue;let k=Ue(c,t),g=k&&ae(u,k.mennyiseg,s);if(k&&g){a.set(b(k),g);continue}let y=Re(r,s);y?n.push(y):o.push(r)}return{arak:a,jeloltek:n,nemIllesztett:o}}function U(e,t,s){let a=r=>Math.round(r),n=t.map(r=>{let u=s[b(r)]??{},c=Number.isFinite(u.bolti)?u.bolti:null,k=Number.isFinite(u.kedvezmenyes)?u.kedvezmenyes:null,g=c===null?null:a(c*r.mennyiseg),y=k===null?null:a(k*r.mennyiseg),v=g===null||y===null?null:g-y;return{...r,bolti:c,kedvezmenyes:k,boltiOsszeg:g,kedvOsszeg:y,haszon:v}}),o=r=>n.reduce((u,c)=>u+(c[r]??0),0),l=o("boltiOsszeg");return{munkadij:e,anyag:n,anyagBolti:l,anyagKedvezmenyes:o("kedvOsszeg"),haszon:o("haszon"),vegosszeg:e.osszesen+l,hianyzoBolti:n.filter(r=>r.bolti===null).length,hianyzoKedvezmenyes:n.filter(r=>r.kedvezmenyes===null).length}}function D(e,t){let s=new Map([...e].map(([a,n])=>[a,[...n]]));for(let a of t){let n=s.get(a.kiallas)??[];n.some(o=>o.cikk===a.cikk&&o.egyseg===a.egyseg)||(n.push({cikk:a.cikk,mennyiseg:a.mennyiseg,egyseg:a.egyseg,cikkszam:a.cikkszam??""}),s.set(a.kiallas,n))}return s}function le(e,t){return(e.get(t.kiallas)??[]).some(s=>s.cikk===t.cikk&&s.egyseg===t.egyseg)}var Ve=e=>{let t=String(e??"");return/[",\n]/.test(t)?`"${t.replace(/"/g,'""')}"`:t};function re(e){let t=[["Ki\xE1ll\xE1s","Cikk","Mennyis\xE9g","Egys\xE9g","Cikksz\xE1m"]];for(let[s,a]of e)for(let n of a)t.push([s,n.cikk,String(n.mennyiseg).replace(".",","),n.egyseg,n.cikkszam]);return`${t.map(s=>s.map(Ve).join(",")).join(`
`)}
`}var ce=new Intl.NumberFormat("hu-HU",{useGrouping:"always"}),z=e=>e==null?"\u2013":`${ce.format(e)} Ft`,P=(e,t)=>`${ce.format(e)} ${t}`;function p(e){return String(e??"").replace(/[&<>"]/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[t])}function ue(e){let t=new Date(`${e}T12:00:00`);return Number.isNaN(t.getTime())?"":new Intl.DateTimeFormat("hu-HU",{year:"numeric",month:"long",day:"numeric"}).format(t)}function qe(e,t){let s=new Date(`${e}T12:00:00`);return Number.isNaN(s.getTime())||!(t>0)?"":(s.setDate(s.getDate()+Number(t)),s.toISOString().slice(0,10))}var me=(e,t)=>`${ue(e).replace(/\.$/,"")}-${t}`,ie=(...e)=>e.filter(Boolean).map(p).join("<br>");function de(e,t){let{vallalkozo:s={},ugyfel:a={},ajanlat:n={}}=t,o=qe(n.datum,n.ervenyesNap);return`
    <header class="ny-fej">
      <div class="ny-vallalkozo">
        <strong>${p(s.nev)}</strong><br>
        ${ie(s.cim,s.adoszam&&`Ad\xF3sz\xE1m: ${s.adoszam}`,s.telefon,s.email)}
      </div>
      <div class="ny-cim">
        <h1>${p(e)}</h1>
        ${n.szam?`<div>Sz\xE1m: ${p(n.szam)}</div>`:""}
        ${n.datum?`<div>Kelt: ${p(ue(n.datum))}</div>`:""}
        ${o?`<div>\xC9rv\xE9nyes: ${p(me(o,"ig"))}</div>`:""}
      </div>
    </header>
    ${a.nev||a.cim||a.munkaHelye?`
    <section class="ny-ugyfel">
      <div><span class="ny-cimke">Megrendel\u0151</span><br>${ie(a.nev,a.cim)}</div>
      ${a.munkaHelye?`<div><span class="ny-cimke">A munka helye</span><br>${p(a.munkaHelye)}</div>`:""}
    </section>`:""}`}function ke(e,t){let s=e.munkadij.sorok.map(l=>`
    <tr>
      <td>${p(l.tetel)}${l.megjegyzes?`<div class="ny-megj">${p(l.megjegyzes)}</div>`:""}</td>
      <td class="num">${p(P(l.mennyiseg,l.egyseg))}</td>
      <td class="num">${z(l.egysegar)}</td>
      <td class="num">${z(l.osszeg)}</td>
    </tr>`).join(""),a=e.anyag.map(l=>`
    <tr>
      <td>${p(l.cikk)}</td>
      <td class="num">${p(P(l.mennyiseg,l.egyseg))}</td>
      <td class="num">${z(l.bolti)}</td>
      <td class="num">${z(l.boltiOsszeg)}</td>
    </tr>`).join(""),n='<thead><tr><th>Megnevez\xE9s</th><th class="num">Mennyis\xE9g</th><th class="num">Egys\xE9g\xE1r</th><th class="num">\xD6sszeg</th></tr></thead>',o=t.ajanlat?.megjegyzes;return`
    <article class="ny-lap">
      ${de("\xC1raj\xE1nlat",t)}
      ${e.munkadij.sorok.length?`
      <h2>Munkad\xEDj</h2>
      <table>${n}<tbody>${s}</tbody>
        <tfoot><tr><td colspan="3">Munkad\xEDj \xF6sszesen</td><td class="num">${z(e.munkadij.osszesen)}</td></tr></tfoot>
      </table>`:""}
      ${e.anyag.length?`
      <h2>Anyag</h2>
      <table>${n}<tbody>${a}</tbody>
        <tfoot><tr><td colspan="3">Anyag \xF6sszesen</td><td class="num">${z(e.anyagBolti)}</td></tr></tfoot>
      </table>`:""}
      <table class="ny-osszesites">
        ${e.munkadij.sorok.length&&e.anyag.length?`
        <tr><td>Munkad\xEDj</td><td class="num">${z(e.munkadij.osszesen)}</td></tr>
        <tr><td>Anyag</td><td class="num">${z(e.anyagBolti)}</td></tr>`:""}
        <tr class="ny-vegosszeg"><td>Fizetend\u0151 v\xE9g\xF6sszeg</td><td class="num">${z(e.vegosszeg)}</td></tr>
      </table>
      <div class="ny-zaras">
      <p class="ny-afa">Alanyi ad\xF3mentes, az \xE1rak \xC1FA-t nem tartalmaznak.</p>
      ${e.anyag.length&&t.ajanlat?.datum?`<p class="ny-megj">Az anyag\xE1rak a ${p(me(t.ajanlat.datum,"i"))} bolti \xE1rak.</p>`:""}
      ${o?`<p class="ny-szabad">${p(o).replace(/\n/g,"<br>")}</p>`:""}
      <footer class="ny-alairas"><div>${p(t.vallalkozo?.nev)}</div></footer>
      </div>
    </article>`}function ge(e,t){let s=e.anyag.map(n=>`
    <tr>
      <td>${p(n.cikk)}</td>
      <td class="num">${p(P(n.mennyiseg,n.egyseg))}</td>
      <td class="num">${z(n.kedvezmenyes)}</td>
      <td class="num">${z(n.bolti)}</td>
      <td class="num">${z(n.kedvOsszeg)}</td>
      <td class="num">${z(n.boltiOsszeg)}</td>
      <td class="num">${z(n.haszon)}</td>
    </tr>`).join(""),a=[e.hianyzoBolti&&`${e.hianyzoBolti} t\xE9telnek nincs bolti \xE1ra.`,e.hianyzoKedvezmenyes&&`${e.hianyzoKedvezmenyes} t\xE9telnek nincs kedvezm\xE9nyes \xE1ra.`].filter(Boolean);return`
    <article class="ny-lap ny-belso">
      ${de("Bels\u0151 \xF6sszes\xEDt\u0151",{...t,ajanlat:{...t.ajanlat,ervenyesNap:0}})}
      <p class="ny-bizalmas">Bels\u0151 haszn\xE1latra, az \xFCgyf\xE9lnek nem adhat\xF3 ki.</p>
      ${a.length?`<p class="ny-hiany">${a.map(p).join(" ")}</p>`:""}
      <table class="ny-osszesites ny-kpi">
        <tr><td>Munkad\xEDj</td><td class="num">${z(e.munkadij.osszesen)}</td></tr>
        <tr><td>Haszon az anyagon</td><td class="num">${z(e.haszon)}</td></tr>
        <tr class="ny-vegosszeg"><td>Bev\xE9tel \xF6sszesen (munkad\xEDj + haszon)</td><td class="num">${z(e.munkadij.osszesen+e.haszon)}</td></tr>
        <tr><td>Az \xFCgyf\xE9l fizet</td><td class="num">${z(e.vegosszeg)}</td></tr>
        <tr><td>Anyagbeszerz\xE9s (kedvezm\xE9nyes brutt\xF3 \xE1ron)</td><td class="num">${z(e.anyagKedvezmenyes)}</td></tr>
      </table>
      ${e.anyag.length?`
      <h2>Anyag t\xE9telesen</h2>
      <table class="ny-suru">
        <thead><tr><th>Cikk</th><th class="num">Menny.</th><th class="num">Kedv. egys\xE9g\xE1r</th><th class="num">Bolti egys\xE9g\xE1r</th>
          <th class="num">Beszerz\xE9s</th><th class="num">Bolti \xF6sszeg</th><th class="num">Haszon</th></tr></thead>
        <tbody>${s}</tbody>
        <tfoot><tr><td colspan="4">\xD6sszesen</td><td class="num">${z(e.anyagKedvezmenyes)}</td>
          <td class="num">${z(e.anyagBolti)}</td><td class="num">${z(e.haszon)}</td></tr></tfoot>
      </table>`:""}
    </article>`}function ye(e,t){let s=(t.ugyfel?.nev||"").trim().replace(/[\\/:*?"<>|]+/g,"").replace(/\s+/g,"_");return[e,s,t.ajanlat?.datum].filter(Boolean).join("_")}var ze="../vendor/pdfjs-4.10.38-legacy/",Ze=/^\d[\d\s .]*(,\d+)?(\s*ft\.?)?$/i,R=e=>Ze.test(e.trim());function Ge(e){e.sort((a,n)=>a.x-n.x);let t=[],s=null;for(let a of e){let n=s?a.x-s.x1:1/0,o=s&&/(\d|ft\.?|db|fm|pár)$/i.test(s.szoveg.trim())&&/^\d/.test(a.str.trim());!s||n>a.h*(o?.6:1.2)?(s={x0:a.x,x1:a.x+a.w,szoveg:a.str},t.push(s)):(n>a.h*.12&&!s.szoveg.endsWith(" ")&&!a.str.startsWith(" ")&&(s.szoveg+=" "),s.szoveg+=a.str,s.x1=Math.max(s.x1,a.x+a.w))}for(let a of t)a.szoveg=a.szoveg.replace(/\s+/g," ").trim();return t.filter(a=>a.szoveg)}var We=e=>e.segs.length>=3&&e.segs.slice(-2).every(t=>R(t.szoveg)),Ye=(e,t)=>e.x0<t.x1+2&&t.x0<e.x1+2;function Je(e,t){let s=e.segs.map(a=>({x0:a.x0,x1:a.x1,szam:R(a.szoveg),darabok:[{y:e.y,szoveg:a.szoveg}]}));for(let a of t)for(let n of a.segs){let o=s.find(l=>Ye(l,n));if(o){if(o.szam&&!R(n.szoveg))continue;o.darabok.push({y:a.y,szoveg:n.szoveg}),o.x0=Math.min(o.x0,n.x0),o.x1=Math.max(o.x1,n.x1)}else s.push({x0:n.x0,x1:n.x1,szam:!1,darabok:[{y:a.y,szoveg:n.szoveg}]})}return s.sort((a,n)=>a.x0-n.x0),s.map(a=>a.darabok.sort((n,o)=>o.y-n.y).map(n=>n.szoveg).join(" ")).join("	")}function Xe(e){let t=e.filter(l=>l.str&&l.str.trim()).map(l=>({...l,h:l.h>0?l.h:10})).sort((l,r)=>r.y-l.y||l.x-r.x),s=[];for(let l of t){let r=s.find(u=>Math.abs(u.y-l.y)<=Math.min(u.h,l.h)*.5);r?r.darabok.push(l):s.push({y:l.y,h:l.h,darabok:[l]})}s.sort((l,r)=>r.y-l.y);for(let l of s)l.segs=Ge(l.darabok);let a=s.filter(We),n=new Map(a.map(l=>[l,[]])),o=new Set;for(let l of s){if(n.has(l))continue;let r=null;for(let u of a){let c=Math.abs(u.y-l.y);c<=Math.max(u.h,l.h)*1.45&&(!r||c<Math.abs(r.y-l.y))&&(r=u)}r&&(n.get(r).push(l),o.add(l))}return s.filter(l=>!o.has(l)).map(l=>n.has(l)?Je(l,n.get(l)):l.segs.map(r=>r.szoveg).join("	")).filter(Boolean).join(`
`)}var fe=null;function Qe(){return fe??(fe=import(new URL(`${ze}pdf.min.mjs`,import.meta.url).href).then(e=>(e.GlobalWorkerOptions.workerSrc=new URL(`${ze}pdf.worker.min.mjs`,import.meta.url).href,e))),fe}async function pe(e){let s=await(await Qe()).getDocument({data:new Uint8Array(await e.arrayBuffer())}).promise,a=[];try{for(let n=1;n<=s.numPages;n++){let l=await(await s.getPage(n)).getTextContent();a.push(Xe(l.items.map(r=>({str:r.str,x:r.transform[4],y:r.transform[5],w:r.width,h:r.height||Math.abs(r.transform[3])}))))}}finally{s.destroy()}return a.filter(Boolean).join(`
`)}var Ee="arajanlat.projekt",N="arajanlat.arak",ve="arajanlat.adatok",K="arajanlat.plusz",Ne="arajanlat.konyvtar-bovites",we="arajanlat.nezet",M=new Intl.NumberFormat("hu-HU",{useGrouping:"always"}),m=e=>document.getElementById(e),O=m("projekt"),i={tabla:null,alapKonyvtar:null,konyvtar:null,bovitesek:[],plusz:[],jeloltek:{},projekt:null,konyvtarbaNyitva:null,munkadij:null,anyag:{sorok:[],figyelmeztetesek:[]},arak:{},arTablaAlairas:"",adatok:{}};function d(e){return String(e).replace(/[&<>"]/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[t])}var f=e=>e==null?"\u2013":`${M.format(e)} Ft`,q=e=>e.map(t=>`<p class="warn">${d(t)}</p>`).join("");function j(e,t){try{localStorage.setItem(e,JSON.stringify(t))}catch{}}function A(e){try{return JSON.parse(localStorage.getItem(e))}catch{return null}}var be=["projekt","anyag","arak","ajanlat"];function V(e,t=!0){be.includes(e)||(e="projekt");for(let s of be)m(`nezet-${s}`).hidden=s!==e;for(let s of document.querySelectorAll(".ful"))s.dataset.nezet===e?s.setAttribute("aria-current","page"):s.removeAttribute("aria-current");try{localStorage.setItem(we,e)}catch{}t&&window.scrollTo({top:0})}function et(){for(let t of document.querySelectorAll(".ful"))t.addEventListener("click",()=>V(t.dataset.nezet));for(let t of document.querySelectorAll("[data-ugras]"))t.addEventListener("click",()=>V(t.dataset.ugras));let e=null;try{e=localStorage.getItem(we)}catch{}V(e??"projekt",!1)}var T=(e,t)=>{let s=m(e);s&&(s.textContent=t)};function he(e,t){return`<label><span>${d(t)}</span><input type="number" min="0" name="${e}"></label>`}function tt(){m("kiallasok").innerHTML=x.map(e=>he(`kiallasok.${e.kod}`,e.nev)).join(""),m("szerelvenyek").innerHTML=B.map(e=>he(`szerelvenyek.${e}`,i.tabla.get(e).tetel)).join(""),st()}function st(){for(let e of O.querySelectorAll("input[type=number]")){if(e.parentElement.classList.contains("lepteto"))continue;let t=e.closest("label")?.querySelector("span")?.textContent??"",s=document.createElement("span");s.className="lepteto",e.replaceWith(s);let a=(n,o,l)=>{let r=document.createElement("button");return r.type="button",r.className="lepes",r.textContent=n,r.setAttribute("aria-label",`${l}: ${t}`),r.addEventListener("click",u=>{u.preventDefault();let c=Number(e.step)||1,k=Math.max(0,Math.round(((Number(e.value)||0)+o*c)/c)*c);e.value=k?String(k):"",e.dispatchEvent(new Event("input",{bubbles:!0}))}),r};s.append(a("\u2212",-1,"Cs\xF6kkent\xE9s"),e,a("+",1,"N\xF6vel\xE9s"))}}function nt(){let e=J();for(let t of O.elements){if(!t.name)continue;let s=t.type==="checkbox"?t.checked:t.type==="number"?Number(t.value||0):t.value,[a,n]=t.name.split(".");n?e[a][n]=s:e[a]=s}return e}function at(e){for(let t of O.elements){if(!t.name)continue;let[s,a]=t.name.split("."),n=a?e[s]?.[a]:e[s];n!==void 0&&(t.type==="checkbox"?t.checked=!!n:t.type==="number"?t.value=n||"":t.value=n)}}function Le(e){return e.sorok.length===0?'<p class="muted">Adj meg legal\xE1bb egy t\xE9telt.</p>':`
    <table>
      <thead><tr><th>T\xE9tel</th><th class="num">Menny.</th><th class="num hide-sm">Egys\xE9g\xE1r</th><th class="num">\xD6sszeg</th></tr></thead>
      <tbody>${e.sorok.map(s=>`
    <tr>
      <td>${d(s.tetel)}${s.megjegyzes?`<div class="muted">${d(s.megjegyzes)}</div>`:""}</td>
      <td class="num">${M.format(s.mennyiseg)} ${d(s.egyseg)}</td>
      <td class="num hide-sm">${M.format(s.egysegar)}</td>
      <td class="num">${f(s.osszeg)}</td>
    </tr>`).join("")}</tbody>
      <tfoot><tr><td colspan="2">Munkad\xEDj \xF6sszesen</td><td class="hide-sm"></td><td class="num">${f(e.osszesen)}</td></tr></tfoot>
    </table>`}var Ae=e=>`Szia!

A k\xF6vetkez\u0151 t\xE9telekr\u0151l szeretn\xE9k k\xE9rni \xE1raj\xE1nlatot.
K\xF6sz\xF6n\xF6m sz\xE9pen el\u0151re is.

${e}
`;function ot(){let e=i.anyag;T("jelveny-anyag",e.sorok.length?String(e.sorok.length):"");let t=I(e.sorok);if(m("email").href=`mailto:?subject=${encodeURIComponent("\xC1raj\xE1nlatk\xE9r\xE9s \u2013 anyaglista")}&body=${encodeURIComponent(Ae(t))}`,m("anyag-gombok").hidden=e.sorok.length===0,e.sorok.length===0){m("anyaglista").innerHTML=q(e.figyelmeztetesek)+'<p class="muted">Adj meg ki\xE1ll\xE1st vagy gerincet.</p>';return}let s=e.sorok.some(n=>n.cikkszam),a=e.sorok.map(n=>`
    <tr>
      ${s?`<td>${d(n.cikkszam)}</td>`:""}
      <td>${d(n.cikk)}${n.plusz?' <span class="cimke">plusz</span>':""}</td>
      <td class="num">${M.format(n.mennyiseg)} ${d(n.egyseg)}</td>
    </tr>`).join("");m("anyaglista").innerHTML=`${q(e.figyelmeztetesek)}
    <table>
      <thead><tr>${s?"<th>Cikksz\xE1m</th>":""}<th>Cikk</th><th class="num">Mennyis\xE9g</th></tr></thead>
      <tbody>${a}</tbody>
    </table>`}var $e=(e,t,s)=>`<input type="text" inputmode="decimal" class="ar"
  data-kulcs="${d(e)}" data-mezo="${t}" value="${s??""}" aria-label="${t==="bolti"?"Bolti \xE1r":"Kedvezm\xE9nyes \xE1r"}">`;function w(e=!1){let t=i.anyag.sorok,s=t.map(a=>`${b(a)}=${a.mennyiseg}`).join(`
`);!e&&s===i.arTablaAlairas||(i.arTablaAlairas=s,m("ar-szakasz").hidden=t.length===0,m("ar-ures").hidden=t.length>0,m("ar-tabla").innerHTML=`
    <table class="ar-tabla">
      <thead><tr><th>Cikk</th><th class="num">Bolti \xE1r<br>(brutt\xF3)</th><th class="num">Kedv. \xE1r<br>(brutt\xF3)</th></tr></thead>
      <tbody>${t.map(a=>{let n=b(a),o=i.arak[n]??{};return`<tr>
          <td>${d(a.cikk)}<div class="muted">${M.format(a.mennyiseg)} ${d(a.egyseg)}</div></td>
          <td class="num">${$e(n,"bolti",o.bolti)}</td>
          <td class="num">${$e(n,"kedvezmenyes",o.kedvezmenyes)}</td>
        </tr>`}).join("")}</tbody>
    </table>`)}var Ke={bolti:"bolti",kedvezmenyes:"kedvezm\xE9nyes"};function Te(e,t){if(i.anyag.sorok.length===0)return'<p class="warn">M\xE9g nincs anyaglista. El\u0151bb add meg a ki\xE1ll\xE1sokat, ut\xE1na t\xF6ltsd fel az \xE1rakat.</p>';let{arak:s,jeloltek:a,nemIllesztett:n}=oe(e,i.anyag.sorok,t);for(let[c,k]of s)Z(c,k);j(N,i.arak),w(!0),H();let o=t??"szoveg";i.jeloltek[o]=a;let l=c=>i.anyag.sorok.filter(k=>!Number.isFinite(i.arak[b(k)]?.[c])).length,r=(t?[t]:["bolti","kedvezmenyes"]).map(c=>[c,l(c)]).filter(([,c])=>c>0).map(([c,k])=>`${k} t\xE9telnek m\xE9g nincs ${Ke[c]} \xE1ra.`).join(" "),u=[];return s.size===0&&a.length===0?u.push(`<p class="warn">Egy t\xE9tel \xE1r\xE1t sem tal\xE1ltam. N\xE9zd meg a kiolvasott sz\xF6veget. Ha abban l\xE1tszanak a t\xE9telek \xE9s az \xE1rak,
      k\xFCldd el a PDF-et, \xE9s hozz\xE1igaz\xEDtom a beolvas\xE1st.</p>`):u.push(`<p><strong>${s.size} / ${i.anyag.sorok.length} t\xE9tel</strong> \xE1ra beolvasva.${r?` ${r}`:""}</p>`),a.length&&u.push(`<details class="reszlet"><summary>\xDAj t\xE9telek (${a.length})</summary>
    <ul class="jeloltek">${a.map((c,k)=>lt(c,o,k)).join("")}</ul></details>`),n.length&&u.push(`<details class="reszlet"><summary>Nem \xE9rtelmezett sorok (${n.length})</summary>
    <ul class="nem-illesztett">${n.map(c=>`<li>${d(c)}</li>`).join("")}</ul></details>`),u.join("")}function Z(e,t){let s={...i.arak[e]};for(let[a,n]of Object.entries(t))n!=null&&(s[a]=n);i.arak[e]=s}function lt(e,t,s){let a=Object.entries(e.ar).filter(([,o])=>o!==null).map(([o,l])=>`${Ke[o]} ${f(l)}`).join(", "),n=i.plusz.some(o=>b(o)===b(e));return`<li>
    <span><strong>${d(e.cikk)}</strong>${e.cikkszam?` <span class="muted">(${d(e.cikkszam)})</span>`:""}<br>
      <span class="muted">${M.format(e.mennyiseg)} ${d(e.egyseg)} \xB7 ${a}</span></span>
    <button type="button" class="kicsi jelolt-hozzaad" data-forras="${t}" data-i="${s}" ${n?"disabled":""}>${n?"Hozz\xE1adva":"+ Aj\xE1nlatba"}</button>
  </li>`}function rt(){m("beolvasas-eredmeny").innerHTML=Te(m("bolt-valasz").value,null)}async function it(e,t){let s=m(`eredmeny-${e}`);s.innerHTML=`<p class="muted">${d(t.name)} beolvas\xE1sa\u2026</p>`;try{let a=await Promise.race([pe(t),new Promise((n,o)=>setTimeout(()=>o(new Error("40 m\xE1sodperc alatt sem siker\xFClt (lass\xFA kapcsolat vagy t\xFAl nagy f\xE1jl).")),4e4))]);if(!a.trim()){s.innerHTML='<p class="warn">Ebben a PDF-ben nincs kiolvashat\xF3 sz\xF6veg (val\xF3sz\xEDn\u0171leg szkennelt k\xE9p). \xCDrd be az \xE1rakat k\xE9zzel.</p>';return}s.innerHTML=`<p class="muted fajlnev">${d(t.name)}</p>${Te(a,e)}
      <details class="reszlet"><summary>Kiolvasott sz\xF6veg</summary><pre>${d(a)}</pre></details>`}catch(a){s.innerHTML=`<p class="error">A PDF nem olvashat\xF3 be: ${d(a.message)}</p>`}}var ct=["db","fm","p\xE1r","csomag","szett","kg","tekercs"];function je(e){let t=b(e);i.plusz.find(a=>b(a)===t)||i.plusz.push({cikk:e.cikk,egyseg:e.egyseg,mennyiseg:e.mennyiseg,cikkszam:e.cikkszam??""}),e.ar&&Z(t,e.ar),j(K,i.plusz),j(N,i.arak)}function G(e){let t=x.find(s=>s.nev===e)?.kod;return Number(i.projekt?.kiallasok?.[t])||0}function He(e,t){let s=G(t);return s>0?Math.round(e.mennyiseg/s*100)/100:e.mennyiseg}function S(){let e=i.plusz.map((s,a)=>{let n=i.konyvtarbaNyitva===a,o=x.find(l=>G(l.nev)>0)?.nev??x[0].nev;return`<li class="plusz-sor">
      <div class="plusz-fej">
        <span class="plusz-nev">${d(s.cikk)}${s.cikkszam?` <span class="muted">(${d(s.cikkszam)})</span>`:""}</span>
        <span class="plusz-menny"><input type="number" min="0" step="any" class="plusz-mennyiseg" data-i="${a}"
          value="${s.mennyiseg}" aria-label="Mennyis\xE9g: ${d(s.cikk)}"> ${d(s.egyseg)}</span>
      </div>
      <div class="actions kicsi-gombok">
        <button type="button" class="kicsi button plusz-konyvtarba" data-i="${a}" aria-expanded="${n}">K\xF6nyvt\xE1rba\u2026</button>
        <button type="button" class="kicsi button plusz-torles" data-i="${a}">T\xF6rl\xE9s</button>
      </div>
      ${n?`<div class="konyvtarba">
        <label>Melyik ki\xE1ll\xE1shoz?
          <select id="kb-kiallas">${x.map(l=>`<option${l.nev===o?" selected":""}>${d(l.nev)}</option>`).join("")}</select></label>
        <label>Mennyis\xE9g ki\xE1ll\xE1sonk\xE9nt
          <span class="nowrap"><input id="kb-mennyiseg" type="number" min="0" step="any" value="${He(s,o)}"> ${d(s.egyseg)}</span></label>
        <div class="actions">
          <button type="button" class="kicsi" id="kb-mentes" data-i="${a}">Ment\xE9s a k\xF6nyvt\xE1rba</button>
          <button type="button" class="kicsi button" id="kb-megse">M\xE9gse</button>
        </div>
      </div>`:""}
    </li>`}).join(""),t=i.bovitesek.map((s,a)=>`<li>
      <span><strong>${d(s.kiallas)}:</strong> ${d(s.cikk)} \u2013 ${M.format(s.mennyiseg)} ${d(s.egyseg)}
        ${le(i.alapKonyvtar,s)?' <span class="muted">(m\xE1r benne van az alapk\xF6nyvt\xE1rban, t\xF6r\xF6lhet\u0151)</span>':""}</span>
      <button type="button" class="kicsi button bovites-torles" data-i="${a}" aria-label="T\xF6rl\xE9s: ${d(s.cikk)}">\xD7</button>
    </li>`).join("");m("plusz").innerHTML=`
    <h3>Plusz t\xE9telek ehhez az aj\xE1nlathoz</h3>
    ${i.plusz.length?`<ul class="plusz-lista">${e}</ul>`:'<p class="muted">A bolt PDF-j\xE9ben tal\xE1lt \xFAj t\xE9telek, vagy amit k\xE9zzel adsz hozz\xE1. A \u201EK\xF6nyvt\xE1rba\u2026\u201D gombbal egy ki\xE1ll\xE1s csomagj\xE1ba is elmenthet\u0151, \xEDgy legk\xF6zelebb mag\xE1t\xF3l benne lesz.</p>'}
    <form id="plusz-uj" class="plusz-uj">
      <input id="plusz-uj-cikk" placeholder="\xDAj t\xE9tel megnevez\xE9se" aria-label="\xDAj t\xE9tel megnevez\xE9se" required>
      <input id="plusz-uj-menny" type="number" min="0" step="any" value="1" aria-label="Mennyis\xE9g">
      <select id="plusz-uj-egyseg" aria-label="Egys\xE9g">${ct.map(s=>`<option>${s}</option>`).join("")}</select>
      <button type="submit" class="kicsi">Hozz\xE1ad\xE1s</button>
    </form>
    <details class="bovitesek"${i.bovitesek.length?"":" hidden"}>
      <summary>A k\xF6nyvt\xE1rhoz hozz\xE1adott t\xE9telek (${i.bovitesek.length})</summary>
      <p class="muted">Ezek csak ezen az eszk\xF6z\xF6n vannak meg. T\xF6ltsd le a teljes k\xF6nyvt\xE1rat, \xE9s k\xFCldd el, hogy beker\xFClj\xF6n az alkalmaz\xE1sba, \xE9s minden eszk\xF6z\xF6n meglegyen.</p>
      <ul class="bovites-lista">${t}</ul>
      <button type="button" class="kicsi" id="konyvtar-letoltes">K\xF6nyvt\xE1r let\xF6lt\xE9se (CSV)</button>
    </details>
    <p id="plusz-uzenet" class="muted" aria-live="polite"></p>`}function Me(){i.konyvtar=D(i.alapKonyvtar,i.bovitesek),j(Ne,i.bovitesek)}function ut(){let e=m("plusz");e.addEventListener("input",t=>{if(!t.target.classList.contains("plusz-mennyiseg"))return;let s=i.plusz[Number(t.target.dataset.i)];s.mennyiseg=Math.max(0,Number(t.target.value)||0),j(K,i.plusz),E()}),e.addEventListener("change",t=>{if(t.target.id!=="kb-kiallas")return;let s=i.plusz[i.konyvtarbaNyitva];s&&(m("kb-mennyiseg").value=He(s,t.target.value))}),e.addEventListener("submit",t=>{if(t.target.id!=="plusz-uj")return;t.preventDefault();let s=m("plusz-uj-cikk").value.trim().replace(/\s+/g," ");s&&(je({cikk:s,mennyiseg:Math.max(0,Number(m("plusz-uj-menny").value)||1),egyseg:m("plusz-uj-egyseg").value}),E(),S(),w(!0))}),e.addEventListener("click",t=>{let s=t.target.closest("button");if(!s)return;let a=Number(s.dataset.i);if(s.classList.contains("plusz-torles"))i.plusz.splice(a,1),i.konyvtarbaNyitva=null,j(K,i.plusz),E(),S();else if(s.classList.contains("plusz-konyvtarba"))i.konyvtarbaNyitva=i.konyvtarbaNyitva===a?null:a,S();else if(s.id==="kb-megse")i.konyvtarbaNyitva=null,S();else if(s.id==="kb-mentes"){let n=i.plusz[a],o=m("kb-kiallas").value,l=Number(m("kb-mennyiseg").value);if(!(l>0)){m("kb-mennyiseg").focus();return}i.bovitesek.push({kiallas:o,cikk:n.cikk,mennyiseg:l,egyseg:n.egyseg,cikkszam:n.cikkszam??""}),Me();let r=G(o);r>0&&i.plusz.splice(a,1),j(K,i.plusz),i.konyvtarbaNyitva=null,E(),S(),m("plusz-uzenet").textContent=r>0?`Elmentve: ${o} \u2013 ${n.cikk}. Az anyaglist\xE1n mostant\xF3l a csomag adja (${r} ki\xE1ll\xE1s \xD7 ${M.format(l)} ${n.egyseg}).`:`Elmentve: ${o} \u2013 ${n.cikk}. Ebben az aj\xE1nlatban plusz t\xE9telk\xE9nt marad, mert nincs ${o} ki\xE1ll\xE1s.`}else if(s.classList.contains("bovites-torles"))i.bovitesek.splice(a,1),Me(),E(),S(),m("plusz").querySelector("details.bovitesek")?.setAttribute("open","");else if(s.id==="konyvtar-letoltes"){let n=new Blob(["\uFEFF",re(i.konyvtar)],{type:"text/csv;charset=utf-8"}),o=document.createElement("a");o.href=URL.createObjectURL(n),o.download="kiallas-konyvtar.csv",document.body.append(o),o.click(),o.remove(),setTimeout(()=>URL.revokeObjectURL(o.href),1e4)}}),m("ar-szakasz").addEventListener("click",t=>{let s=t.target.closest(".jelolt-hozzaad");if(!s)return;let a=i.jeloltek[s.dataset.forras]?.[Number(s.dataset.i)];if(a){je(a),E(),S(),w(!0);for(let n of document.querySelectorAll(".jelolt-hozzaad")){let o=i.jeloltek[n.dataset.forras]?.[Number(n.dataset.i)];o&&b(o)===b(a)&&(o!==a&&Z(b(o),o.ar),n.disabled=!0,n.textContent="Hozz\xE1adva")}j(N,i.arak),w(!0),H()}})}function H(){if(!i.munkadij)return;let e=U(i.munkadij,i.anyag.sorok,i.arak),t=e.anyag.length;T("jelveny-arak",t?`${t-e.hianyzoBolti}/${t}`:""),T("sum-anyag",e.anyagBolti?f(e.anyagBolti):"\u2013"),T("sum-vegosszeg",e.vegosszeg?f(e.vegosszeg):"\u2013");let s=e.anyag.map(n=>`
    <tr>
      <td>${d(n.cikk)}</td>
      <td class="num">${M.format(n.mennyiseg)} ${d(n.egyseg)}</td>
      <td class="num hide-sm">${f(n.bolti)}</td>
      <td class="num">${f(n.boltiOsszeg)}</td>
    </tr>`).join("");m("ugyfel").innerHTML=`
    ${e.hianyzoBolti?`<p class="warn">${e.hianyzoBolti} anyagt\xE9telnek nincs bolti \xE1ra, az \xF6sszeg hi\xE1nyos.</p>`:""}
    <h3>Munkad\xEDj</h3>
    ${Le(e.munkadij)}
    ${e.anyag.length?`<h3>Anyag</h3>
    <table>
      <thead><tr><th>Cikk</th><th class="num">Menny.</th><th class="num hide-sm">Egys\xE9g\xE1r</th><th class="num">\xD6sszeg</th></tr></thead>
      <tbody>${s}</tbody>
      <tfoot><tr><td colspan="2">Anyag \xF6sszesen</td><td class="hide-sm"></td><td class="num">${f(e.anyagBolti)}</td></tr></tfoot>
    </table>`:""}
    <p class="vegosszeg"><span>V\xE9g\xF6sszeg</span><span>${f(e.vegosszeg)}</span></p>
    <p class="muted">Alanyi ad\xF3mentes, \xC1FA n\xE9lk\xFCl.</p>`;let a=e.anyag.map(n=>`
    <tr>
      <td>${d(n.cikk)}<div class="muted">${M.format(n.mennyiseg)} ${d(n.egyseg)}</div></td>
      <td class="num">${f(n.kedvOsszeg)}</td>
      <td class="num hide-sm">${f(n.boltiOsszeg)}</td>
      <td class="num">${f(n.haszon)}</td>
    </tr>`).join("");m("belso").innerHTML=e.anyag.length===0?'<p class="muted">Nincs anyagt\xE9tel.</p>':`
    ${e.hianyzoKedvezmenyes?`<p class="warn">${e.hianyzoKedvezmenyes} t\xE9telnek nincs kedvezm\xE9nyes \xE1ra, a haszon hi\xE1nyos.</p>`:""}
    <table>
      <thead><tr><th>Cikk</th><th class="num">Beszerz\xE9s</th><th class="num hide-sm">Bolti</th><th class="num">Haszon</th></tr></thead>
      <tbody>${a}</tbody>
      <tfoot><tr><td>\xD6sszesen</td><td class="num">${f(e.anyagKedvezmenyes)}</td><td class="num hide-sm">${f(e.anyagBolti)}</td><td class="num">${f(e.haszon)}</td></tr></tfoot>
    </table>
    <dl class="osszesito">
      <dt>Munkad\xEDj</dt><dd>${f(e.munkadij.osszesen)}</dd>
      <dt>Haszon az anyagon</dt><dd>${f(e.haszon)}</dd>
      <dt>\xDCgyf\xE9l fizet</dt><dd>${f(e.vegosszeg)}</dd>
      <dt>Anyagbeszerz\xE9s</dt><dd>${f(e.anyagKedvezmenyes)}</dd>
    </dl>`}var C=m("adatok"),mt=()=>{let e=new Date;return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,"0")}-${String(e.getDate()).padStart(2,"0")}`};function _e(){let e={vallalkozo:{},ugyfel:{},ajanlat:{}};for(let t of C.elements){if(!t.name)continue;let[s,a]=t.name.split(".");e[s][a]=t.type==="number"?Number(t.value||0):t.value.trim()}return e}function dt(e){for(let t of C.elements){if(!t.name)continue;let[s,a]=t.name.split("."),n=e?.[s]?.[a];n!=null&&(t.value=n)}}var kt=document.title;function xe(e){if(!i.munkadij)return;let t=U(i.munkadij,i.anyag.sorok,i.arak),s=_e();m("nyomtat").innerHTML=e==="belso"?ge(t,s):ke(t,s),document.title=ye(e==="belso"?"Belso_osszesito":"Arajanlat",s)}function E(){let e=nt();m("puffer-sor").hidden=e.hotermelo!=="vegyes",m("felar-hsz-sor").hidden=e.hotermelo!=="hoszivattyu",j(Ee,e);try{i.munkadij=X(e,i.tabla),m("eredmeny").innerHTML=q(i.munkadij.figyelmeztetesek)+Le(i.munkadij),T("sum-munkadij",i.munkadij.osszesen?f(i.munkadij.osszesen):"\u2013")}catch(t){i.munkadij=null,m("eredmeny").innerHTML=`<p class="error">${d(t.message)}</p>`}i.projekt=e;try{i.anyag=ee(e,i.konyvtar);for(let t of i.plusz){if(!(t.mennyiseg>0))continue;let s=i.anyag.sorok.find(a=>b(a)===b(t));s?s.mennyiseg=Math.round((s.mennyiseg+t.mennyiseg)*100)/100:i.anyag.sorok.push({...t,plusz:!0})}ot()}catch(t){i.anyag={sorok:[],figyelmeztetesek:[]},m("anyaglista").innerHTML=`<p class="error">${d(t.message)}</p>`}w(),H()}async function Se(e,t){let s=await fetch(e,{cache:"no-cache"});if(!s.ok)throw new Error(`A(z) ${t} nem t\xF6lthet\u0151 be (${s.status}).`);return s.text()}async function gt(){et();try{let[n,o]=await Promise.all([Se("data/munkadij.csv","munkad\xEDj-t\xE1bl\xE1zat"),Se("data/kiallas-konyvtar.csv","ki\xE1ll\xE1s-k\xF6nyvt\xE1r")]);i.tabla=W(n),i.alapKonyvtar=Q(o)}catch(n){m("eredmeny").innerHTML=`<p class="error">${d(n.message)}</p>`,m("anyaglista").innerHTML="";return}tt();let e=A(Ee);e&&at(e),i.arak=A(N)??{},i.plusz=(A(K)??[]).filter(n=>n?.cikk&&n?.egyseg),i.bovitesek=(A(Ne)??[]).filter(n=>n?.kiallas&&n?.cikk&&n?.egyseg&&n.mennyiseg>0),i.konyvtar=D(i.alapKonyvtar,i.bovitesek),ut(),O.addEventListener("input",E),m("masol").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(Ae(I(i.anyag.sorok))),m("masol-uzenet").textContent="V\xE1g\xF3lapra m\xE1solva."}catch{m("masol-uzenet").textContent="A m\xE1sol\xE1s nem siker\xFClt; haszn\xE1ld az E-mail gombot."}}),m("beolvas").addEventListener("click",rt);for(let n of["bolti","kedvezmenyes"])m(`pdf-${n}`).addEventListener("change",o=>{let l=o.target.files?.[0];o.target.value="",l&&it(n,l)});m("ar-tabla").addEventListener("input",n=>{let o=n.target;if(!o.dataset.kulcs)return;let l=L(o.value),r={...i.arak[o.dataset.kulcs]};o.value.trim()===""||Number.isNaN(l)?delete r[o.dataset.mezo]:r[o.dataset.mezo]=l,i.arak[o.dataset.kulcs]=r,o.classList.toggle("hibas",o.value.trim()!==""&&Number.isNaN(l)),j(N,i.arak),H()}),m("arak-torlese").addEventListener("click",()=>{if(confirm("T\xF6rl\xF6d az \xF6sszes be\xEDrt \xE1rat?")){i.arak={},j(N,i.arak);for(let n of["beolvasas-eredmeny","eredmeny-bolti","eredmeny-kedvezmenyes"])m(n).innerHTML="";w(!0),H()}});let t=A(ve)??{};dt({...t,ajanlat:{datum:mt(),ervenyesNap:15,...t.ajanlat}}),C.addEventListener("input",()=>j(ve,_e())),C.addEventListener("submit",n=>n.preventDefault());let s=!1,a=n=>{s=!0,xe(n),window.print()};m("pdf-ugyfel").addEventListener("click",()=>a("ugyfel")),m("pdf-belso").addEventListener("click",()=>a("belso")),window.addEventListener("beforeprint",()=>{s||xe("ugyfel")}),window.addEventListener("afterprint",()=>{s=!1,document.title=kt}),E(),S()}gt();
