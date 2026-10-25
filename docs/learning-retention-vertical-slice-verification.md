# WL-001 kennisbehoud v1 — verticale flowverificatie

**Status:** `WL-001 KNOWLEDGE RETENTION v1 — TECHNICALLY IMPLEMENTED PROTOTYPE`. Geen production-ready-claim. R001–R100 blijven DRAFT; de programmaversie is niet actief of gepubliceerd voor studenten. Verificatie uitgevoerd op 30-09-2026 vanaf start-HEAD `6095114089baa551e58c5e03a8260327444956d4`.

## Flowdekking

| Flow | Code-aanwezig | Database-/browser-runtime | Notitie |
| --- | --- | --- | --- |
| Eligibility + expliciete wekelijkse consent | Ja | Database niet getest; browser niet getest | Server controleert eigen WL-001-enrollment, voltooide H1–H10 en geslaagde eindtoets. Checkbox staat niet vooraf aan. |
| Afzonderlijke jaarherinneringconsent | Ja | Database niet getest; browser niet getest | Los van retentiedeelnametoggle; berekend vanaf eerste geslaagde eindtoets op kalenderjaarbasis. |
| Participation / status / stoppen | Ja | Database niet getest | Idempotente deelname; STOPPED blokkeert nieuwe antwoorden en uitgaande weekmail. Eerdere historie blijft read-only. |
| Vaste weekchecks, precies vijf vragen | Ja | Database niet getest | Lazy ensure op route/maintenance, immutable assignments, idempotency via unieke participation/week-sleutel. |
| Vraagplayer, directe feedback en multi-select | Ja | Component-semantiektest; browser niet getest | Eén vraag per scherm, native radio/checkbox, expliciete multi-instructie, feedback na definitief serverantwoord. |
| Antwoordownership, membership en secrecy | Ja | Domain-/readmodeltests; PostgreSQL niet getest | Server leest uitsluitend aan eigen check toegewezen vraag; correcte antwoorden blijven verborgen vóór definitieve beantwoording. |
| Resume, afronding en resultaat | Ja | In-memory orchestratietest; PostgreSQL/browser niet getest | Readmodel herstelt feedback en eerste open positie; score is X/5 zonder cesuur. |
| Adaptieve week 2 | Ja | Selector-/orchestratietests; PostgreSQL niet getest | Eerste geslaagde examattempt en eerdere retentionantwoorden leveren server-side knowledge-area-signalen. |
| Jaarcheck: tien vragen uit H1–H10 | Ja | Selector-/policytests; PostgreSQL/browser niet getest | Bestaande jaarservice slaat set/antwoorden op en toont resultaat/hoofdstuklinks. |
| Scheduler-/outboxhook | Ja | Niet tegen database of provider uitgevoerd | `runLearningRetentionMaintenance` maakt checks/jaarintents; losse worker verwerkt alleen de twee retentiontemplates. Niets is gekoppeld aan of geactiveerd in productieplanning. |

## Testresultaten

- Gerichte retentie/content/policy/selector/email/UI-set: **8 bestanden, 47 tests geslaagd**. Daarvan testen 6 de wekelijkse framework-onafhankelijke orchestration, 4 de jaarlijkse consentservice met een Prisma-fake, 3 UI/semantiek, 2 mailcopy; de overige 32 testen bankinhoud, policy/publication en selectors.
- Volledige Vitest-suite (`--configLoader native --pool=forks --maxWorkers=4`): **332 testbestanden, 322 geslaagd, 7 gefaald, 3 overgeslagen**; **2.082 tests, 2.055 geslaagd, 7 gefaald, 20 overgeslagen**. De 7 failures zijn in public content, assignments, finance en public-intake. Dit zijn dezelfde niet-retentiefailuregroepen als in de vorige bekende suitebaseline; de suite liet geen retentie-/Learningfailure zien. De `.mjs` dispatchfile is geen Vitest-suite; apart uitgevoerd met `node:test`: **10 geslaagd, 0 gefaald**.
- `npm run lint`: PASS.
- `npx tsc --noEmit --incremental false`: PASS. Prisma Generate kon de bestaande lokale generated client niet herschrijven door Windows-EPERM; de succesvolle typecheck draaide tegen de aanwezige lokale generated types. Geen generated client-bestand is toegevoegd aan Git.
- `npm run db:validate`: PASS met syntactische, niet-bereikbare placeholder-URL; dit is geen databaseverbinding. In deze worktree staan 87 migratiemapjes, waaronder de oorspronkelijke retentionmigratie en de forward-only policycorrectie; aantal applied/pending/failed is NOT TESTED.
- `git diff --check`: PASS (Git meldde alleen LF→CRLF-waarschuwingen op bestaande gewijzigde tekstbestanden).
- `npm run build`: niet gestart voorbij Prisma Generate door `EPERM` bij unlink van `src/generated/prisma/browser.ts`. Rechtstreekse `npx next build` met host `example.invalid` stopte bij `EPERM` op `.next/trace-build`, vóór compile-/static-generationresultaat.
- Migration status, fresh/upgrade-migratieketen, seed-idempotentie, Prisma transactie-/runtimegedrag: niet getest wegens geen `DATABASE_URL` of geïsoleerde PostgreSQL. Geen migraties of seeds uitgevoerd.

