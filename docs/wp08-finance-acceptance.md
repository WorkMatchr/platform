# WP8 — Financiële acceptatie

24 oktober 2026. Branch `codex/wp08-finance-acceptance`, mainbasis `a49b59507139ef7121634705da19f781b17845f0`. WP7 is afzonderlijk vastgelegd in Draft PR #56. Geen WP7-code dubbel overgenomen.

## Architectuur en nulmeting

Bestaand: CreditAccount per professionele organisatie, append-only CreditTransaction als bron, databaseprojecties, MarketplaceRuleSet/immutable uitnodigingsprijs, FinancialPurchase/PaymentEvent/Invoice/InvoiceLine/VatSummary/Refund/Event, ProfessionalSubscription/Payment en JorttSync/Attempt. Routes `/credits`, checkout/betaling/facturen, `/abonnement`, `/platformbeheer/financien`, Mollie-webhook en beveiligde maintenance. Serveracties bepalen actor/tenant; services controleren opnieuw. Geen productieconfiguratie gelezen of gewijzigd.

Mollie is de geïmplementeerde betaaladapter; Jortt de downstream boekhoudadapter. Actieve productiesleutelmodus, betaalprofiel, mandaten en daadwerkelijke boekhouding zijn in deze opdracht **niet geverifieerd**. Alleen in-memory gateways en lokale synthetische records. De algemene walletdocumentatie beschrijft een oudere fase zonder betalingen; `financial-chain-f3-f9.md` en actuele services beschrijven de later gebouwde keten. Haar oude opmerkingen over ontbrekende notificatieworker zijn achterhaald door de aparte assignment-notificationmodule.

De creditcatalogus bevat 25/50/75/100/150/250/500 credits. Pro, opzegging per periode-einde, mandaatcontrole, recurring betalingen, kortingscodes, startersbeoordeling en volledige refunds zijn gebouwd. Het bestaande Pro-contract vermeldt 49 euro exclusief btw en 10% korting; dit bewijst niet dat de productieconfiguratie/commerciële acceptatie is vrijgegeven. Marketplaceprijs komt uit een geldige gepubliceerde regelset en wordt opgeslagen; geen 25-creditprijs voor 2027 geactiveerd. Pakketprijzen zijn een andere bron dan de ontgrendelregelset. Geen prijs, korting, fiscale regel of migratie gewijzigd.

Niet gebouwd of niet aangetoond: automatische betrouwbare KvK-oprichtingsverificatie; generieke gedeeltelijke refund-UI; volledige bank-/providerreconciliatie als nieuwe module. Niet alsnog gebouwd in deze audit. Btw-tests bewijzen centenberekening en snapshots, geen fiscale certificering. Algemene internationale btw-toepasselijkheid blijft een inhoudelijk acceptatiepunt.

## Bevestigde fouten en correcties

1. **Hoog, autorisatie:** drie creditbeheerfuncties en checkoutreplay konden bestaande resultaten teruggeven vóór actuele autorisatie. Eerst bestaande autorisatie, daarna replay. Beheerreplay bindt tevens actor, wallet, bedrag, type en reden; handmatige mutaties ook toelichting, referentie en tegenboeking. Geen nieuwe rechten, saldoaanpassing of prijslogica.
2. **Hoog, financiële presentatie:** het beheer-walletscherm berekende saldo uit maximaal vijftig zichtbare ledgerregels. Nu aggregate over alle regels; de zichtbare lijst blijft vijftig. PostgreSQL bewijst 54 regels, 151 credits en vijftig getoonde regels.
3. **Hoog, statusintegriteit:** een vertraagde providerobservatie kon PAID terugzetten naar pending of een refundstatus overschrijven met PAID. Latere betaal-/refundstatussen blijven behouden. Provider-ID moet overeenkomen met de opgevraagde ID; bedrag/valuta/tenant blijven gecontroleerd. Observatie-events blijven append-only. Geen historische records bijgewerkt.
4. **Testdefect:** twee opzegtests faalden doordat hun septemberperiode inmiddels voorbij was. Alleen de testklok vastgezet; aanvullende verstreken-periodetest bewijst de bestaande veilige ingangsdatum. Geen abonnementsvoorwaarden aangepast.

Reproductie vóór fix: 13/16 nieuwe creditboundarytests faalden; 5/15 paymentboundarytests faalden; aanvullende checkouttest faalde. Financiële bestaande nulmeting 270/272 PASS met twee datumafhankelijke failures. Eerste uitvoering zonder gegenereerde Prisma-client was een lokale setupfailure en telt niet als productregressie.

## Tests en geïsoleerde simulatie

