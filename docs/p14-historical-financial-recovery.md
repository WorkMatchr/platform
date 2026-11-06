# P1.4 — historisch financieel herstel voorbereiden

Datum: 6 november 2026. Basis: P1.2 `179f2e9cfde426069eb11ce83b8351ba12ebe770`, inclusief de P1.1-kandidaat. Dit document bevat geen echte betaal-, klant-, factuur- of infrastructuuridentificatoren. Het private gebeurtenismanifest en actuele providerbewijs staan uitsluitend buiten Git.

## Vrijgavegrens

P1.3 is afgerond met **NO-GO**. De productie-uitrol is niet goedgekeurd of uitgevoerd. De nieuwe read-only controle bevestigt dezelfde productiecommit en 85 geslaagde migraties zonder onafgemaakte registraties. De kandidaat bevat 115 migraties; deze wijziging voegt geen migratie toe. De bestaande herstel-, sleutel-, beperkte bronrechten-, writersluiting- en gecontroleerde heropeningsvoorwaarden blijven open. Geen productiecorrectie, providerboekingen, mail, migratie, merge of deployment uitgevoerd.

## Vastgestelde afwijkingen

| Geval | Nieuwe controle | Voorbereide correctie | Productieadvies |
| --- | --- | --- | --- |
| A — eerste ontbrekende maandincasso | Live-providerbetaling, klant, abonnement, interne metadata en betaaldatum opnieuw gelezen; lokale betaling en factuur ontbreken | Eén expliciet geselecteerde betaling via bestaande Pro-service, factuur en Jortt-werk atomair | NO-GO tot release, bronpreflight en afzonderlijk akkoord |
| B — volgende maandincasso | Afzonderlijke succesvolle providerbetaling opnieuw gelezen; lokale betaling en factuur ontbreken | Eigen betalings-ID en eigen factuur; latere contractperiode behouden bij oudere replay | NO-GO onder dezelfde voorwaarden |
| C — achterlopende abonnementsperiode | Interne periode onveranderd achterhaald; providerabonnement actief | Uitsluitend projectie via A/B; geen losse SQL, nieuwe subscription of nieuwe incasso | NO-GO; hoort expliciet bij A/B-goedkeuring |
| D — bestaande open Jortt-documenten | Twee bestaande documenten opnieuw onafhankelijk als achterstallig gezien; lokaal documenttransport SYNCED | Eerst boekingen, eventuele deelbetalingen en tussenrekening lezen; boekhouder keurt rekening en datum goed; daarna per document aparte reconciliatie | NO-GO tot boekhoudkundig en providerbewijs compleet |
| E — netto-uitbetalingen | Eerste afrekening uitbetaald, tweede nog gepland; bruto-incasso en providerkosten afzonderlijk bevestigd | Alleen boekhoudkundige aansluiting na bewijs van bank-/tussenrekening; geen WorkMatchr-betalingsreplay voor netto-uitbetaling | NO-GO voor boekingen; read-only aansluiting voorbereid |

Een providerstatus “naar bank verstuurd” bewijst geen onafhankelijk gecontroleerde bankontvangst. De getoonde transactiekosten met fracties van centen zijn niet gelijk aan de afgeronde afrekeningskosten. Een geplande afrekening heeft nog geen definitieve boekingsstatus. Er is geen bewijs dat de onderzochte historische afwijkingen inmiddels zijn opgelost.

## Noodzakelijke technische afbakening

De bestaande `reconcileProPayments` selecteerde alle betalingen vanaf een datum. Dit is te breed voor een per-gebeurtenis goedgekeurd manifest. De bestaande service en beschermde beheeractie ondersteunen nu aanvullend precies één `paymentId`:

- Exact één provider-GET, geen lijstfallback of nieuwe incasso. Ongeldig, ontbrekend of ambigu bereik faalt gesloten.
- Exact provider-ID, PAID-status, customer-identiteit, tenant en subscription vereist. De bestaande betaalservice blijft bedrag, valuta, mandaat, bronfactuur en contractperiode controleren.
- Actuele operatorautorisatie vóór providerlezing en opnieuw vóór verwerking; actor komt uit de serversessie. Bestaande gesloten correctiefeaturegate blijft vereist in de Server Action.
- Bestaande transacties, unieke betaal-/factuurrelaties, Jortt-PENDING-opdracht en idempotente operator-audit worden hergebruikt. Geen tweede administratie.
- De afzonderlijke datumgebaseerde beheerfunctie blijft bestaan, met waarschuwing dat toestemming voor één betaling haar niet dekt. De nieuwe eenbetalingsactie toont het financiële gevolg vóór bevestiging.
- Factuuruitgiftedatum en volgnummer worden bij echte uitvoering door de bestaande factuurservice bepaald. De oorspronkelijke dienstperiode en providerbetaaldatum blijven afzonderlijk. Geen antedatering, hernummering of herschrijven van bestaande documenten.

