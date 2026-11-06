# Academy — contentintegratie en publicatiegereedheid

Status: **concept voor technische en inhoudelijke review**. Geen commerciële publicatie of productievrijgave.

## Basis en scope

- LMS-release: PR #93, `a7c903130771ca8302536ea6df6055b76fe22fd4` (de opvolger van de genoemde `c7e71db`).
- Content: `7434ae2ddb462f8bcdf7ecb567e619ed1c27e82b` gecontroleerd samengevoegd in `codex/academy-content-integration`.
- Main bij nulmeting: `a315db8c7738b8862a92d9f8517b0315e3b14d1f`.
- Geen nieuwe migratie: de bestaande 109 migraties blijven ongewijzigd. Geen overname van de afzonderlijke certificaatontwerper, homepagewerk, privacyconcepten of wijzigingen aan financiële beslisregels.
- De PR wordt gestapeld op de releasebranch van #93. Eerst die release beoordelen; daarna deze integratie opnieuw tegen main controleren. De bestaande WP15/WP16/WP17-afhankelijkheden en productie-/providerholds uit #93 blijven gelden.

## Werkende integratie

De bestaande Academy-authoringservice en de importer gebruiken één gedeelde, transactieve bundelschrijver. De volledige bundel blijft in het bestaande versiegebonden `sourceMetadata` bewaard en wordt naast de daadwerkelijke hoofdstuk-, blok-, vraag-, optie-, examen- en kennisbehoudrecords geverifieerd. Geen tweede CMS of opslagmodel.

De editor heeft afzonderlijke onderdelen voor cursus/certificaat, hoofdstuk/leerdoelen, lessen/praktijkopdrachten, kennisvragen, examenvragen, cesuur/pogingen, kennisbehoud en bronnen. Afbeeldingen gebruiken de bestaande beveiligde upload en inhoudshash; bijschrift en tekstalternatief blijven afzonderlijk behouden. Geen video. Ongeldige invoer blijft zichtbaar en wordt niet opgeslagen. Export/import behoudt ook niet-bewerkte velden. De Server Action-limiet is 2 MB om de volledige bundel te kunnen verwerken.

Bestaande versies zijn alleen-lezen. De beheerder bereidt expliciet een nieuwe versie voor; vraagversies worden opgehoogd en oude inhoud wordt nooit overschreven. Cursuscode en slug blijven identiteit. Cursustitel/beschrijving kunnen vóór eerste publicatie worden aangepast; na publicatie blijft wijziging van deze gedeelde identiteit bewust geblokkeerd omdat de bestaande lezers die identiteit ook voor historie gebruiken. Een latere titelwijziging over gepubliceerde versies vereist een afzonderlijk versiegebonden presentatiebesluit; deze beperking is geen volledige onbeperkte redactievrijgave.

### Bevestigde publicatiefout en herstel

De browser reproduceerde een unique-constraintfout bij publicatie van een tweede examenversie. De bestaande database staat één gepubliceerde cursus- en examenversie per identiteit toe. De overgang archiveert de voorganger nu in dezelfde transactie en legt een minimaal `ACADEMY_VERSION_SUPERSEDED`-event vast. Inhoud, antwoorden, resultaten en certificaten blijven intact.

**Actieve cursisten worden niet stilzwijgend afgesneden:** publicatie van een opvolger wordt geweigerd wanneer een niet-ingetrokken inschrijving op de gepubliceerde voorganger nog geen geslaagde eindtoets heeft of een lopende poging heeft. Hiervoor blijft een expliciet overgangsplan nodig. De bestaande regel dat nieuwe pogingen alleen op een gepubliceerd examen mogen worden gestart is behouden. Een ingetrokken examen wordt niet via een fallback opnieuw actief.

## Cursus- en roundtripintegriteit

| Bundel | Hoofdstukken | Uitleg/lessen | Kenniscontroles | Examen | Kennisbehoud | Minuten incl. examen |
|---|---:|---:|---:|---:|---:|---:|
| WL-001 1.0, behouden bron | 10 | 73 | 214 | 50 | 100 | 300 |
| WL-001 1.1, nieuwe kandidaat | 10 | 73 | 214 | 50 | 100 | 300 |
| WL-002 1.3 | 10 | 60 | 90 | 50 | 100 | 295 |
| WL-003 1.1 | 10 | 60 | 90 | 50 | 100 | 288 |

