# Árajánlatkészítő

Víz-, gáz- és fűtésszerelési árajánlatok összeállítása: munkadíj, boltnak küldhető anyaglista, ügyfélajánlat és belső összesítő.

## Jelenlegi állapot

Telefonról is használható weboldal. A beírt adatokat és árakat a böngésző megjegyzi.

1. **Munkadíj** a projekt adataiból.
2. **Anyaglista** a boltnak: vágólapra másolható, vagy előre kitöltött e-mailként küldhető.
3. **Árak a boltból:** a bolt két PDF-jét feltöltöd a „Bolti árak PDF” és a „Kedvezményes árak PDF” gombbal, mindegyik csak a saját oszlopát tölti ki. Ha mindkét ár egy levélben jön, a szövegét bemásolhatod, és a program tételenként kiolvassa a bolti és a kedvezményes egységárat. Amit nem tud tételhez kötni, kilistázza, és a hiányzó árat kézzel beírhatod.
3b. **Új tételek a bolt válaszában:** ha a bolt a listán nem szereplő tételt is ír (más típust ajánl, vagy hozzátesz valamit), a program felajánlja, és a „+ Ajánlatba” gombbal a PDF-ben szereplő mennyiséggel és árral felkerül az ajánlatra. Plusz tételt kézzel is hozzá lehet adni.
3b+. **Diktálás:** a plusz tételeknél a „Diktálás” gombbal bemondhatók a tételek, pl. „teflonszalag két darab, golyóscsap fél col három darab”. A program tételekre bontja (megnevezés, mennyiség, egység; a „fél col” 1/2 col lesz), és egy ellenőrző listába teszi, ahonnan egyenként vagy egyszerre vehetők fel, vagy javíthatók. A böngésző beszédfelismerőjét használja (Chrome-ban a Google, Safariban az Apple szolgáltatását), ezért internet kell hozzá.
3c. **Kiállás-könyvtár bővítése:** egy plusz tétel a „Könyvtárba…” gombbal elmenthető egy kiállás csomagjába, így a következő ajánlatnál már magától benne van. A bővítés azon az eszközön tárolódik, ahol felvetted. A „Könyvtár letöltése (CSV)” gombbal a teljes könyvtár letölthető; ezt kell a `data/kiallas-konyvtar.csv` helyére tenni, hogy minden eszközön meglegyen. A már bekerült tételek nem duplázódnak.
4. **Ügyfélajánlat:** munkadíj tételesen, anyag bolti áron, végösszeg. **Belső összesítő:** beszerzési ár és haszon tételenként, illetve összesen.
5. **PDF:** mindkét kimenet külön sablonnal, A4-es lapra. A gomb a böngésző nyomtatási ablakát nyitja meg, ott a „Mentés PDF-ként” lehetőséget kell választani. A fájlnév javaslata például `Arajanlat_Kovács_Anna_2026-11-25`. A fejlécbe a vállalkozó adatai, a megrendelő, az ajánlat száma, a kelte és az érvényessége kerül. A saját adataidat a böngésző megjegyzi.

- `data/munkadij.csv`: a munkadíj-táblázat. Árat itt kell módosítani. A `Kód` oszlopot ne írd át.
- `data/kiallas-konyvtar.csv`: a kiállás-csomagok (kiállás, cikk, mennyiség, egység, cikkszám). A cikkszám oszlop még üres; ha kitöltöd, megjelenik a listában és az e-mailben.
- `src/munkadij.js`: a munkadíj szabályai.
- `src/anyaglista.js`: az anyaglista összegyűjtése, a gerinc és a hüvelyszabály.
- `src/arak.js`: a bolt válaszának beolvasása és az ajánlat összesítése.
- `src/sablonok.js`: az ügyfélajánlat és a belső összesítő nyomtatható sablonja.
- `src/diktalas.js`: a diktált mondat tételekre bontása és a beszédfelismerés.
- `src/konyvtar.js`: a kiállás-könyvtár bővítése és CSV-exportja.
- `src/pdfszoveg.js`: a bolt PDF-jének szövegét soronként kinyeri, és a cellán belül tördelt megnevezéseket visszailleszti a sorukba.
- `vendor/pdfjs-4.10.38-legacy/`: a Mozilla pdf.js (régebbi telefonokon is működő változat) PDF-olvasója (Apache 2.0 licenc). Csak PDF feltöltésekor töltődik be. A PDF a telefonon dolgozódik fel, nem kerül fel sehova.
- `index.html`, `src/app.js`: a weboldal.

### Szabályok

- A vízszerelés alapszerelés mennyisége az összes vízszerelési kiállás darabszáma.
- A hőtermelő gépészete 1 db (gázkazán, vegyes tüzelésű kazán vagy hőszivattyú).
- Ha radiátoros és padlófűtéses kör is van, 1 db felár jár. Kazánnál ez automatikus, hőszivattyúnál külön be kell kapcsolni (nyitott kérdés).
- Puffertartály csak vegyes tüzelésű kazánhoz vehető fel. Hőszivattyúnál a gépészet díja tartalmazza.
- Anyaglista: a csomag sorai szorozva a kiállások számával, azonos cikkek összevonva. Ehhez jön a gerinc csöve és csőhéja (16-oshoz 4x18, 20-ashoz 4x22 mm-es).
- Hüvelyszabály: T-idom 3, falikorong 1, könyök 2, toldóidom 2 hüvely, átmérő szerint. A program figyelmeztet, ha egy csomag ettől eltér. A könyvtár jelenleg minden csomagja megfelel neki.
- Projektenként felülírható csomag: a számítás már kezeli, a felülethez még nincs szerkesztő.
- Árak: a bolt bruttó (ÁFÁ-s) árakat küld. Alanyi adómentesként az ÁFA nem igényelhető vissza, ezért ez a valódi beszerzési költség. Az ügyfélnek a bruttó bolti ár megy tovább, a haszon a két bruttó ár különbsége.
- Árbeolvasás: a sorokat cikkszám, vagy ennek hiányában a megnevezés szavai alapján köti tételhez. A számot tartalmazó szavaknak (méret, átmérő) pontosan egyezniük kell, így a PX 25 T-idom nem lesz PX 20 T-idom, hanem új tételként jelenik meg. Az ár a sor végi számokból jön: a mennyiséget és a soronkénti összeget kihagyja, a két ár közül a nagyobb a bolti. A beolvasott árakat a bolt valódi válaszain még ellenőrizni kell.

## Felület

Négy lépés, telefonon alul fülekkel: **Projekt**, **Anyag**, **Árak**, **Ajánlat**. Felül mindig látszik a munkadíj, az anyag és a végösszeg. A füleken kis szám mutatja az anyaglista tételeinek számát, és hogy hány tételnek van már bolti ára.

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
