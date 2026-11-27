# Árajánlatkészítő

Víz-, gáz- és fűtésszerelési árajánlatok összeállítása: munkadíj, boltnak küldhető anyaglista, ügyfélajánlat és belső összesítő.

## Jelenlegi állapot

Telefonról is használható weboldal. A beírt adatokat és árakat a böngésző megjegyzi.

1. **Munkadíj** a projekt adataiból.
2. **Anyaglista** a boltnak: vágólapra másolható, vagy előre kitöltött e-mailként küldhető.
3. **Árak a boltból:** a bolt két PDF-jét feltöltöd a „Bolti árak PDF” és a „Kedvezményes árak PDF” gombbal, mindegyik csak a saját oszlopát tölti ki. Ha mindkét ár egy levélben jön, a szövegét bemásolhatod, és a program tételenként kiolvassa a bolti és a kedvezményes egységárat. Amit nem tud tételhez kötni, kilistázza, és a hiányzó árat kézzel beírhatod.
3a. **Rossz PDF eltávolítása:** mindkét feltöltő alatt van egy „PDF eltávolítása” gomb. Visszavonja, amit az a PDF beírt: az árakat a saját oszlopában, a PDF szerinti mennyiségeket és a csak abban szereplő új tételeket. Ami a másik PDF-ben is szerepel, megmarad. Ha ugyanoda új PDF-et töltesz fel, az előzőt automatikusan visszavonja.
3b. **A bolt PDF-je az irányadó:** a PDF minden tétele bekerül az ajánlatba. A listán nem szereplő tételek automatikusan felkerülnek plusz tételként, „bolt” jelöléssel, a PDF szerinti mennyiséggel és mindkét árral, így a haszon is kiszámolódik rájuk. Ha egy tétel mennyisége a PDF-ben eltér a listától (pl. a levélben kiegészítetted), a PDF szerintivel számol, és ezt jelzi („PDF szerint; lista: 2”). Így az anyagköltség pontosan a PDF-ek összegével egyezik. Plusz tételt kézzel is hozzá lehet adni.
3b+. **Diktálás:** a plusz tételeknél a „Diktálás” gombbal bemondhatók a tételek, pl. „teflonszalag két darab, golyóscsap fél col három darab”. A program tételekre bontja (megnevezés, mennyiség, egység; a „fél col” 1/2 col lesz), és egy ellenőrző listába teszi, ahonnan egyenként vagy egyszerre vehetők fel, vagy javíthatók. A böngésző beszédfelismerőjét használja (Chrome-ban a Google, Safariban az Apple szolgáltatását), ezért internet kell hozzá.
3c. **Kiállás-könyvtár bővítése:** egy plusz tétel a „Könyvtárba…” gombbal elmenthető egy kiállás csomagjába, így a következő ajánlatnál már magától benne van. A bővítés azon az eszközön tárolódik, ahol felvetted. A „Könyvtár letöltése (CSV)” gombbal a teljes könyvtár letölthető; ezt kell a `data/kiallas-konyvtar.csv` helyére tenni, hogy minden eszközön meglegyen. A már bekerült tételek nem duplázódnak.
4. **Ügyfélajánlat:** munkadíj tételesen, anyag bolti áron, végösszeg. **Belső összesítő:** beszerzési ár és haszon tételenként, illetve összesen.
5. **PDF:** mindkét kimenet külön sablonnal, A4-es lapra. A gomb a böngésző nyomtatási ablakát nyitja meg, ott a „Mentés PDF-ként” lehetőséget kell választani. A fájlnév javaslata például `Arajanlat_Kovács_Anna_2026-11-25`. A fejlécbe a vállalkozó adatai, a megrendelő, az ajánlat száma, a kelte és az érvényessége kerül. A saját adataidat a böngésző megjegyzi.
6. **E-mail az ügyfélnek:** az ügyfélajánlat alatt; előre megírt levél az ügyfél e-mail címére (tárgy, összesítés, érvényesség, aláírás). A PDF-et kézzel kell csatolni (a böngésző nem tud fájlt csatolni). Mentett ajánlatnál az állapot „Ajánlat elküldve” lesz.

