# Compliance F2 — versiegrens en vijfstatusresultaten

Issue #44; ontwerp PR #42 / issue #41; bouwt op gemergede F1 PR #43.
Baseline `baad69fc2cbd4b50d4a7342730e056246f450384`. Het ontwerp staat op
de afzonderlijke PR #42-branch; F2 importeert geen andere wijzigingen uit die PR of A07.

## F1-releasegate: read-only bevestigd

15 oktober 2026: `www.workmatchr.nl` wijst naar productie-READY
`dpl_4C2Aan9nAqSZtqWp1DLQbRqKsoVN`, live SHA gelijk aan bovenstaande baseline.
Neon WorkMatchr / production / neondb: 84 registraties, 0 onopgelost,
`NL_ARBO_LEGACY / 1` PUBLISHED met de F1-ID en evaluatorchecksum.
Nog steeds 4 beoordelingen en 38 resultaatregels. Geen productiewrites in F2.
Dit is metadata-/aantallenbewijs, geen nieuwe inhoudelijke inspectie van persoonsgegevens.

## Eén opslagketen, twee expliciete contracten

- `ArboGuideRun` blijft de root. Dezelfde serializable transactie, tenant-/user-/
  membershipcontroles, idempotencylock, rapportnummer en immutable snapshot.
- V1 schemaVersion 1, guideVersion 1, reportVersion 1.0 blijft exact vierstatus.
  Geen omzetting van CHECK naar Aandacht nodig of Niet beoordeeld; geen backfill.
- V2 schemaVersion 2, guideVersion 2, reportVersion 2.0, productCode
  COMPLIANCE_GUIDE, frameworkCode NL_ARBO_GUIDE / versie 2 (of afzonderlijke
  inhoudsrevisie 2.x/2.x.y met eigen ID en checksum). Guide-/rapportmajor blijft 2;
  een onbekende major zoals 3 wordt geweigerd. Alleen BASIC;
  geen betaalrecht, EXTENDED-activatie of nieuw operationeel actiebeheer.
- Het bestaande framework-/module-/vraag-/regel-/bronmodel is leidend.
  De service leest uitsluitend het opgegeven gepubliceerde framework en verifieert
  de checksum van de deterministisch geordende inhoud. Geen nieuwste/DRAFT-fallback.
- De snapshot bevat de volledige gebruikte definitie, regel-ID's/checksums,
  vraagidentiteiten en bronclaim-/bronversie-ID's/checksums. Gewijzigde actuele
  bronmetadata blokkeert nieuwe opslag tot een bewuste nieuwe versie; historische
  readers raadplegen uitsluitend hun snapshot. Replay blijft na retirement mogelijk.
- De service berekent het v2-rapport opnieuw uit de databaseconfiguratie en antwoorden
  en weigert afwijkende aangeleverde resultaten. Er is geen nieuwe publieke v2-route.
- Historie, PDF en de bestaande dashboardreader kiezen op `schemaVersion`.
  Het dashboard hergebruikt voor v2 dezelfde vijfstatuscomponent; de v1-weergave
  en het bestaande betaalde actiemanagement worden niet naar v2 vertaald.
- Sets worden alleen voor v2 gededupliceerd en canoniek gesorteerd vóór fingerprinting.
  De v1-fingerprint en scalargrenzen blijven behouden.

## Beoordelingssemantiek

Exact IN_ORDER / ATTENTION_REQUIRED / ACTION_REQUIRED / NOT_ASSESSED /
NOT_APPLICABLE, met Nederlandse labels. ACTION_REQUIRED gaat vóór ATTENTION_REQUIRED,
dan onvoldoende informatie, dan volledig onderbouwd positief. Een tekortkoming
blijft zichtbaar bij `sufficientlyAssessed=false`.

V2 gebruikt dezelfde conditietaal met driewaardige evaluatie. Afwezig/null/leeg/
UNKNOWN/SKIPPED/SKIPPED_DEPENDENCY levert geen positief bewijs, ook niet onder NOT
of notEquals. Gemengde onbekende meerkeuze is ongeldig. NVT vereist een expliciete
positieve, volledig bekende uitsluitingsregel, zonder relevante tegenbevinding.
Voor groen moeten alle vereiste vragen bekend en door toepasselijke regels gedekt
zijn, zonder onzekere toepasselijkheid. Specialistbeoordeling blokkeert ook NVT.
Geen sector-/interesse-/niet-aangevinkt→NVT-afleiding.

Regels onderscheiden expliciet LEGAL_REQUIREMENT en PRACTICAL_RECOMMENDATION.
Bronclaims en citaties moeten directe onderbouwing leveren; ontbrekende bronversie,
checksum of review blokkeert opslag. Dit is technische herleidbaarheid, geen claim
van juridische certificering. Definitieve inhoudelijke bron-/regelreview volgt later.

## Additieve migratie en overgang

`20261016100000_add_compliance_v2_result_contract` is migratie 85:

- Nullable `assessmentStatus` en `resultSchemaVersion` (default 1) naast legacy
  `status`. `status` wordt nullable; XOR-check verplicht exact de juiste projectie.
- Nullable `ComplianceRuleDefinition.basis`; bestaande published regels blijven
  ongewijzigd. V2 weigert een ontbrekende expliciete grondslag.
