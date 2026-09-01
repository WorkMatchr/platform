# Financiële keten F3-F9

## Platformbeheer

Platformoperators hebben onder `/platformbeheer/financien` een uitsluitend-lezen financieel overzicht. De onderliggende aankopen, factuursnapshots en terugbetalingen blijven de enige bron; de beheerpagina's vormen geen tweede administratie. Betalingen, facturen en terugbetalingen zijn afzonderlijk filterbaar en gepagineerd. Factuur-PDF's zijn via een platformbeheer-geautoriseerde route beschikbaar. De beheerinterface biedt bewust geen verwijder- of mutatieacties.

## Verantwoordelijkheden

De financiële keten bouwt voort op het append-only creditgrootboek. Een `FinancialPurchase` bewaart vóór contact met Mollie een immutable prijs-, btw-, kortings- en klantadres-snapshot. Mollie is uitsluitend betaalprovider: alleen een server-side opnieuw opgehaalde betaling waarvan ID, organisatie, valuta, bedrag en status overeenkomen mag credits of Pro activeren.

Het redirectscherm is read-only. Webhooks zijn idempotent en iedere providerstatus wordt als afzonderlijk `FinancialPaymentEvent` vastgelegd. Serialiseerbare transacties worden alleen bij PostgreSQL serialization/deadlockconflicten begrensd opnieuw uitgevoerd; validatie- en autorisatiefouten blijven direct fail-closed.

## Prijzen en btw

Bedragen worden uitsluitend als gehele eurocenten opgeslagen en berekend. De actuele catalogus bevat 25, 50, 75, 100, 150, 250 en 500 credits. De pakketkorting is onderdeel van de aankoop-snapshot. Nederlandse btw wordt als `2100` basispunten vastgelegd. WorkMatchr Pro kost €49 exclusief btw per maand en geeft 10% extra korting ná pakketkorting. Een actieve Pro-korting en kortingscode zijn nooit combineerbaar.

Voor de eerste Mollie-sandboxacceptatie bestaat één strikt server-side prijsmodus: uitsluitend wanneer `MOLLIE_API_KEY` met `test_` begint, kost `CREDITS_25` tijdelijk €1,00 exclusief btw en €1,21 inclusief btw. De normale catalogusprijs blijft €25,00 exclusief btw. Andere pakketten wijzigen niet en Pro-korting, kortingscodes en bonuscredits worden niet op de testprijs toegepast. `FinancialPurchase.pricingMode` en `FinancialInvoice.pricingMode` markeren deze testprijs expliciet; snapshots, Mollie-verificatie, factuur, creditnota en boekhoudprojectie gebruiken altijd de werkelijk betaalde bedragen. Bij iedere andere sleutelmodus geldt uitsluitend `STANDARD`.

De verkopersnapshot luidt Feenstra Safety Consulting, Kennemerland 71, 9405 LC Assen, KvK 57788863 en btw-id NL002107278B11. Een wijziging van organisatie- of verkopergegevens verandert een bestaande factuur niet.

## Facturen, correcties en boekhouding

Na een bevestigde betaling ontstaat exact één immutable factuur. De globale, concurrency-veilige teller levert nummers volgens `WM-YYMM5NNN` en groeit zonder afkap voorbij 999. Een terugbetaling corrigeert het creditgrootboek append-only en maakt een creditnota; een factuur wordt nooit herschreven.

Nieuwe reguliere facturen gebruiken immutable snapshotcontract v2. Bestaande documenten blijven logisch v1 en worden niet gebackfilled. V2 bevriest de lever-/prestatiedatum, eventuele vooruitbetalingsdatum, eventuele abonnementsperiode, geordende fiscale regels en een btw-samenvatting per tarief. Iedere regel bevat omschrijving, hoeveelheid, eenheid, eenheidsprijs excl. btw, bruto bedrag, korting, netto bedrag, btw en bedrag incl. btw. Uitgestelde databaseconstraints vergelijken bij commit regels, kortingssnapshot, btw-groepen en factuurtotalen; een onvolledige v2-uitgifte rolt volledig terug.

Een creditaankoop gebruikt de definitieve creditmutatie als levermoment, het concrete aantal als hoeveelheid en `credit` als eenheid. WorkMatchr Pro gebruikt hoeveelheid 1, `maand` als eenheid en de immutable begin- en einddatum van de geleverde abonnementsperiode. De checkout vraagt de volledige juridische naam of geregistreerde handelsnaam voor facturatie; de uitgifteservice normaliseert en valideert deze fail-closed.