- `data/munkadij.csv`: a munkadíj-táblázat. Árat itt kell módosítani. A `Kód` oszlopot ne írd át.
- `data/kiallas-konyvtar.csv`: a kiállás-csomagok (kiállás, cikk, mennyiség, egység).
- `src/munkadij.js`: a munkadíj szabályai.
- `src/anyaglista.js`: az anyaglista összegyűjtése, a gerinc és a hüvelyszabály.
- `src/arak.js`: a bolt válaszának beolvasása és az ajánlat összesítése.
- `src/sablonok.js`: az ügyfélajánlat és a belső összesítő nyomtatható sablonja.
- `src/ikonok.js`: a saját vonalas piktogramok (kiállások, szerelvények, fűtés, csövek, műveletek).
- `src/diktalas.js`: a diktált mondat tételekre bontása és a beszédfelismerés.
- `src/konyvtar.js`: a kiállás-könyvtár bővítése és CSV-exportja.
- `src/pdfszoveg.js`: a bolt PDF-jének szövegét soronként kinyeri, és a cellán belül tördelt megnevezéseket visszailleszti a sorukba.
- `vendor/pdfjs-4.10.38-legacy/`: a Mozilla pdf.js (régebbi telefonokon is működő változat) PDF-olvasója (Apache 2.0 licenc). Csak PDF feltöltésekor töltődik be. A PDF a telefonon dolgozódik fel, nem kerül fel sehova.
- `index.html`, `src/app.js`: a weboldal.

### Szabályok

- A vízszerelés alapszerelés mennyisége az összes vízszerelési kiállás darabszáma. Ha egy kiállásnak saját munkadíja van (a szerkesztőjében a „Munkadíj (Ft / kiállás)” mező), az külön sorban szerepel: „Vízszerelés alapszerelés – <kiállás>”.
- A hőtermelő gépészete 1 db (gázkazán, vegyes tüzelésű kazán vagy hőszivattyú).
- Ha radiátoros és padlófűtéses kör is van, 1 db felár jár. Kazánnál ez automatikus, hőszivattyúnál külön be kell kapcsolni (nyitott kérdés).
- Puffertartály csak vegyes tüzelésű kazánhoz vehető fel. Hőszivattyúnál a gépészet díja tartalmazza.
- Anyaglista: a csomag sorai szorozva a kiállások számával, azonos cikkek összevonva. Ehhez jön a gerinc csöve és csőhéja (16-oshoz 4x18, 20-ashoz 4x22 mm-es).
- Hüvelyszabály: T-idom 3, falikorong 1, könyök 2, toldóidom 2 hüvely, átmérő szerint. A program figyelmeztet, ha egy csomag ettől eltér. A könyvtár jelenleg minden csomagja megfelel neki.
- Projektenként felülírható csomag: a számítás már kezeli, a felülethez még nincs szerkesztő.
- Árak: a bolt bruttó (ÁFÁ-s) árakat küld. Alanyi adómentesként az ÁFA nem igényelhető vissza, ezért ez a valódi beszerzési költség. Az ügyfélnek a bruttó bolti ár megy tovább, a haszon a két bruttó ár különbsége.
- Árbeolvasás: a sorokat a megnevezés szavai alapján köti tételhez (a szavak legalább 80%-ának egyeznie kell). A méreteknek pontosan kell egyezniük: a „20” nem azonos a „20-16-16”-tal, a tizedespont és -vessző viszont mindegy („20x2.9mm” = „20x2,9 mm”). Ha a bolt a sor értékét is megadja, az egységár abból számolódik (a kiírt egységár gyakran kerekített), így az összeg a PDF-fel egyezik. Ha ugyanaz a tétel több sorban szerepel, a mennyiségek összeadódnak. A bolt cikkszáma (pl. „FIS_79815”) a megnevezés elől levágódik.
- Ha már van bolti árajánlat, a lista azon tételei, amik nincsenek benne, kimaradnak az ajánlatból (az ügyfélajánlatnál lenyitható listában látszanak). Ha kézzel árat kapnak, visszakerülnek.