De oorspronkelijke drie JSON-bestanden blijven byte-ongewijzigd. Semantische roundtrips gebruiken één canonieke SHA-256-strategie; de bestaande registrycontrole accepteert uitsluitend de vastgelegde LF- of CRLF-bytechecksums van dezelfde 109 migratiebestanden. Dit verandert geen migratiechecksum in een database.

De lokale PG18-guard vereist een exacte synthetische loopback-testidentiteit, expliciete lokale testflags en afwezigheid van provider-/productiecontext. De importer weigert een eigenaar/beheerrol: uitsluitend de beperkte applicatierol, zonder schema-CREATE, eigenaarsrechten, superuser of rolbeheer. De migratieregistratie is voor die rol alleen leesbaar. De bestaande remote guards zijn niet versoepeld.

## WL-001: 104 leerdoelen

Zie [Markdown-dekkingsmatrix](academy-content/WL-001-integration-coverage.md) en [JSON-dekkingsmatrix](academy-content/WL-001-integration-coverage.json).

Alle 104 doelen hebben een afzonderlijke beoordeling: 61 bestaande directe reviewvoorstellen, 6 voorgestelde directe verbeteringen, 24 gedeeltelijk en 13 zonder expliciete eindtoetsdekking. Alle menselijke beslisvelden blijven OPEN.

Vier vragen zijn uitsluitend in kandidaat 1.1 aangescherpt: E08 (gevaar/risico), E14 (blootstellingsduur, frequentie en aantal), E19 (STOP-volgorde), E40 (toezicht, verbetering en betrokkenheid). Vijf van de 18 ontbrekende koppelingen en één van de 25 gedeeltelijke koppelingen hebben daarmee een expliciet verbeteringsvoorstel. Overige gaten zijn per doel gemotiveerd; geen kunstmatig volledige dekking. De vaste 50 vragen en hun volgorde blijven reproduceerbaar. Een grotere bank of willekeurige selectie is niet ingevoerd zonder toetskundig besluit.

De bronverwijzingen en toepasselijkheidsnuances, met name RI&E-toetsingsuitzonderingen, vereisen menselijke vakinhoudelijke/juridische acceptatie. Technische broncontrole of een groen testsysteem is geen juridische goedkeuring.

## Acceptatiebewijs

De echte browser gebruikte uitsluitend een lokale server, een nieuwe geïsoleerde PG18-database en tijdelijke `example.invalid`-accounts. De lokale featuregate stond alleen in het eigen serverproces aan. Geen externe mail-, betaal- of provideracties.

| Controle | WL-001 | WL-002 | WL-003 |
|---|---|---|---|
| Beheerder inloggen, openen en hoofdstukken bekijken | PASS | PASS | PASS |
| Hoofdstuktekst en kennisvraagfeedback wijzigen | PASS | PASS | PASS |
| Afbeelding en bijschrift | upload/preview PASS | upload/preview PASS | bekijken/bijschrift PASS |
| Poginglimiet/cesuur opslaan als nieuwe versie | PASS | PASS | PASS |
| Heropenen en gewijzigde inhoud behouden | PASS | PASS | PASS |
| Cursist inloggen, voortgang opslaan en herladen | PASS | PASS | PASS |
| Examen, zakken/herkansen, slagen/certificaat in browser | PASS: 0/50 → 50/50 | PASS: 0/50 → 50/50 | PASS: 0/50 → 50/50 |

Voor alle drie cursussen zijn de 50 antwoorden via echte browserbediening ingeleverd en is de certificaatverificatiepagina als geldig gecontroleerd. Het WL-003-certificaat is daadwerkelijk gedownload en visueel gerenderd: één leesbare A4-pagina zonder overlap of afsnijding; tagged PDF 1.7. Poppler meldde twee ontbrekende lokale fallbackfonts, zonder zichtbaar renderdefect. Dit is geen PDF/UA-conformiteitsbewijs. Na uitloggen zijn nul sessies voor de twee browseraccounts aangetroffen en verwijst de beschermde cursuspagina naar inloggen.

