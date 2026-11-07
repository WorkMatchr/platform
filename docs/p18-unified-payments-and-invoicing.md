# P1.8 — Betalingen, facturen en aflettering

7 november 2026. Technisch geschikt voor beoordeling op de gestapelde kandidaat. **Commerciële productie: NO-GO voor Pro, credits en Academy.** De tests gebruiken uitsluitend fictieve kopers en fake Mollie/Jortt. Er heeft geen provideracceptatie plaatsgevonden. In het bijzonder bewijst de Academy-proef wel het document- en aflettercontract, maar geen werkende commerciële Jortt-wachtrij.

## Bron en schema

| Bron-PR | Gecontroleerde head | Bijdrage |
|---|---|---|
| #102 | `936782bf97250be58b2904563f738f61f47b3c71` | WP21 inclusief Academy |
| #104 | `93796bf3634968458391a3cbbd5a693368e1df46` | P1 Pro, creditnota en refund |
| #105 | `db959b4b48c072df37a94f42e983c5fcbe142173` | Geïntegreerde WP21/P1-kandidaat |
| #106 | `179f2e9cfde426069eb11ce83b8351ba12ebe770` | Gevulde upgrade- en herstelrepetitie |
| #107 | `32258c4eb9b0849d423fc250276a7ca0c53a63ab` | Historisch herstel en koperinzage |
| #108 | `873d4e7c7be7680f68940b4fa28a807cb913074a` | Directe basis P1.8; onafhankelijke alarmontvanger en herstelgrenzen |

Integratievolgorde: #105 → #106 → #107 → #108 → P1.8. #102/#104 zijn al verwerkt in #105. Geen nieuw schema en geen migratie 116: alle 115 migratiebestanden zijn byte-identiek in Git aan de geïntegreerde voorgangers. De 30 kandidaatchecksums vanaf de laatst gerapporteerde productiestand van 85 zijn vergeleken met het [P1.2-manifest](evidence/p12/pending-migrations.json) op de Git-inhoud, onafhankelijk van Windows-regelafbrekingen. Twee lokale migratieruns op een nieuwe PostgreSQL 18-database gaven dezelfde 115 geslaagde registraties en checksums. Geen nieuwe productiepreflight uitgevoerd.

## Acceptatiematrix

PASS hieronder betekent daadwerkelijk synthetisch getest. Geen regel impliceert live acceptatie. E-learning omvat een individuele koper en een zakelijke bestelling van vijf plaatsen.

| Controle | Pro | Creditpakket | E-learning |
|---|---|---|---|
| Betaling | PASS: eerste poging/vervanging, twee verlengingen | PASS: betaald en vertraagde status | PASS: mislukte, betaalde en verouderde status |
| Interne registratie | PASS: juiste incasso en periode | PASS: één toekenning van 25 credits | PASS: aankoop, juiste koper en 1/5 plaatsen |
| Factuur en btw | PASS: originele factuur per betaling, juiste dienstperiode | PASS: koppeling en bedragen, één factuur | PASS: exact één sandboxfactuur; netto/btw/bruto in centen 12314/2586/14900 en 49174/10326/59500; geen fiscale vrijgave |
| Klant- of koperinzage | PASS: ook na beëindiging Pro | PASS: eigen factuurdetail | PASS: beide kopers openen eigen historische bestelling |
| Beheerinzage | PASS: OWNER en ADMIN | PASS: OWNER en ADMIN | PASS: beheer-PDF individuele koper; beide kooptypen ook via financiële beheerservice |
| PDF-download | PASS: browser opent privé-PDF | PASS: browser opent PDF | PASS: twee echte koperdownloads, HTTP 200, PDF-signatuur en private/no-store |
| Jortt-document | PASS: fake acceptatie, document-ID en status | PASS: fake acceptatie, replay | PASS voor snapshot â†’ fake document; **BLOCKED voor werkelijke uitgaande koppeling** |
| Jortt-aflettering | PASS: aparte boeking, timeout, herstel via lezen | PASS: juiste factuur, bedrag en één boeking | PASS voor gedeelde service met nagebootste documentkoppeling; **BLOCKED voor volledige productieroute** |
| Duplicaatbescherming | PASS: zes concurrerende replays/refundverzoeken | PASS: zes callbacks, één walletmutatie | PASS: herhaalde callback, één factuur, één refundaanvraag en creditnota |
| Fout en herstel | PASS: ontbrekende webhook, factuurrollback, verloren bevestiging | PASS: provider-/mailfout zonder verlies van factuur | PASS: vertraagde zichtbaarheid na verloren refund-/afletterantwoord; geen tweede geldopdracht |
| Tenant- en koperisolatie | PASS: vreemde tenant, MEMBER en ingetrokken lidmaatschap geweigerd | PASS: klant- en beheerservices en afgeschermde routes | PASS: onbevoegde gebruiker geweigerd; beide kruislingse koper-PDF-verzoeken geven 404 |

