# Compliance F1 — migratie en resultaatopslag

Issue #41 / ontwerp PR #42. Afzonderlijk van A07 PR #40. Baseline:
`d3bce31248cf496f4c0563e210addbcb8d2e721c` (origin/main, 15 oktober 2026).

## Bevestigde oorzaken

1. Migratie `20261001113000_add_compliance_domain_versioning_foundation` bevatte
   `AS $` en `$;` rond `prevent_non_draft_compliance_framework_mutation`.
   De oorspronkelijke commit `07e1fa7` had geldige quoting; `09fb864` introduceerde
   de fout tijdens hardening van immutability. Een loutere broncodetest vond dit niet.
2. De publieke POST-route gaf geen `complianceFrameworkVersionId` door, terwijl
   `completeArboGuideRun` die voor COMPLIANCE verplicht stelt. De routetest mockte
   de service en zag daardoor de ontbrekende domeinvoorwaarde niet.
3. De bestaande seed `NL_ARBO / 2026-10` is een DRAFT voor het toekomstige
   configureerbare domein. Dit is **niet** de huidige codegebaseerde wijzer versie 1.

## Read-only inventarisatie en checksums

Op 15 oktober 2026, uitsluitend metadata gelezen:

- Neon-project **WorkMatchr**, `billowing-term-15867762`, branch `production`
  (`br-odd-smoke-agf0wj9j`), database `neondb`: 81 migratieregistraties, geen
  open failed migraties, deze foundation niet geregistreerd en geen
  `ComplianceFrameworkVersion`-tabel. Geen writes uitgevoerd.
- Lokale container `workmatchr-postgres`: 16 applicatie-/testdatabases
  geïnventariseerd. Alleen `workmatchr_accept_v02` heeft deze migratie succesvol
  geregistreerd: finished=true, rolled_back=false, applied_steps_count=1.
  De overige databases hebben geen registratie; één heeft geen migratieregister.
  In die overige databases zijn ook geen compliance-definitiontabellen of de
  drie foundationfuncties aangetroffen; geen aanwijzing voor gedeeltelijke toepassing.
- Twee oude Jortt-previewprojecten zijn gearchiveerd. Hun inhoud is niet opnieuw
  uitgelezen of gereactiveerd. Onbekende/ontoegankelijke databases zijn niet
  automatisch als compatibel aangemerkt.

SHA-256 van het migratiebestand:

| Variant | Checksum |
| --- | --- |
| Oorspronkelijke SQL uit `07e1fa7`, LF | `73ef2d243d107d5dbec0484e9382989d79c6ea79b3ab0abc562a1a05c7b12951` |
| Defecte main-versie, LF | `48883b9c2ea3273e132464fba0eccf6521833cb5382eab547b57e4ee51cd3259` |
| Herstelde SQL, LF | `976cf9391e9540116899c2556494659da98ab7d665db18c57c08489608a0e450` |
| Herstelde SQL, CRLF (daadwerkelijk lokaal toegepast) | `119c864839d38488b8886c9f1c62275d2ca5f0ed496418f81e2f776e908c923c` |

Het herstel verandert uitsluitend de twee delimiters in `$$`. De resulterende
CRLF-bytes zijn exact gelijk aan de geregistreerde succesvolle lokale variant.
Een regressietest legt beide regelafbrekingsvarianten vast. Geen registerrij,
checksum of bestaande database is gewijzigd. Geen `migrate resolve`, reset of
handmatig markeren als applied uitgevoerd.

## Veilige herstelprocedure

**Iedere bestaande database vereist vooraf afzonderlijke toestemming voor writes.**
Dit document geeft geen opdracht om productie nu te migreren.

1. Lees vóór een release `_prisma_migrations` en de aanwezige compliance-objecten
   read-only; controleer identiteit, backup/herstelroute en alle pending migraties.
2. Nieuwe lege database: de volledige bestaande keten uitvoeren met
   `prisma migrate deploy`, gevolgd door de nieuwe referentiemigratie. Geen seed
   nodig om de huidige wijzer te kunnen opslaan. F1 heeft 84 migraties.
3. Nog niet toegepast en geen gedeeltelijke objecten: na toestemming kan de
   normale keten worden toegepast; geen historische run wordt bijgewerkt.
4. Succesvol toegepast met bovenstaande herstelde LF/CRLF-checksum: niet opnieuw
   uitvoeren en geen registry wijzigen. Controleer de echte databasefuncties op
   drift; alleen de nieuwe pending referentiemigratie is dan nodig. Een tooling-
   waarschuwing over bytes/regelafbrekingen eerst onderzoeken, nooit blind oplossen.