- Insert/completiontriggers borgen versie/projectie/snapshotconsistentie en weigeren
  extra resultaatregels na afronding. Bestaande append-only triggers blijven intact.
- Geen UPDATE van historische inhoud, geen wijziging van bestaande migratiebytes,
  geen vragen/frameworks/bronclaims gepubliceerd door deze migratie.

Voor een latere release: afzonderlijke migratieautorisatie, preflight/checksums/
herstelroute, eerst 85 migraties op doelomgeving, dan nieuwe app. De huidige code kan
zijn v1-resultaten blijven schrijven na de migratie; de default blijft 1. Voordat ooit
een v2-start wordt ontsloten moeten de volledige vraag-/regelset en bronreview zijn
goedgekeurd en in een nieuwe, checksumgebonden PUBLISHED-versie beschikbaar zijn.
F2 alleen maakt de 25 extra vragen of betaalde scan dus niet operationeel.

Rollback vóór v2-data: oude app terug, additief schema behouden. Na v2-data: v2-starts
uitschakelen maar de gecombineerde reader behouden; een pre-F2-app kan v2-snapshots
niet lezen. Geen downmigration, herinterpretatie, herberekening of verwijdering.

## Validatie en productreview

Gerichte pure contract-/semantiek-/v1/PDF-tests, PostgreSQL-suite op uitsluitend een
zelf aangemaakte tijdelijke lokale database: volledige migratieketen, herhaling,
v1 route→service, v2 roundtrip, races, autorisatie, bron-/frameworkdrift en historie.
De testfixture bevat uitsluitend synthetische vragen en example.invalid-bronnen;
geen nieuwe productvragen of juridische teksten.

Uitgevoerd op de F2-branch:

- 71 tests in 13 suites PASS: `vitest run src/lib/compliance src/lib/arbo-guides
  src/lib/compliance-guide src/lib/bhv-guide/bhv-report.test.ts
  src/app/wijzers/compliance/runs/route.test.ts
  src/components/arbo-guides/compliance-v2-report-view.test.tsx --maxWorkers=1`.
- `npm run test:db:compliance-runs` PASS, ook na de laatste codewijziging:
  85/85 registraties/checksums, 0 failed/onverwacht, herhaling ongewijzigd.
  Zowel v1 als v2: zes gelijktijdige identieke aanvragen, exact één nieuwe run.
- `npm run test:db:compliance-domain` en `npm run test:db:arbo-guides` PASS.
- Standalone `tsc --noEmit`: uitsluitend de vier bestaande TS2345-fouten in
  `src/lib/compliance/rule-engine.test.ts` op 13, 14, 23 en 24. Test en onderliggende
  v1-engine zijn ongewijzigd tegenover de main-baseline; zie ook het F1-rapport.
  Geen nieuwe F2-typefouten. Geen baselinecorrectie in deze PR.
- Diff-check en secrets-patrooncontrole van de taakbestanden PASS; geen nieuwe
  externe secretscantool geïnstalleerd. Volledige `npm run lint` PASS.
  `npm run build` PASS, inclusief 163 pagina's. Bekende workspace-root- en
  NFT-tracingwaarschuwingen in de bestaande Knowledge-uploadketen; geen nieuwe
  buildfout of configuratieworkaround. De automatisch gegenereerde wijziging in
  `next-env.d.ts` wordt niet opgenomen.

PC-017/018/064: vijf expliciete tekstlabels, geen kleur als enig onderscheid.
PC-048/057/058: herleidbare versie, historie en idempotentie.
PC-052/075: bestaande serverautorisatie en tenantisolatie blijven leidend.
PC-069–071: wettelijke grondslag versus aanbeveling en indicatieve begrenzing.
Handmatige v2-productacceptatie en echte 200%-zoom blijven open voor de latere
v2-flow; F2 activeert geen nieuw publiek formulier. Zie Draft PR voor meetresultaten.

## Gewijzigde taakbestanden

- `docs/compliance-f2-versioned-results.md`
- `docs/data-dictionary.md`
- `docs/database.md`
- `docs/ERD.md`
- `docs/README.md`
- `prisma/migrations/20261016100000_add_compliance_v2_result_contract/migration.sql`
- `prisma/schema.prisma`
- `scripts/fixtures/compliance-v2-database.ts`
- `scripts/test-compliance-runs-database.ts`
- `src/app/dashboard/compliance/page.tsx`
- `src/app/mijn-arbo-wijzers/page.tsx`
- `src/components/arbo-guides/arbo-guide-report-view.tsx`
- `src/components/arbo-guides/compliance-v2-report-view.test.tsx`
- `src/components/arbo-guides/compliance-v2-report-view.tsx`
- `src/lib/arbo-guides/arbo-guide-run-service.test.ts`
- `src/lib/arbo-guides/arbo-guide-run-service.ts`
- `src/lib/bhv-guide/bhv-report.ts`
- `src/lib/compliance-guide/compliance-report-pdf.ts`
- `src/lib/compliance/compliance-action-service.ts`
- `src/lib/compliance/compliance-v2-framework.ts`
- `src/lib/compliance/compliance-v2.test.ts`
- `src/lib/compliance/compliance-v2.ts`
- `src/test-fixtures/compliance-v2.ts`
