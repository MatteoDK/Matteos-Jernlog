# Matteos Jernlog — status

Sidst opdateret: 2026-07-15

## Opdatering 2026-07-15 (4. runde — testet på telefonen, mindre rettelser)
Matteo har nu uploadet koden til GitHub og testet på sin iPhone (som PWA/hjemmeskærm-app). Bundnavigationen virker og hopper ikke, feed-kommentarer er synlige — men en lille sort stribe var synlig nederst under bundnavigationen (dvh-højde ramte ikke helt bunden af skærmen på hjemmeskærm-installerede iPhone-apps). Rettet ved at ændre `.app` fra `height:100dvh` til `position:fixed;inset:0;` — mere robust løsning specifikt til dette iOS-scenarie. Titlen øverst er også ændret fra "Master Matteos Jernlog" til "Master Matteos Jernlog-app". **Bekræftet på GitHub at begge rettelser er uploadet korrekt** (tjekket direkte via raw-fil), men Matteo skulle slette+geninstallere hjemmeskærm-genvejen for at telefonens cache ikke viste den gamle version. Ikke bekræftet visuelt på telefonen efter denne rettelse endnu.

**"Godkend brugere"-siden er udvidet:** viser nu også en "Alle oprettede brugere"-liste (ikke kun ventende), med status (Godkendt/Afventer) pr. bruger. Godkendte brugere (undtagen Matteo selv) har en "Fjern adgang"-knap til at tilbagekalde godkendelse igen. Testet med jsdom-simulering, ingen fejl.

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
