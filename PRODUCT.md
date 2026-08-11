# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Matteo and a small, closed circle of real-life friends (currently ~10 people, e.g. Thor, mrbuuuzzz), all admitted manually by Matteo. Everyone is an active gym-goer doing structured strength training (push/pull/legs-style splits). Used almost entirely on iPhone, installed to the home screen as a PWA — not discovered through an app store, not aimed at strangers.

## Product Purpose

"Strava for vægtløftning" (Strava for weightlifting) — a personal strength-training log shared inside a friend group. Log sets (exercise, weight, reps), track PRs and progress over time, and see friends' workouts in a social feed with comments. Built by Matteo for himself and his friends, not a commercial product.

## Positioning

Combines a fast, few-taps-per-set logging flow with a lightweight social feed (PRs, comments, "in progress now" badges) scoped to a real friend group rather than public discovery — the mechanism a generic spreadsheet or a public fitness app neither offers.

## Operating Context

Used standing in a gym between sets — logging must be fast, thumb-reachable, legible under gym lighting, and forgiving of quick, imprecise taps. Primary loop: pick exercise → enter weight/reps → save → repeat for the next set. Secondary loops happen at home/on the couch: browsing the feed, reviewing history/graphs, checking the calendar, managing friends and comments. Internet (Supabase) is required at all times; there is no offline mode.

## Capabilities and Constraints

- Static site: `index.html` + `styles.css` + `app-*.js`, no build step, no framework, no bundler — deploy is "edit files, push to GitHub Pages."
- Supabase (Postgres + Auth + RLS) backend; anon key is public by design, tables scoped to self/friends via RLS.
- iOS PWA specifics already solved and fragile: `apple-mobile-web-app-status-bar-style: black` plus `position:fixed;inset:0` on `.app` fixes a real WebKit bug where standalone-mode PWAs left a black bar under the bottom nav — do not touch this mechanism without retesting on a real installed iPhone PWA (a plain browser preview cannot reproduce the bug).
- Fixed header + fixed bottom nav (5 tabs: Feed, Kalender, Log øvelse, Historik, Dig), only `<main>` scrolls.
- Dark-mode-only today; no user-facing theme toggle exists. Not a locked constraint for the redesign (user deferred to designer's judgment) — but the iOS status-bar mechanism above depends on the app never being visually "light" in the safe-area/statusbar region, so any lighter treatment must be evaluated against that fragility, not just against contrast.
- Everything currently reachable in the UI must remain reachable in the same places after the redesign — this is a visual redesign only, not a re-architecture. No functional, navigational, or structural changes.

## Brand Commitments

Keep the name "Jernlog" / "Matteos Jernlog" and the existing app icon (`icon-180-v1.png`, a hand-drawn "flexing figure + BRAH speech bubble" illustration Matteo made himself) exactly as they are. The redesign is scoped to in-app visual design only — palette, type, spacing, components, motion — not naming or the home-screen icon.

## Evidence on Hand

- Full source of the current implementation (all `app-*.js`, `styles.css`, `index.html`) — current visual system: near-black background, yellow (`#f5c518`) accent, card-based dark UI, system font stack, minimal iconography (emoji).
- `PROGRESS.md` — dated build log of every prior session's changes, including the iOS status-bar saga referenced above.
- Real exercise catalog (60 exercises across 9 muscle groups) and real UI copy already in Danish throughout the app; redesign must keep Danish copy as-is unless asked.

## Product Principles

1. Speed at the barbell beats decoration — the logging flow (search → pick exercise → weight/reps → save) must stay the fastest, least-effortful path in the app, whatever the visual system becomes.
2. Small and real, not a storefront — this serves a specific, known group of ~10 friends, not anonymous acquisition; polish should read as considered and personal, not as generic SaaS/startup gloss.
3. The gym is the real usage scene — legible at a glance, forgiving of sweaty/quick thumb taps, unbothered by bright overhead gym lighting or a dim room at night.
4. Visual change only — every screen, tab, and interaction stays exactly where it is and does exactly what it did; the redesign may not require anyone to relearn the app.