Pro en credits: klant via `/credits` → `/credits/facturen/[id]`; OWNER/ADMIN via `/platformbeheer/financien/facturen`. Een platform-MEMBER krijgt geen financieel beheer. De Pro-browserproef beëindigt alleen het synthetische abonnement: de PDF blijft zichtbaar; na intrekking van het organisatielidmaatschap is er geen PDF meer. Aankoop en historische Academy-factuur: `/e-learnings/aankopen/[id]` → `/factuur` binnen die aankoop. Testbedragen zijn geen prijsbesluit.

## Wat is hersteld en hoe is het aangetoond?

- **Mollie-refund:** een eerder geaccepteerde Academy-terugbetaling kon herhaald worden na verlies van de respons. De bestaande refundservice claimt nu vóór provider-I/O één poging in de bestaande, unieke financiële eventregistratie. Dit respecteert de bestaande PostgreSQL-immutabilitytrigger; de eerste proef wees een wijziging van de refundrij terecht af. Alleen de nieuwe oorspronkelijke aanvraag mag verzenden. Bij onzekere of oudere intentie: alleen opvragen, zo nodig in onderzoek laten. Zowel de volledige refund als de afzonderlijk onderbouwde gedeeltelijke sandboxrefund gebruiken dit contract. Geen nieuwe poging bij tijdelijke onvindbaarheid. Creditnota, geldteruggave, walletmutatie, abonnementsbeëindiging en cursustoegang zijn afzonderlijke besluiten; een Pro-credit verandert nooit de creditwallet.
- **Creditpakket:** een refundresponse zonder exacte betaalbinding, bedrag of valuta wordt geweigerd vóór afschrijving en creditnota. Na onjuist bewijs blijft de reservering staan; alleen een passende read-only bevestiging voltooit dezelfde correctie.
- **Jortt-document:** originele factuur en reguliere volledige creditnota gebruiken nu ook een duurzame, unieke aanmaakclaim vóór een muterend verzoek. Eerst de bekende externe identiteit of exacte technische referentie raadplegen. Een bekende concept-ID wordt vastgelegd vóór finaliseren; een tweede aanmaak na antwoordverlies is verboden. Een oude poging van vóór dit protocol zonder gevonden document gaat naar expliciete reconciliatie. Een aanmaakclaim zonder vindbaar document is ook bij een crash vóór verzending geen toestemming tot nogmaals posten. De bestaande Pro-creditclaim blijft geldig.
- **Aflettering:** factuuruitgifte, aangeboden document, geaccepteerd document, bevestigde boeking, creditnota en cashrefund blijven afzonderlijk zichtbaar. De reader telt niet langer alleen het saldo of de som van boekregels: hij vergelijkt het lokale bevestigingsevent met één exacte externe boeking, boekings-ID, factuurreferentie, bedrag, rekening en boekdatum. Nulsaldo zonder eigen bewijs is ‘In onderzoek’; strijdig bewijs is ‘Afwijking’. Verkeerde valuta of afwijkend document is nooit ‘In orde’.
- **Academy-proef:** de individuele en zakelijke cursusroute schrijven via de bestaande purchase-/invoice-/refund-/eventmodellen; geen tweede administratie. Op echte PostgreSQL-rijen is het factuursnapshot naar het gedeelde Jortt-formaat vertaald en door een fake adapter geaccepteerd. Uitsluitend bij het lezen voor de aflettertest leverde de testadapter de nog ontbrekende externe documentkoppeling. De echte afletterservice registreerde intentie en bevestiging in PostgreSQL; een verloren respons veroorzaakte één boeking. De proef controleert afzonderlijk dat er **nul** echte uitgaande sandboxjobs zijn. De sandbox mag geen productiejob worden door zijn pricing mode te wijzigen. Voor live zijn een goedgekeurde prijs/btw-behandeling, mapping van de individuele debiteur en een expliciet ondersteunde commerciële koop-/documentroute met eigen volledige acceptatie vereist.
- **Gedeeltelijke creditpakketten:** de bestaande productroute ondersteunt de volledige terugbetaling onder haar bestaande voorwaarden. De [Belastingdienst over prijsvermindering of ontbinding](https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/btw_aangifte_doen_en_betalen/aangifte_corrigeren/btw_terugvragen/teruggaaf-door-prijsvermindering-volledige-kwijtschelding-of-verbreking-overeenkomst) beschrijft fiscale correctie wanneer de tegenprestatie wijzigt. Dat stelt geen WorkMatchr-recht op een gedeeltelijke pakketrefund vast. **Niet geactiveerd:** besluit nodig over verbruikte credits, kortingen, pro-rata btw/afronding, grondslag, autorisatie en walletcorrectie.

## Monitoring, geschiedenis en vrijgave

