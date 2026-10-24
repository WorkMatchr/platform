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

Definitieve testresultaten en mergevolgorde staan in het integrale WP12-rapport.
