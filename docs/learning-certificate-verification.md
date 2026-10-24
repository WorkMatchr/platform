# WL-001 certificaat van afronding — verificatie

**Implementatiestatus:** `TECHNICALLY IMPLEMENTED PROTOTYPE`; nog geen production-ready acceptatie. Verificatie is uitgevoerd op branch `codex/learning-vertical-slice-current`, start-HEAD `8e87e09d63c785d428d915945d65c37a04fcaf2b`.

## Architectuur en datamodel

De additieve migratie `20260929100000_add_learning_certificates` introduceert `LearningCertificate`, profielvelden voor voor- en achternaam, uniciteitsconstraints en databaseguards. De service selecteert de eerste chronologische geslaagde WL-001-examenpoging, controleert H1–H10-completion en slaat een immutable snapshot op van naam, cursus, CourseVersion, ExamVersion, examenpoging, templateversie, certificaatnummer en behaaldatum (`submittedAt`). De databaseguard valideert bovendien de bronversies en weigert een later geslaagde poging als er een eerdere pass bestaat. `templateVersion` is `WL-001-CERT-1.0`; de PDF-renderer weigert onbekende templateversies in plaats van ze met de actuele template te renderen. Een toekomstige templatewijziging moet een eigen renderer behouden/toevoegen. Een uniek certificaat per gebruiker/cursus en een cryptografisch willekeurige 96-bit code borgen idempotentie en publieke code-uniciteit; herhaalde issuance retourneert het bestaande record. De code bevat geen accountgegevens.

## PDF, QR en publieke verificatie

De server genereert met `pdf-lib` één A4-landscape-pagina met het bestaande WorkMatchr-logo, naam, opleiding, datum, omvang, uitgever, certificaatnummer, disclaimer en QR. De QR bevat uitsluitend de HTTPS-verificatielink met publieke code. De PDF bevat geen score of e-mailadres. De lange-naamtest gebruikt `Johannes Cornelis van den Berg-Smit`; PDF-parsing bevestigt dat de volledige naam en belangrijkste inhoud aanwezig zijn en dat er één pagina met A4-landscape-afmetingen is. Deze test is programmatisch; een visuele PDF-renderreview is niet uitgevoerd.

De disclaimer in de PDF is exact:

> Dit certificaat bevestigt de succesvolle afronding van de WorkMatchr-opleiding ‘RI&E in de praktijk’ en de bijbehorende eindtoets. Het certificaat is geen bewijs van certificering als arbokerndeskundige en verleent geen wettelijke beroepskwalificatie of bevoegdheid tot formele toetsing van een RI&E.

De download vereist een geauthenticeerde eigenaar. De publieke noindex-route toont uitsluitend geldigheidsstatus, naam, opleiding, behaaldatum, uitgever en certificaatnummer; er is geen directory. `REVOKED` wordt door het publieke model als status doorgegeven en de pagina toont “Dit certificaat is niet geldig”; de servicetest controleert dat de readmodel-selectie geen e-mail, score of interne IDs bevat. HTTP-routeweergave is niet browsermatig getest.

## E-mail en outbox

De eerste issuance schrijft in dezelfde transactie één idempotente intent naar de bestaande `NotificationOutbox`. De bestaande beveiligde `POST /api/maintenance/marketplace`-route kan deze intents verwerken via de bestaande Resend-adapter. De worker vereist een actieve gebruiker en geverifieerd e-mailadres, maakt de PDF opnieuw uit de certificaatsnapshot, voegt die toe als `application/pdf` en gebruikt de outbox-idempotency key ook bij de provider. Er is een interne limiet van **20 MiB ruwe PDF-bytes**; de grens en overschrijding worden met numerieke grenswaarden getest, zonder grote buffers te genereren. Een te grote attachment faalt gesloten met `CERTIFICATE_ATTACHMENT_TOO_LARGE`.