## Acceptatiestatus

- `DATABASE RUNTIME NOT TESTED — ENVIRONMENT LIMITATION`: zonder `DATABASE_URL` of veilige geïsoleerde PostgreSQL-runtime zijn migratieketen, constraints/triggers, participation- en WeeklyCheck-persistentie, antwoorden, concurrency, outbox/schedulerpersistentie, jaarcheckpersistentie en seed-idempotentie niet tegen PostgreSQL bewezen. De genoemde service-, policy- en in-memorytests bewijzen alleen de daarin geteste applicatielogica.
- `BROWSER ACCEPTANCE: NOT TESTED — TOOLING LIMITATION`: opt-in, consentcopy, Mijn e-learnings, weekoverzicht, vijfvragenplayer, feedback, resume, stoppen, jaaropt-in/-check, responsive weergave en keyboard/focus/zoom/reflow zijn niet browsermatig bevestigd. Er is geen account aangemaakt.
- `PRODUCTION BUILD: NOT COMPLETED — ENVIRONMENT LIMITATION`: `npm run build` stopte bij Prisma Generate met Windows-EPERM bij `src/generated/prisma/browser.ts`; een directe `npx next build` stopte met Windows-EPERM op `.next/trace-build`, vóór compile/static generation. Er is geen retentioncompilefout aangetoond.
- Accessibility is niet formeel gevalideerd. Geen WCAG-conformiteitsclaim; keyboard-only, focus, 390×844, 500×900, desktop, 200/400% zoom/reflow en screenreader blijven open.
- Geen echte e-mail verzonden, geen productieprovider/cron/scheduler geactiveerd en geen deployment uitgevoerd.
- Content blijft onder `CONTENT REVIEW REQUIRED — LEGAL` voor gemarkeerde items; `ASSESSMENT/LEARNING VALIDATION REQUIRED` blijft open voor studentvalidatie.
- De prototypecode bevat een wekelijkse verticale flow en afzonderlijke jaarflow; hun PostgreSQL-persistentie, scheduling- en outboxgedrag zijn niet runtime-bewezen. R001–R100 zijn niet ge-seed/gepubliceerd en de programmaversie blijft inactief voor echte studenten.

## Open acceptatie

- `DATABASE RUNTIME NOT TESTED — ENVIRONMENT LIMITATION`: er was geen veilige geïsoleerde PostgreSQL-verbinding. Geen migraties, seeds of gedeelde datawijzigingen uitgevoerd.
- `BROWSER ACCEPTANCE: NOT TESTED — TOOLING LIMITATION`: geen bestaande ingelogde browsersessie beschikbaar. Geen account gemaakt en geen voorwaarden namens een gebruiker geaccepteerd.
- Geen echte e-mail, production scheduler, deployment of gedeelde publicatie uitgevoerd.
- R001–R100 blijven DRAFT; studenten hebben geen toegang tot de retentiebank. Geen WCAG 2.2 A/AA-conformiteitsclaim; keyboard/responsive/screenreaderreview blijft open.
- Juridisch gevoelige items: `CONTENT REVIEW REQUIRED — LEGAL`; daarnaast `ASSESSMENT/LEARNING VALIDATION REQUIRED` voor inhoudelijke en studentvalidatie.
