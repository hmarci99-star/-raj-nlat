function I(e){let t=[],s=[],a="",n=!1;for(let o=0;o<e.length;o++){let l=e[o];n?l==='"'&&e[o+1]==='"'?(a+='"',o++):l==='"'?n=!1:a+=l:l==='"'?n=!0:l===","?(s.push(a),a=""):l===`
`||l==="\r"?(l==="\r"&&e[o+1]===`
`&&o++,s.push(a),a="",s.some(r=>r!=="")&&t.push(s),s=[]):a+=l}return s.push(a),s.some(o=>o!=="")&&t.push(s),t}function X(e){let[,...t]=I(e.replace(/^﻿/,"")),s=new Map;for(let[a,n,o,l,r=""]of t){let c=Number(l);if(!a||!Number.isFinite(c))throw new Error(`Hib\xE1s sor a munkad\xEDj-t\xE1bl\xE1zatban: ${[a,n,l].join(", ")}`);s.set(a,{kod:a,tetel:n,egyseg:o,egysegar:c,megjegyzes:r})}return s}var M=[{kod:"wc_tartaly",nev:"WC-tart\xE1ly"},{kod:"kad",nev:"F\xFCrd\u0151k\xE1d"},{kod:"zuhanyzo",nev:"Zuhanyz\xF3"},{kod:"bojler",nev:"Bojler"},{kod:"mosogep",nev:"Mos\xF3g\xE9p"},{kod:"hoszivattyu",nev:"H\u0151szivatty\xFA"},{kod:"mosdo",nev:"Mosd\xF3"},{kod:"konyha",nev:"Konyha"},{kod:"kerti_csap",nev:"Kerti csap"}],Q={nincs:null,gaz:"gazkazan",vegyes:"vegyes_kazan",hoszivattyu:"hoszivattyu"},_=["wc","mosdo_sima","mosdo_butoros","mosdo_dupla","csaptelep","zuhanycsaptelep_sullyesztett","mosogep_bekotes","zuhanykabin_konnyu","zuhanykabin_kozepes","zuhanykabin_nehez","kad_hagyomanyos","kad_elolapos","bojler_egyszeru","bojler_futesrol"];function ee(){return{kiallasok:Object.fromEntries(M.map(e=>[e.kod,0])),radiatorKiallas:0,radiatorFelszereles:0,padlofutesKor:0,kulsoVizFm:0,kulsoSzennyvizFm:0,gerinc:{16:0,20:0},hotermelo:"nincs",puffer:!1,felarHoszivattyunal:!1,szerelvenyek:Object.fromEntries(_.map(e=>[e,0]))}}function C(e){let t=Number(e);return Number.isFinite(t)&&t>0?t:0}function te(e,t){let s=[],a=[],n=(b,h)=>{let $=C(h);$>0&&s.push([b,$])},o=C(e.radiatorKiallas),l=C(e.padlofutesKor);n("radiator_kiallas",o),n("radiator_felszereles",e.radiatorFelszereles),n("padlofutes_kor",l);let r=Object.values(e.kiallasok??{}).reduce((b,h)=>b+C(h),0);n("viz_alapszereles",r),n("kulso_viz",e.kulsoVizFm),n("kulso_szennyviz",e.kulsoSzennyvizFm);for(let b of _)n(b,e.szerelvenyek?.[b]);let c=e.hotermelo??"nincs";if(!(c in Q))throw new Error(`Ismeretlen h\u0151termel\u0151: ${c}`);let u=Q[c];u&&n(u,1),o>0&&l>0&&(c==="gaz"||c==="vegyes"||c==="hoszivattyu"&&e.felarHoszivattyunal)&&n("felar_vegyes_kor",1),e.puffer&&(c==="vegyes"?n("puffer",1):c==="hoszivattyu"?a.push("H\u0151szivatty\xFAn\xE1l a puffer a g\xE9p\xE9szet d\xEDj\xE1ban van, k\xFCl\xF6n nem sz\xE1moltam fel."):a.push("Puffertart\xE1ly csak vegyes t\xFCzel\xE9s\u0171 kaz\xE1nhoz vehet\u0151 fel, nem sz\xE1moltam fel.")),(o>0||l>0)&&!u&&a.push("Van f\u0171t\xE9si k\xF6r, de nincs h\u0151termel\u0151 kiv\xE1lasztva.");let g=s.map(([b,h])=>{let $=t.get(b);if(!$)throw new Error(`Hi\xE1nyzik a munkad\xEDj-t\xE1bl\xE1zatb\xF3l: ${b}`);return{...$,mennyiseg:h,osszeg:$.egysegar*h}}),y=g.reduce((b,h)=>b+h.osszeg,0);return{sorok:g,osszesen:y,figyelmeztetesek:a}}function Pe(e){return Number(String(e).trim().replace(",","."))}function se(e){let[,...t]=I(e.replace(/^﻿/,"")),s=new Map;for(let[a,n,o,l,r=""]of t){let c=Pe(o);if(!a||!n||!Number.isFinite(c))throw new Error(`Hib\xE1s sor a ki\xE1ll\xE1s-k\xF6nyvt\xE1rban: ${[a,n,o].join(", ")}`);s.has(a)||s.set(a,[]),s.get(a).push({cikk:n,mennyiseg:c,egyseg:l,cikkszam:r.trim()})}return s}var Ve={16:{cso:"Rehau Rautitan Stabil cs\u0151 16,2x2,6 mm",csohej:"Kaiflex cs\u0151h\xE9j 4x18 mm"},20:{cso:"Rehau Rautitan Stabil cs\u0151 20x2,9 mm",csohej:"Kaiflex cs\u0151h\xE9j 4x22 mm"}};function Ze(e){let t;if(t=e.match(/PX ([\d-]+) T-idom/)){let s=t[1].split("-").map(Number);return s.length===3?s:[s[0],s[0],s[0]]}if(t=e.match(/(\d+)-(?:os|as|es) falikorong/))return[Number(t[1])];if(t=e.match(/PX (\d+)(?:-(\d+))? (?:könyök|toldóidom)/)){let s=Number(t[1]);return[s,t[2]?Number(t[2]):s]}return[]}function Ge(e){let t=e.match(/PX (\d+) toldóhüvely/);return t?Number(t[1]):null}function qe(e){let t=new Map,s=new Map,a=(o,l,r)=>o.set(l,(o.get(l)??0)+r);for(let o of e){for(let r of Ze(o.cikk))a(t,r,o.mennyiseg);let l=Ge(o.cikk);l&&a(s,l,o.mennyiseg)}return[...new Set([...t.keys(),...s.keys()])].map(o=>({atmero:o,szukseges:t.get(o)??0,megadott:s.get(o)??0})).filter(o=>o.szukseges!==o.megadott).sort((o,l)=>o.atmero-l.atmero)}function ne(e,t){let s=new Map,a=[],n=(l,r)=>{let c=`${l.cikk}|${l.egyseg}`,u=s.get(c)??{cikk:l.cikk,egyseg:l.egyseg,cikkszam:l.cikkszam??"",mennyiseg:0};u.mennyiseg+=l.mennyiseg*r,!u.cikkszam&&l.cikkszam&&(u.cikkszam=l.cikkszam),s.set(c,u)};for(let{kod:l,nev:r}of M){let c=Number(e.kiallasok?.[l])||0;if(c<=0)continue;let u=e.felulirasok?.[r]??t.get(r);if(!u){a.push(`Nincs anyagcsomag a ki\xE1ll\xE1shoz: ${r}`);continue}for(let k of qe(u))a.push(`${r}: a h\xFCvelyszab\xE1ly szerint ${k.szukseges} db ${k.atmero}-as told\xF3h\xFCvely kellene, a csomagban ${k.megadott} van.`);for(let k of u)n(k,c)}for(let[l,{cso:r,csohej:c}]of Object.entries(Ve)){let u=Number(e.gerinc?.[l])||0;u<=0||(n({cikk:r,egyseg:"fm",mennyiseg:u},1),n({cikk:c,egyseg:"fm",mennyiseg:u},1))}return{sorok:[...s.values()].map(l=>({...l,mennyiseg:Math.round(l.mennyiseg*100)/100})),figyelmeztetesek:a}}function R(e){return e.map((t,s)=>`${s+1}. ${t.cikk} \u2013 ${String(t.mennyiseg).replace(".",",")} ${t.egyseg}`+(t.cikkszam?` (cikksz\xE1m: ${t.cikkszam})`:"")).join(`

`)}var v=e=>`${e.cikk}|${e.egyseg}`;function A(e){let t=String(e).replace(/ft\.?/gi,"").replace(/[\s ]/g,"");return t?(/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)&&(t=t.replace(/\./g,"")),t=t.replace(",","."),/^\d+(\.\d+)?$/.test(t)?Number(t):NaN):NaN}function oe(e){return e.toLowerCase().normalize("NFC").replace(/[()"„”]/g," ")}function ae(e){return oe(e).split(/[\s,;/]+/).filter(t=>t.length>1)}function le(e){let t=e.split(/\t|;|\||\s{2,}/).map(n=>n.trim()).filter(Boolean),s=[];if(t.length>=2){let n=t.length-1;for(;n>0;n--){let o=t[n];if(/^(db|fm|m|pár|kör|ft)\.?$/i.test(o))continue;let r=o.replace(/\s*(db|fm|m|pár)\.?$/i,"").split(new RegExp("(?<=ft\\.?)\\s+(?=\\d)","i")).map(A);if(r.some(Number.isNaN))break;s.unshift(...r)}return{szamok:s,szoveg:t.slice(0,n+1).join(" ")}}let a=e.match(/((?:[\s/:–-]+\d[\d .]*(?:,\d+)?\s*(?:ft|db|fm)?\.?)+)\s*$/i);if(!a)return{szamok:[],szoveg:e};for(let n of a[1].matchAll(/\d{1,3}(?:[ .]\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g))s.push(A(n[0]));return{szamok:s,szoveg:e.slice(0,a.index)}}function We(e,t){let s=oe(e),a=t.find(g=>g.cikkszam&&new RegExp(`(^|\\D)${g.cikkszam}(\\D|$)`).test(e));if(a)return a;let n=ae(e),o=new Set(n),l=(g,y)=>g[0]-y[0]||g[1]-y[1],r=null,c=[0,0],u=[0,0],k=g=>n.some(y=>y===g||y.startsWith(g)&&!/\d/.test(y[g.length]));for(let g of t){let y=ae(g.cikk);if(y.length===0||!y.filter($=>/\d/.test($)).every(k))continue;let b=new Set(y),h=[y.filter($=>o.has($)||s.includes($)).length/y.length,n.length?n.filter($=>b.has($)).length/n.length:0];l(h,c)>0?(u=c,c=h,r=g):l(h,u)>0&&(u=h)}return c[0]>=.7&&l(c,u)>0?r:null}function ie(e,t,s=null){let a=[...e];a.length>=2&&a[0]===t&&(a=a.slice(1));let n=a.filter((r,c)=>!a.slice(0,c).some(u=>Math.abs(u*t-r)<1&&t!==1));if(n.length===0)return null;if(s){let[r,c=r]=n;return{[s]:s==="kedvezmenyes"?Math.min(r,c):Math.max(r,c)}}if(n.length===1)return{bolti:n[0],kedvezmenyes:null};let[o,l]=n;return{bolti:Math.max(o,l),kedvezmenyes:Math.min(o,l)}}var Je="db|fm|m|p\xE1r|kg|cs|csomag|szett|tekercs|doboz|zs\xE1k|l",Ye=/összesen|végösszeg|fizetendő|részösszeg|árajánlat|kelt|dátum|oldal|érvényes|bankszámla|adószám|telefon/i;function Xe(e,t=null){let{szamok:s,szoveg:a}=le(e);if(s.length===0)return null;let o=[...e.matchAll(new RegExp(`(?:^|[\\s\\t])(\\d+(?:[.,]\\d+)?)\\s*(${Je})\\.?(?=[\\s\\t;|]|$)`,"gi"))].at(-1),l=o?A(o[1]):1,r=o?o[2].toLowerCase():"db",c=ie(s,l,t);if(!c||!Object.values(c).some(y=>y>=10))return null;let u=a;o&&u.endsWith(o[0].trim())&&(u=u.slice(0,-o[0].trim().length));let k="",g=u.match(/^(\d{4,})\s+(.*)$/);return g&&([,k,u]=g),u=u.replace(/^\d+[.)]\s+/,"").replace(/[\s–:-]+$/,"").replace(/\s+/g," ").trim(),(u.match(new RegExp("\\p{L}","gu"))??[]).length<3||Ye.test(u)?null:{cikk:u,cikkszam:k,mennyiseg:l,egyseg:r,ar:c,sor:e}}function re(e,t,s=null){let a=new Map,n=[],o=[];for(let l of e.split(/\r?\n/)){let r=l.trim();if(!r)continue;let{szamok:c,szoveg:u}=le(r);if(c.length===0)continue;let k=We(u,t),g=k&&ie(c,k.mennyiseg,s);if(k&&g){a.set(v(k),g);continue}let y=Xe(r,s);y?n.push(y):o.push(r)}return{arak:a,jeloltek:n,nemIllesztett:o}}function D(e,t,s){let a=r=>Math.round(r),n=t.map(r=>{let c=s[v(r)]??{},u=Number.isFinite(c.bolti)?c.bolti:null,k=Number.isFinite(c.kedvezmenyes)?c.kedvezmenyes:null,g=u===null?null:a(u*r.mennyiseg),y=k===null?null:a(k*r.mennyiseg),b=g===null||y===null?null:g-y;return{...r,bolti:u,kedvezmenyes:k,boltiOsszeg:g,kedvOsszeg:y,haszon:b}}),o=r=>n.reduce((c,u)=>c+(u[r]??0),0),l=o("boltiOsszeg");return{munkadij:e,anyag:n,anyagBolti:l,anyagKedvezmenyes:o("kedvOsszeg"),haszon:o("haszon"),vegosszeg:e.osszesen+l,hianyzoBolti:n.filter(r=>r.bolti===null).length,hianyzoKedvezmenyes:n.filter(r=>r.kedvezmenyes===null).length}}function P(e,t){let s=new Map([...e].map(([a,n])=>[a,[...n]]));for(let a of t){let n=s.get(a.kiallas)??[];n.some(o=>o.cikk===a.cikk&&o.egyseg===a.egyseg)||(n.push({cikk:a.cikk,mennyiseg:a.mennyiseg,egyseg:a.egyseg,cikkszam:a.cikkszam??""}),s.set(a.kiallas,n))}return s}function ce(e,t){return(e.get(t.kiallas)??[]).some(s=>s.cikk===t.cikk&&s.egyseg===t.egyseg)}var Qe=e=>{let t=String(e??"");return/[",\n]/.test(t)?`"${t.replace(/"/g,'""')}"`:t};function ue(e){let t=[["Ki\xE1ll\xE1s","Cikk","Mennyis\xE9g","Egys\xE9g","Cikksz\xE1m"]];for(let[s,a]of e)for(let n of a)t.push([s,n.cikk,String(n.mennyiseg).replace(".",","),n.egyseg,n.cikkszam]);return`${t.map(s=>s.map(Qe).join(",")).join(`
`)}
`}var me=new Intl.NumberFormat("hu-HU",{useGrouping:"always"}),z=e=>e==null?"\u2013":`${me.format(e)} Ft`,V=(e,t)=>`${me.format(e)} ${t}`;function p(e){return String(e??"").replace(/[&<>"]/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[t])}function ke(e){let t=new Date(`${e}T12:00:00`);return Number.isNaN(t.getTime())?"":new Intl.DateTimeFormat("hu-HU",{year:"numeric",month:"long",day:"numeric"}).format(t)}function et(e,t){let s=new Date(`${e}T12:00:00`);return Number.isNaN(s.getTime())||!(t>0)?"":(s.setDate(s.getDate()+Number(t)),s.toISOString().slice(0,10))}var ge=(e,t)=>`${ke(e).replace(/\.$/,"")}-${t}`,de=(...e)=>e.filter(Boolean).map(p).join("<br>");function ye(e,t){let{vallalkozo:s={},ugyfel:a={},ajanlat:n={}}=t,o=et(n.datum,n.ervenyesNap);return`
    <header class="ny-fej">
      <div class="ny-vallalkozo">
        <strong>${p(s.nev)}</strong><br>
        ${de(s.cim,s.adoszam&&`Ad\xF3sz\xE1m: ${s.adoszam}`,s.telefon,s.email)}
      </div>
      <div class="ny-cim">
        <h1>${p(e)}</h1>
        ${n.szam?`<div>Sz\xE1m: ${p(n.szam)}</div>`:""}
        ${n.datum?`<div>Kelt: ${p(ke(n.datum))}</div>`:""}
        ${o?`<div>\xC9rv\xE9nyes: ${p(ge(o,"ig"))}</div>`:""}
      </div>
    </header>
    ${a.nev||a.cim||a.munkaHelye?`
    <section class="ny-ugyfel">
      <div><span class="ny-cimke">Megrendel\u0151</span><br>${de(a.nev,a.cim)}</div>
      ${a.munkaHelye?`<div><span class="ny-cimke">A munka helye</span><br>${p(a.munkaHelye)}</div>`:""}
    </section>`:""}`}function ze(e,t){let s=e.munkadij.sorok.map(l=>`
    <tr>
      <td>${p(l.tetel)}${l.megjegyzes?`<div class="ny-megj">${p(l.megjegyzes)}</div>`:""}</td>
      <td class="num">${p(V(l.mennyiseg,l.egyseg))}</td>
      <td class="num">${z(l.egysegar)}</td>
      <td class="num">${z(l.osszeg)}</td>
    </tr>`).join(""),a=e.anyag.map(l=>`
    <tr>
      <td>${p(l.cikk)}</td>
      <td class="num">${p(V(l.mennyiseg,l.egyseg))}</td>
      <td class="num">${z(l.bolti)}</td>
      <td class="num">${z(l.boltiOsszeg)}</td>
    </tr>`).join(""),n='<thead><tr><th>Megnevez\xE9s</th><th class="num">Mennyis\xE9g</th><th class="num">Egys\xE9g\xE1r</th><th class="num">\xD6sszeg</th></tr></thead>',o=t.ajanlat?.megjegyzes;return`
    <article class="ny-lap">
      ${ye("\xC1raj\xE1nlat",t)}
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
      ${e.anyag.length&&t.ajanlat?.datum?`<p class="ny-megj">Az anyag\xE1rak a ${p(ge(t.ajanlat.datum,"i"))} bolti \xE1rak.</p>`:""}
      ${o?`<p class="ny-szabad">${p(o).replace(/\n/g,"<br>")}</p>`:""}
      <footer class="ny-alairas"><div>${p(t.vallalkozo?.nev)}</div></footer>
      </div>
    </article>`}function fe(e,t){let s=e.anyag.map(n=>`
    <tr>
      <td>${p(n.cikk)}</td>
      <td class="num">${p(V(n.mennyiseg,n.egyseg))}</td>
      <td class="num">${z(n.kedvezmenyes)}</td>
      <td class="num">${z(n.bolti)}</td>
      <td class="num">${z(n.kedvOsszeg)}</td>
      <td class="num">${z(n.boltiOsszeg)}</td>
      <td class="num">${z(n.haszon)}</td>
    </tr>`).join(""),a=[e.hianyzoBolti&&`${e.hianyzoBolti} t\xE9telnek nincs bolti \xE1ra.`,e.hianyzoKedvezmenyes&&`${e.hianyzoKedvezmenyes} t\xE9telnek nincs kedvezm\xE9nyes \xE1ra.`].filter(Boolean);return`
    <article class="ny-lap ny-belso">
      ${ye("Bels\u0151 \xF6sszes\xEDt\u0151",{...t,ajanlat:{...t.ajanlat,ervenyesNap:0}})}
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
    </article>`}function pe(e,t){let s=(t.ugyfel?.nev||"").trim().replace(/[\\/:*?"<>|]+/g,"").replace(/\s+/g,"_");return[e,s,t.ajanlat?.datum].filter(Boolean).join("_")}var be="../vendor/pdfjs-4.10.38-legacy/",tt=/^\d[\d\s .]*(,\d+)?(\s*ft\.?)?$/i,Z=e=>tt.test(e.trim());function st(e){e.sort((a,n)=>a.x-n.x);let t=[],s=null;for(let a of e){let n=s?a.x-s.x1:1/0,o=s&&/(\d|ft\.?|db|fm|pár)$/i.test(s.szoveg.trim())&&/^\d/.test(a.str.trim());!s||n>a.h*(o?.6:1.2)?(s={x0:a.x,x1:a.x+a.w,szoveg:a.str},t.push(s)):(n>a.h*.12&&!s.szoveg.endsWith(" ")&&!a.str.startsWith(" ")&&(s.szoveg+=" "),s.szoveg+=a.str,s.x1=Math.max(s.x1,a.x+a.w))}for(let a of t)a.szoveg=a.szoveg.replace(/\s+/g," ").trim();return t.filter(a=>a.szoveg)}var nt=e=>e.segs.length>=3&&e.segs.slice(-2).every(t=>Z(t.szoveg)),at=(e,t)=>e.x0<t.x1+2&&t.x0<e.x1+2;function ot(e,t){let s=e.segs.map(a=>({x0:a.x0,x1:a.x1,szam:Z(a.szoveg),darabok:[{y:e.y,szoveg:a.szoveg}]}));for(let a of t)for(let n of a.segs){let o=s.find(l=>at(l,n));if(o){if(o.szam&&!Z(n.szoveg))continue;o.darabok.push({y:a.y,szoveg:n.szoveg}),o.x0=Math.min(o.x0,n.x0),o.x1=Math.max(o.x1,n.x1)}else s.push({x0:n.x0,x1:n.x1,szam:!1,darabok:[{y:a.y,szoveg:n.szoveg}]})}return s.sort((a,n)=>a.x0-n.x0),s.map(a=>a.darabok.sort((n,o)=>o.y-n.y).map(n=>n.szoveg).join(" ")).join("	")}function lt(e){let t=e.filter(l=>l.str&&l.str.trim()).map(l=>({...l,h:l.h>0?l.h:10})).sort((l,r)=>r.y-l.y||l.x-r.x),s=[];for(let l of t){let r=s.find(c=>Math.abs(c.y-l.y)<=Math.min(c.h,l.h)*.5);r?r.darabok.push(l):s.push({y:l.y,h:l.h,darabok:[l]})}s.sort((l,r)=>r.y-l.y);for(let l of s)l.segs=st(l.darabok);let a=s.filter(nt),n=new Map(a.map(l=>[l,[]])),o=new Set;for(let l of s){if(n.has(l))continue;let r=null;for(let c of a){let u=Math.abs(c.y-l.y);u<=Math.max(c.h,l.h)*1.45&&(!r||u<Math.abs(r.y-l.y))&&(r=c)}r&&(n.get(r).push(l),o.add(l))}return s.filter(l=>!o.has(l)).map(l=>n.has(l)?ot(l,n.get(l)):l.segs.map(r=>r.szoveg).join("	")).filter(Boolean).join(`
`)}var ve=null;function it(){return ve??(ve=import(new URL(`${be}pdf.min.mjs`,import.meta.url).href).then(e=>(e.GlobalWorkerOptions.workerSrc=new URL(`${be}pdf.worker.min.mjs`,import.meta.url).href,e))),ve}async function he(e){let s=await(await it()).getDocument({data:new Uint8Array(await e.arrayBuffer())}).promise,a=[];try{for(let n=1;n<=s.numPages;n++){let l=await(await s.getPage(n)).getTextContent();a.push(lt(l.items.map(r=>({str:r.str,x:r.transform[4],y:r.transform[5],w:r.width,h:r.height||Math.abs(r.transform[3])}))))}}finally{s.destroy()}return a.filter(Boolean).join(`
`)}var $e={nulla:0,egy:1,kett\u0151:2,k\u00E9t:2,h\u00E1rom:3,n\u00E9gy:4,\u00F6t:5,hat:6,h\u00E9t:7,nyolc:8,kilenc:9,t\u00EDz:10,h\u00FAsz:20,harminc:30,negyven:40,\u00F6tven:50,hatvan:60,hetven:70,nyolcvan:80,kilencven:90,sz\u00E1z:100,f\u00E9l:.5,m\u00E1sf\u00E9l:1.5},rt={tizen:10,huszon:20,harminc:30,negyven:40,\u00F6tven:50,hatvan:60,hetven:70,nyolcvan:80,kilencven:90},je={egy:1,kett\u0151:2,k\u00E9t:2,h\u00E1rom:3,n\u00E9gy:4,\u00F6t:5,hat:6,h\u00E9t:7,nyolc:8,kilenc:9};function x(e){let t=e.toLowerCase();if(/^\d+([.,]\d+)?$/.test(t))return Number(t.replace(",","."));if(t in $e)return $e[t];for(let[s,a]of Object.entries(rt))if(t.startsWith(s)&&t.slice(s.length)in je)return a+je[t.slice(s.length)];return null}var ct={db:"db",darab:"db",darabot:"db",m:"fm",m\u00E9ter:"fm",m\u00E9tert:"fm",fm:"fm",foly\u00F3m\u00E9ter:"fm",foly\u00F3m\u00E9tert:"fm",p\u00E1r:"p\xE1r",p\u00E1rat:"p\xE1r",csomag:"csomag",csomagot:"csomag",szett:"szett",szettet:"szett",kg:"kg",kil\u00F3:"kg",kil\u00F3t:"kg",kilogramm:"kg",tekercs:"tekercs",tekercset:"tekercs",doboz:"doboz",dobozt:"doboz"},O=e=>ct[e?.toLowerCase()]??null,ut=e=>Math.round(e*100)/100;function dt(e){return e.replace(/\bháromnegyed(?:es)?\s+col(?:os)?/gi,"3/4 col").replace(/(^|\s)fél\s+col(?:os)?/gi,"$11/2 col").replace(/(^|\s)(?:egy|egész)\s+col(?:os)?/gi,"$11 col")}function mt(e){let t=e.split(/\s+/).map(r=>r.replace(/[.,;:!?]+$/,"")).filter(Boolean);for(let r=0;r+2<t.length;r++){let c=x(t[r]);c!==null&&c>=1&&t[r+1].toLowerCase()==="\xE9s"&&t[r+2].toLowerCase()==="f\xE9l"&&t.splice(r,3,String(c+.5))}let s=null,a=null,n=t,o=t.length;o>=2&&O(t[o-1])&&x(t[o-2])!==null?(s=x(t[o-2]),a=O(t[o-1]),n=t.slice(0,o-2)):o>=3&&x(t[0])!==null&&O(t[1])?(s=x(t[0]),a=O(t[1]),n=t.slice(2)):o>=2&&x(t[o-1])!==null&&!/col$/i.test(t[o-1])?(s=x(t[o-1]),n=t.slice(0,o-1)):o>=2&&x(t[0])!==null&&t[0].toLowerCase()!=="f\xE9l"&&(s=x(t[0]),n=t.slice(1));let l=n.join(" ").replace(/^(?:a|az|és|meg)\s+/i,"").replace(/[.,;:]+$/,"").trim();return!l||/^(?:és|meg|aztán|következő|tétel|a|az)$/i.test(l)?null:(l=l[0].toLocaleUpperCase("hu")+l.slice(1),{cikk:l,mennyiseg:ut(s&&s>0?s:1),egyseg:a??"db"})}function we(e){return dt(String(e).replace(/\s+/g," ").trim()).replace(/(\S+) és fél\b/gi,(s,a)=>x(a)!==null?`${a}\xA7f\xE9l`:s).split(/\s*[,;]\s*|\.\s+|\s+(?:és|meg|aztán|következő(?:\s+tétel)?)\s+/i).map(s=>s.replace(/§/g," \xE9s ").trim()).filter(Boolean).map(mt).filter(Boolean)}function Se(){return typeof window<"u"&&!!(window.SpeechRecognition||window.webkitSpeechRecognition)}function xe(e){let t=window.SpeechRecognition||window.webkitSpeechRecognition,s=new t;s.lang="hu-HU",s.interimResults=!0,s.continuous=!1,s.maxAlternatives=1;let a="";return s.onresult=n=>{let o="";for(let l=n.resultIndex;l<n.results.length;l++){let r=n.results[l];r.isFinal?a+=`${r[0].transcript} `:o+=r[0].transcript}e.kozben?.((a+o).trim())},s.onerror=n=>{let l={"not-allowed":"A mikrofon haszn\xE1lata nincs enged\xE9lyezve. Enged\xE9lyezd a b\xF6ng\xE9sz\u0151 be\xE1ll\xEDt\xE1saiban.","service-not-allowed":"A besz\xE9dfelismer\xE9s nincs enged\xE9lyezve ezen az eszk\xF6z\xF6n (iPhone-on: Be\xE1ll\xEDt\xE1sok \u2192 Siri).","no-speech":"Nem hallottam semmit. Pr\xF3b\xE1ld \xFAjra, \xE9s besz\xE9lj k\xF6zelebb a telefonhoz.","audio-capture":"Nem \xE9rem el a mikrofont.",network:"A besz\xE9dfelismer\xE9shez internetkapcsolat kell.",aborted:""}[n.error]??`A dikt\xE1l\xE1s nem siker\xFClt (${n.error}).`;l&&e.hiba?.(l)},s.onend=()=>{a.trim()&&e.kesz?.(a.trim()),e.vege?.()},s.start(),()=>s.stop()}var He="arajanlat.projekt",N="arajanlat.arak",Me="arajanlat.adatok",T="arajanlat.plusz",Be="arajanlat.konyvtar-bovites",Ce="arajanlat.nezet",S=new Intl.NumberFormat("hu-HU",{useGrouping:"always"}),d=e=>document.getElementById(e),U=d("projekt"),i={tabla:null,alapKonyvtar:null,konyvtar:null,bovitesek:[],plusz:[],jeloltek:{},projekt:null,konyvtarbaNyitva:null,diktalt:[],diktalasLeallit:null,diktalasUzenet:"",munkadij:null,anyag:{sorok:[],figyelmeztetesek:[]},arak:{},arTablaAlairas:"",adatok:{}};function m(e){return String(e).replace(/[&<>"]/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[t])}var f=e=>e==null?"\u2013":`${S.format(e)} Ft`,W=e=>e.map(t=>`<p class="warn">${m(t)}</p>`).join("");function w(e,t){try{localStorage.setItem(e,JSON.stringify(t))}catch{}}function K(e){try{return JSON.parse(localStorage.getItem(e))}catch{return null}}var Ee=["projekt","anyag","arak","ajanlat"];function G(e,t=!0){Ee.includes(e)||(e="projekt");for(let s of Ee)d(`nezet-${s}`).hidden=s!==e;for(let s of document.querySelectorAll(".ful"))s.dataset.nezet===e?s.setAttribute("aria-current","page"):s.removeAttribute("aria-current");try{localStorage.setItem(Ce,e)}catch{}t&&window.scrollTo({top:0})}function kt(){for(let t of document.querySelectorAll(".ful"))t.addEventListener("click",()=>G(t.dataset.nezet));for(let t of document.querySelectorAll("[data-ugras]"))t.addEventListener("click",()=>G(t.dataset.ugras));let e=null;try{e=localStorage.getItem(Ce)}catch{}G(e??"projekt",!1)}var H=(e,t)=>{let s=d(e);s&&(s.textContent=t)};function Le(e,t){return`<label><span>${m(t)}</span><input type="number" min="0" name="${e}"></label>`}function gt(){d("kiallasok").innerHTML=M.map(e=>Le(`kiallasok.${e.kod}`,e.nev)).join(""),d("szerelvenyek").innerHTML=_.map(e=>Le(`szerelvenyek.${e}`,i.tabla.get(e).tetel)).join(""),yt()}function yt(){for(let e of U.querySelectorAll("input[type=number]")){if(e.parentElement.classList.contains("lepteto"))continue;let t=e.closest("label")?.querySelector("span")?.textContent??"",s=document.createElement("span");s.className="lepteto",e.replaceWith(s);let a=(n,o,l)=>{let r=document.createElement("button");return r.type="button",r.className="lepes",r.textContent=n,r.setAttribute("aria-label",`${l}: ${t}`),r.addEventListener("click",c=>{c.preventDefault();let u=Number(e.step)||1,k=Math.max(0,Math.round(((Number(e.value)||0)+o*u)/u)*u);e.value=k?String(k):"",e.dispatchEvent(new Event("input",{bubbles:!0}))}),r};s.append(a("\u2212",-1,"Cs\xF6kkent\xE9s"),e,a("+",1,"N\xF6vel\xE9s"))}}function zt(){let e=ee();for(let t of U.elements){if(!t.name)continue;let s=t.type==="checkbox"?t.checked:t.type==="number"?Number(t.value||0):t.value,[a,n]=t.name.split(".");n?e[a][n]=s:e[a]=s}return e}function ft(e){for(let t of U.elements){if(!t.name)continue;let[s,a]=t.name.split("."),n=a?e[s]?.[a]:e[s];n!==void 0&&(t.type==="checkbox"?t.checked=!!n:t.type==="number"?t.value=n||"":t.value=n)}}function _e(e){return e.sorok.length===0?'<p class="muted">Adj meg legal\xE1bb egy t\xE9telt.</p>':`
    <table>
      <thead><tr><th>T\xE9tel</th><th class="num">Menny.</th><th class="num hide-sm">Egys\xE9g\xE1r</th><th class="num">\xD6sszeg</th></tr></thead>
      <tbody>${e.sorok.map(s=>`
    <tr>
      <td>${m(s.tetel)}${s.megjegyzes?`<div class="muted">${m(s.megjegyzes)}</div>`:""}</td>
      <td class="num">${S.format(s.mennyiseg)} ${m(s.egyseg)}</td>
      <td class="num hide-sm">${S.format(s.egysegar)}</td>
      <td class="num">${f(s.osszeg)}</td>
    </tr>`).join("")}</tbody>
      <tfoot><tr><td colspan="2">Munkad\xEDj \xF6sszesen</td><td class="hide-sm"></td><td class="num">${f(e.osszesen)}</td></tr></tfoot>
    </table>`}var Oe=e=>`Szia!

A k\xF6vetkez\u0151 t\xE9telekr\u0151l szeretn\xE9k k\xE9rni \xE1raj\xE1nlatot.
K\xF6sz\xF6n\xF6m sz\xE9pen el\u0151re is.

${e}
`;function pt(){let e=i.anyag;H("jelveny-anyag",e.sorok.length?String(e.sorok.length):"");let t=R(e.sorok);if(d("email").href=`mailto:?subject=${encodeURIComponent("\xC1raj\xE1nlatk\xE9r\xE9s \u2013 anyaglista")}&body=${encodeURIComponent(Oe(t))}`,d("anyag-gombok").hidden=e.sorok.length===0,e.sorok.length===0){d("anyaglista").innerHTML=W(e.figyelmeztetesek)+'<p class="muted">Adj meg ki\xE1ll\xE1st vagy gerincet.</p>';return}let s=e.sorok.some(n=>n.cikkszam),a=e.sorok.map(n=>`
    <tr>
      ${s?`<td>${m(n.cikkszam)}</td>`:""}
      <td>${m(n.cikk)}${n.plusz?' <span class="cimke">plusz</span>':""}</td>
      <td class="num">${S.format(n.mennyiseg)} ${m(n.egyseg)}</td>
    </tr>`).join("");d("anyaglista").innerHTML=`${W(e.figyelmeztetesek)}
    <table>
      <thead><tr>${s?"<th>Cikksz\xE1m</th>":""}<th>Cikk</th><th class="num">Mennyis\xE9g</th></tr></thead>
      <tbody>${a}</tbody>
    </table>`}var Ne=(e,t,s)=>`<input type="text" inputmode="decimal" class="ar"
  data-kulcs="${m(e)}" data-mezo="${t}" value="${s??""}" aria-label="${t==="bolti"?"Bolti \xE1r":"Kedvezm\xE9nyes \xE1r"}">`;function L(e=!1){let t=i.anyag.sorok,s=t.map(a=>`${v(a)}=${a.mennyiseg}`).join(`
`);!e&&s===i.arTablaAlairas||(i.arTablaAlairas=s,d("ar-szakasz").hidden=t.length===0,d("ar-ures").hidden=t.length>0,d("ar-tabla").innerHTML=`
    <table class="ar-tabla">
      <thead><tr><th>Cikk</th><th class="num">Bolti \xE1r<br>(brutt\xF3)</th><th class="num">Kedv. \xE1r<br>(brutt\xF3)</th></tr></thead>
      <tbody>${t.map(a=>{let n=v(a),o=i.arak[n]??{};return`<tr>
          <td>${m(a.cikk)}<div class="muted">${S.format(a.mennyiseg)} ${m(a.egyseg)}</div></td>
          <td class="num">${Ne(n,"bolti",o.bolti)}</td>
          <td class="num">${Ne(n,"kedvezmenyes",o.kedvezmenyes)}</td>
        </tr>`}).join("")}</tbody>
    </table>`)}var Fe={bolti:"bolti",kedvezmenyes:"kedvezm\xE9nyes"};function Ue(e,t){if(i.anyag.sorok.length===0)return'<p class="warn">M\xE9g nincs anyaglista. El\u0151bb add meg a ki\xE1ll\xE1sokat, ut\xE1na t\xF6ltsd fel az \xE1rakat.</p>';let{arak:s,jeloltek:a,nemIllesztett:n}=re(e,i.anyag.sorok,t);for(let[u,k]of s)J(u,k);w(N,i.arak),L(!0),B();let o=t??"szoveg";i.jeloltek[o]=a;let l=u=>i.anyag.sorok.filter(k=>!Number.isFinite(i.arak[v(k)]?.[u])).length,r=(t?[t]:["bolti","kedvezmenyes"]).map(u=>[u,l(u)]).filter(([,u])=>u>0).map(([u,k])=>`${k} t\xE9telnek m\xE9g nincs ${Fe[u]} \xE1ra.`).join(" "),c=[];return s.size===0&&a.length===0?c.push(`<p class="warn">Egy t\xE9tel \xE1r\xE1t sem tal\xE1ltam. N\xE9zd meg a kiolvasott sz\xF6veget. Ha abban l\xE1tszanak a t\xE9telek \xE9s az \xE1rak,
      k\xFCldd el a PDF-et, \xE9s hozz\xE1igaz\xEDtom a beolvas\xE1st.</p>`):c.push(`<p><strong>${s.size} / ${i.anyag.sorok.length} t\xE9tel</strong> \xE1ra beolvasva.${r?` ${r}`:""}</p>`),a.length&&c.push(`<details class="reszlet"><summary>\xDAj t\xE9telek (${a.length})</summary>
    <ul class="jeloltek">${a.map((u,k)=>bt(u,o,k)).join("")}</ul></details>`),n.length&&c.push(`<details class="reszlet"><summary>Nem \xE9rtelmezett sorok (${n.length})</summary>
    <ul class="nem-illesztett">${n.map(u=>`<li>${m(u)}</li>`).join("")}</ul></details>`),c.join("")}function J(e,t){let s={...i.arak[e]};for(let[a,n]of Object.entries(t))n!=null&&(s[a]=n);i.arak[e]=s}function bt(e,t,s){let a=Object.entries(e.ar).filter(([,o])=>o!==null).map(([o,l])=>`${Fe[o]} ${f(l)}`).join(", "),n=i.plusz.some(o=>v(o)===v(e));return`<li>
    <span><strong>${m(e.cikk)}</strong>${e.cikkszam?` <span class="muted">(${m(e.cikkszam)})</span>`:""}<br>
      <span class="muted">${S.format(e.mennyiseg)} ${m(e.egyseg)} \xB7 ${a}</span></span>
    <button type="button" class="kicsi jelolt-hozzaad" data-forras="${t}" data-i="${s}" ${n?"disabled":""}>${n?"Hozz\xE1adva":"+ Aj\xE1nlatba"}</button>
  </li>`}function vt(){d("beolvasas-eredmeny").innerHTML=Ue(d("bolt-valasz").value,null)}async function ht(e,t){let s=d(`eredmeny-${e}`);s.innerHTML=`<p class="muted">${m(t.name)} beolvas\xE1sa\u2026</p>`;try{let a=await Promise.race([he(t),new Promise((n,o)=>setTimeout(()=>o(new Error("40 m\xE1sodperc alatt sem siker\xFClt (lass\xFA kapcsolat vagy t\xFAl nagy f\xE1jl).")),4e4))]);if(!a.trim()){s.innerHTML='<p class="warn">Ebben a PDF-ben nincs kiolvashat\xF3 sz\xF6veg (val\xF3sz\xEDn\u0171leg szkennelt k\xE9p). \xCDrd be az \xE1rakat k\xE9zzel.</p>';return}s.innerHTML=`<p class="muted fajlnev">${m(t.name)}</p>${Ue(a,e)}
      <details class="reszlet"><summary>Kiolvasott sz\xF6veg</summary><pre>${m(a)}</pre></details>`}catch(a){s.innerHTML=`<p class="error">A PDF nem olvashat\xF3 be: ${m(a.message)}</p>`}}var Ie=["db","fm","p\xE1r","csomag","szett","kg","tekercs"];function q(e){let t=v(e);i.plusz.find(a=>v(a)===t)||i.plusz.push({cikk:e.cikk,egyseg:e.egyseg,mennyiseg:e.mennyiseg,cikkszam:e.cikkszam??""}),e.ar&&J(t,e.ar),w(T,i.plusz),w(N,i.arak)}function Y(e){let t=M.find(s=>s.nev===e)?.kod;return Number(i.projekt?.kiallasok?.[t])||0}function Re(e,t){let s=Y(t);return s>0?Math.round(e.mennyiseg/s*100)/100:e.mennyiseg}function j(){let e=i.plusz.map((s,a)=>{let n=i.konyvtarbaNyitva===a,o=M.find(l=>Y(l.nev)>0)?.nev??M[0].nev;return`<li class="plusz-sor">
      <div class="plusz-fej">
        <span class="plusz-nev">${m(s.cikk)}${s.cikkszam?` <span class="muted">(${m(s.cikkszam)})</span>`:""}</span>
        <span class="plusz-menny"><input type="number" min="0" step="any" class="plusz-mennyiseg" data-i="${a}"
          value="${s.mennyiseg}" aria-label="Mennyis\xE9g: ${m(s.cikk)}"> ${m(s.egyseg)}</span>
      </div>
      <div class="actions kicsi-gombok">
        <button type="button" class="kicsi button plusz-konyvtarba" data-i="${a}" aria-expanded="${n}">K\xF6nyvt\xE1rba\u2026</button>
        <button type="button" class="kicsi button plusz-torles" data-i="${a}">T\xF6rl\xE9s</button>
      </div>
      ${n?`<div class="konyvtarba">
        <label>Melyik ki\xE1ll\xE1shoz?
          <select id="kb-kiallas">${M.map(l=>`<option${l.nev===o?" selected":""}>${m(l.nev)}</option>`).join("")}</select></label>
        <label>Mennyis\xE9g ki\xE1ll\xE1sonk\xE9nt
          <span class="nowrap"><input id="kb-mennyiseg" type="number" min="0" step="any" value="${Re(s,o)}"> ${m(s.egyseg)}</span></label>
        <div class="actions">
          <button type="button" class="kicsi" id="kb-mentes" data-i="${a}">Ment\xE9s a k\xF6nyvt\xE1rba</button>
          <button type="button" class="kicsi button" id="kb-megse">M\xE9gse</button>
        </div>
      </div>`:""}
    </li>`}).join(""),t=i.bovitesek.map((s,a)=>`<li>
      <span><strong>${m(s.kiallas)}:</strong> ${m(s.cikk)} \u2013 ${S.format(s.mennyiseg)} ${m(s.egyseg)}
        ${ce(i.alapKonyvtar,s)?' <span class="muted">(m\xE1r benne van az alapk\xF6nyvt\xE1rban, t\xF6r\xF6lhet\u0151)</span>':""}</span>
      <button type="button" class="kicsi button bovites-torles" data-i="${a}" aria-label="T\xF6rl\xE9s: ${m(s.cikk)}">\xD7</button>
    </li>`).join("");d("plusz").innerHTML=`
    <h3>Plusz t\xE9telek ehhez az aj\xE1nlathoz</h3>
    ${i.plusz.length?`<ul class="plusz-lista">${e}</ul>`:'<p class="muted">A bolt PDF-j\xE9ben tal\xE1lt \xFAj t\xE9telek, vagy amit k\xE9zzel adsz hozz\xE1. A \u201EK\xF6nyvt\xE1rba\u2026\u201D gombbal egy ki\xE1ll\xE1s csomagj\xE1ba is elmenthet\u0151, \xEDgy legk\xF6zelebb mag\xE1t\xF3l benne lesz.</p>'}
    <form id="plusz-uj" class="plusz-uj">
      <input id="plusz-uj-cikk" placeholder="\xDAj t\xE9tel megnevez\xE9se" aria-label="\xDAj t\xE9tel megnevez\xE9se" required>
      <input id="plusz-uj-menny" type="number" min="0" step="any" value="1" aria-label="Mennyis\xE9g">
      <select id="plusz-uj-egyseg" aria-label="Egys\xE9g">${Ie.map(s=>`<option>${s}</option>`).join("")}</select>
      <button type="submit" class="kicsi">Hozz\xE1ad\xE1s</button>
    </form>
    ${jt()}
    <details class="bovitesek"${i.bovitesek.length?"":" hidden"}>
      <summary>A k\xF6nyvt\xE1rhoz hozz\xE1adott t\xE9telek (${i.bovitesek.length})</summary>
      <p class="muted">Ezek csak ezen az eszk\xF6z\xF6n vannak meg. T\xF6ltsd le a teljes k\xF6nyvt\xE1rat, \xE9s k\xFCldd el, hogy beker\xFClj\xF6n az alkalmaz\xE1sba, \xE9s minden eszk\xF6z\xF6n meglegyen.</p>
      <ul class="bovites-lista">${t}</ul>
      <button type="button" class="kicsi" id="konyvtar-letoltes">K\xF6nyvt\xE1r let\xF6lt\xE9se (CSV)</button>
    </details>
    <p id="plusz-uzenet" class="muted" aria-live="polite"></p>`}var $t=`<svg viewBox="0 0 24 24" aria-hidden="true" class="ikon"><rect x="9" y="3" width="6" height="11" rx="3"/>
  <path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>`;function jt(){let e=!!i.diktalasLeallit,t=Se()?`<div class="diktalas">
        <button type="button" id="diktal" class="kicsi${e?" fut":" button"}" aria-pressed="${e}">
          ${$t}<span>${e?"Le\xE1ll\xEDt\xE1s":"Dikt\xE1l\xE1s"}</span></button>
        <span id="diktal-allapot" class="muted" aria-live="polite">${m(e?"Hallgatlak\u2026 mondd a t\xE9teleket, pl. \u201Eteflonszalag k\xE9t darab, goly\xF3scsap f\xE9l col h\xE1rom darab\u201D.":i.diktalasUzenet)}</span>
      </div>`:'<p class="megj">Tipp: a telefon billenty\u0171zet\xE9nek mikrofon gombj\xE1val is dikt\xE1lhatod a megnevez\xE9st.</p>';if(!i.diktalt.length)return t;let s=i.diktalt.map((a,n)=>`<li>
      <span><strong>${m(a.cikk)}</strong><br><span class="muted">${S.format(a.mennyiseg)} ${m(a.egyseg)}</span></span>
      <span class="nowrap">
        <button type="button" class="kicsi diktalt-hozzaad" data-i="${n}">+ Hozz\xE1ad\xE1s</button>
        <button type="button" class="kicsi button diktalt-javit" data-i="${n}" aria-label="Jav\xEDt\xE1s: ${m(a.cikk)}">Jav\xEDt\xE1s</button>
      </span>
    </li>`).join("");return`${t}
    <div class="diktalt">
      <p class="muted">Felismert t\xE9telek. N\xE9zd \xE1t, \xE9s vedd fel \u0151ket; a \u201EJav\xEDt\xE1s\u201D a fenti mez\u0151kbe teszi, ott \xE1t\xEDrhatod.</p>
      <ul class="jeloltek">${s}</ul>
      <div class="actions kicsi-gombok">
        <button type="button" class="kicsi" id="diktalt-mind">Mind hozz\xE1ad\xE1sa</button>
        <button type="button" class="kicsi button" id="diktalt-elvet">Elvet\xE9s</button>
      </div>
    </div>`}function wt(){if(i.diktalasLeallit){i.diktalasLeallit();return}i.diktalasUzenet="";try{i.diktalasLeallit=xe({kozben:e=>{let t=d("diktal-allapot");t&&(t.textContent=`\u201E${e}\u201D`)},kesz:e=>{let t=we(e);i.diktalt.push(...t),i.diktalasUzenet=t.length?`Felismerve: \u201E${e}\u201D`:`Nem tal\xE1ltam benne t\xE9telt: \u201E${e}\u201D`},hiba:e=>{i.diktalasUzenet=e},vege:()=>{i.diktalasLeallit=null,j()}})}catch(e){i.diktalasLeallit=null,i.diktalasUzenet=`A dikt\xE1l\xE1s nem indult el: ${e.message}`}j()}function Ae(){i.konyvtar=P(i.alapKonyvtar,i.bovitesek),w(Be,i.bovitesek)}function St(){let e=d("plusz");e.addEventListener("input",t=>{if(!t.target.classList.contains("plusz-mennyiseg"))return;let s=i.plusz[Number(t.target.dataset.i)];s.mennyiseg=Math.max(0,Number(t.target.value)||0),w(T,i.plusz),E()}),e.addEventListener("change",t=>{if(t.target.id!=="kb-kiallas")return;let s=i.plusz[i.konyvtarbaNyitva];s&&(d("kb-mennyiseg").value=Re(s,t.target.value))}),e.addEventListener("submit",t=>{if(t.target.id!=="plusz-uj")return;t.preventDefault();let s=d("plusz-uj-cikk").value.trim().replace(/\s+/g," ");s&&(q({cikk:s,mennyiseg:Math.max(0,Number(d("plusz-uj-menny").value)||1),egyseg:d("plusz-uj-egyseg").value}),E(),j(),L(!0))}),e.addEventListener("click",t=>{let s=t.target.closest("button");if(!s)return;let a=Number(s.dataset.i);if(s.classList.contains("plusz-torles"))i.plusz.splice(a,1),i.konyvtarbaNyitva=null,w(T,i.plusz),E(),j();else if(s.classList.contains("plusz-konyvtarba"))i.konyvtarbaNyitva=i.konyvtarbaNyitva===a?null:a,j();else if(s.id==="kb-megse")i.konyvtarbaNyitva=null,j();else if(s.id==="kb-mentes"){let n=i.plusz[a],o=d("kb-kiallas").value,l=Number(d("kb-mennyiseg").value);if(!(l>0)){d("kb-mennyiseg").focus();return}i.bovitesek.push({kiallas:o,cikk:n.cikk,mennyiseg:l,egyseg:n.egyseg,cikkszam:n.cikkszam??""}),Ae();let r=Y(o);r>0&&i.plusz.splice(a,1),w(T,i.plusz),i.konyvtarbaNyitva=null,E(),j(),d("plusz-uzenet").textContent=r>0?`Elmentve: ${o} \u2013 ${n.cikk}. Az anyaglist\xE1n mostant\xF3l a csomag adja (${r} ki\xE1ll\xE1s \xD7 ${S.format(l)} ${n.egyseg}).`:`Elmentve: ${o} \u2013 ${n.cikk}. Ebben az aj\xE1nlatban plusz t\xE9telk\xE9nt marad, mert nincs ${o} ki\xE1ll\xE1s.`}else if(s.classList.contains("bovites-torles"))i.bovitesek.splice(a,1),Ae(),E(),j(),d("plusz").querySelector("details.bovitesek")?.setAttribute("open","");else if(s.id==="diktal")wt();else if(s.classList.contains("diktalt-hozzaad")||s.id==="diktalt-mind"){let n=s.id==="diktalt-mind"?i.diktalt.splice(0):i.diktalt.splice(a,1);for(let o of n)q(o);i.diktalasUzenet=`${n.length} t\xE9tel hozz\xE1adva.`,E(),j(),L(!0)}else if(s.classList.contains("diktalt-javit")){let[n]=i.diktalt.splice(a,1);j(),d("plusz-uj-cikk").value=n.cikk,d("plusz-uj-menny").value=n.mennyiseg,Ie.includes(n.egyseg)||d("plusz-uj-egyseg").append(new Option(n.egyseg)),d("plusz-uj-egyseg").value=n.egyseg,d("plusz-uj-cikk").focus()}else if(s.id==="diktalt-elvet")i.diktalt=[],i.diktalasUzenet="",j();else if(s.id==="konyvtar-letoltes"){let n=new Blob(["\uFEFF",ue(i.konyvtar)],{type:"text/csv;charset=utf-8"}),o=document.createElement("a");o.href=URL.createObjectURL(n),o.download="kiallas-konyvtar.csv",document.body.append(o),o.click(),o.remove(),setTimeout(()=>URL.revokeObjectURL(o.href),1e4)}}),d("ar-szakasz").addEventListener("click",t=>{let s=t.target.closest(".jelolt-hozzaad");if(!s)return;let a=i.jeloltek[s.dataset.forras]?.[Number(s.dataset.i)];if(a){q(a),E(),j(),L(!0);for(let n of document.querySelectorAll(".jelolt-hozzaad")){let o=i.jeloltek[n.dataset.forras]?.[Number(n.dataset.i)];o&&v(o)===v(a)&&(o!==a&&J(v(o),o.ar),n.disabled=!0,n.textContent="Hozz\xE1adva")}w(N,i.arak),L(!0),B()}})}function B(){if(!i.munkadij)return;let e=D(i.munkadij,i.anyag.sorok,i.arak),t=e.anyag.length;H("jelveny-arak",t?`${t-e.hianyzoBolti}/${t}`:""),H("sum-anyag",e.anyagBolti?f(e.anyagBolti):"\u2013"),H("sum-vegosszeg",e.vegosszeg?f(e.vegosszeg):"\u2013");let s=e.anyag.map(n=>`
    <tr>
      <td>${m(n.cikk)}</td>
      <td class="num">${S.format(n.mennyiseg)} ${m(n.egyseg)}</td>
      <td class="num hide-sm">${f(n.bolti)}</td>
      <td class="num">${f(n.boltiOsszeg)}</td>
    </tr>`).join("");d("ugyfel").innerHTML=`
    ${e.hianyzoBolti?`<p class="warn">${e.hianyzoBolti} anyagt\xE9telnek nincs bolti \xE1ra, az \xF6sszeg hi\xE1nyos.</p>`:""}
    <h3>Munkad\xEDj</h3>
    ${_e(e.munkadij)}
    ${e.anyag.length?`<h3>Anyag</h3>
    <table>
      <thead><tr><th>Cikk</th><th class="num">Menny.</th><th class="num hide-sm">Egys\xE9g\xE1r</th><th class="num">\xD6sszeg</th></tr></thead>
      <tbody>${s}</tbody>
      <tfoot><tr><td colspan="2">Anyag \xF6sszesen</td><td class="hide-sm"></td><td class="num">${f(e.anyagBolti)}</td></tr></tfoot>
    </table>`:""}
    <p class="vegosszeg"><span>V\xE9g\xF6sszeg</span><span>${f(e.vegosszeg)}</span></p>
    <p class="muted">Alanyi ad\xF3mentes, \xC1FA n\xE9lk\xFCl.</p>`;let a=e.anyag.map(n=>`
    <tr>
      <td>${m(n.cikk)}<div class="muted">${S.format(n.mennyiseg)} ${m(n.egyseg)}</div></td>
      <td class="num">${f(n.kedvOsszeg)}</td>
      <td class="num hide-sm">${f(n.boltiOsszeg)}</td>
      <td class="num">${f(n.haszon)}</td>
    </tr>`).join("");d("belso").innerHTML=e.anyag.length===0?'<p class="muted">Nincs anyagt\xE9tel.</p>':`
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
    </dl>`}var F=d("adatok"),xt=()=>{let e=new Date;return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,"0")}-${String(e.getDate()).padStart(2,"0")}`};function De(){let e={vallalkozo:{},ugyfel:{},ajanlat:{}};for(let t of F.elements){if(!t.name)continue;let[s,a]=t.name.split(".");e[s][a]=t.type==="number"?Number(t.value||0):t.value.trim()}return e}function Mt(e){for(let t of F.elements){if(!t.name)continue;let[s,a]=t.name.split("."),n=e?.[s]?.[a];n!=null&&(t.value=n)}}var Et=document.title;function Ke(e){if(!i.munkadij)return;let t=D(i.munkadij,i.anyag.sorok,i.arak),s=De();d("nyomtat").innerHTML=e==="belso"?fe(t,s):ze(t,s),document.title=pe(e==="belso"?"Belso_osszesito":"Arajanlat",s)}function E(){let e=zt();d("puffer-sor").hidden=e.hotermelo!=="vegyes",d("felar-hsz-sor").hidden=e.hotermelo!=="hoszivattyu",w(He,e);try{i.munkadij=te(e,i.tabla),d("eredmeny").innerHTML=W(i.munkadij.figyelmeztetesek)+_e(i.munkadij),H("sum-munkadij",i.munkadij.osszesen?f(i.munkadij.osszesen):"\u2013")}catch(t){i.munkadij=null,d("eredmeny").innerHTML=`<p class="error">${m(t.message)}</p>`}i.projekt=e;try{i.anyag=ne(e,i.konyvtar);for(let t of i.plusz){if(!(t.mennyiseg>0))continue;let s=i.anyag.sorok.find(a=>v(a)===v(t));s?s.mennyiseg=Math.round((s.mennyiseg+t.mennyiseg)*100)/100:i.anyag.sorok.push({...t,plusz:!0})}pt()}catch(t){i.anyag={sorok:[],figyelmeztetesek:[]},d("anyaglista").innerHTML=`<p class="error">${m(t.message)}</p>`}L(),B()}async function Te(e,t){let s=await fetch(e,{cache:"no-cache"});if(!s.ok)throw new Error(`A(z) ${t} nem t\xF6lthet\u0151 be (${s.status}).`);return s.text()}async function Lt(){kt();try{let[n,o]=await Promise.all([Te("data/munkadij.csv","munkad\xEDj-t\xE1bl\xE1zat"),Te("data/kiallas-konyvtar.csv","ki\xE1ll\xE1s-k\xF6nyvt\xE1r")]);i.tabla=X(n),i.alapKonyvtar=se(o)}catch(n){d("eredmeny").innerHTML=`<p class="error">${m(n.message)}</p>`,d("anyaglista").innerHTML="";return}gt();let e=K(He);e&&ft(e),i.arak=K(N)??{},i.plusz=(K(T)??[]).filter(n=>n?.cikk&&n?.egyseg),i.bovitesek=(K(Be)??[]).filter(n=>n?.kiallas&&n?.cikk&&n?.egyseg&&n.mennyiseg>0),i.konyvtar=P(i.alapKonyvtar,i.bovitesek),St(),U.addEventListener("input",E),d("masol").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(Oe(R(i.anyag.sorok))),d("masol-uzenet").textContent="V\xE1g\xF3lapra m\xE1solva."}catch{d("masol-uzenet").textContent="A m\xE1sol\xE1s nem siker\xFClt; haszn\xE1ld az E-mail gombot."}}),d("beolvas").addEventListener("click",vt);for(let n of["bolti","kedvezmenyes"])d(`pdf-${n}`).addEventListener("change",o=>{let l=o.target.files?.[0];o.target.value="",l&&ht(n,l)});d("ar-tabla").addEventListener("input",n=>{let o=n.target;if(!o.dataset.kulcs)return;let l=A(o.value),r={...i.arak[o.dataset.kulcs]};o.value.trim()===""||Number.isNaN(l)?delete r[o.dataset.mezo]:r[o.dataset.mezo]=l,i.arak[o.dataset.kulcs]=r,o.classList.toggle("hibas",o.value.trim()!==""&&Number.isNaN(l)),w(N,i.arak),B()}),d("arak-torlese").addEventListener("click",()=>{if(confirm("T\xF6rl\xF6d az \xF6sszes be\xEDrt \xE1rat?")){i.arak={},w(N,i.arak);for(let n of["beolvasas-eredmeny","eredmeny-bolti","eredmeny-kedvezmenyes"])d(n).innerHTML="";L(!0),B()}});let t=K(Me)??{};Mt({...t,ajanlat:{datum:xt(),ervenyesNap:15,...t.ajanlat}}),F.addEventListener("input",()=>w(Me,De())),F.addEventListener("submit",n=>n.preventDefault());let s=!1,a=n=>{s=!0,Ke(n),window.print()};d("pdf-ugyfel").addEventListener("click",()=>a("ugyfel")),d("pdf-belso").addEventListener("click",()=>a("belso")),window.addEventListener("beforeprint",()=>{s||Ke("ugyfel")}),window.addEventListener("afterprint",()=>{s=!1,document.title=Et}),E(),j()}Lt();