## Felület

Négy lépés, telefonon alul fülekkel: **Projekt**, **Anyag**, **Árak**, **Ajánlat**. Felül mindig látszik a munkadíj, az anyag és a végösszeg. A füleken kis szám mutatja az anyaglista tételeinek számát, és hogy hány tételnek van már bolti ára.

## Kiállás-csomagok szerkesztése

A Projekt lépésben egy kiállás nevére vagy ikonjára koppintva megnyílik a szerkesztője: a neve átírható (a beépített kiállásoké is), az anyagcsomagja (egy kiállásra számolva) a tételek átírhatók, törölhetők, újak vehetők fel, vagy PDF-ből beolvashatók. A változás minden további ajánlatra érvényes ezen az eszközön; az „Eredeti csomag visszaállítása” gombbal visszaáll az alkalmazás csomagja. A módosítások a biztonsági mentésbe és a „Könyvtár letöltése (CSV)” exportba is bekerülnek.

A Fűtés, a Szerelvények és a Gerinc és külső szerelés kártyán is van „Új …” gomb (Új fűtési tétel, Új szerelvény, Új tétel): az így felvett saját tétel abban a kártyában jelenik meg, és ugyanúgy működik, mint az egyéb munkák (név, egységár, egység, megjegyzés, anyag; a nevére koppintva szerkeszthető, törölhető).

Új kiállás is felvehető (pl. bidé, piszoár): a „Vízszerelési kiállások” kártya „Új kiállás” gombjával, névvel és anyagcsomaggal (kézzel vagy PDF-ből). Ugyanúgy működik, mint a többi kiállás – alapszerelés jár utána, a csomagja az anyaglistára kerül –, a nevére koppintva átnevezhető, szerkeszthető, törölhető, és bekerül a mentett ajánlatokba és a biztonsági mentésbe.

A többi sor is szerkeszthető (koppintás a sor nevére vagy ikonjára): a szerelvényeknél, a fűtésnél és a külső szerelésnél a megnevezés az ajánlaton, az egységár, a megjegyzés és a tételhez rendelt anyag (egységenként); a hőtermelőnél a kiválasztott típusé; a gerincnél az 1 fm-re jutó anyag (alapból cső és csőhéj). A módosított sorok neve mellett kék pont látszik, és mindegyik visszaállítható az eredetire.

A Projekt lépés fő pontjai (kiállások, fűtés, szerelvények, gerinc és külső szerelés, egyéb munkák) összecsukhatók: csukva csak a kitöltött sorok látszanak, a „Továbbiak” / „… megadása” gombbal nyílik a többi.

## Egyéb munkák

A Projekt lépés „Egyéb munkák” kártyáján az „Új munka” gombbal a táblázatban nem szereplő munka vehető fel (pl. hőcserélő csere): megnevezés, egységár, egység, megjegyzés az ajánlaton, és ha kell, a munkához tartozó anyag (egy munkára számolva). Ezután minden ajánlatnál ott van a többi sor között; a mennyiség szerint beleszámít a munkadíjba, az anyag pedig felkerül az anyaglistára. A nevére koppintva szerkeszthető vagy törölhető. Az „Anyag PDF-ből” gombbal egy PDF (anyagszükséglet vagy bolti ajánlat) tételei – megnevezés, mennyiség, egység – egyszerre bekerülnek a munka anyagai közé; azonos nevű tételnél a mennyiség összeadódik. Az eszközön tárolódik, és bekerül a biztonsági mentésbe; a mentett ajánlat a benne használt munkák leírását is megőrzi.

## Ajánlatok és profit

Az Ajánlat lépésnél a „Mentés az ajánlatok közé” gombbal az ajánlat bekerül az Ajánlatok közé; utána minden változás magától mentődik. Az „Új ajánlat” tiszta lappal indít (a saját adatok maradnak), a listából bármelyik ajánlat újra megnyitható a projekttel, árakkal, PDF-ekkel és plusz tételekkel együtt.