Een factuur-PDF wordt server-side uitsluitend uit de immutable factuursnapshot opgebouwd, inclusief verkoper-, klant-, omschrijvings- en btw-gegevens. Daardoor verandert een historische PDF niet wanneer later organisatiegegevens wijzigen. Snapshot-v1-documenten behouden hun historische renderer; snapshot-v2-documenten gebruiken de gedeelde moderne WorkMatchr-vormgeving met het officiële logo, fiscale regels en tariefsamenvatting. Alleen een geauthenticeerd lid van dezelfde organisatie kan de beveiligde PDF-route bekijken of downloaden. Na een betaalde aankoop verstuurt WorkMatchr één responsive factuurmail in dezelfde merkstijl, met een plain-text fallback en een beveiligde downloadlink; die link gebruikt server-side de expliciet geconfigureerde Preview-alias in Preview en de canonieke WorkMatchr-host in Production, nooit een request-hostheader. Voor een gecontroleerde Preview-acceptatie kan uitsluitend `FINANCIAL_INVOICE` met een expliciete Preview-only ontvangeroverride fysiek naar een beheerd testadres worden bezorgd; de oorspronkelijke ontvanger en alle financiële snapshots blijven intact, het onderwerp krijgt `[PREVIEW TEST]` en Production weigert de override. Een vaste Resend-idempotency key en append-only financiële delivery-events voorkomen dubbele verzending bij webhookreplay. Mislukte of verlopen betalingen maken en versturen geen factuur.

Een door Mollie aangemaakte refund blijft lokaal `PENDING` zolang de provider `queued`, `pending` of `processing` meldt. De credits blijven dan gereserveerd en er ontstaat nog geen creditnota. Alleen `refunded` voltooit de ledgercorrectie, aankoopstatus en creditnota transactioneel. `failed` en `canceled` geven de reservering append-only vrij zonder creditnota. `reconcilePendingMollieRefunds()` haalt niet-definitieve statussen uitsluitend server-side opnieuw op; status-events verwijzen via `FinancialEvent.refundId` expliciet naar de refund.

Een bevoegde platformbeheerder start een volledige refund van een betaalde creditaankoop via **Financieel → Betalingen → betaling openen**. De actie vereist een gecontroleerde redencode, vrije toelichting en expliciete bevestiging en hergebruikt `refundWorkmatchrError`. Dezelfde idempotente service verzorgt Mollie, creditreservering/-correctie, creditnota en `FinancialEvent`-audit. Is na de aankoop creditgebruik gevonden, dan wordt de aankoop `REFUND_REVIEW_REQUIRED` en volgt geen Mollie-aanroep voordat de bestaande review is afgerond. Gedeeltelijke refunds en handmatige statusmutaties zijn niet beschikbaar.

`FinancialJorttSync` en immutable pogingen vormen een downstream adaptergrens. Een Jortt-storing verandert betaling, factuur of credits niet. De synchronisatie gebruikt uitsluitend immutable factuursnapshots en registreert iedere poging herleidbaar.

Jortt mag een eigen administratief `invoice_number` genereren. Het immutable WorkMatchr-factuurnummer (`WM-...`) blijft het officiële klantfactuurnummer en wordt exact als Jortt `reference` vastgelegd. Het is nadrukkelijk niet de technische conflictsleutel: iedere nieuwe synchronisatie gebruikt daarnaast `workmatchr-invoice:<FinancialInvoice.id>` als stabiele technische identiteit in de Jortt-opmerkingen en in `FinancialJorttSync.technicalReference`. Een bekende remote Jortt-ID blijft leidend; vóór create zoekt de adapter op de technische identiteit en faalt hij gesloten bij meerdere verschillende remote objecten met dezelfde identiteit. Een gelijke menselijke referentie met een andere invoice-ID is geen identiteitstreffer. Historische verzonden Jortt-documenten worden niet aangepast of gebackfilld. Zowel de Jortt remote ID als het gegenereerde nummer worden in `FinancialJorttSync` bewaard. WorkMatchr verstuurt de klantfactuur; de adapter gebruikt uitsluitend Jortt `send_method: self` en nooit `email` of `peppol`.