Een tweede bevestigde blokkade betrof vindbaarheid: `/credits` las uitsluitend aankopen met hun directe factuurrelatie. Terugkerende Pro-facturen hebben juist een `subscriptionPaymentId` en ontbraken daardoor in de accountlijst. De pagina toont nu aanvullend de laatste 50 factuurdocumenten van de **actueel geautoriseerde organisatie**, inclusief maandfacturen en creditnota's, met links naar de bestaande beveiligde detail- en PDF-routes. Dit is een server-side query binnen de bestaande accountpagina; geen nieuwe financiële opslag of nieuwe toegangsroute. De lijst blijft na opzegging beschikbaar bij een nog bevoegd account. De begrenzing op 50 is zichtbaar; dit is geen claim van onbeperkte historische paginering.

## Uitvoering per gebeurtenis — uitsluitend na afzonderlijke vrijgave

1. Benoemde operator en boekhouder vullen het private manifest aan: actuele bronidentiteiten/statussen, goedgekeurde contractperiode, bedragen/btw, documentmoment, bevoegde actor, grondslag, akkoord en UTC-moment. Onbekende velden blokkeren uitvoering.
2. Controleer goedgekeurde runtime/schema/checksums en herstelcheckpoint volgens P1.3. Controleer opnieuw of eerdere callbacks of handmatige boekingen het geval al hebben opgelost. Bij afwijkingen niet schrijven.
3. Sluit ongeautoriseerde neveneffecten aantoonbaar uit. Een nieuw lokaal factuurrecord krijgt Jortt-PENDING-werk dat een onderhoudsrun later kan oppakken. Alleen de Jortt-betaalgate sluiten voorkomt documenttransport niet. Scheduler, handmatige retry, oude deployments en andere uitvoerders moeten binnen het goedgekeurde uitvoeringsvenster vallen. Bestaande Jortt-writeguards behouden; geen bypass.
4. Selecteer de oorspronkelijke Pro-factuur in platformbeheer en gebruik **Eén ontvangen Pro-betaling verwerken** met uitsluitend de goedgekeurde ID en manifestreferentie in de onderbouwing. De bredere datumactie is uitgesloten van individuele A/B-toestemming. Geen muterend GET, losse SQL of ongeauthenticeerde CLI.
5. Postflight per betaling: exact één PAID-registratie, één oorspronkelijke factuur, juiste tenant/product/periode/netto/btw/bruto, actuele uitgiftedatum, immutable snapshot, operator-event, Jortt-PENDING-koppeling. Klant vindt facturen onder `/credits`; klant-PDF `/credits/facturen/<id>/pdf`; beheer `/platformbeheer/financien/facturen` en bijbehorende detail/PDF. Toegang met andere tenant weigeren.
6. Stop na lokale postflight. Jortt-documentverzending en betaalaflettering zijn afzonderlijke goedkeuringen. Voor elk document eerst identiteit/referentie/totaal/valuta én alle betalingsboekingen lezen. Een bestaande identieke boeking alleen bevestigen. Een onzekere, gedeeltelijke of afwijkende boeking blijft onderzoek; nooit blind opnieuw POSTen.
7. Idempotentie: betaalrecord `pro-payment-v2:<payment>:paid`; validatie `pro-validated:<payment>:paid`; operatorbewijs `pro-reconciled:<payment>:paid`; factuur unieke `subscriptionPaymentId`; Jortt-document `jortt:invoice:<invoice>`; betaalintentie `jortt-payment-intent:<invoice>` en providerreferentie `workmatchr-payment:<invoice>`. Vervang geen sleutel om een fout te omzeilen.
8. Bij fout of verloren bevestiging: gates/uitvoerders gesloten houden, lokale records en provider eerst teruglezen, immutable documenten behouden. Dezelfde goedgekeurde ID kan na gecontroleerde lokale fout opnieuw door dezelfde service; onzekere Jortt-acceptatie uitsluitend lezen. Geen automatische refund, credit, incasso, opzegging of terugzetten van perioden.