- Állapotok: Felmérés, Anyaglista elküldve, Árak megérkeztek, Ajánlat elküldve, Elfogadva, Kivitelezés, Kész, Elutasítva.
- Az Ajánlatok lépés tetején évre szűrhetően: a **profit** az elfogadott (elfogadva, kivitelezés, kész) ajánlatokon (munkadíj + az anyagon maradó haszon), a bevétel, az elfogadott ajánlatok száma és aránya, és a döntésre váró ajánlatok értéke.
- Biztonsági mentés: „Mentés fájlba” / „Betöltés fájlból” (JSON), az ajánlatokkal, a saját adatokkal és a könyvtár bővítéseivel; így másik eszközre is átvihető.
- A logika a `src/ajanlatok.js`-ben van.

## Hangos árajánlat

A jobb alsó „Hangos árajánlat” gombbal az alkalmazás végigkérdez a négy lépésen: felolvassa a kérdést, meghallgatja a választ, és beírja a mezőbe, ahogy kézzel is kitöltenéd.

- Csak a releváns kérdéseket teszi fel. Kád nélkül nem kérdez kádtípust. A szerelvényeknél a kiállásokból javasol, pl. „Hány WC-t szerelünk fel? Ha 2 darabot, mondd: jó.”
- Egy mondatban több adat is bemondható („két WC, egy mosógép, hat radiátor”). Amit így megkapott, azt nem kérdezi újra.
- Parancsok: vissza, kihagyás, ismételd, mennyi a végösszeg, befejezés.
- Az Anyag lépésnél plusz tételek mondhatók be, az Ajánlat lépésnél a megrendelő neve és címe. A végén felolvassa az összegeket.
- PDF-feltöltéshez és e-mail küldéséhez a telefon érintést kér, ezeknél csak szól, melyik gombot kell megnyomni.
- A válasz be is gépelhető. Ha a böngésző nem ismeri fel a beszédet, így is végig lehet menni.
- A logika (kérdések, válaszok értelmezése) a `src/hangos.js`-ben van, a panel és a beszéd a `src/hangosfelulet.js`-ben.

## Futtatás

```
npm install    # egyszer (esbuild)
npm run build  # minden módosítás után: dist/app.js és a verziójel az index.html-ben
npm start      # http://localhost:3000
npm test
```

A program a `src/` mappában van, a weboldal a `dist/app.js` csomagolt változatot tölti be. A hivatkozás a tartalomból számolt verziójelet kap (`dist/app.js?v=…`), így a telefon böngészője nem keverheti a régi és az új fájlokat.

### Telefonról

Az alkalmazás GitHub Pages-en fut: https://hmarci99-star.github.io/-raj-nlat/

Ha a böngésző menüjében a „Hozzáadás a kezdőképernyőhöz” lehetőséget választod, saját ikonnal indítható. A beírt adatok és árak csak az adott eszköz böngészőjében tárolódnak, a webre nem kerülnek fel.

A weboldal statikus fájlokból áll. Közvetlenül fájlként (`file://`) megnyitva nem működik, mert a CSV-t be kell töltenie.

## Következő lépések

1. Az árbeolvasás finomítása valódi bolti válaszok alapján. A szkennelt (képként mentett) PDF-ből nem lehet szöveget kiolvasni.
2. Csomag-felülírás szerkesztése a felületen; a gerinc idomai és a 25-ös cső.
3. Több ajánlat mentése és kezelése, ajánlat-követés: állapot, következő lépés, határidő.

## Kinézet

Az Ajánlatok lépés alján a „Kinézet” kártyán választható: Kék (alap), Narancs, Sárga (fekete–sárga, szögletes), Smaragd (zöld, lekerekített) vagy Letisztult (szinte fekete-fehér). Világos és sötét módban is működik; a választás az eszközön megmarad.

## Csempés megadás

A Projekt lépésben a kiállások, szerelvények és munkák nagy ikonos csempék: koppintás = +1, a sarokban a − elvesz egyet, hosszan nyomva nyílik a tétel szerkesztője. A folyóméteres tételeknél (gerinc, külső szerelés) a hossz a csempén írható be. A hőtermelő és a kapcsolók a kártyákon maradnak. Az ajánlatkártyák bal szélén színes csík jelzi az állapotot.