- Finale gerichte unit-/route-/contractset: **315/315, 38 bestanden PASS**.
- `test:db:credits`: **PASS, 39 s**; bestaande ledger/tenant/immutable/concurrency plus nieuwe beheerreplays en volledige saldoberekening.
- `test:db:finance`: **PASS, 33 s**; factuurnummerconcurrency, v1/v2-snapshots, negatieve creditnotaregels, rollback bij ontbrekende v2-regels, kortings-/starterraces en echte paymentservice met fake gateway.
- Paymentservice: pending geeft nul credits; zes gelijktijdige paid-bevestigingen geven één PURCHASE-ledgerregel en één factuur. Vertraagde pending behoudt PAID en dezelfde ledgerbinding; checkout met vreemde actor wordt geweigerd. Geen externe fetch toegestaan. De development-only factuurmail is uitsluitend een lokale log, geen bezorging.
- Reconciliatie walletfixture: 100 aankoop -20 verbruik +10 refund +5 bonus -5 correctie =90 totaal; na concurrente reserveringen 80 gereserveerd en 10 beschikbaar. Beheerfixture 100 -1 +1 +51 =151. Databaseprojecties sluiten aan; directe projectiewrites en ledger-update/delete worden geweigerd.
- Tijdelijke databases via bestaande harnesses aangemaakt en verwijderd. Bestaande database-OIDs/rollen exact gelijk vóór/na. Geen echte gebruikers, providercredentials of financiële transacties.
- WP7-browserbewijs hergebruikt voor zichtbare credits vóór/na één synthetische ontgrendeling. Geen nieuwe Mollie-browsercheckout, mobiele of keyboard-PASS geclaimd. Echte provider-sandboxacceptatie blijft apart.

De eerste volledige controle vond daarnaast twee typefouten in de nieuwe testharnesses: een niet in alle returnvarianten getypeerd overzichtsveld en een onvolledig getypeerde fake gateway. Het saldo wordt nu op de bestaande beschikbare/gereserveerde/bestede velden gecontroleerd; alle ongebruikte gatewaymethoden weigeren expliciet iedere aanroep. Beide PostgreSQL-harnesses zijn daarna opnieuw uitgevoerd. Dit zijn testcorrecties, geen versoepeling van productievalidatie.

## Exacte wijzigingsset

- `docs/wp08-finance-acceptance.md`
- `scripts/test-credit-wallet-database.ts`
- `scripts/test-financial-chain-database.ts`
- `src/lib/finance/financial-purchase-service.ts`
- `src/lib/finance/subscription-cancellation.test.ts`
- `src/lib/finance/payment-verification-boundaries.test.ts`
- `src/lib/marketplace/credit-service.ts`
- `src/lib/marketplace/marketplace-credit-admin-service.ts`
- `src/lib/marketplace/credit-admin-boundaries.test.ts`

Geen package-, lockfile-, schema-, migratie-, prijs- of providerconfiguratiebestand gewijzigd. Lokale testlogs en processconfiguratie worden niet gecommit.

## Vijftig controles

PASS is beperkt tot hieronder benoemde test-/codegrens.

