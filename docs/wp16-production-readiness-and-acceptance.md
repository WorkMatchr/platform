# WP16 — Production Readiness & Acceptance

Peildatum: 28 oktober 2026. Werkbranch `codex/wp16-production-readiness`.
Basis main `46962cff1724e87e5f33697173cbb9168d6f9da3`; WP15
`dff1470bb64783842ffc4818dc1d18b5497fe957` is gecontroleerd overgenomen als
branchbasis. PR #70 is nog open en Draft. Geen merge uitgevoerd.

Dit dossier wordt aangevuld met de daadwerkelijke CI- en acceptatieresultaten.
Onbewezen controles blijven NOT VERIFIED of BLOCKED. Productiemigratie en
volledige commerciële vrijgave blijven NO-GO.

## Afgebakende technische verbetering

De bestaande PostgreSQL-notificatieproef wordt uitgebreid met een echte
checkout-/betalingsservice op een fake gateway: zes betaalreplays, één
PURCHASE-ledgerregel en factuur, expliciete mailfailure/recovery en dezelfde
professional door dossier, Request, handoff, matching, outbox, ontgrendeling,
offerte en gunning. Externe fetch is geblokkeerd; uitsluitend example.invalid.

De bestaande fresh/upgrade-migratieproef krijgt een optionele CI-only
pg_dump/pg_restore-proef op haar eigen nieuw aangemaakte database, met een
tweede eigen restoredoel. Migraties, tabeldigests, functiebody/owner/ACL en
historieguards worden na herstel vergeleken. Geen productiegegevens gekopieerd.

## Actuele read-only baseline

- Production `dpl_3RDDYiSY6dsk6hPhdyeLqyWKY1H8`, READY, main 46962cff.
- Neon `billowing-term-15867762`, production `br-odd-smoke-agf0wj9j`, endpoint
  `ep-royal-sound-agegzj34`, neondb/neondb_owner. Connectortransactie READ ONLY.
- 85 succesvolle registraties, nul onafgemaakte registraties; vier beoordelingen,
  38 resultaatregels, twee Requests en twee Assignments. Alleen NL_ARBO_LEGACY/1.
- Historie 21.600 seconden; oude snapshot van 16 oktober nog aanwezig. Geen
  actueel migratieherstelpunt aangemaakt of bestaand herstelpunt verwijderd.
- Vercel-envmetadata ongewijzigd: diagnostische gates ontbreken; Production
  en beide Preview-overrides niet vanuit de runtime geverifieerd.
- Lokale PostgreSQL onbereikbaar; Docker geeft geen serverversie. Nieuwe
  databaseproeven worden uitgevoerd in de bestaande geïsoleerde PostgreSQL-CI.

## Veiligheidsgrenzen

Geen productiewrites, migratie, privilegewijziging, productie-POST, deployment,
merge, echte mail/betaling/boekhouding of juridische vrijgave. Geen F4/LMS-activering.
De eigen reviewbranch krijgt geen Vercel-deployment zolang Preview-isolatie niet
bewezen is. Main en productieconfiguratie blijven ongemoeid.
