# LMS 2.0 — geïntegreerde releasekandidaat

Datum oorspronkelijke acceptatie: 4 november 2026. Publicatievoorbereiding: 5 november 2026; zie [definitieve releasechecklist](academy-20-publication-checklist.md). Status: **reviewkandidaat; geen productie- of mergevrijgave**.
Branch: `codex/lms-20-platform-release`. Alle nieuwe browser- en databasebewijzen gebruiken uitsluitend synthetische gegevens. Geen productie, providerbetaling, mail of inhoudelijke cursusvrijgave uitgevoerd.

## Herkomst en scope

Basis is opgehaalde main `9f22a67a7308b971b84b3c70bbcd09cebe37221a` (inclusief PR #89). Academy-lijn: geïntegreerde RC `f83784fc`, latere acceptatie `41c24be`, meest recente lokale releasebron `1aeb12b1668b53c5253b18bb55c7177c6d9ce6ac`, gemeenschappelijke basis `3ccd76cbae94c63d779983accbed81e3636a881e`. Een afzonderlijke actuele remote Academy-repository is niet aangetroffen. Daarom is de aantoonbare lokale lineage gebruikt, niet een verzonnen nieuwere implementatie.

| Klasse | Bevinding en verwerking |
|---|---|
| A — al in Academy | Generieke cursusidentiteit, vragenbankbeheer, examens, certificaten, commerce, prijsversies, kortingsregels, seats, bezwaar/correctie, kennisbehoud en migratieguards. |
| B — al in platform | Better Auth, organisatie-/platformrechten, basis-LMS, financiële verwerking, facturen, outbox, gesloten runtimegate en bestaande publieke informatiepagina’s. |
| C — geïntegreerd | Nieuwste Academy-bronwijzigingen voor runtime, beheer, commerce en twaalf aanvullende migraties; bestaande platformconcurrency en authenticatie behouden. |
| D — nieuw aangevuld | Cursusauthoring met hoofdstukken/lessen/vragen, gecontroleerde publicatie, eigen catalogus, private media, variabele aantallen en cesuur, herkansingslimiet, beheerdersintrekking. |
| E — acceptatie/activering | Cursusinhoud, juridische en fiscale voorwaarden, productieproviders/private mediastore, migratieautorisatie en toegankelijkheidsacceptatie. |

De algemene registratieflow, `src/lib/auth.ts`, privacy- en voorwaardenpagina’s zijn uit main behouden. Ongebruikte geïmporteerde registratie-UI en de daarop gerichte tests zijn niet opgenomen. Bestaande juridische bewijsmodellen blijven beschikbaar voor de gesloten Academy-commerce. Er is geen tweede authenticatie- of financieel systeem gemaakt. F3, F4 en contactbeslisregels zijn niet vervangen.

## Geïntegreerde functionaliteit

- `/platformbeheer/academy/cursussen`: titel, omschrijving, categorie, niveau, afbeelding, versie, studieduur per hoofdstuk, ordenbare hoofdstukken en lessen, tekst/afbeelding, hoofdstukchecks, examenvragen, antwoorden/toelichtingen, cesuur, pogingenlimiet, preview, deelnemers/resultaten en archivering.
- Workflow: Concept → Review → Goedgekeurd → Gepubliceerd → Gearchiveerd. Revisiecontrole en serialiseerbare transacties voorkomen concurrerende overschrijving. Review bindt SHA-256 aan de genormaliseerde vragen, opties, lessen en exameninstellingen; afwijkende opslag of ontbrekende media blokkeert publicatie. Reviewer, tijdstip en reden worden vastgelegd. Menselijke inhoudelijke review is niet door deze technische test vervangen.
- Gepubliceerde inhoud wordt niet in-place herschreven. Nieuwe inhoud vereist een nieuwe cursusversie. Oude inschrijvingen/resultaten blijven versiegebonden. De oorspronkelijke v1- en certificaatcontracten blijven ondersteund.
- Catalogus toont ook nog niet ingeschreven gepubliceerde cursussen. De bestaande sandbox-commerce regelt prijsversies, gratis/betaalde inschrijving, seats, factuur/outbox, annulering en gecontroleerde refunds.
- Voortgang en serverbeoordeling behouden eigenaarscontrole. Expliciete cursusstart gebruikt de eigen inschrijving en cursusversie; verlopen toegang wordt geweigerd. Aantallen hoofdstukken en examenvragen zijn niet meer vast op 10/50 voor nieuwe cursussen.
- Eén certificaat per geslaagde poging/inschrijvingscontext, PDF met cursusversie en QR, eigen overzicht, beheerdersoverzicht en controleerbare intrekking. De intrekking gebruikt het bestaande reviewmodel met de echte operatoridentiteit; oorspronkelijke resultaten en certificaatsnapshot blijven behouden.

## Media en concrete beperking

Media gebruikt dezelfde applicatie en bestaande Blob-library. Alleen content-gehashte lokale paden; geen willekeurige externe embeds. Afbeeldingen worden opnieuw gecodeerd. Product Owner-besluit: Academy biedt geen video. De editor, uploadvalidatie en lesweergave ondersteunen daarom uitsluitend tekst en afbeeldingen naast kennisvragen, eindtoetsen en certificaten. Upload verlangt bevoegde actieve operator, juiste origin en begrensde payload. Lezen verlangt geldige inschrijving of beheerrecht; private responses zijn `no-store`. Publicatie controleert opgeslagen bytes en checksums.

**De veilige route accepteert maximaal 3 MiB per afbeelding.** PNG/JPEG/WebP worden veilig opnieuw gecodeerd naar WebP; MP4, WebM en VTT worden geweigerd. Video-upload, streaming, ondertiteling en videoacceptatie zijn geen releasecriteria. De bestaande private Blob-configuratie moet afzonderlijk voor de productieomgeving worden geaccepteerd; er is geen betaalde opslag aangezet. Op 5 november is een synthetische afbeelding via de echte lokale browsereditor geüpload, opgeslagen, opnieuw geopend en met tekstalternatief weergegeven.

Het bestaande VIDEO-enum in migratie 108 blijft ongewijzigd voor migratiehistoriecompatibiliteit. Het is geen vrijgegeven contenttype; authoringvalidatie weigert nieuwe videolessen. Er zijn geen historische cursusgegevens verwijderd.

## Migraties

Main: 95 migraties. Kandidaat: **109** = 95 + 12 overgenomen + 2 nieuwe additieve migraties. Geen bestaande main-migratie gewijzigd of handmatig geregistreerd.

- `20261104180000_add_learning_authoring_media`: VIDEO-contenttype en generieke hoofdstukgrens voor vragen.
- `20261104190000_allow_operator_certificate_review`: beperkte uitbreiding van de bestaande review-contexttrigger. Alleen een actieve, geverifieerde platformbeheerder met actieve OWNER/ADMIN-platformmembership kan voor een ander een certificaatfout/fraude-review aanvragen. Alle overige context- en auditguards blijven behouden. Geen algemene triggeruitschakeling.

Alle veertien toevoegingen en SHA-256-checksums staan in `lms-20-migration-manifest.json`. De bestaande productieaanduiding **85 migraties** komt uit het eerder geverifieerde dossier; in deze opdracht is productie niet opnieuw benaderd. Naar deze kandidaat zouden dan 24 migraties ontbreken. Dat is geen uitvoeringsautorisatie. Het geparkeerde hersteltraject blijft een productievoorwaarde.

Lokaal bewezen: schone opbouw van 108 migraties en vervolgens de nieuwe operatorcorrectie tot 109; afzonderlijk main-95 → 108 → 109. Beide databases eindigen met **109 geslaagd, 0 onafgemaakt/mislukt**, exact de migratienamen/checksums uit de worktree. Herhaald deploy na migratie 109 meldde geen pending migraties. De nieuwe correctie is op beide eigen testdatabases uitgevoerd. Het manifest onderscheidt Git-LF-checksums van de daadwerkelijk geteste Windows-bytes (CRLF waar aanwezig); deze byteverschillen zijn geen SQL-wijziging. Voor een uitvoeringspreflight moet de checksum van het werkelijk gebruikte artifact worden vergeleken; bestaande migratiegeschiedenis wordt niet herschreven. Geen bestaande lokale databases aangeraakt. Na afloop zijn de eigen testcontainer, beide testdatabases, alle synthetische accounts/sessies en het eigen volume verwijderd. De 3 bestaande containers en 27 bestaande volumes zijn behouden. De tijdelijke databasecredential en eigen QR-/migratiestagingtools zijn verwijderd. Eén gedownload synthetisch certificaat-PDF blijft buiten Git staan omdat een ander proces het bestand vasthoudt; dat proces is niet beëindigd.

## Actuele tests

- Gerichte LMS-, finance-, credits- en beheernavigatieregressies: **1.014 PASS, 0 FAIL, 84 overgeslagen**. De overgeslagen omgevingsgebonden suites zijn geen nieuw bewijs.
- Aanvullende gewijzigde authenticatie-, integratie-, lokale-mail- en beheercontroles: **142 PASS, 0 FAIL, 3 overgeslagen**.
- Nieuwe PostgreSQL-authoringacceptatie: **4 PASS**; exacte migratiechecksums, onbevoegde authoring, stale/concurrerende revisies, review/contentdrift, immutable historie, echte start-/les-/antwoord-/afrondingsacties, verlopen toegang, gezakt zonder certificaat, gelijktijdig inleveren, precies één certificaat, herkansingslimiet, eigenaarsisolatie, intrekking/idempotentie en directe databaseweigering van onbevoegde operatorreviews.
- Bestaande commerce-PostgreSQL-suite op deze geïsoleerde PG18-configuratie: **2 PASS** voor 1 en 5 plaatsen, mockbetaling, dubbele providerstatus, factuur/outbox, seattoegang, onbevoegde refund en herhaalde refund. Fixtures worden teruggerold. Geen Mollie/Resend-verkeer.
- Gesloten authoring-routes: **2 PASS**; geen databasequery wanneer de gate uitstaat. Herkansingsweergave: **5 PASS**; limiet inclusief afgebroken pogingen, hervatten en onbeperkt beleid. De pagina biedt geen nieuwe poging meer aan wanneer de serverlimiet is bereikt.
- Media/admin-unitrun: 47 PASS (deels overlappend met de bovenstaande regressies; niet optellen als onafhankelijke dekking).
- Lint: 0 errors, 4 bestaande waarschuwingen over `window.location.assign` in authcomponenten.
- Standalone TypeScript: PASS. Productiebuild: PASS, ook na de finale gate- en herkansingscorrecties. Een buildherhaling miste eerst de Prisma-configuratievariabele; met een niet-werkende lokale buildplaceholder slaagde deze, zonder databaseverbinding.
- Lokale productiebuild met gesloten gates: homepage, opdrachtstart en Compliance-scan HTTP 200; de gesloten Academy-routes bevatten geen synthetische cursusgegevens of `LEARNING_DISABLED`-uitzondering (Next-streaming retourneert HTTP 200). De daadwerkelijke gate vóór databasegebruik is aanvullend met de twee gerichte routetests bewezen; deze HTTP-controle geldt niet als nieuwe ingelogde browseracceptatie. De eerste lokale serverstart zonder synthetische authsleutel werd terecht geweigerd; de controle is met een tijdelijke procesgebonden testsleutel herhaald.
- Diff- en secretscontrole: uitgevoerd; gevonden verbindingsstrings zijn expliciete testfixtures. Geïmporteerde infrastructuuridentiteiten zijn vervangen door niet-routeerbare fixtures. Geen secretbestanden of testwachtwoorden in Git.

Historisch Academy-bewijs (3.855 geslaagde tests, 92 skips, 34 PG-tests, keten van 105) is hergebruikt als achtergrond bij ongewijzigde onderdelen, niet als nieuwe acceptatie van deze branch.

## Echte browseracceptatie

Uitgevoerd op de eigen lokale server, met echte Better Auth-sessies van synthetische beheerder en deelnemer:

1. Beheerder maakt WL-991 aan, configureert les/kennischeck/examen, legt review en goedkeuring vast en publiceert uitsluitend in de testdatabase.
2. Cursusprijs €0 via beheer; deelnemer ziet de cursus in het aanbod en schrijft zich in via de bestaande gratis sandboxflow. Order en seat worden actief, zonder providerbetaling/mail.
3. Les vooruit met toetsenbord, hoofdstukcheck, 50% voortgang na herladen behouden, hoofdstukafronding.
4. Eerste poging 0%: geen certificaat. Tweede poging 100%: certificaatdownload, overzicht en lokale publieke verificatie.
5. PDF daadwerkelijk gedownload en met Poppler gerenderd: één leesbare A4-pagina, getagd, geen JavaScript, cursusversie zichtbaar. QR werkelijk gedecodeerd naar de canonical certificaatroute. De lokale testidentiteit is niet in productie geregistreerd; de productie-URL is niet als geldig testcertificaat gepubliceerd/gecontroleerd.
6. Beheerder ziet het certificaat, trekt het met reden/bevestiging in; publieke lokale verificatie wordt ongeldig en downloadactie verdwijnt. Uitloggen en daarna afgeschermde resultaatroute geeft inloggen, geen resultaatgegevens.
7. Desktop en mobiel 390×844 bekeken; mobiel resultaat zonder afgesneden CTA. Toetsenbordactie/focus en toegankelijkheidsboom gecontroleerd; geen consoleerrors in de laatste browserronde.

Niet bewezen: echte 200%-browserzoom, bediening met een zelfstandige schermlezer, volledige PDF/UA-conformiteit, (op 4 november) browserupload van afbeeldingen, volledige WL-001/WL-002-inhoud. Synthetische servicechecks vervangen deze niet.

Screenshots: `evidence/lms20/mobile-result.jpg`, `evidence/lms20/admin-revoked.jpg`, `evidence/lms20/certificate.png` (uitsluitend synthetisch).

## Scorecard

PASS betekent hier lokaal technisch bewezen voor de beschreven scope, niet inhoudelijk of juridisch goedgekeurd.

| Onderdeel | Technisch | Browseracceptatie | Productiegereed |
|---|---|---|---|
| Academy-beheer | PASS | PASS kernroute | NO — migraties/gates |
| Cursusbeheer | PASS | PASS aanmaak/review | NO — inhoudsacceptatie |
| Hoofdstukken en lessen | BEPERKT — media 3 MiB | Tekst/check PASS; media OPEN | NO — mediavoorziening |
| Studievoortgang | PASS | PASS herladen/afronden | NO — migraties |
| Vragenbank | PASS | PASS nieuwe vragen/antwoorden | NO — inhoudsreview |
| Eindtoets | PASS | PASS gezakt/herkansing/geslaagd | NO — migraties |
| Certificaatgeneratie | PASS | PASS PDF/QR-route | NO — toegankelijkheidsacceptatie |
| Certificatenbeheer | PASS | PASS inzage/intrekking | NO — migratie 109 |
| Cursusprijzen en toegang | PASS sandbox | PASS gratis; betaald mocks | NO — fiscale/provideracceptatie |
| Publicatieworkflow | PASS | PASS synthetische review | NO — geen echte inhoudsvrijgave |
| Platformintegratie | PASS gerichte tests | PASS login/logout; beperkt rollenbereik | NO — integrale PO-acceptatie |
| Databasemigraties | PASS lokaal 109/109 | Niet van toepassing | NO — afzonderlijk migratietraject |

## Releasegrenzen en rollback

LMS, contact en F4 blijven op productie uitgeschakeld. Er is geen deployment gedaan. WL-001 blijft eerste kandidaat na acceptatie, WL-002 Draft, WL-003 afzonderlijke contentontwikkeling. Publicatie van synthetische fixtures geldt niet voor deze cursussen.

Rollback: runtimegate gesloten houden en applicatie terugzetten naar voorafgaande release. Geen migraties terugdraaien of historie verwijderen; additieve tabellen/velden mogen ongebruikt blijven. Nieuwe authoring-/operatorreviewfunctionaliteit vereist eerst de volledige goedgekeurde migratieketen. Databasesnapshot/herstelprocedure en uitvoeringsautorisatie zijn afzonderlijke voorwaarden.

Deze paragraaf beschrijft de oorspronkelijke lokale oplevering van 4 november. De actuele push-, CI- en Draft-PR-status van de geautoriseerde publicatievoorbereiding staat in de nieuwe releasechecklist; geen merge of productiepublicatie is toegestaan. Werkelijke veranderde bestanden staan in `lms-20-change-manifest.txt`; geschoonde testtotalen in `lms-20-test-results.json`. Samenvoegen is nog niet vrijgegeven: media, volledige toegankelijkheid en inhoudelijke acceptatie zijn niet compleet.

Maximaal drie vervolgstappen:
1. Review van deze kandidaat en resterende echte 200%-zoom-, schermlezer- en PDF-toegankelijkheidsacceptatie; video is op besluit van de Product Owner vervallen.
2. Inhoudelijke/fiscale/juridische cursusacceptatie en geïsoleerde provider-/media-acceptatie; geen echte betaling/mail zonder akkoord.
3. Afzonderlijk herstel- en migratievenster autoriseren; pas daarna gecontroleerde featurevrijgave en productieacceptatie.