Bármelyik beépített tétel (kiállás, fűtési tétel, szerelvény, gerinc, külső szerelés) eltávolítható a listából: hosszan nyomva a csempét megnyílik a szerkesztője, ott „Törlés a listából”. A kártya alján megjelenik az „Eltávolított tételek (n)” gomb, ahol bepipálva bármelyik visszaállítható. Az eltávolított tételre a hangos mód sem kérdez rá; ha egy régebbi ajánlatban mégis van mennyisége, a csempe megjelenik. A saját (új) tételeknél a szerkesztőben a „Törlés” végleg törli őket. Az eltávolítások a biztonsági mentésbe is bekerülnek.

## Anyaglista a boltnak

Az e-mailben (és a Másolás / Megosztás gombbal) a tételek csoportokba rendezve mennek: Lefolyó, Csövek és csőhéjak, Idomok és falikorongok, Fűtés, Szerelvények és egyéb. Csoporton belül ábécérendben, folyamatos sorszámmal, így a bolt a sorszámra hivatkozhat. A levél sortörései minden levelezőben megmaradnak. Telefonon a Megosztás gombbal bármilyen alkalmazásba (Gmail, Viber, Messenger…) elküldhető.

## Boltok összevetése

Az Árak lépésben a „Másik bolt PDF” gombbal más boltok árajánlata is feltölthető (bruttó beszerzési ár). Boltonként látszik az összeg és hogy hány tételre adott árat, a közös tételekre vetített összeg (tisztességes összevetés), tételenként pedig zölddel a legolcsóbb. „Ezt használom”: az adott bolt árai lesznek a beszerzési árak; „Legolcsóbb árak átvétele”: tételenként a legolcsóbb. Az eredeti beszerzési árak ilyenkor külön oszlopban megmaradnak, így vissza lehet állni rájuk. A boltok az ajánlattal együtt mentődnek.

## Ármemória

Az alkalmazás megjegyzi a beolvasott és kézzel beírt árakat. Új bolti PDF-nél kiírja a legalább 15%-kal drágult tételeket (régi → új ár), az ártáblázatban pedig ▲ jelzi őket. Ha egy tételnek még nincs ára, de korábbról ismert, az Anyag lépésnél becsült anyagköltséget mutat, az Árak lépésnél pedig a „Korábbi árak beírása” gombbal kitölthetők. Az ármemória a biztonsági mentésbe is bekerül.

## Biztonsági mentés emlékeztető

Ha van mentett ajánlat, és 7 napja (vagy még soha) nem készült biztonsági mentés, az oldal tetején sárga sáv szól („Mentés most” / „Később” – 3 napra elhalasztja). Telefonon a mentés a megosztás menüt nyitja meg, így a fájl a Fájlokba, iCloudba, Google Drive-ba vagy e-mailbe menthető. Az alkalmazás tartós tárhelyet is kér a böngészőtől, hogy az adatokat ne törölje magától.

## Naptár és időpontfoglalás

Az Ajánlat lépésben („Időpont a naptárba”) megadható a felmérés vagy a kivitelezés kezdete és hossza (felmérésnél óra, kivitelezésnél nap). A „Google Naptárba” gomb a Google Naptárban előre kitöltött eseményt nyit (ügyfél, cím, ajánlatszám, végösszeg, megjegyzés); csak menteni kell. Bejelentkezés és beállítás nem kell hozzá.