## Acceptatie

| Controle | Resultaat |
| --- | --- |
| Gerichte eindset | **98/98 PASS in 9 bestanden**, oorspronkelijke vijfsecondenlimiet, één worker; exact-ID, Pro-verlenging/herstel, correctieactie, klantinzage en klant-/beheer-PDF-routes |
| PostgreSQL 18 | **PASS**: 115 migraties en herhaalde deploy uitsluitend in tijdelijke synthetische database; oktober/november afzonderlijk, zes gelijktijdige exacte replays zonder duplicaten, verkeerde tenant/bedrag/valuta geweigerd, foutinjectie en herstel, audit, Jortt-onzekerheid en refunds |
| Opruiming | Eigen tijdelijke testdatabase/container verwijderd; bestaande container- en volume-inventaris gelijk aan de nulmeting |
| Lint | **PASS**, nul fouten; vier bestaande waarschuwingen over interne `window.location.assign` in authenticatiecomponenten. Gewijzigde PDF-test aanvullend apart gelint |
| TypeScript | **PASS**, nul fouten |
| Productiebuild | **PASS**, `npm run build -- --webpack`, met uitsluitend synthetische procesconfiguratie; geen deployment |
| Diff, secrets en private metadata | **PASS**; expliciete bestandsselectie, controle tegen private gebeurtenisidentiteiten; geen nieuwe migraties of afhankelijkheden |
| Provideracceptatie | Uitsluitend actuele read-only Mollie-/Jortt-controles; geen echte replay, factuurcreatie, betaalboeking, refund of mail |
| Nieuwe UI | Serverrendering en serverautorisatie getest; geen claim van handmatige browser-/zoomacceptatie van de nieuwe beheeractie |

De eerdere uitgebreide set had 106/107 PASS met een time-out in de bestaande PDF-reproduceerbaarheidstest (eerder ook een eenmalige incassotest-time-out). Een afzonderlijke timingdiagnose wees circa 1,04 seconde rendering tegenover 4,67 seconden generieke diepe Buffer-vergelijking uit. De test gebruikt nu `Buffer.equals`: dezelfde volledige bytegelijkheid, zonder objecttraversal. Geen verruiming van de definitieve testlimiet en geen wijziging aan de PDF-generator. De gecorrigeerde eindset hierboven is volledig groen. De tijdelijke ruimere diagnoselimiet telt niet als acceptatiebewijs.

Opstartafwijkingen zijn opgelost: ontbrekende gegenereerde Prisma-client in de nieuwe worktree, een lint-run die met clientgeneratie overlapte en één impliciete testtype-inferentie. Deze zijn geen productiecorrecties. De PostgreSQL-driver geeft een bestaande deprecatiemelding voor overlappende clientqueries; de transactietests slagen. De bestaande financiële CI omvat nu ook de factuur-inzagetest. Remote CI-status wordt op de Draft PR afzonderlijk gecontroleerd.

De bestaande synthetische baselinebewijzen uit P1/P1.1/P1.2 blijven van toepassing op ongewijzigde componenten. De aanvullende PostgreSQL-proef gebruikt uitsluitend een eigen tijdelijke PostgreSQL 18-container en synthetische accounts; bestaande Docker-resources blijven behouden.

## Afzonderlijke besluiten

1. P1.3-productievrijgave: bewezen actuele herstelbaarheid, beperkte toegang, writersluiting en gecontroleerde migratie-/applicatie-uitrol; geen impliciet akkoord vanuit deze PR.
2. Boekhoudkundige goedkeuring per document: bronfactuur en dienstperiode, uitgiftedatum, actuele verkopersgegevens versus bronsnapshot, btw, tussenrekening, boekdatum/waardedatum en eventuele al aanwezige bankboekingen. Geen automatische classificatie van andere onbekende betalingen.
3. Product Owner- en operatorakkoord per exacte gebeurtenis, inclusief toegestane lokale factuur-/periodewijziging, afzonderlijke Jortt-document-/betaalhandeling en eventuele communicatie. Geen algemene bulkautorisatie.

Historisch productieherstel blijft **NO-GO**. Het private manifest is een voorbereidingsdossier, geen verleende uitvoeringsbevoegdheid.
