# Matteos Jernlog — status

Sidst opdateret: 2026-07-15

## Opdatering 2026-07-15 (9. runde — sort bjælke: STOP med blinde forsøg, kør diagnose)
Efter 4 mislykkede forsøg er strategien ændret: i stedet for flere CSS-gæt afgøres det nu eksperimentelt HVOR problemet ligger. Der er præcis to teorier tilbage:
- **Teori A (cache):** Telefonen kører slet ikke den nyeste kode (GitHub Pages CDN / hjemmeskærms-snapshot / service worker hønen-og-ægget). Ville forklare hvorfor INGEN forsøg har ændret noget visuelt — heller ikke farve-matchingen, som umuligt kan være usynlig hvis koden faktisk kørte.
- **Teori B (WebView-inset):** WebView'en dækker reelt ikke bunden i standalone; det sorte er iOS' eget vindue bag web-indholdet, og kan pr. definition ikke males med CSS.

**Nyt i denne runde:**
1. `bundtest.html` — minimal, isoleret testside (rød fuldskærm + grøn safe-area-stribe + blå "falsk bundnav" + live-tal på skærmen: klokkeslæt for indlæsning, standalone ja/nej, env(safe-area-inset-bottom) i px, innerHeight osv.). Skal uploades til repoet, åbnes i Safari OG som hjemmeskærm-app, og skærmbilledes.
2. Versions-markør i `index.html`: nederst i dropdown-menuen (☰) står nu "version 15.7-B". Hvis appen på telefonen IKKE viser den tekst efter upload+genstart, er Teori A bevist.

**Fortolkning af bundtest (som hjemmeskærm-app):**
- Rød når helt ned + grøn stribe ca. 34px synlig → WebView'en KAN dække bunden → Teori B død → fejlen er app-specifik/cache → fix i appen.
- Sort bjælke under rød/blå + env-tal = 0 → Teori B bevist → CSS kan ikke løse det; næste skridt er meta/manifest-varianter (fx uden manifest.json, anden statusbar-style) testet én ad gangen på testsiden — eller acceptér og design bundnav'en så den ser bevidst ud.

**Upload:** `bundtest.html` + `index.html` (versions-markør). Testsiden kræver sin egen "Føj til hjemmeskærm" (ikonet hedder "Bundtest").

## Opdatering 2026-07-15 (8. runde — sort bjælke under bundnav, forsøg 3: rigtig manifest.json)
Matteo sammenlignede med Strava-appen og pressede på — med rette, for Strava beviser at det GODT kan lade sig gøre at få bundnav'en helt ned uden sort bjælke. Fandt en sandsynlig hovedårsag: appen har KUN de gamle "apple-mobile-web-app-*" meta-tags, men ingen rigtig **Web App Manifest** (`manifest.json`) — det er den moderne standard som nyere iOS-versioner håndterer markant bedre, bl.a. i forhold til safe-area/viewport i hjemmeskærm-tilstand.

**Rettelser:**
- Ny fil `manifest.json` tilføjet (name, display:"standalone", background_color/theme_color, ikon-reference).
- `<link rel="manifest" href="manifest.json">` tilføjet i `index.html`'s `<head>`.
- Ekstra defensiv CSS: `height:-webkit-fill-available` tilføjet til html/body (kendt fix for et specifikt WebKit-bug-mønster med denne præcise symptom).
- Alle tidligere forsøg (position:fixed;inset:0, farve-matching, større knap-række) er bevaret — dette er lag oveni, ikke en erstatning.

⚠️ **VIGTIGT:** En Web App Manifest læses kun af iOS på selve installationstidspunktet ("Føj til hjemmeskærm"). Det er IKKE nok at uploade filen og genåbne den eksisterende hjemmeskærm-genvej — Matteo (og alle andre brugere) skal **slette den nuværende hjemmeskærm-genvej og tilføje appen igen fra bunden** for at manifestet reelt træder i kraft. Dette er ud over den service worker-relaterede engangs-geninstallation der allerede er sket tidligere.

**Ikke testet på telefonen endnu — kræver slet+geninstaller, ikke bare genupload.**

## Opdatering 2026-07-15 (7. runde — nyt ikon, bundnav-plads, kommentar-forbedringer)
1. **Nyt app-ikon** — lavet fra Matteos nyeste ChatGPT-genererede billede (samme figur/stil, men tekst der fylder bredden bedre og næsten intet tomrum i bunden). Beskåret tæt og kvadratisk, gemt som `icon-180-v1.png` (overskriver den forrige — filnavnet er uændret, så `index.html` skal IKKE opdateres for dette).
2. **Bundnav-plads** — iOS reserverer en lille strimmel nederst til "swipe hjem"-bevægelsen, hvor der ikke kan sidde trykbare knapper (kan ikke fjernes helt). I stedet er selve knap-rækken gjort højere (mere padding, større ikon/tekst), så knapperne fylder mere af området og den reserverede strimmel virker mindre/mere ubetydelig.
3. **"Kommentarer"-label i feed** — tilføjet en lille label ("💬 Kommentarer") over kommentarsektionen i hvert opslag, så det er tydeligt hvor kommentarerne starter.
4. **Dato på kommentarer** — hver kommentar viser nu dato (I dag/I går/dd. mmm) til højre.