| Code | Status | Bevinding/bewijs |
|---|---|---|
| FIN-01 | PASS | Routes, services, modellen, maintenance geïnventariseerd. |
| FIN-02 | BLOCKED | Mollie-adapter bevestigd; actuele productie/sandboxconfig niet geverifieerd. |
| FIN-03 | PASS | Autoritatief ledger en databasebeheerde projecties. |
| FIN-04 | PASS | Regelsetprijs versus pakketprijs onderscheiden; immutable snapshots. |
| FIN-05 | PASS | 38 gerichte suites plus twee PostgreSQL-harnesses. |
| FIN-06 | PASS | Geen clientwallet; actieve professionele tenant vereist. |
| FIN-07 | PASS | Volledig saldo versus vijftig zichtbare regels gerepareerd/getest. |
| FIN-08 | PASS | Actuele admin-/providerverificatie, fake paid eenmaal. |
| FIN-09 | PASS | Bestaande ledger/serviceconstraints; WP7 aankoopbewijs. |
| FIN-10 | PASS | Concurrente reservering heeft één winnaar; geen negatief saldo. |
| FIN-11 | PASS | Zeven cataloguspakketten en prijscontracttests. |
| FIN-12 | PASS | Checkoutvalidatie, URLconfig en actuele replayautorisatie; geen echte providercheckout. |
| FIN-13 | PASS | Statuscontract en vertraagde-observatieregressies. |
| FIN-14 | PASS | Redirect is read-only; serverget, ID/bedrag/valuta/tenant worden gecontroleerd. |
| FIN-15 | PASS | Zes fake paid-bevestigingen, één ledger/factuur in PostgreSQL. |
| FIN-16 | PASS | Herhaalde identieke paymentverwerking via service; geen live webhook. |
| FIN-17 | PASS | Wallet-race en WP7 parallelle ontgrendelingen. |
| FIN-18 | PASS | Replayidentiteit, provider-idempotentiesleutels en begrensde transaction-retries. |
| FIN-19 | PASS | Unitproviderfouten, deferred v2-rollback; geen volledige netwerkchaostest. |
| FIN-20 | PASS | Synthetische ledger/projectie/aankoop/factuurreconciliatie. |
| FIN-21 | PASS | Bestaande resolver en historische prijssnapshot. |
| FIN-22 | PASS | Saldo vóór write en DBconstraints. |
| FIN-23 | PASS | WP7 één betaling bij parallelle aankoop. |
| FIN-24 | PASS | WP7 privacy/readmodel- en aankoopbewijs; #56 is releaseafhankelijkheid. |
| FIN-25 | PASS | Unit/PG insufficient, deadline, status, race en rollback. |
| FIN-26 | PASS | Bestaand Pro-product en entitlementtests; commerciële prijsacceptatie apart. |
| FIN-27 | PASS | First-payment/mandaat/activatie met mocks. |
| FIN-28 | PASS | Recurring provider- en factuurtests met mocks. |
| FIN-29 | PASS | Opzegging, replay, periodes en verstreken-periodegeval. |
| FIN-30 | PASS | Actief/achterstallig/geschorst/verlopen contracttests. |
| FIN-31 | PASS | Centrale bronnen geïnventariseerd, geen prijzen gewijzigd. |
| FIN-32 | PASS | Immutable aankoop-/factuur-/uitnodigingssnapshots. |
| FIN-33 | PASS | Synthetische eenmaligheid/concurrency; echte identiteit vereist menselijke review. |
| FIN-34 | PASS | Geen Pro/codecumulatie; limieten en race in PG. |
| FIN-35 | PASS | Bestaande prijs/checkoutpresentatietests en WP7-browserprijs; geen nieuw mobiel oordeel. |
| FIN-36 | PASS | Append-only financial events en ledger. |
| FIN-37 | PASS | Factuursnapshot v1/v2, nummering en PDF-tests. |
| FIN-38 | BLOCKED | Rekenkundig PASS; fiscale scope/toepasselijkheid vereist inhoudelijke goedkeuring. |
| FIN-39 | PASS | Jortt-mapping/retry/idempotentie met mocks; geen echte boekhoudacceptatie. |
| FIN-40 | PASS | Volledige refund/creditnota met mocks/PG; geen echte refund. |
| FIN-41 | PASS | Vier publieke replaygrenzen hersteld; algemene services/auth regressies. Geen penetratiecertificering. |
| FIN-42 | PASS | Wallet-/checkout-/factuurtenanttests. |
| FIN-43 | PASS | Classic ID-webhook leest provider opnieuw; geen clientstatusvertrouwen. Geen live signaturetest geclaimd. |
| FIN-44 | PASS | Append-only audit, foutcodes zonder credentials. |
| FIN-45 | PASS | Ongeldige bedragen, verkeerde tenant/prijs/valuta/ID en onbevoegde replay. |
| FIN-46 | PASS | Echte paymentservice op tijdelijke DB met fake paid-responses; geen externe checkout. |
| FIN-47 | PASS | WP7 geïsoleerde aankoop/offerte/gunning. |
| FIN-48 | PASS | Zes paymentreplays en wallet-/factuurnummerraces. |
| FIN-49 | PASS | Pending in PG; failed/canceled/expired unit: geen credits/factuur. |
| FIN-50 | PASS | Beide hierboven uitgeschreven synthetische reconciliaties. |

## Resterende acceptatie en besluit

FINANCIAL INTEGRITY GO uitsluitend voor de beschreven lokale simulaties, geen productiegarantie. SECURITY NO-GO voor integrale vrijgave door bestaande dependency-advisories (WP5) en nog noodzakelijke gezamenlijke review van #56 en deze fix. TECHNICAL NO-GO bij de bekende standalone-TypeScript-baseline; COMMERCIAL FLOW NOT READY en PRODUCTION RELEASE NOT READY: actuele providerconfig, echte afzonderlijk geautoriseerde sandboxbezorging/checkout, fiscale/commerciële beoordeling en UI-eindacceptatie ontbreken.

WP9 kan onafhankelijk doorgaan; zij moet development-only, provideraccepted en daadwerkelijk bezorgd strikt onderscheiden. Geen merge, deployment, productiehandeling of echte mail/betaling. Een schemawijziging is niet nodig.

## Laatste kwaliteitscontrole

Volledige lint PASS. Productiebuild PASS (163 pagina’s), inclusief TypeScript-buildcontrole. Bekende lokale Turbopack-waarschuwingen over meerdere lockfiles en NFT-bestandsdetectie blijven zichtbaar. Diff-check en secrets-patterncontrole van uitsluitend de negen taakbestanden PASS. Standalone TypeScript wordt afzonderlijk vastgelegd; de vier bestaande readonly-arrayfouten in compliance/rule-engine.test.ts worden niet aangepast.

Finale standalone TypeScript: exact vier bestaande TS2345 readonly-arrayfouten, regels 13/14/23/24 van compliance/rule-engine.test.ts; geen nieuwe fout. Gerichte lint van de laatste typeannotatie eveneens PASS.