5. Oorspronkelijke `07e1fa7`-checksum, onbekende checksum, failed registratie of
   gedeeltelijke objecten: **STOP**. Maak eerst een schema-/functievergelijking en
   een afzonderlijk herstelplan met expliciete eigenaarstoestemming. De oorspronkelijke
   geldige versie bevat andere immutabilitylogica; niet als identiek behandelen.
   Geen generieke auto-repair, drop, reset of handmatige registry-update leveren.
6. Na een later geautoriseerde migratie: controleer alle registraties, checksums,
   functies en constraints en exact de verwachte frameworkidentiteit. Een mislukte
   referentiedata-insert wordt niet met `ON CONFLICT DO NOTHING` verborgen.

Voorbeeld van metadata-only SQL voor stap 1:

```sql
SELECT migration_name, checksum, finished_at, rolled_back_at, applied_steps_count
FROM "_prisma_migrations"
ORDER BY migration_name;
```

## Versiecorrecte opslag

Nieuwe migratie `20261015180000_register_legacy_compliance_framework` registreert
één immutable identiteit: `NL_ARBO_LEGACY / 1`, UUID
`7e44a647-0549-4d96-a14c-c1d783d11e01`, status PUBLISHED, guide 1 / rapport 1.0.
Dit betekent technisch beschikbaar voor de bestaande evaluator, geen nieuwe
inhoudelijke/juridische goedkeuring. Het is geen publicatie van het toekomstige
NL_ARBO-framework en introduceert geen vragen, modules of beoordelingsregels.
De checksum verwijst naar de LF-genormaliseerde bestaande `compliance-guide.ts`.
Wijziging van die evaluator vereist een bewuste nieuwe versie/binding.

De route gebruikt uitsluitend de serverconstante; een client kan geen tenant,
framework of rapport kiezen. Antwoorden worden zoals voorheen genormaliseerd en
het rapport wordt server-side opgebouwd. De domeinservice controleert in dezelfde
serializable transactie de actieve gebruiker, organisatie en membership, plus
exacte framework-ID/code/versie/checksum/PUBLISHED-status en rapportversies.
Een willekeurige of nieuwste DRAFT is nooit fallback.

De bestaande org+idempotencyKey-lock, unieke constraint, fingerprint, begrensde
serializable retries en append-only resultaten blijven leidend. Identieke
afgeronde requests worden gereplayed; afwijkende inhoud geeft conflict. Een
gepensioneerd framework blokkeert nieuwe beoordelingen maar niet het uitlezen
of identiek replayen van een al afgerond resultaat. Historische nullable bindings
blijven onaangeroerd en leesbaar; er is geen backfill of herberekening.

## Verificatie

- `npm run test:db:compliance-domain`: echte PostgreSQL-taxonomie, constraints,
  frameworkintegriteit en immutability, volledige migratieketen.
- `npm run test:db:arbo-guides`: bestaande service-/historie-/tenanttests.
- `npm run test:db:compliance-runs`: echte route → evaluator → service → PostgreSQL.
  Alleen de sessiecontext wordt als synthetische testcontext aangeboden; geen
  claim dat hiermee de volledige browserlogin is getest.
- Nieuwe database per suite; alleen die eigen database wordt na afloop verwijderd.
  Bestaande lokale databases, productie en A07 worden niet gewijzigd.
- De route-integratie controleert alle 84 migratiechecksums en een tweede deploy,
  gelijktijdige identieke requests, afwijkende payload, OWNER/ADMIN/MEMBER,
  ontbrekende/suspended membership, geblokkeerde gebruiker, tenantoverschrijding,
  gemanipuleerde framework-ID/versie, pensionering en historische snapshots.
- Geen wijziging van de bestaande 21 vragen of toekomstige 25 vragen, prijzen,
  credits, betalingen, UI, sessies of browseropslag.

Resultaten: 30 gerichte tests in zes suites PASS; de drie genoemde PostgreSQL-
suites PASS, inclusief 84/84 migraties en identieke registraties na herhaling.
Volledige lint PASS; diff-check en secrets-patrooncontrole PASS.
Standalone TypeScript: uitsluitend vier bestaande TS2345 readonly-arrayfouten in
`src/lib/compliance/rule-engine.test.ts` (13, 14, 23, 24). Die test en `rule-engine.ts`
zijn inhoudelijk ongewijzigd ten opzichte van origin/main; geen nieuwe F1-typefouten.
Geen baselinecorrectie uitgevoerd.

Productiebuild (`npm run build`) PASS. De eerste poging werd geblokkeerd doordat
Turbopack een externe dependency-junction niet toestond. Na een lokale dependency-
kopie slaagde de standaard build zonder productconfiguratie te wijzigen. Bestaande
workspace-root/NFT-tracingwaarschuwingen in de kennisuploadketen blijven zichtbaar.
Productiemigratie, release en merge blijven afzonderlijke beslissingen.