Mailcopy gebruikt “WorkMatchr-opleiding” en “certificaat van afronding”. Kennisbehoudcopy zegt dat aanmelden mogelijk is als het vrijwillige programma beschikbaar komt; er volgt geen automatische inschrijving of toestemmingsinferentie. Iedere toekomstige mail is alleen na eigen keuze. De mailtemplate-test controleert onderwerp, copy, HTML-escaping, PDF-mimetype/filename/attachment, certificaatnummer en afwezigheid van score/werkgever/poginggegevens. Een PDF via de worker is unit-tested via de attachmentconstructie; database-outboxtrigger, volledige worker-delivery en retry zijn niet runtime-geaccepteerd.

**Geen echte certificaatmail verzonden. Geen productieprovider aangeroepen. Geen productiecron geactiveerd. Geen scheduler gedeployed.** De bestaande onderhoudsroute is alleen een hook; operationele planning blijft voor release.

## Verificatie per onderdeel

- **Certificate/PDF/mail/service/private-download gerichte run, 2026-09-30:** `npx vitest run --configLoader runner src/lib/learning/learning-certificate-service.test.ts src/lib/learning/learning-certificate-pdf.test.ts src/lib/learning/learning-certificate-email.test.ts src/lib/learning/learning-final-exam-runtime.integration.test.ts src/app/api/maintenance/marketplace/route.test.ts src/lib/email.test.ts 'src/app/api/learning/certificates/[certificateId]/pdf/route.test.ts'` — 6 testbestanden PASS, 1 database-runtimebestand SKIPPED; 33 tests PASS, 1 SKIPPED, 0 FAIL. De skip is de PostgreSQL Learning/exam runtime-integratie omdat geen geïsoleerde `LEARNING_TEST_DATABASE_URL` beschikbaar is.
- **Outbox intent:** issuance-servicecode schrijft certificate-issued intent transactioneel en gebruikt een unieke idempotency key. PostgreSQL-integratie van “exact één intent na eerste pass, geen extra intent op herhaalacties” is **NOT TESTED — ENVIRONMENT LIMITATION**. PDF-download, paginaweergave en Mijn e-learnings triggeren geen issuance in de geïnspecteerde routecode; dit is code review, niet runtime/browserbewijs.
- **Revoked/public readmodel:** service-unittest PASS voor revoked-recordselectie en code-normalisatie; browserweergave NOT TESTED.
- **PDF:** geautomatiseerde parser-test PASS voor 1 pagina, A4 landscape, metadata, lange naam, opleiding, certificaatcode, afbeeldingsobject/QR-aanwezigheid, disclaimerinhoud en ontbreken van e-mail/score. QR-afbeeldingsinhoud niet met een decoder uitgelezen; visuele PDF-review NOT TESTED.
- **Mail:** fake/mocktests PASS; geen echte provider aangeroepen. `ops/marketplace-notifications/dispatch.test.mjs` met `node --test`: 10 PASS, 0 FAIL.
- **Lint:** eerdere volledige `npm run lint` PASS. De nieuwe volledige run gaf binnen deze verificatie geen output en is afgebroken; gerichte `npx eslint` op alle gewijzigde certificaat-/mailbestanden PASS na de codewijzigingen.
- **Typecheck:** laatste `npx tsc --noEmit --incremental false --pretty false` PASS na de templateversieguard en private-downloadtest; de Windows-run duurde enkele minuten.
- **Prisma validate:** PASS met niet-verbindende placeholder-URL; geen verbinding gemaakt.
- **Migratiebestand:** handmatig nagezien als additief certificaat-DDL. Fresh-chain, upgradepad, PostgreSQL-constraints/triggers en werkelijke migrate status **NOT TESTED — ENVIRONMENT LIMITATION**; geen migratie is uitgevoerd.
- **Gedeelde ontwikkel-DB:** `CERTIFICATE MIGRATION PENDING — NOT APPLIED` (status niet tegen PostgreSQL geverifieerd; migratie bewust niet toegepast).
- **Production build:** `ENVIRONMENT BLOCKED`. Eerdere `npm run build` eindigde op Windows `EPERM` tijdens Prisma generate (`unlink src/generated/prisma/client.ts`); directe `npx next build` eindigde op `EPERM` bij `.next/trace`. Procesinventarisatie was `Access denied`; geen processen beëindigd of gegenereerde bestanden verwijderd. Geen certificate compile error vastgesteld vóór blokkade.
- **Browseracceptatie:** `NOT TESTED — TOOLING LIMITATION` en geclassificeerd als **NON-BLOCKING PROTOTYPE REVIEW**. Er was geen bestaande ingelogde browsersessie of open tab en localhost was niet bereikbaar. Daarom zijn kaart/download, actieve en revoked verificatiepagina, QR-route, responsive 1280×900/390×844/500×900, browserconsole/server-500's en lange naam in de browser niet bevestigd. Geen account gemaakt, geen voorwaarden geaccepteerd en geen echte mail verzonden.
- **Volledige suite, 2026-09-30 (322 bestanden op dat moment; latere private-download- en templateguard-tests zijn gericht geslaagd):** `npm test -- --pool=forks --maxWorkers=4 --configLoader runner` — 311 PASS, 8 FAIL, 3 SKIPPED; 2.027 tests: 1.999 PASS, 8 FAIL, 20 SKIPPED. Geen certificaatfailure aangetroffen. Zeven failures zijn de eerder bekende niet-Learning-groepen: public-content woordlimiet (1), public-intake source/guidance (2), assignment-query mocks/data (2), subscription-cancellation datumverwachting (2). De achtste is een ongewijzigde financiële factuur-PDF-test die 6,773 seconden nodig had tegenover de 5 seconden timeout; ook afzonderlijk faalde alleen die test met timeout. Geclassificeerd als **ENVIRONMENT/TIMEOUT — unrelated test**, niet als certificaatregressie. Het `node:test`-bestand heeft geen Vitest-suite maar slaagde apart met 10/10; een database-afhankelijke suite heeft geen `DATABASE_URL`. Historische baselinevergelijking van alle failures is niet opnieuw uitgevoerd.
- **Geen echte mail / productieplanning:** bevestigd; productiebezorging `NOT ACTIVATED — BY DESIGN`.

