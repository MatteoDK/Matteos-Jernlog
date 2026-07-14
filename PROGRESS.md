# Matteos Jernlog — status

Sidst opdateret: 2026-07-14 (opdateret ud fra projektets Context-filer)

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

## Features (ifølge seneste overleveringsnotat: alle bygget og testet)
- Log øvelse (søg/vælg, vægt+reps, auto-udfyldt vægt, PR-toast, "foreslået i dag" ud fra muskelgruppe)
- Historik/statistik pr. øvelse (grafer, sæt-historik, PR-badge)
- Feed (træninger grupperet, PR-øvelser, kommentar-antal, "i gang nu"-badge)
- Kommentarer (notifikationer, ulæst-tæller)
- Øvelser-siden (grupperet efter muskelgruppe, træk-og-slip rækkefølge)
- Kalender (trænede dage, streaks, venners kalender)
- Venner (søg, anmod, acceptér, venneprofil med read-only historik)
- Wins & Plateaus (procent-ranking)

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
- (Udfyld: hvilke ændringsønsker har Matteo nu?)

## Sådan bruges denne fil
Ved start af ny chat om app'en: peg AI'en på denne fil ("læs PROGRESS.md og fortsæt derfra").
Efter hver session: opdater "Status", "Kendte faldgruber" og "Næste skridt" ovenfor, og gem filen i GitHub-repo'en (eller projektets Context).
