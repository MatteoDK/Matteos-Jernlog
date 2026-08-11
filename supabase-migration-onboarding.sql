-- ============================================================
-- Migration: onboarding-flow for nye brugere
-- Kør denne i Supabase SQL Editor (supabase.com -> dit "jernlog"-projekt -> SQL Editor)
-- FØR du uploader den nye index.html/app-core.js — ellers ser koden bare bort fra
-- onboardingen (helt harmløst), indtil kolonnen findes.
-- Idempotent (sikkert at køre flere gange).
-- ============================================================

-- 1) Ny kolonne: has_onboarded. Default false, så KUN fremtidige nye konti
--    (oprettet efter denne migration) ser onboardingen.
alter table profiles add column if not exists has_onboarded boolean not null default false;

-- 2) Alle konti der allerede findes NU (dig, Thor, og alle andre nuværende
--    brugere) markeres som allerede "onboardet", så ingen af jer ser den nye
--    velkomst-flow ved næste login — det er kun til nye, fremtidige konti.
update profiles set has_onboarded = true where has_onboarded = false;

-- ============================================================
-- Efter du har kørt dette: tjek at "select username, has_onboarded from profiles;"
-- viser true for alle jeres nuværende konti.
-- ============================================================
