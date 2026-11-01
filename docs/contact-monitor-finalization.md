# Contactmonitoring en menselijke reconciliatie — gesloten kandidaat

Basis: main `952b1eee448de0a41bbfc4eddf2dd270e6ffdc66`. Geen productieactivatie.
Deze wijziging vult [contact operations](contact-operations.md) gericht aan.
Operationele infrastructuur en privébesluiten staan uitsluitend in het private beheerdossier.

## Afgescheiden monitorauthenticatie

`GET /api/maintenance/contact-health` accepteert uitsluitend `CONTACT_MONITOR_SECRET`:
64 lowercase hextekens, onafhankelijk gegenereerd na afzonderlijke configuratieautorisatie.
Een ontbrekende, ongeldige of aan CRON_SECRET/FINANCIAL_MAINTENANCE_SECRET gelijke sleutel
faalt gesloten. Er is geen CRON-fallback. De bestaande cron-/financeroutes zijn ongewijzigd.
De monitor leest de nieuwe variabele; bestaande secretconfiguratie wordt niet gekopieerd.
`CONTACT_MONITOR_ENABLED` blijft standaard uit. Preview-isolatie, generieke fouten, TLS bij de
bestaande vaste HTTPS-bestemming, redirectweigering en no-store blijven behouden.
Geen databasecredential of providercredential op de monitorhost nodig.

## Expliciete menselijke afhandeling

Nieuwe, standaard gesloten POST: `/api/platform-admin/contact-reconciliation`.
Geen machine-bearer; same-origin JSON en de bestaande Better Auth-sessie zijn vereist.
De body kan geen actor of sessie opgeven. De service controleert opnieuw, onder rijlocks:
actieve/geverifieerde platformbeheerder, actieve OWNER/ADMIN-membership bij de actieve
WorkMatchr-platformorganisatie, geldige individuele sessie en geen impersonation.
Daarnaast moet de persoon expliciet in `CONTACT_RECONCILIATION_OPERATOR_IDS` staan;
maximaal tien UUIDs, geen automatische rechten. Gate: `CONTACT_RECONCILIATION_ENABLED=true`.
Beide configuraties zijn standaard leeg/uit; geen bestaande operator aangewezen.

Invoer is strict en begrensd: confirmation=`RECONCILE_WITHOUT_RESENDING`, één outboxId,
decisionId, evidenceId, SHA-256 van het private bewijs, evidenceObservedAt, outcome, reason,
providerMessageId, expectedAttemptCount en expectedFingerprint. Geen vrije tekst of bewijsinhoud.
Het bewijs moet aantoonbaar het exacte bericht, alle mogelijke providerpogingen en de provideruitkomst betreffen.
Een afwijzing van alleen de laatste poging bewijst niet dat eerdere pogingen nooit zijn geaccepteerd.
Een hash bewijst binding aan het beoordeelde dossier, niet vanzelf de waarheid van de bron.
Alleen een bevoegde menselijke reviewer mag dit bevestigen; afwezigheid in logs is geen afwijzingsbewijs.

| Bewijs | Toegestane overgang | Voorwaarde |
| --- | --- | --- |
| ACCEPTED / PROVIDER_ACCEPTANCE_PROVEN | FAILED naar SENT | Resend-message-UUID vereist, bewijs niet toekomstig en vanaf eerste poging |
| NOT_ACCEPTED / PROVIDER_REJECTION_PROVEN | FAILED naar definitief gereconcilieerde FAILED | Geen tegenstrijdige provider-ID; afwijzing daadwerkelijk bewezen |
| UNKNOWN, lopend onderzoek of tegenstrijdig bewijs | Geen mutatie | Retry blijft geblokkeerd; triage/escalatie via privédossier |

Alleen reeds geblokkeerde FAILED-contactrecords zonder actieve lease kunnen worden afgehandeld.
Een achtergebleven PROCESSING-record moet eerst door de bestaande lease-/reconciliatieafhandeling
veilig worden geblokkeerd; de nieuwe route neemt geen workerlease over. Geen globale dispatch.
De service reset geen pogingen/fingerprints, verandert geen berichtinhoud en verstuurt niets.

Statuswijziging en één bestaand append-only MarketplaceAuditEvent worden atomair vastgelegd.
De bestaande unieke correlationKey en dezelfde transactielock als admission/retentie begrenzen
concurrency. Audit bevat operator, vaste grondslagcode, tijd, bewijsreferentie/hash, besluit-ID,
statusovergang en beleidsversie; geen sessietoken, berichtinhoud, afzender of providerpayload.
Identieke herhaling door dezelfde nog bevoegde actor verandert niets, ook na outboxpurge;
een gewijzigd besluit, ingetrokken sessie of afwijkende actuele status wordt geweigerd.
Bij audit- of statusfout rolt alles terug. Er is geen rollback naar PENDING: correcties vereisen
nieuwe beoordeling en een afzonderlijk geautoriseerde herstelactie.