De inschrijvingen zijn synthetische fixtures via het bestaande Prisma-model, geen betaalacceptatie. Na echte browservoortgang/hervatten werden de overige hoofdstukvereisten via de bestaande services voorbereid voor de afzonderlijke browserexamens. Dat fixturewerk wordt niet als volledig browsermatig doorlopen van iedere les gerapporteerd.

Mobiel (390 px), beeldweergave, bereikbaar menu, toetsenbord-Enter en focus op de volgende lestitel gecontroleerd. Geen horizontale overflow in de gemeten editor/cursistweergave. Product Owner bevestigde tijdens deze uitvoering echte **200%-zoom PASS**. Zelfstandige schermlezer- en PDF/UA-eindacceptatie blijft een releasehold uit #93.

## Tests

- Volledige regressies: 4.041 PASS, 110 SKIP, 0 FAIL; 464 bestanden PASS, 23 SKIP. Scheduler afzonderlijk 14/14 PASS.
- Eerste volledige poging had vier tests met een ontbrekende lokale DATABASE_URL-prerequisite; zowel de gerichte vier als de volledige herhaling met lokale configuratie slagen. Geen assertion afgezwakt.
- PostgreSQL 18: 109/109 migraties met exacte historie; beperkte rol en geweigerde DDL/registry-/rolmutaties; 11 gerichte tests voor volledige import, herhaling, verliesvrije versieopslag, autorisatie, rollback, concurrerende dubbele import, examen/retake, certificaatidempotentie, historie en geblokkeerde opvolgpublicatie bij actieve cursisten.
- Ongewijzigde inhoud wordt canoniek vergeleken. Nieuwe cesuur en poginglimiet worden daadwerkelijk in PostgreSQL en de runtime gelezen.
- Finale lint: PASS, nul fouten en vier bestaande authnavigatiewaarschuwingen. TypeScript: PASS, nul fouten. Productiebuild: PASS met uitsluitend drie bestaande Knowledge-tracingwaarschuwingen. Een eerste build zonder synthetische authsecret gaf configuratiemeldingen; de herhaling met uitsluitend lokale testconfiguratie slaagt zonder deze meldingen.
- De door Next gegenereerde typeverwijzingen wijzen naar de productiebuildtypes. Geen wijziging aan authgedrag.
- Diff-check en secrets/private-metadatascan van bestanden én uitgaande commitgeschiedenis: PASS. Geen secrets, productiehosts of testgegevens opgenomen.
- De eerste lint na de browserproef vond twee fouten uitsluitend in eigen tijdelijke diagnosescripts; deze hulpmiddelen zijn verwijderd, de volledige herhaling slaagt.

## Publicatiematrix

| Onderdeel | WL-001 | WL-002 | WL-003 |
|---|---|---|---|
| Volledige conceptinhoud/technische import | PASS | PASS | PASS |
| Verliesvrije editor vóór publicatie | PASS | PASS | PASS |
| Menselijke toetsdekking | OPEN: 13 ontbrekend, 24 gedeeltelijk, 6 voorstellen | OPEN | OPEN |
| Bronnen/juridische/vakinhoudelijke acceptatie | OPEN | OPEN | OPEN |
| Studiebelasting | raming; menselijk bevestigen | raming; menselijk bevestigen | raming; menselijk bevestigen |
| Certificaatclaims | alleen afronding; menselijke acceptatie OPEN | idem | idem |
| Toegankelijkheid | browser/zoom PASS; zelfstandige screenreader/PDF OPEN | idem | idem |
| Privacy/commerciële toegang | bestaande gates en financiële tests behouden; productieacceptatie OPEN | idem | idem |
| Definitieve commerciële publicatie | **NO-GO** | **NO-GO** | **NO-GO** |

Technisch bewijs geeft uitsluitend GO voor review van de geteste integratie. De algemene beperking rond titel-/identiteitswijzigingen ná publicatie en een overgangsplan voor actieve cursisten moeten vóór een daarop gebaseerde release expliciet worden beoordeeld. Geen definitieve inhoudelijke goedkeuring ingevuld.

