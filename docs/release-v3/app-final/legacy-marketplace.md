# Uitfasering van interesse en betaalde offerteplaatsen

Nieuwe publicaties gebruiken de bestaande overdracht naar een Marketplace-opdracht. Bij een ouder adviesdossier kan de eigenaar via **Maak hiervan een opdracht** de intake met dossierkoppeling hervatten. Een herhaalde publicatie van een bestaande aanvraag geeft dezelfde referentie terug. Publicatie schrijft geen oude geschiktheidslijst meer.

De oude serveracties voor interesse en aankoop weigeren ook rechtstreeks aangeroepen verzoeken. Het archief onder **Werk → Eerdere aanvragen** toont alleen de eigen historie aan actieve organisatieleden. Een eigenaar of beheerder kan een bestaande onbetaalde interesse bij een nog gepubliceerde aanvraag intrekken. De oorspronkelijke plaats, de geregistreerde prijs en het auditspoor blijven behouden. Inzage in contactgegevens vereist nog steeds een geclaimde plaats, een actuele kwalificatie en de geldige selectie.

## Afhandeling per bestaande toestand

| Toestand | Afhandeling | Financiële controle |
| --- | --- | --- |
| Geen betaling of verplichting | Een oude interesse geeft geen uitnodiging. Dossiergebonden intake of bestaande bevoegde herstelservice alleen bij een ondubbelzinnige bron en zonder conflicterende historie. Daarna nieuwe scopecontrole en gekwalificeerde selectie. | Geen boeking bij omzetting of selectie. |
| Gereserveerde credits | Een CreditReservation hoort bij een ProviderParticipation. Controleer deelname, opdracht, reserveringsstatus en ledger. Bij een onduidelijke koppeling blijft het geval in beheer. | Geen tweede reservering, afschrijving of automatische vrijval door deze wijziging. |
| Afgeschreven credits of bestaande offerteplaats | Historische afhandeling met de oorspronkelijke organisatie, plaats, regelversie en boeking. Ook een plaats zonder verifieerbare prijs blijft bewaard. Bij een gekoppelde oude plaats of boeking blokkeren nieuwe selectie, vervangende uitnodiging en aankoop. | Beheer controleert de verplichting. Eventuele compensatie vereist een afzonderlijk besluit. Een reeds bestaande expliciete intrekking behoudt haar eigen contract en idempotente audit. |
| Ingediende offerte | Originele Quote en ingediende versie blijven gekoppeld aan de oorspronkelijke deelname. Een oude offerteplaats op zichzelf bewijst geen ingediende offerte. Buiten het platform aangeleverde offertes vereisen handmatige verificatie. | Geen nieuwe aankoop voor inzage of afhandeling. |
| Gegunde opdracht | Behoud de oorspronkelijke gunning, offertes, meldingen en betrokken organisaties. Geen herpublicatie, tweede gunning of automatische overdracht. | Historische boekingen blijven leidend. Geen automatische restitutie. |

Er is geen conversiescript, datamigratie of wijziging van bestaande klantrecords. De classificatie hierboven beschrijft hoe een aangetroffen geval behandeld moet worden. Er is geen inventarisatie van echte klantgegevens uitgevoerd.

Vóór commerciële omschakeling controleert de operator dat oudere deployments en directe clients het oude schrijfpunt niet meer kunnen uitvoeren. Bij een gemengde verplichting of onbekende schrijver blijft de betrokken opdracht gesloten.

## Laatste vrijgavecontrole en overdracht aan Chat 2

| Onderdeel | Technisch bewijs | Operationele voorwaarde |
| --- | --- | --- |
| Historische ingang | Ook een directe aanroep van de twee oude serveracties bereikt uitsluitend de gesloten services. De API-routes hebben geen schrijver voor interesse of offerteplaatsen. | Controleer elke externe ingang en directe deployment-URL; ook een door een beheerder bereikbare oude deployment telt als schrijver zolang de binding geldig is. |
| Nieuwe opdrachten | Canonieke publicatie en scopecontrole, dienstkwalificatie, selectie, uitnodiging en eenmalige deelnameaankoop. De integratieproef controleert beide offertestatussen na gunning. | Alleen de geaccepteerde build krijgt het commerciële schrijfaccount. |
| Historische verplichtingen | De PostgreSQL-proeven vergelijken afschrijving, nog actieve reservering, offerteversies en gunningsbesluit vóór en na directe oude aanroepen. De twee archiefsuites controleren de oorspronkelijke plaats, prijs en audit. | Leg bij de omschakeling een privaat voor/na-overzicht vast met aantallen, bedragen en referentie-integriteit per status. Onverklaarde verschillen blokkeren heropening. |
| Factuurmail | Zes gelijktijdige betaalcallbacks met afgewezen transport moeten één factuur, creditbijschrijving en faalregistratie achterlaten. Zes gelijktijdige herstelacties moeten één provideraanroep, één verzendregistratie en vijf idempotente antwoorden opleveren. | Bij een onzekere provideruitkomst de vaste sleutel en acceptatie bij de provider controleren voordat buiten de geldige deduplicatieperiode opnieuw wordt verzonden. |