A „Saját adataim” alatt megadható a Google Naptár időpontfoglalási oldalának nyilvános linkje (pl. https://calendar.app.google/…). Ha meg van adva, az ügyfélnek küldött levélbe és az ajánlat PDF-be bekerül, így az ügyfél maga foglalhat időpontot. Ha a naptár saját szerkesztőoldalának címét másolod be, az alkalmazás figyelmeztet, és nem teszi a levélbe.

A Projekt lépés tetején a „Foglalási link” gombbal az ügyfélnek már az ajánlat előtt (a felméréshez) elküldhető a link: kész, átírható, magázó üzenet („Az alábbi linken kiválaszthatja az Önnek megfelelő időpontot a helyszíni felméréshez: …”), Megosztás (Viber, Messenger, WhatsApp…), SMS, E-mail vagy Másolás. Ha még nincs megadva a link, ott is beírható. Az üzenet átírása magától mentődik, és a következő alkalommal is az lesz (a link és az ügyfél neve mindig az aktuálisra cserélődik); az „Eredeti szöveg visszaállítása” visszahozza az alapszöveget.

## Másképp írt tételnevek

Új tétel beírásakor (plusz tétel, kiállás- és munkaanyag) a mező felajánlja a már ismert neveket, és ha a beírt név egy meglévőhöz hasonlít, alatta megjelenik: „Már van hasonló a listában…” a meglévő névvel. Rákoppintva a mező a pontos nevet és egységet veszi át, így a tétel a meglévővel összeadódik, nem lesz kétszer a listán. A hasonlóságnál a méretnek egyeznie kell („20-as” ≈ „20x2,9”, „16-os” ≈ „16,2x2,6”, de „20” ≠ „25”), a szavak sorrendje, a kis-nagybetű, az ékezet és a ragozás mindegy („Rehau 20-as cső” ≈ „Rehau Rautitan Stabil cső 20x2,9 mm”). Ismert nevek: a kiállás-könyvtár, a plusz tételek, a munkák és a gerinc anyaga, valamint a korábbi árajánlatok tételei.

## AI anyagjavaslat

Az Anyag lépésben az „AI anyagjavaslat” kártya a kiállások, munkák, a mostani anyaglista és (ha megadod) a munka rövid leírása alapján javasolja, mi hiányzik vagy miből kevés. A javaslatok bepipálva jönnek, a mennyiség átírható, a „Kijelöltek felvétele” a plusz tételek közé teszi őket. Ismert tételnél a pontos meglévő nevet használja, így összeadódik a listán lévővel. Az ügyfél neve, címe, elérhetősége nem megy ki. Minden kérés alján látszik a becsült ára.

Pontosság: az AI megkapja a kiállások anyagcsomagjait (ezeket teljesnek kell tekintenie), a munkák és a gerinc anyagát, a használt rendszereket és márkákat (pl. Rehau PX, Pipelife KAEM) és az ismert tételneveket; csak ezeket a rendszereket használhatja. Minden javaslatnál jelzi, hogy „biztosan kell” vagy „talán”; a „talán” javaslatok alapból nincsenek bepipálva. A hasonló nevű javaslatot az app a meglévő pontos névre és egységre írja át. Ami bepipálatlan marad, azt megjegyzi, és legközelebb nem javasolja (a Beállításnál elfelejthető). A szakmai utasítás az appban van, így finomításához a Workert nem kell cserélni. A munka leírása a „Diktálás” gombbal be is mondható (folyamatosan hallgat, a „Leállítás” zárja le; a szöveg a meglévő után kerül, utána átírható).

A kérés a saját Cloudflare Workereden megy át (`worker/ai-javaslat.js`), az Anthropic API-kulcs csak ott van titkosan tárolva; az appban csak a Worker címe és egy jelszó van (csak a telefonon, a biztonsági mentésbe nem kerül). A Worker csak az app oldaláról és a helyes jelszóval fogad kérést, és csak a Claude Opus 5.5 vagy Sonnet 5.5 modellt hívja.

Beállítás egyszer:
1. platform.claude.com: egyenleg feltöltése, havi költési limit, API-kulcs létrehozása.
2. dash.cloudflare.com → Workers & Pages → Create → Worker („Hello World”) → név pl. `ai-javaslat` → Deploy → Edit code: a `worker/ai-javaslat.js` tartalmát bemásolni, Deploy.
3. A Worker Settings → Variables and Secrets: `ANTHROPIC_API_KEY` (Secret, az API-kulcs) és `APP_JELSZO` (Secret, saját jelszó).
4. Az appban: Anyag → AI anyagjavaslat → Beállítás: a Worker címe (`https://ai-javaslat.<fiók>.workers.dev`) és a jelszó.