## Release en rollback

1. Beoordeel #93 en deze gestapelde PR, inclusief de benoemde grenzen; merge niet automatisch.
2. Herhaal alleen gewijzigde integratievoorwaarden na basiswijzigingen. Behoud productie-, financiële, F4- en LMS-gates gesloten.
3. Regel afzonderlijk migratie-/Preview-/media-/provideracceptatie en per cursus een menselijke review van de exacte checksum.
4. Nieuwe versies blijven concept tot de bestaande bevoegde publicatiereview is doorlopen. Een actieve cursistenpopulatie vereist een afzonderlijk veilig overgangsplan.
5. Code-rollback naar de voorafgaande geteste applicatiecommit; geen historische data resetten of migraties terugdraaien. Nieuwe concepten mogen blijven bestaan als alleen-lezen versies. Geen gepubliceerde vragen/resultaten herschrijven.

## Cleanup en resterende voorwaarden

Eigen lokale server gestopt; nul resterende browseraccountsessies geverifieerd. Eigen tijdelijke PostgreSQL-container/volume met alle synthetische accounts verwijderd. Drie bestaande containers en 27 volumes behouden. Lokale testcredentials, fixtures en geüploade testmedia verwijderd; productie- en Preview-gates ongewijzigd. Eén synthetische PDF-download blijft door Acrobat Reader vergrendeld en moet na sluiten van het betreffende document worden verwijderd. Deze bevat alleen de synthetische testnaam, geen echte cursistgegevens.

Remote CI/Preview wordt op de gepushte head gecontroleerd en in de Draft PR geregistreerd. De bekende Preview-isolatiehold van #93 is niet omzeild. Geen productiegegevens, credentials of operationele hostmetadata in dit dossier.

## Exacte bestanden ten opzichte van #93

- `content/academy/WL-001_COURSE_1.0_DRAFT.json`
- `content/academy/WL-001_COURSE_1.1_DRAFT.json`
- `content/academy/WL-002_COURSE_1.3_DRAFT.json`
- `content/academy/WL-003_COURSE_1.1_DRAFT.json`
- `docs/README.md`
- `docs/academy-content-integration-and-publication-readiness.md`
- `docs/academy-content/README.md`
- `docs/academy-content/WL-001-integration-coverage.json`
- `docs/academy-content/WL-001-integration-coverage.md`
- `docs/academy-content/WL-001-review.json`
- `docs/academy-content/WL-001-review.md`
- `docs/academy-content/WL-002-review.json`
- `docs/academy-content/WL-002-review.md`
- `docs/academy-content/WL-003-review.json`
- `docs/academy-content/WL-003-review.md`
- `docs/academy-content/checkpoint.md`
- `docs/academy-content/validation.json`
- `next-env.d.ts`
- `next.config.ts`
- `src/app/platformbeheer/academy/cursussen/[versionId]/page.tsx`
- `src/app/platformbeheer/academy/cursussen/academy-authoring-actions.test.ts`
- `src/app/platformbeheer/academy/cursussen/actions.ts`
- `src/app/platformbeheer/academy/cursussen/page.tsx`
- `src/components/learning/academy-bundle-editor.test.tsx`
- `src/components/learning/academy-bundle-editor.tsx`
- `src/components/learning/lesson-player.test.tsx`
- `src/components/learning/lesson-player.tsx`
- `src/lib/learning/academy-authoring-service.ts`
- `src/lib/learning/academy-bundle-authoring.ts`
- `src/lib/learning/academy-bundle-contract.ts`
- `src/lib/learning/academy-catalog-service.ts`
- `src/lib/learning/academy-content-integration.test.ts`
- `src/lib/learning/academy-content-postgres.test.ts`
- `src/lib/learning/academy-content-release.test.tsx`
- `src/lib/learning/academy-content-standard.ts`
- `src/lib/learning/academy-database-policy.ts`
- `src/lib/learning/academy-import-migrations.json`
- `src/lib/learning/academy-import-preflight.ts`
- `src/lib/learning/academy-import-service.ts`