De oorspronkelijke CI-assertie bewaarde uitsluitend een booleaanse uitkomst. Op PostgreSQL 18 leverde een korte invoegvertraging op de synthetische faalregistratie op de oude code vijf unieke-sleutelfouten op bij zes callbacks. De schrijfbewerking voor de faalregistratie is nu één conflictbestendige insert. Een aparte proef met gelijktijdig herstel liet bovendien zien dat zes wachtende transacties de fake provider konden aanroepen: hun serialiseerbare snapshot was al genomen bij het wachten op het factuurslot. Bij READ COMMITTED leest iedere verzender **na** het verkrijgen van hetzelfde transactieslot de inmiddels vastgelegde verzendregistratie. Dit verandert uitsluitend de transactie voor mailbezorging. Betaling, factuur en ledger behouden hun bestaande financiële transactie. De providersleutel per factuur blijft gelijk bij herstel na een verloren bevestiging. De tests geven geen afleveringsbewijs voor echte mail.

### Omschakeling

1. Breid het bestaande [schrijversmanifest](../../database-upgrade-preparation.md) uit met de toegestane releasecommit en de identiteit van elke oude build, alias, directe URL, rollbackversie, job, directe client, pool en effectieve databaserol. Een URL-wissel alleen laat bestaande verbindingen intact.
2. Bevestig dat uitsluitend de geaccepteerde versie toegang heeft tot de commerciële schrijfidentiteit. Gedeelde credentials, rol-lidmaatschap, overgeërfde secrets, pooler- en directe alternatieven tellen mee. Bij een gedeelde rol eerst een afzonderlijk geautoriseerde scheiding aanbrengen.
3. Sluit oude ingangen en nieuwe logins voor oude schrijvers volgens het runbook. Laat lopende transacties gecontroleerd afronden en sluit ook idle pools. Controleer onafhankelijk nul oude sessies en geen herverbinding. Reeds geauthenticeerde clients verliezen hun bestaande sessie niet uitsluitend door NOLOGIN. Behoud historische opslag en bevoegde archiefinzage.
4. Verifieer als operator tegen de bedoelde omgeving de geweigerde verbinding van elke oude writer-identiteit en de effectieve identiteit van de kandidaat. Bewaar het geaggregeerde bewijs privé. Een onbekende schrijver, actieve oude sessie, bereikbare oude schrijfidentiteit of onverklaarde boeking betekent STOP.
5. Open alleen de nieuwe schrijver na afzonderlijk besluit. Bij rollback eerst weer sluiten en de ledger reconciliëren. Een oude build met de historische aankoopservice mag geen schrijfidentiteit terugkrijgen. Meldingen, financiële provideropvolging en reeds afgegeven rechten blijven in het overdrachtsmanifest.

### Uitgevoerd vrijgavebewijs

- Twee onafhankelijke PostgreSQL 18-runs met synthetische gegevens gaven elk zes verwachte bezorgfouten, één faalregistratie en één aankoop, factuur en creditbijschrijving. Bij zes gelijktijdige herstelverzoeken per run volgden één aanroep van de fake provider, één verzendregistratie en vijf idempotente antwoorden. Beide runs doorliepen ook selectie, uitnodiging, credits, offerte en gunning.
- De PostgreSQL-concurrencytest bevestigde behoud van historische afschrijving, actieve creditreservering, beide offerteversies en het gunningsbesluit na beide oude serviceaanroepen. Herhaalde deelname, indiening en gunning hielden één effect.
- Alle 15 gerichte unit-tests slaagden. De twee oude serveracties zijn rechtstreeks aangeroepen met een geldige synthetische autorisatie. Ze gebruikten de eigen organisatie en eindigden in het archief.
- De bestaande synthetische schrijfpauzetest stopte bij een onbekende schrijver en bij achtergebleven verbindingen. Oude logins werden geweigerd en zes synthetische HTTP-ingangen, inclusief de directe legacy-ingang, bleven tijdens de pauze gesloten. De daadwerkelijke productieafscherming blijft een afzonderlijk bewijsstuk voor Chat 2.
- Twee afzonderlijke, aangemelde formulier-POSTs tegen de lokale productiebuild kregen HTTP 400 van Next.js vóór afhandeling. De aantallen in alle zeven gecontroleerde tabellen bleven gelijk. De directe actietests hierboven bewijzen apart de weigering in de applicatie. De tijdelijke PostgreSQL 18-container is verwijderd.
