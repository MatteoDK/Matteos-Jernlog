# Matteos Jernlog — status

Sidst opdateret: 2026-07-15

## Opdatering 2026-07-15
Opklarede uoverensstemmelsen fra sidste session: den cloud-baserede version (login/Supabase/feed/venner) var aldrig blevet uploadet til GitHub — den lå kun i en anden chats arbejdsmappe. Den fulde, korrekte `index.html` er nu hentet ind, 3 rettelser er lavet, og filen ligger klar til upload i `Jernlog App/index.html` i denne mappe:

1. **PR-farve** — `.pr-badge` og PR-toasten ("🏆 Ny PR på X!") er ændret fra rød til grøn (`var(--green)`), så det ikke ligner en fejl. Andre toasts (fejlbeskeder m.m.) er stadig røde som før — kun PR-beskeden er grøn, via en ny `.toast.pr`-klasse.
2. **Feed: kommentarer altid synlige** — Kommentarliste + kommentarfelt er flyttet uden for "se detaljer"-sektionen og er nu altid synlige på hvert opslag. "Se detaljer"-knappen er omdøbt til "Se øvelser & sæt" og styrer nu kun visning af de præcise øvelser/sæt/kg.
3. **"Skift"-knap** — Omdøbt fra "Skift ✕" til to linjer "Skift" / "øvelse", med ny baggrundsfarve (`--bg-card` + border) så den er mere synlig. Klasse: `.skift-ex-btn`.
4. **404 efter email-verificering — IKKE rettet i kode.** Koden sender ingen egen redirect (ingen `emailRedirectTo`), så det er udelukkende styret af Supabase Auths "Site URL"-indstilling. Ifølge den anden chat er Site URL sat til `https://matteodk.github.io/Matteos-Jernlog/`, hvilket burde virke uden 404 — MEN det forklarer ikke hvorfor Matteo faktisk oplevede en ægte GitHub 404-side (den gamle `index.html` findes jo på den URL, så den burde vises, ikke en 404). **Anbefaling:** test verificeringsflowet igen efter at den nye `index.html` er uploadet. Hvis 404-siden stadig dukker op, skal vi se de faktiske indstillinger direkte i Supabase Auth (Site URL + Redirect URLs, skærmbillede eller kopieret tekst) i stedet for at stole på en gengivelse fra en anden chat.

**Verificeret:** JS-koden er tjekket for syntaksfejl efter alle 3 rettelser (bestået).
**Ikke verificeret:** Rettelserne er ikke testet i en rigtig browser/telefon endnu — kun læst og redigeret som tekst.

## Tidligere status (2026-07-14, opdateret ud fra projektets Context-filer)

## Formål
"Strava for vægtløftning" — personlig styrketræning-tracker delt mellem Matteo og hans venner (fx Thor). Log øvelser, sæt, reps, vægt, se grafer/statistik og PR-tracking (personlige rekorder), og se venners træning i en feed.

## ⚠️ Vigtig ændring siden start — læs dette
Appen startede som et rent lokalt/offline-projekt (data kun på telefonen, ingen server). Undervejs er arkitekturen ændret fundamentalt til en **cloud-løsning med Supabase**, fordi appen nu deles med venner (feed, kommentarer, venneanmodninger — det kræver en central database). Det er ikke nødvendigvis en fejl, men bare vær opmærksom på at det oprindelige "kun lokalt, ingen server"-krav ikke længere gælder for den nuværende version.

## Arkitektur (nuværende)
- Én fil: `index.html` — HTML/CSS/vanilla JS, ingen build-trin
- Hostet på GitHub Pages, repo: `MatteoDK/Matteos-Jernlog`
- Bruges som PWA på iPhone via "Føj til hjemmeskærm"
- **Backend: Supabase** (gratis plan), projekt "jernlog", region Stockholm, ejet af Matteos GitHub-konto
- Database: Postgres via Supabase, tabeller: `profiles`, `exercises`, `logs`, `friendships`, `comments` — alle med Row Level Security
- supabase-js v2 hentes via CDN
- Login: email + adgangskode (email-bekræftelse slået til)
- localStorage bruges kun til: nød-backup ved offline-gem, læst-markering af kommentarer, historisk migreringsflag
- Internet er påkrævet (bevidst valg, pga. cloud-backend)

## Opdatering 2026-07-15 (2. runde — navigation + Dig-side)
4 nye ændringsønsker implementeret oveni de 3 fra tidligere i dag:

