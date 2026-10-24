# WP12 — geïsoleerde LMS-runtimekandidaat

Basis: actuele main `a49b59507139ef7121634705da19f781b17845f0`.
Bron: uitsluitend Learning-delta tussen `5d41fa8` en `b7188eb`, plus de zes
geteste runtime-/testbestanden uit `docs/wp10-learning-runtime-repair.patch` (#59).
Dit is een reviewkandidaat, geen cursusvrijgave.

## Scope en bescherming

- Alleen nieuwe Learning-routes, services, playercomponenten, testfixtures en
  zes bestaande additieve Learning-migraties zijn overgenomen. De 85 bestaande
  main-migraties en authenticatie-/Compliance-implementaties blijven intact.
- Gedeelde integratie is afzonderlijk gecontroleerd: additieve Prisma-relaties,
  Learning-headerlinks, bestaande mailadapter met PDF-bijlagen, testalias en
  bestaande PDFKit-afhankelijkheid voor de reeds ontwikkelde certificaatrenderer.
  Geen oude auth-/bootstrap-/impersonationexperimenten of readonly-arraytestfix.
- Dubbele historische documentatieblokken zijn niet overgenomen.
- `LEARNING_RUNTIME_ENABLED` is server-side, standaard **uit**. Alleen de exacte
  waarde `true` opent de kandidaat. Alle routes/actions lopen door de bestaande
  Better Auth-autorisatie met actuele accountstatus; de gate verleent geen rechten.
- Met de gate uit worden ook de Learning-headerquery, publieke certificaatroute
  en beide mailworkers vóór databasegebruik geblokkeerd. Een app zonder de nieuwe
  Learning-tabellen behoudt daardoor de bestaande header. De maintenance-route
  is bewust ongewijzigd: er is geen automatische Learning-mail/scheduleractivatie.
- Retentionbank blijft DRAFT. Geen vragen, cesuur, betaalflow of juridische status
  gewijzigd. Inhouds-, didactische en certificaatacceptatie blijven afzonderlijk.

## Runtimecorrecties

Start serialiseert op de bestaande User-rij; blokvoortgang op de eigen Enrollment.
Hierdoor leveren zes gelijktijdige starts één inschrijving en zes verschillende
blokupdates consistente voortgang. Alleen een nieuw ingediende geslaagde eindtoets
voltooit de eigen actieve inschrijving. Herhaalde submissions wijzigen die datum
niet; een onvoldoende poging voltooit de cursus niet. Historie wordt niet gebackfilld.

## Tijdelijke PostgreSQL-validatie

`npm run test:db:learning` maakt uitsluitend een nieuwe loopback-testdatabase.
De harness vergelijkt de volledige migratielijst/checksums, herhaalt deploy en seeds,
test v1.0 → v1.1 zonder historieverlies, vervolgens H1–H10, concurrency, consent en
retention met fake mail. De oude expliciete Neon-testtoegang is verwijderd uit
de tests. De lokale testcontroller laat geen database achter.

De kandidaat heeft 91 migraties; gecombineerd met F4 zijn het 92. Dit is **geen**
autorisatie om een daarvan op productie uit te voeren. De zes Learning-migraties
zijn ongewijzigd overgenomen; registratievolgorde wordt door Prisma bepaald.

## Vrijgave en rollback

De kandidaat blijft Draft en de runtimegate blijft uit. Nodig vóór latere activatie:
gerichte review van deze port, volledige playerbrowseracceptatie, inhouds-/toetsreview,
certificaatprivacy en afzonderlijk goedgekeurde migratie-/seed-/mailprocedure.
Een productiepreflight moet de dan actuele historie, checksums en herstelroute
verifiëren; geen reset of resolve. Rollback: gate uit en vorige appversie; historische
enrollments, examens, snapshots en migratieregistraties blijven behouden.

## WP12-testresultaten (24 oktober 2026)

- Afzonderlijke kandidaat: 219 unit-/componenttests PASS; 14 PostgreSQL-cases
  bewust overgeslagen in deze unitrun en afzonderlijk met de echte database getest.
- Volledige lint PASS; productiebuild PASS. Standalone TypeScript: uitsluitend
  de vier bestaande TS2345 readonly-arrayfouten in `rule-engine.test.ts`.
- Gecombineerd met #40, #49 en #52–#58: 1.565 tests PASS, 14 databasecases in
  de unitrun overgeslagen; alle acht PostgreSQL-suites PASS, inclusief Learning.
- De echte Learning-harness valideert de gecombineerde 92 migraties/checksums,
  herhaalde deploy/seeds, v1.0/v1.1-examenhistorie, de tienhoofdstukkenketen,
  zes gelijktijdige starts/voortgangsupdates, eindtoets, certificaat en retention.
  De certificaatretentietest vraagt nu eerst via de normale service een certificaat
  aan voor de nieuwe synthetische geslaagde deelnemer; geen productregel versoepeld.
- Alle speciaal aangemaakte testdatabases verwijderd; bestaande database- en
  rolidentiteiten behouden. Geen productieverbinding of echte mail/betaling.
- De 85 migratieblobs op main zijn ongewijzigd. Windows-checkouts kunnen CRLF
  gebruiken; de harness vergelijkt checksums met de daadwerkelijk uitgevoerde
  bestanden. De zes nieuwe migratieblobs zijn gelijk aan de gereviewde bron.

Dit bewijst technische isolatie en integriteit, geen volledige playerbrowser-,
didactische of juridische acceptatie. De actuele productie-dependency-audit heeft
dezelfde 22 bevindingen als main (1 critical, 14 high, 7 moderate); de kandidaat
voegt geen nieuw gemeld kwetsbaar pakket toe. Afzonderlijke securitybeoordeling blijft nodig.

Definitieve gecombineerde resultaten en mergevolgorde: `docs/wp12-integration-readiness.md`
in het bewijs- en rapportagepakket van PR #59.