Alt testet med jsdom-simulering (ingen JS-fejl, label og dato bekræftet i output). **Ikke testet på en rigtig telefon endnu.**

**Skal uploades til GitHub:** `index.html`, `icon-180-v1.png`, `PROGRESS.md`. `sw.js` skal IKKE med (uændret).

## Opdatering 2026-07-15 (6. runde — sort bjælke under bundnav, forsøg 2)
Matteo bekræftede via skærmbillede at der stadig var en tydelig sort stribe under bundnavigationen på hjemmeskærm-appen (efter forrige `position:fixed;inset:0`-rettelse var uploadet og appen geninstalleret). Årsag (mest sandsynlig): `env(safe-area-inset-bottom)` giver i nogle tilfælde ikke ekstra plads korrekt til et element der ligger inde i et `position:fixed;inset:0`-element på iOS hjemmeskærm-apps — så bundnav'ens baggrund nåede ikke helt ned til bunden, og man så html/body's baggrundsfarve (`--bg`, næsten sort) i stedet.

**Rettelse (defensiv, virker uanset præcis årsag):**
- `html,body` baggrund ændret fra `--bg` til `--bg-elevated` (samme farve som bundnav'en) — så selv hvis der er en lille kant/gab et sted, matcher farven bundnav'en i stedet for at se sort/forkert ud.
- `.app` har nu selv en eksplicit `background:var(--bg-elevated)` som ekstra sikkerhed.
- `main` har fået en eksplicit `background:var(--bg)` (den mørkere farve), så resten af appen ser ud som før — kun bundnav-området er påvirket.
- `.bottom-nav`'s `padding-bottom` er ændret til `max(env(safe-area-inset-bottom),12px)` — sikrer minimum 12px baggrund under ikonerne, selv hvis `env()` skulle give 0.

Syntaks-tjekket (JS OK). **Ikke testet på telefonen endnu** — Matteo skal uploade `index.html` og teste igen efter geninstallation.

## Opdatering 2026-07-15 (5. runde — nyt app-ikon)
Matteo har lavet et nyt AI-genereret app-ikon (person der flekser + "BRAH"-taleboble + "Matteos Jernlog-app"-tekst på lilla/blå gradient). Det er beskåret tæt ind (intet tomrum i bunden, ingen kanter/border) og skaleret til 180x180. Matteo har slettet alle gamle ikonfiler på GitHub, så filen er omdøbt fra `icon-180-v4.png` til **`icon-180-v1.png`** for at starte navngivningen forfra — `index.html` linje 11 (`<link rel="apple-touch-icon">`) peger nu på det nye navn.

**Mangler at blive uploadet til GitHub:** `index.html` og `icon-180-v1.png`. `sw.js` er IKKE ændret i denne runde og skal ikke uploades igen (den skal kun genuploades hvis dens eget indhold ændres).

## Opdatering 2026-07-15 (4. runde — testet på telefonen, mindre rettelser)
Matteo har nu uploadet koden til GitHub og testet på sin iPhone (som PWA/hjemmeskærm-app). Bundnavigationen virker og hopper ikke, feed-kommentarer er synlige — men en lille sort stribe var synlig nederst under bundnavigationen (dvh-højde ramte ikke helt bunden af skærmen på hjemmeskærm-installerede iPhone-apps). Rettet ved at ændre `.app` fra `height:100dvh` til `position:fixed;inset:0;` — mere robust løsning specifikt til dette iOS-scenarie. Titlen øverst er også ændret fra "Master Matteos Jernlog" til "Master Matteos Jernlog-app". **Bekræftet på GitHub at begge rettelser er uploadet korrekt** (tjekket direkte via raw-fil), men Matteo skulle slette+geninstallere hjemmeskærm-genvejen for at telefonens cache ikke viste den gamle version. Ikke bekræftet visuelt på telefonen efter denne rettelse endnu.

**"Godkend brugere"-siden er udvidet:** viser nu også en "Alle oprettede brugere"-liste (ikke kun ventende), med status (Godkendt/Afventer) pr. bruger. Godkendte brugere (undtagen Matteo selv) har en "Fjern adgang"-knap til at tilbagekalde godkendelse igen. Testet med jsdom-simulering, ingen fejl.

**Ny fil: `sw.js` (service worker) — løser "alle skal slette+geninstallere appen for at få opdateringer".** Uden en service worker cacher iPhones en hjemmeskærm-app ret aggressivt, så nye kodeændringer ikke altid når frem uden manuel geninstallation. `sw.js` tvinger appen til altid at hente den nyeste version fra serveren (netværk først, kun cache som nødløsning hvis reelt offline — appen kræver alligevel internet pga. Supabase). Registreres automatisk fra `index.html` ved opstart.

⚠️ **Vigtigt at forstå:** dette er en "hønen og ægget"-fix. Telefoner der allerede kører den GAMLE kode (uden service worker-registrering) kan ikke opdage den nye `sw.js` af sig selv — de skal have ÉN sidste manuel opdatering (slet+geninstallér genvejen, som i denne runde) for at hente koden der faktisk registrerer service workeren. Men fra og med DEN opdatering, bør alle fremtidige ændringer hentes automatisk, uden at nogen skal slette og geninstallere igen. Så: upload denne omgang som normalt, bed alle 3 brugere geninstallere én sidste gang — herefter bør det være løst for godt.
**Ikke testet i en rigtig browser/telefon endnu.**

## ⚠️ Vigtig ændring siden start — læs dette
Appen startede som et rent lokalt/offline-projekt (data kun på telefonen, ingen server). Undervejs er arkitekturen ændret fundamentalt til en **cloud-løsning med Supabase**, fordi appen deles med venner (feed, kommentarer, venneanmodninger — det kræver en central database). Det oprindelige "kun lokalt, ingen server"-krav gælder altså ikke længere.

## Formål
"Strava for vægtløftning" — personlig styrketræning-tracker delt mellem Matteo og hans venner (fx Thor). Log øvelser, sæt, reps, vægt, se grafer/statistik og PR-tracking, se venners træning i en feed.

## Arkitektur (nuværende)
- Én fil: `index.html` — HTML/CSS/vanilla JS, ingen build-trin
- Hostet på GitHub Pages, repo: `MatteoDK/Matteos-Jernlog`
- Bruges som PWA på iPhone via "Føj til hjemmeskærm"
- **Backend: Supabase** (gratis plan), projekt "jernlog", region Stockholm
- Database: Postgres via Supabase, tabeller: `profiles` (nu inkl. `approved`), `exercises`, `logs`, `friendships`, `comments` — alle med Row Level Security
- App-skal: header og bundnav er faste (flex-kolonne, `height:100dvh`), kun `<main>` scroller
- Login: email + adgangskode (email-bekræftelse slået til) + **manuel admin-godkendelse af nye brugere**
- Internet er påkrævet (bevidst valg, pga. cloud-backend)

## Features
- Log øvelse (søg/vælg, vægt+reps, auto-udfyldt vægt, grøn PR-toast, "foreslået i dag")
- Historik/statistik pr. øvelse (grafer, sæt-historik, grøn PR-badge)
- Feed (træninger grupperet, PR-øvelser, "i gang nu"-badge, kommentarer altid synlige uden at skulle folde ud)
- Kommentarer (notifikationer, ulæst-tæller)
- Øvelser-siden (grupperet efter muskelgruppe, træk-og-slip rækkefølge)
- Kalender (trænede dage, streaks, venners kalender)
- Venner (søg, anmod, acceptér, venneprofil med read-only historik)
- Dig (seneste aktiviteter + Wins & Plateaus)
- Bundnavigation: Feed, Kalender, Log øvelse, Historik/Statistik, Dig
- Godkend brugere (kun synlig for matteoverdiani.dk@gmail.com) — accepter/afvis nye konti

## Status lige nu
Koden i `Jernlog App/index.html` (denne mappe) er den nyeste, fulde version — **den er endnu ikke uploadet til GitHub**. Alt er verificeret med en simuleret jsdom-test (fake login/database, ingen rigtig server), ikke i en rigtig browser/telefon endnu.

### Rettelser i dag, runde 3 (nyeste)
1. **Scroll-plads / bundnav dækkede for indhold** (fx kommentarfeltet nederst i feedet) — App-strukturen er lavet om: header + bundnav er faste flex-elementer, kun `<main>` scroller. Bundnav er ikke længere `position:fixed`, så den kan ikke længere dække noget.
2. **Bundnav "hoppede" ved skift til Feed** — Årsag: Feed viste kort en "Henter…"-besked før det fulde indhold, og den pludselige højdeændring fik mobilens adresselinje til at vise/skjule sig og flytte den faste bundnav. Løst af samme struktur-ændring + skift fra `window.scrollTo` til `main.scrollTop`.
3. **Godkendelse af nye brugere** — Nye konti er nu spærret indtil du godkender dem manuelt.
   - Ny kolonne `approved` (default `false`) på `profiles`.
   - Nye brugere ser "Venter på at MASTER MATTEO accepterer dig" i stedet for appen.
   - Ny side "Godkend brugere" i dropdown-menuen, kun synlig for din konto, med Accepter/Afvis + antal-badge.
   - **Kræver at du selv kører `supabase-migration-approval.sql` (ligger i denne mappe) i Supabase SQL Editor, FØR du uploader den nye `index.html`.** Se forklaring i selve SQL-filen. Scriptet godkender automatisk alle eksisterende konti (dig + Thor).
   - Sikkerhed: en database-trigger forhindrer brugere i at godkende sig selv via API'et direkte — ikke 100% uigennemtrængeligt for en teknisk garvet person, men stopper "deler jeg linket, kan alle bare oprette sig".

### Rettelser i dag, runde 2
4. **Bundnavigation** — 5 faste knapper: Feed, Kalender, Log øvelse, Historik/Statistik, Dig. Fjernet fra dropdown-menuen (som nu kun har Kommentarer, Øvelser, Venner, Log ud).
5. **"Dig"-side** — erstatter "Wins & Plateaus": viser "Seneste aktiviteter" (egne træninger, Strava-agtigt) øverst, ranking nedenunder.
6. **App-boot** — åbner automatisk "Log øvelse" hvis du har logget inden for 30 min, ellers "Feed".
7. **Live-badge/varighed i feed** — tjekket, var allerede korrekt (ingen ændring).

### Rettelser i dag, runde 1
8. **PR-farve** — grøn i stedet for rød (kun PR-beskeden, andre fejlbeskeder er stadig røde).
9. **Feed-kommentarer altid synlige** — uden at skulle trykke "se detaljer" først.
10. **"Skift"-knap** — omdøbt til "Skift øvelse" (to linjer) + baggrundsfarve.
11. **404 efter email-verificering — IKKE rettet.** Koden styrer ikke selv redirect'et, det er Supabase Auths "Site URL"-indstilling. Forklaringen fra en anden chat om at det "løser sig selv" er ikke fuldt overbevisende — test igen efter upload, og hvis 404 fortsætter, skal vi se de faktiske Supabase-indstillinger direkte.

## Kendte faldgruber (vigtigt ved videre kodning)
- Diff-sync kræver nye objekt-kopier ved redigering af `memEx`/`memLogs` — redigér aldrig direkte
- `variant`-feltet: 'a', 'b', 'ab' eller null (null = Liste C)
- Kommentar-nøgle er `target_user + workout_start` — flyt aldrig `logged_at` på en træning med kommentarer uden at opdatere kommentarerne
- Supabase gratis-plan pauser projektet efter ~1 uges inaktivitet (skal vækkes manuelt på supabase.com)
- `main` er nu det eneste scrollbare element (ikke `window`) — brug `main.scrollTop`, ikke `window.scrollTo`, ved fremtidige ændringer

## Næste skridt (i denne rækkefølge)
1. ~~Kør `supabase-migration-approval.sql` i Supabase SQL Editor~~ **GJORT 2026-07-15** — kørt direkte via browser-styring, verificeret med `select username, approved, created_at from profiles;`. Alle 3 eksisterende konti (matty-mc-fatty, thor, mrbuuuzzz) er godkendt (approved=true).
   - ⚠️ **OBS:** "mrbuuuzzz" (formentlig Thors far) blev automatisk godkendt, fordi hans konto allerede eksisterede før migrationen kørte (oprettet 2026-07-14). Hvis det IKKE var meningen, skal han sættes tilbage til ikke-godkendt manuelt — enten via den nye "Godkend brugere"-side (kræver den nye kode er uploadet), eller direkte i Supabase: `update profiles set approved = false where username = 'mrbuuuzzz';`
2. Upload `Jernlog App/index.html` til GitHub-repoet (erstat den gamle) — ikonfilen skal **ikke** uploades igen, kun hvis den selv ændres
4. Test hele flowet på telefonen: opret en test-konto, bekræft email (tjek om 404 stadig sker), tjek at den nye konto rammer "venter på godkendelse"
5. Godkend test-kontoen fra din egen konto under "Godkend brugere"
6. Test resten: scroll til bunden af feedet og kommentér, skift mellem alle 5 bundnav-faner uden hop, PR-farve, Skift-knap

## Sådan bruges denne fil
Ved start af ny chat om app'en: peg AI'en på denne fil ("læs PROGRESS.md og fortsæt derfra").
Efter hver session: opdater "Status" og "Næste skridt" ovenfor, og gem filen i GitHub-repo'en (eller projektets Context).