1. **Bundnavigation** — 5 faste knapper nederst i skærmen, venstre→højre: Feed, Kalender, Log øvelse, Historik/Statistik, Dig. Disse 5 er fjernet fra dropdown-menuen (som nu kun indeholder Kommentarer, Øvelser, Venner, Log ud). Ny CSS-klasse `.bottom-nav`/`.bn-item`, vist/skjult sammen med menuknappen (login/logout), fremhæver aktiv side automatisk ved al navigation (`updateBottomNavActive()` kaldt fra `goto()`).
2. **"Dig"-side** — erstatter den gamle "Wins & Plateaus"-side (samme menupunkt, ny funktion `renderDig()`). Viser nu øverst "Seneste aktiviteter" (egne seneste træninger, Strava-agtigt: dato/tid, "I gang nu"-badge, PR-badges, udvidelig "Se øvelser & sæt"), og herunder den eksisterende Wins & Plateaus-ranking uændret. Bruger kun data der allerede er i hukommelsen (memEx/memLogs) — ingen ekstra netværkskald.
3. **App-boot: Feed eller Log øvelse** — appen åbner nu automatisk på "Log øvelse" hvis du har logget et sæt inden for de sidste 30 min (ny hjælpefunktion `hasRecentOwnActivity()`), ellers på "Feed".
4. **Live-badge/varighed i feed** — tjekket, var allerede korrekt implementeret (ingen ændring nødvendig).

**Verificeret grundigt denne gang:** Byggede en jsdom-testsimulering (fake Supabase-klient, ingen rigtig netværksadgang) og kørte appen igennem to scenarier — "ingen nylig aktivitet" (lander korrekt på Feed) og "aktivitet for 5 min siden" (lander korrekt på Log øvelse). Testede desuden klik gennem alle 5 bundnav-faner, og at Dig-siden renderer "Seneste aktiviteter" + øvelse/sæt-udvidelse + Wins & Plateaus uden JS-fejl. Ingen fejl fundet.
**Stadig ikke testet:** rigtig browser/telefon, og PR-toast/farve-ændringerne (kræver faktisk at logge et sæt, ikke dækket af simuleringen).

## Features (ifølge seneste overleveringsnotat: alle bygget og testet)
- Log øvelse (søg/vælg, vægt+reps, auto-udfyldt vægt, PR-toast, "foreslået i dag" ud fra muskelgruppe)
- Historik/statistik pr. øvelse (grafer, sæt-historik, PR-badge)
- Feed (træninger grupperet, PR-øvelser, kommentar-antal, "i gang nu"-badge, kommentarer altid synlige)
- Kommentarer (notifikationer, ulæst-tæller)
- Øvelser-siden (grupperet efter muskelgruppe, træk-og-slip rækkefølge)
- Kalender (trænede dage, streaks, venners kalender)
- Venner (søg, anmod, acceptér, venneprofil med read-only historik)
- Dig (seneste aktiviteter + Wins & Plateaus — tidligere kaldt "Wins & Plateaus")
- Bundnavigation: Feed, Kalender, Log øvelse, Historik/Statistik, Dig

## Status lige nu
Ifølge sidste overleveringsnotat: koden er færdig og testet. Muligvis mangler Matteo stadig at:
- Uploade nyeste `index.html` + `icon-180-v4.png` til GitHub
- Oprette sin egen konto med **matteoverdiani.dk@gmail.com** (vigtigt — den engangs-migrering af gammel lokal data er låst til denne email)
- Få vennen (Thor) til at oprette konto og sende venneanmodning

**Bemærk:** Jeg (denne chat) har ikke selv set den nyeste `index.html`-kode — ovenstående er baseret på et overleveringsnotat fra en tidligere Fable 5-samtale. Bekræft gerne med Matteo om det stadig er præcist, før der bygges videre.

## Kendte faldgruber (vigtigt ved videre kodning)
- Diff-sync kræver nye objekt-kopier ved redigering af `memEx`/`memLogs` — redigér aldrig direkte
- `variant`-feltet: 'a', 'b', 'ab' eller null (null = Liste C)
- Kommentar-nøgle er `target_user + workout_start` — flyt aldrig `logged_at` på en træning med kommentarer uden at opdatere kommentarerne
- Supabase gratis-plan pauser projektet efter ~1 uges inaktivitet (skal vækkes manuelt på supabase.com)

## Næste skridt
- Upload `Jernlog App/index.html` (den opdaterede fil, nu inkl. bundnavigation + Dig-side) til GitHub-repoet — erstat den gamle `index.html`
- **Ikonfilen (`icon-180-v4.png`) skal IKKE uploades igen medmindre den selv er ændret** — den er en engangsting, ikke noget der gentages ved hver kodeopdatering. Ret denne linje hvis det stadig er uafklaret om den blev uploadet første gang.
- Test hele flowet på telefonen: opret konto med matteoverdiani.dk@gmail.com, bekræft email, tjek om 404-siden stadig dukker op
- Test alle 7 rettelser i praksis: PR-farve, feed-kommentarer, Skift-knap, bundnavigation, Dig-side, auto-åbning på Feed/Log øvelse, live-badge/varighed
- Hvis 404 stadig sker: hent faktiske Supabase Auth-indstillinger (Site URL / Redirect URLs) direkte, i stedet for at stole på gengivelse fra anden chat

## Sådan bruges denne fil
Ved start af ny chat om app'en: peg AI'en på denne fil ("læs PROGRESS.md og fortsæt derfra").
Efter hver session: opdater "Status", "Kendte faldgruber" og "Næste skridt" ovenfor, og gem filen i GitHub-repo'en (eller projektets Context).