Snapshot-v2-regelprijzen zijn bedragen exclusief btw. De Jortt-adapter zet daarom `net_amounts: false`, behoudt de immutable eenheidsprijs en geeft het snapshot-btw-tarief afzonderlijk door. Acceptancefactuur `WM-26085003` / Jortt `2026-2006601` is op 25 augustus 2026 vóór deze correctie met `net_amounts: true` geboekt en geldt uitsluitend als mislukte acceptatietest; zij mag niet als geslaagde financiële synchronisatie worden gebruikt en wordt niet automatisch gewijzigd, verwijderd of gecrediteerd.

Configuratie is server-only via `JORTT_CLIENT_ID`, `JORTT_CLIENT_SECRET` en `JORTT_SYNC_ENVIRONMENT`. Preview vereist een afzonderlijke Jortt-acceptatieadministratie met waarde `acceptance`. Production vereist daarnaast zowel `JORTT_SYNC_ENVIRONMENT=production` als de expliciete tweede write-gate `JORTT_PRODUCTION_WRITES_ENABLED=true`. Zonder volledige configuratie blijft de adapter fail-closed. Jortt kent geen afzonderlijke sandbox; echte acceptatieboekingen horen daarom uitsluitend in een afgescheiden testadministratie.

Een providerfout resulteert in `RETRY_REQUIRED` met begrensde back-off. Het onderhoudsproces en de bevoegde platformbeheerder kunnen veilig herhalen. Een stabiele WorkMatchr-reference, een korte `PROCESSING`-lease, database-advisory locks en find-before-create bij Jortt voorkomen dubbele boekingen bij replay of herstel na een onderbreking.

## Kortingen, startersvoordeel en Pro

Kortingscodes ondersteunen één voordeelvorm per code, geldigheid, pakketbereik, minimumwaarde, gebruikslimiet, eenmalig gebruik per organisatie en alleen-nieuwe-klantbeleid. Reservering en definitieve toepassing zijn afzonderlijk en idempotent.

Het startersvoordeel is 25 bonuscredits, maximaal eenmaal per economische identiteit. Zonder betrouwbare KvK-oprichtingsdatum volgt `REVIEW_REQUIRED`; sterke identiteitsmatches worden uitsluitend als SHA-256-fingerprints opgeslagen. Er worden geen IBAN, accountidentiteit of e-maildomein in leesbare vorm bewaard.

Een mislukte Pro-incasso zet Pro direct op `PAST_DUE`, waardoor alleen de Pro-voordelen stoppen. Bestaande credits en reguliere platformfunctionaliteit blijven beschikbaar. Na een maand kan de status naar `SUSPENDED`; dit geeft geen matchingvoordeel of -nadeel.

Een nieuw Pro-abonnement gebruikt een Mollie `first` payment van €59,29 inclusief btw bij de bestaande customer. De checkout biedt iDEAL als voorkeursroute en kaart als ondersteund alternatief. Na een betaalde eerste maand leest WorkMatchr via de Mandates API uitsluitend mandate-ID, status en methode; rekening- en kaartgegevens worden niet opgeslagen. Alleen een `valid` direct-debit- of kaartmandate wordt geaccepteerd. Direct debit heeft deterministisch voorrang, waarna de Mollie-subscription met dit specifieke mandate en een startdatum na de reeds betaalde eerste maand wordt aangemaakt. Zonder geldig mandate blijft Pro `PENDING_MANDATE`; er wordt geen recurring betaling gestart en geen Pro-recht geactiveerd. Mandatebevestiging en abonnementsactivatie zijn afzonderlijk append-only geaudit.

Een bevoegde eigenaar of beheerder kan een `ACTIVE` of `PAST_DUE` Pro-abonnement opzeggen tegen het einde van de actuele betaalperiode. `cancelAtPeriodEnd`, `cancellationRequestedAt` en `cancellationEffectiveAt` leggen deze planning vast zonder de actuele betaalstatus voortijdig te wijzigen. Mollie wordt met een vaste idempotentiesleutel geannuleerd, zodat geen nieuwe verlenging wordt gestart. Een `ACTIVE` abonnement behoudt de Pro-voordelen uitsluitend tot `cancellationEffectiveAt`; `PAST_DUE` blijft achterstallig. De aanvraag en de uiteindelijke overgang naar `CANCELED` schrijven afzonderlijke append-only `FinancialEvent`-regels.