De dagelijkse controle leest providers zonder financiële herstelmutaties. Ontbrekende factuur of betaalbinding, dubbele waarnemingen, afwijkend bedrag/btw/valuta, achterlopende Pro-periode, openstaande betaling, onzekere refund en onvolledige dekking zijn geen groene uitkomsten. Verouderde Pro-webhooks mogen de periode niet terugzetten. Een onzekere refund vanaf twee uur wordt als achterstallig aangemerkt. Mislukte volledige cycli komen direct in het bestaande financiële beheeroverzicht; na 26 uur zonder volledige cyclus is opvolging nodig. De bestaande onafhankelijke monitoradapter is getest op ontbrekende runs, onbereikbare ontvanger, één bevestiging, deduplicatie en herstel. Dit bewijst **geen** ingeplande externe financiële watchdog of bevestigde operationele ontvanger. Bij database-uitval kan ook de interne registratie falen. Primair: platformbeheer; escaleren naar boekhouding bij ontbrekende betaal-/boekingsmatch. Geen alarmdienst of e-mail geactiveerd.

[Het P1.4-dossier](p14-historical-financial-recovery.md) blijft leidend. De twee afzonderlijk geselecteerde verlengingen, de periodestand en de twee typen document-/afletterherstel zijn synthetisch herspeeld met behoud van nummering en bedragen. De twee payout-/clearinggevallen vereisen apart bank-/kostenbewijs: geen negen herstelde productiegevallen claimen. De echte referenties en bedragen van individuele dossiers worden hier niet gepubliceerd. Historische correctie vereist goedkeuring per gebeurtenis.

| Product | Technische integratie | Commerciële productie |
|---|---|---|
| Pro | GO voor review van de gestapelde kandidaat | NO-GO: echte provider-/boekhoudacceptatie, open historische gevallen en operationele controles |
| Credits | GO voor review van de bestaande volledige pakketroute | NO-GO: daadwerkelijke document- én betalingsreconciliatie en incidentopvolging niet geaccepteerd |
| Academy | GO voor afgeschermde sandbox en gedeeld contract; geen GO voor een commerciële aansluiting | NO-GO: ontbrekende reguliere documentroute, fiscale en debiteuracceptatie, gesloten gates |

Gezamenlijke stopvoorwaarden: onbekende schrijvers, onbewezen herstelpunt, checksumverschil, succesvolle betaling zonder factuur, onzekere cash- of documentmutatie, onverklaarde boeking of ontbrekende alarmontvangst. Volg het [bestaande uitrol- en hersteldossier](p17-night-shift-financial-release-readiness.md); geen productie-export, migratie, Preview, deployment, echte provideractie of historische correctie uitgevoerd. Eerst expliciete acceptatie van herstelbaarheid, afgeschermde geïntegreerde omgeving en de financiële keten per geactiveerde route.

## Validatie op deze kandidaat

- 556/556 gerichte Vitest-regressies in 52 bestanden; 11/11 onafhankelijke monitor-/ontvangertests. Voor de lokale keyless-test moesten omgevingsvariabelen in de fixture expliciet leeg zijn; productieguards behouden.
- PostgreSQL 18: beide financiële suites geslaagd, inclusief zes gelijktijdige replays, terugrol/herstel en tenantisolatie. De twee zelfstandige Academy-aankoopproeven zijn geslaagd, met eigen tijdelijke database en opruiming.
- Echte lokale Edge-browser met synthetische accounts: OWNER, ADMIN, MEMBER, organisatiekoper en buitenstaander; detail/PDF, desktop/mobiel, logout met nul actieve sessies. Afzonderlijke individuele/zakelijke Academy-kopersproef: beide PDF-downloads en beide toegangsweigeringen geslaagd. Een eerste geslaagde browsercontrole bleef tijdens afsluiten hangen. Na gerichte correctie eindigde ook de harness met bevestigde opruiming. Geen 200%- of PDF/UA-claim.
- Reproduceerbaar: `node scripts/test-wp21-integration.mjs --local-synthetic --only=finance,finance-p1 --finance-browser` en `node scripts/test-academy-content-database.mjs --local-synthetic --commerce-only --buyer-browser`. Browserproeven vereisen lokaal Playwright/Edge en een build voor de financiële browser. Geen providercredentials nodig. GitHub voert de PostgreSQL-commerceproef zonder interactieve browser uit.

- Volledige lint: nul fouten, vier bestaande Next-navigatiewaarschuwingen. TypeScript en lokale webpack-productiebuild worden afzonderlijk gecontroleerd; de PostgreSQL-test vereiste expliciete Prisma-types voor twee bewijsrecords. De 115 migraties en de 30 SHA-256-waarden zijn gecontroleerd. Diff-, secrets- en metadataresultaten en de CI op de definitieve head staan bij de Draft PR.