## Product- en privacyreview

De publieke verificatie is beperkt tot de gegevens die nodig zijn om echtheid te controleren en toont geen e-mail, organisatie, score, pogingen of interne IDs. De certificaatcopy bevestigt afronding van de opleiding en eindtoets, zonder erkende opleiding, wettelijke bevoegdheid, geldigheidsduur of beroepskwalificatie te claimen. De template-identiteit is `WL-001-CERT-1.0`; nieuwe template-inhoud moet een nieuwe templateversie krijgen zodat historische snapshots niet stilzwijgend wijzigen. PDF en e-mail worden uit dezelfde certificaatsnapshot opgebouwd. Productiestatus blijft afhankelijk van database-runtime, build, browserreview en outboxoperatie.

## Openstaande punten

- geïsoleerde PostgreSQL fresh-chain/upgrade- en runtime-invarianttests;
- daadwerkelijke outboxissuance/retry-integratie tegen geïsoleerde PostgreSQL;
- production build opnieuw na oplossen van de aangetoonde Windows-bestandslock;
- browser-, mobiele-, keyboard- en visuele PDF-review;
- QR decode-verificatie;
- deploymentfase moet later de bestaande outboxconsumer veilig plannen; geen productiecron in deze fase;
- integrale juridische/contentreview van WL-001 en pilotvalidatie blijven afzonderlijke acceptatiepunten.

De certificaatmigratie is **niet** toegepast, geen echte e-mail verzonden, niet gemerged en niet gedeployed. Definitieve Git-status en commit-SHA staan in het opleverrapport.