De onderhoudsrunner voert refundreconciliatie, vervallen opzeggingen en achterstanden van minimaal één maand idempotent en concurrency-safe uit. Productie roept `POST /api/maintenance/finance` met `Authorization: Bearer <FINANCIAL_MAINTENANCE_SECRET>` aan vanuit een externe scheduler, bijvoorbeeld Vercel Cron. De secret moet minimaal 32 tekens bevatten. Zonder configuratie antwoordt de route fail-closed met 503; een fout of ontbrekend bearer-token geeft 401. De externe cronconfiguratie zelf is niet onderdeel van de repository.

Het platformdashboard rapporteert bruto omzet uit succesvolle creditaankopen, eerste Pro-betalingen en append-only terugkerende Pro-betalingen. Alleen definitief `REFUNDED` terugbetalingen met de bedragen uit hun creditnota worden afgetrokken. Pending, failed en canceled refunds beïnvloeden netto-omzet niet. Het dashboard toont bruto, refund en netto voor excl. btw, btw en incl. btw en houdt credit- en Pro-betalingstellers gescheiden om webhookreplays niet dubbel te tellen.

## Externe acceptatiepunten

- Mollie vereist een beheerde `MOLLIE_API_KEY`, publiek bereikbare webhookbasis en redirectbasis, geactiveerd betaalprofiel en voor Pro een bruikbaar mandaat/betaalmethode.
- Voor iDEAL als eerste Pro-betaling moet Mollie zowel iDEAL voor `sequenceType=first` als SEPA Direct Debit voor recurring betalingen op het betaalprofiel hebben goedgekeurd. Tot dat moment blijft de flow fail-closed; een kaartmandate werkt alleen wanneer de klant kaart als eerste methode kiest en Mollie recurring kaartbetalingen ondersteunt.
- Jortt vereist nog een door Jortt bevestigd API-contract en productiecredentials; er wordt geen fictieve koppeling gesimuleerd.
- Automatische KvK-bronverificatie is niet aanwezig; startersvoordeel blijft daarom een expliciete platformbeoordeling.
- Pro-notificatievoorkeuren zijn nog niet operationeel: de huidige notificatielaag heeft uitsluitend in-app events en een e-mailoutbox, maar geen tenantgebonden voorkeurenmodel of productie-worker. De productbelofte blijft staan; invoering vraagt een afzonderlijk ontwerpbesluit zodat geen tweede notificatiesysteem ontstaat.
- Productieacceptatie moet testbetalingen, webhookherhaling, mislukte incasso, refund en boekhoudretry met de echte sandbox-/testaccounts doorlopen.

## Configuratie

De bestaande platformbeheer-beveiligde `GET /api/platformbeheer/financien/mollie/methoden-preflight` rapporteert naast de read-only methodencontrole uitsluitend twee aanvullende configuratiebooleans: `redirectBaseUrlMatchesProduction` en `webhookBaseUrlMatchesProduction`. Deze vergelijken de ongewijzigde runtimewaarden exact met `https://www.workmatchr.nl`; ontbrekende waarden, andere hosts, whitespace en een trailing slash geven `false`. De onderliggende URL-waarden worden niet teruggegeven of gelogd. `ok` blijft het resultaat van de bestaande methodencontrole; voor Production-acceptatie moeten daarnaast beide URL-booleans `true` zijn. Autorisatie blijft vóór iedere controle staan en antwoorden blijven `private, no-store`. Deze route maakt geen payment of financiële records aan.

Alle waarden staan uitsluitend in beheerde omgevingsconfiguratie:

- `MOLLIE_API_KEY`
- `MOLLIE_WEBHOOK_BASE_URL`
- `MOLLIE_REDIRECT_BASE_URL`
- `FINANCIAL_MAINTENANCE_SECRET` (minimaal 32 willekeurige tekens; uitsluitend voor de server-side onderhoudsroute)
- `JORTT_CLIENT_ID` en `JORTT_CLIENT_SECRET` (uitsluitend server-side OAuth-clientcredentials)
- `JORTT_SYNC_ENVIRONMENT` (`acceptance` voor Preview, `production` voor Production)
- `JORTT_TRADENAME_ID` en `JORTT_REVENUE_LEDGER_ACCOUNT_ID` (optionele administratieve mapping)
- `JORTT_PRODUCTION_WRITES_ENABLED` (expliciete tweede Production-write-gate; standaard `false`)

Sleutels, volledige providerresponses en persoonsgegevens worden niet gelogd of gedocumenteerd.