Retentie en health herkennen definitief afgewezen pogingen uitsluitend met passend auditbewijs,
inclusief recordidentiteit en exact finalisatietijdstip. Een foutcode alleen is onvoldoende.
Bestaande nooit-geprobeerd- en SENT-regels blijven behouden. De 30 dagen beginnen bij werkelijke
finalisatie; herhaling vernieuwt die datum niet. 24 uur tellers en zeven dagen inhoud blijven gelijk.
Geen migratie of nieuwe tabel. De query gebruikt het reeds bestaande, uniek geïndexeerde auditmodel.

## Nog geen operationele vrijgave

- Onafhankelijke permanente uitvoering, private state, watchdog en alarmontvanger ontbreken nog.
  Een lokale run of stdout-overgang is geen bewijs van externe ontvangst.
- Een afzonderlijke sleuteluitgifte, configuratie en rollout zijn nog niet toegestaan.
- Elke echte reconciliatie vereist toegewezen operator, gecontroleerd bewijs en geaccepteerde
  register-/auditretentie. De code beoordeelt providerbewijs niet automatisch.
- De bestaande audit is databasebreed append-only en overleeft outboxpurge. Dat is geen vrijbrief
  voor onbeperkte persoonsgegevensbewaring. Een eindige afzonderlijke auditretentie vereist nog
  een inhoudelijk besluit en een gereviewde, technisch afdwingbare archief-/verwijderstrategie.
  De nieuwe mutatieroute mag daarom vóór die acceptatie niet worden ingeschakeld.
- De maximaal 48 uur extra is uitsluitend een individueel te onderbouwen voorstel, geen
  automatische of geactiveerde verlenging. De eerdere zeven extra dagen zijn niet goedgekeurd.
- Harde fysieke maxima tijdens infrastructuuruitval zijn niet bewezen. Periodieke detectie is
  geen retentiegarantie; de goedgekeurde 30 dagen/24 uur worden niet stilzwijgend verlengd.

Een eventuele opname van deze code verandert de publieke contactgate niet. Deze branch heeft
Vercel Git-deployments uitgeschakeld. F4/LMS en juridische concepten blijven ongewijzigd.

## Gerichte verificatie

- 85/85 unit-/routeregressies: contact, monitor, operatorroute, bestaande onderhoudsauth.
- 24/24 scheduler-/monitortests: uitval, hervatting, deduplicatie en veilige waarneming.
- 8/8 nieuwe PostgreSQL-groepen: autorisatie, invalid input, lease/scope, zes concurrente besluiten,
  exacte retentie, audit-/statusfoutinjectie, immutable audit en dispatcher zonder herverzending.
- 8/8 bestaande read-only healthgroepen en 27/27 contact-outboxgroepen, inclusief lokale
  providerstub, late acceptatie, idempotentie, 45 concurrente requests en scheduleronderbreking.
- Uitsluitend nieuw aangemaakte lokale databases met synthetische fixture, nul migraties en nul
  echte providerrequests. Eigen databases zijn in finally verwijderd.
- Standalone TypeScript PASS. Lint: nul fouten en vier bestaande navigatiewaarschuwingen.
- Productiebuild PASS: 172 statische pagina's; drie bestaande filesystemtracingwaarschuwingen.
- Diff-/secretscontrole PASS; uitsluitend geschoonde taakbestanden. Geen infrastructuur-ID's, hostmetadata, echte accountgegevens of credentials toegevoegd.

De eerste proef had een UUID/text-castfout in de nieuwe testfixture; hersteld en opnieuw groen.
Een lintpoging overlapte Prisma-generatie; opnieuw afzonderlijk uitgevoerd. Dit zijn geen
bestaande productiefouten. Productreview: geen publieke UI/copywijziging; autorisatie,
privacygrenzen, idempotentie en terughoudende statusbetekenis zijn gericht gecontroleerd.
Geen handmatige operator-/provideracceptatie of juridische goedkeuring geclaimd.

## Exacte wijzigingsset

```text
.env.example
.github/workflows/learning-publication-integrity.yml
docs/README.md
docs/contact-monitor-finalization.md
docs/contact-operations.md
docs/contact-retention.md
ops/marketplace-notifications/monitor.mjs
scripts/fixtures/contact-retention-database.ts
scripts/test-contact-reconciliation-database.ts
src/app/api/maintenance/contact-health/route.test.ts
src/app/api/maintenance/contact-health/route.ts
src/app/api/platform-admin/contact-reconciliation/route.test.ts
src/app/api/platform-admin/contact-reconciliation/route.ts
src/lib/contact/contact-final-state.ts
src/lib/contact/contact-health.ts
src/lib/contact/contact-monitor-auth.test.ts
src/lib/contact/contact-monitor-auth.ts
src/lib/contact/contact-reconciliation-policy.ts
src/lib/contact/contact-reconciliation.ts
src/lib/contact/contact-retention.ts
vercel.json
```
