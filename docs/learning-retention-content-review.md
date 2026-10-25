# WL-001 kennisbehoud v1 — kwaliteitsreview retentiebank

**Reviewstatus:** inhoudelijke prototypebank beoordeeld; records blijven DRAFT en niet ge-seed/gepubliceerd. Dit verslag is geen formele juridische review, studentpilot of acceptatie van databasepublicatie.

## Omvang en verdeling

- Vraagversies: 100 (R001–R100), uniek.
- Vraagtypen: 63 SINGLE_CHOICE, 37 MULTI_CHOICE.
- Hoofdstukken H1–H10: 5 / 10 / 10 / 15 / 15 / 10 / 10 / 8 / 8 / 9.
- Cognitief niveau B/T/A: 20 / 55 / 25.
- Correcte positie SINGLE_CHOICE (volgorde A/B/C/D): 14 / 14 / 16 / 19. Er is geen exact verdeelpatroon afgedwongen.
- MULTI_CHOICE gebruikt een vastgelegde exacte antwoordset, minimaal twee correcte opties en een afleider; andere combinaties zijn onjuist. Geen deelpunten.

## Antwoordlengte-bias

| Meting | Vóór polish | Na polish |
|---|---:|---:|
| SINGLE_CHOICE totaal | 63 | 63 |
| Correcte optie uniek langste | 33 (52,4%) | 21 (33,3%) |

De nagestreefde bandbreedte van circa 35–40% is gehaald (iets lager dan de band). De correct-scoremappings zijn gelijk gebleven; er is geen antwoordset of scoring aangepast. Veertien correcte SINGLE_CHOICE-opties zijn compacter geformuleerd. De aparte afleiderreview heeft daarnaast evident karikaturale formuleringen vervangen door geloofwaardiger werk-/managementmisvattingen in R008, R021, R033, R037, R042 en R047. Geen correct antwoord is hierdoor gewijzigd.

## Inhoud, overlap en feedback

- De bestaande contenttests controleren bankomvang, code-uniciteit, chapter- en B/T/A-verdeling, vraagtypen, opties, feedback, legal metadata en exacte stemoverlap met E01–E50. De afleiderpolish wijzigt geen stammen.
- De bank is als een zelfstandige retentie-set geschreven; er is geen letterlijke vraagstamkopie van E01–E50 volgens de gerichte test. Verwante leerdoelen zijn bewust toegestaan. Dit is geen formele psychometrische semantische doublureanalyse.
- Werkcontexten variëren over magazijn/verkeer, stoffen, fysieke belasting, werkdruk, werkinrichting en organisatorische rollen. Sommige magazijn-/transportcontexten komen terug waar dat het leerdoel ondersteunt; een integrale menselijke review blijft aanbevolen.
- Feedback benoemt het inhoudelijke principe en waarom de afleider niet volstaat; directe feedback is leergericht.
- Geen item leert dat een RI&E standaard vijf jaar geldig is. Actualiteit hangt af van werkelijke veranderingen, nieuwe informatie en passende herbeoordeling.
- Juridisch gevoelige codes blijven intern gemarkeerd: R006, R008–R012, R015, R045, R051, R058, R071–R080 en R090 (`CONTENT REVIEW REQUIRED — LEGAL`). De markering vervangt geen formele inhoudelijke/juridische/arbotechnische goedkeuring.

## Publicatiegate

De kwaliteitsmetingen en geautomatiseerde invarianten zijn voldoende voor verdere prototype-implementatie. De bank blijft echter DRAFT. Er is geen retentionseed uitgevoerd en geen `WL-001-RETENTION-1.0` gepubliceerd. De nieuwe forward-only correctiemigratie `20260930120000_correct_learning_retention_publication_policy` vervangt de guard met `CREATE OR REPLACE FUNCTION` en laat de oorspronkelijke migratie ongemoeid. De SQL-invariant en centrale applicatiepolicy vereisen beide retentionmetadata `PUBLISHED` plus `LearningQuestion.status = PUBLISHED_PROTOTYPE`. PostgreSQL-migratie-/seedruntime is nog niet uitgevoerd; policycorrectie is uitsluitend statisch getest. Publicatie volgt pas na een geldige fresh/upgrade-runtimeketen en de resterende menselijke content-/legal review. Er is geen gedeelde of productie-database gewijzigd.

## Verificatie

- Retention/Learning-gerichte regressies: 8 testbestanden, 47 tests geslaagd. Content-, publication-policy- en selector-dekking is onderdeel van deze set.
- Volledige Vitest-suite: 332 bestanden; 322 geslaagd, 7 gefaald, 3 overgeslagen. In totaal 2.082 tests: 2.055 geslaagd, 7 gefaald, 20 overgeslagen. De zeven assertionfailures zijn in bestaande niet-retentiongroepen public content, assignments, finance en public-intake; er is geen retention-/Learningfailure aangetoond. De aparte Node-suite slaagde met 10/10.
- `npm run lint`: PASS. `npx tsc --noEmit --incremental false`: PASS tegen de aanwezige gegenereerde types. `npm run db:validate`: PASS met syntactische placeholder-URL, zonder databaseverbinding.
- `PRODUCTION BUILD: NOT COMPLETED — ENVIRONMENT LIMITATION`: Prisma Generate stopte met Windows-EPERM op de generated Prisma-client; de directe Next-build stopte met Windows-EPERM op `.next/trace-build`, vóór compile/static generation. Er is geen retentioncompilefout aangetoond.
- `DATABASE RUNTIME NOT TESTED — ENVIRONMENT LIMITATION`: geen geïsoleerde PostgreSQL; migratieketen, seed-idempotentie en runtime zijn niet getest. Geen migratie of seed uitgevoerd.
- `BROWSER ACCEPTANCE: NOT TESTED — TOOLING LIMITATION`: geen bestaande ingelogde sessie/tooling gebruikt voor browseracceptatie. Studentvalidatie, keyboard/focus/responsive/screenreaderreview en formele juridische review blijven open.
