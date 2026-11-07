# B4 – Acceptatie kwalificatiebeheer en dashboard

Herstelronde op Draft PR #114 vanaf `d3745f343118c14c679f961c7162f17dafa12cea`. De proeven gebruiken synthetische organisaties en accounts, een loopbackserver, een lokale mailstub en tijdelijke PostgreSQL 18-databases. De lokale database bevat de 85 migraties uit het bestaande productieschemamanifest. Alle 85 SHA-256-checksums zijn vergeleken. Er is geen schemawijziging.

| Bevinding | Oorzaak | Herstel |
| --- | --- | --- |
| B4-FIX-01 | Na het dossierbesluit bood het beheer geen handeling voor een kwalificatiebesluit of het opbouwen van de selecteerbare projectie. De bestaande service legde evenmin de koppeling met de goedgekeurde dossierversie vast bij een positief platformbesluit. | Afzonderlijk platform- en dienstbesluit met onafhankelijke beoordelaar en goedkeurder, actuele grants, reden en geldigheid. De server controleert de laatst goedgekeurde kandidaat, tenant, profielversie en inhoudschecksum. Vervolgens bouwt een bevoegde goedkeurder readiness, selecteerbaarheid en projectie transactioneel op. |
| B4-FIX-02 | Het dashboard leidde afronding af uit het ontbreken van een blokkerende reden. Optionele rubrieken hebben per definitie geen blokkerende reden. | Dashboard en dossier lezen de feitelijke rubriekstatus uit dezelfde serverbeoordeling. Alleen de toepasselijke verplichte rubrieken tellen voor het percentage. De samenvatting toont dezelfde compleetheid als de checklist, ook bij een geschorst en daardoor niet-selecteerbaar profiel. |

## Keten met één nieuw account

1. Registreren via het browserformulier, de synthetische verificatielink openen, inloggen en een dienstverlenende organisatie aanmaken.
2. Bedrijfsgegevens, diensten met leveringsvormen, sectorervaring en werkgebied afronden. Heropenen, mobiel wijzigen en opnieuw bewaren. Toegang tot uitnodigingen blijft gesloten.
3. Voor de **bestaande aanvullende kwalificatievoorwaarden** zijn synthetische referentiedata en bewijzen aangebracht. Zes testverklaringen zijn via de bestaande service geaccepteerd. Diensten, werkgebied en verzekeringsbewijs zijn door een aparte reviewer geverifieerd. Deze fixture kent geen kwalificaties of selecteerbaarheid toe.
4. Dossier indienen, als reviewer de beoordeling openen en als onafhankelijke goedkeurder het dossier goedkeuren. Alleen dossiergoedkeuring geeft nog geen uitnodigingstoegang.
5. In beheer expliciet het platform en beide actieve diensten kwalificeren. Na het bijwerken van de selecteerbaarheid bestaan drie gedateerde besluiten voor dezelfde kandidaat, met reden en twee verschillende bevoegde actoren. Een organisatiegebruiker kan geen besluit registreren.
6. De testopdracht en uitnodiging zijn gekoppeld aan de actuele projectie van dezelfde dienstverlener. In de browser de uitnodiging openen, synthetische credits gebruiken, offerteconcept bewaren, zes velden heropenen, mobiel bijwerken en definitief indienen. De andere organisatie krijgt geen inzage. De opdrachtgever ziet het ingediende bedrag en gunt de offerte.
7. Na expliciete schorsing zijn het uitnodigingenoverzicht en de directe uitnodigingslink opnieuw afgeschermd. De server weigert ook de offertedetailroute. De ingediende offerteversie blijft intact.

## Gerichte bewijsstukken

| Controle | Resultaat |
| --- | --- |
| Leeg en gedeeltelijk nieuw dossier | Verplichte onderdelen staan open. Vier lege optionele rubrieken tonen **Optioneel · niet ingevuld**. Zonder toepasselijke verklaringen staat er **Niet van toepassing**. |
| Vier matchingonderdelen ingevuld | Precies vier verplichte onderdelen afgerond. Een leeg optioneel onderdeel telt niet mee. |
| Goedgekeurd dossier | Alleen werkelijk aangebrachte, voldoende onderbouwde gegevens veranderen de rubriekstatus. Een lege professionalrubriek blijft optioneel en leeg. |
| Bestaande organisatie en nieuw uitgenodigde professional | De oorspronkelijke gebruiker behoudt de bestaande negen controles. Voor de nieuw uitgenodigde professional gelden de vier matchingcontroles. |
| B4-FIX-00A/00B op PostgreSQL | Zes besluiten op een dienst uit een andere organisatie geweigerd zonder neveneffecten. Zes bevoegd genomen besluiten geaccepteerd. Vier ogen, gearchiveerde dienst, schorsing, herstel, verlopen en gelijktijdige besluiten, oude projecties, directe toegang en concurrerende herberekening gecontroleerd. |
| B4-FIX-01 op PostgreSQL | Niet-goedgekeurde, vreemde en verouderde kandidaat geweigerd. Wijziging van organisatiegegevens zonder profielversieverhoging gedetecteerd. Historische besluiten zonder kandidaat bieden een nieuw aangemelde organisatie geen toegang. |
| B3 op PostgreSQL | Uitnodiging, deelname, offerte-indiening, gunning en herhaling over tenants gecontroleerd. Bij twee gelijktijdige gunningen precies één effect. Ook 17 matchingfixtures en suites voor notificaties, interesse en offerteslots uitgevoerd. |
| Browser en toegankelijkheid | Microsoft Edge op desktop (1414 CSS-pixels), tablet (820), mobiel (390) en echte browserzoom 200% (707 CSS-pixels bij verdubbelde pixelratio). Op de aanbod-, kwalificatie- en offertepagina geen horizontale overflow of door axe gerapporteerde WCAG A/AA-overtredingen in de 12 gemeten weergaven. Tabvolgorde en zichtbare focus op formuliercontroles gecontroleerd. |

[Screenshot registratie](acceptance/b4/registratie-bevestiging.png) · [Dashboard](acceptance/b4/checklist-initial.png) · [Kwalificatiebesluiten](acceptance/b4/besluiten-goedgekeurd.png) · [Dienstverlening op tablet](acceptance/b4/dienstverlening-tablet.png) · [Beheer op 200%](acceptance/b4/kwalificatie-zoom.png) · [Mobiele offerte](acceptance/b4/offerte-mobile.png) · [Ingediende offerte](acceptance/b4/offerte-opdrachtgever.png) · [Gunning](acceptance/b4/offerte-gegund.png) · [Na schorsing](acceptance/b4/uitnodiging-na-schorsing.png).

## Tests en releasegrens

| Uitvoering | Geslaagd | Mislukt | Overgeslagen |
| --- | ---: | ---: | ---: |
| Volledige Vitest-suite | 3422 | 0 | 26 |
| Schedulerregressies (Node) | 14 | 0 | 0 |
| Gerichte B4/B3-selectie binnen Vitest, inclusief de eerdere 402 | 407 | 0 | 0 |
| PostgreSQL-suites voor dossier, Marketplace-concurrency, opdrachtnotificaties, interesse en slots | 5 | 0 | 0 |

De 26 skips behoren tot Knowledge en LMS. TypeScript en de productiebuild slagen. ESLint meldt vier bestaande navigatiewaarschuwingen in de authformulieren. De lokale PostgreSQL-driver meldt een deprecatiewaarschuwing bij bestaande overlappende queries. De synthetische databases, bijbehorende Docker-volumes en browsersessies zijn na de proef verwijderd.

Technisch advies voor B4 is **GO** wanneer de GitHub Actions op de definitieve commit groen zijn. Controleer vóór ingebruikname dat de beheeromgeving actuele inhoudelijke vereisten, een passende actieve kwalificatiereden en twee bevoegde beoordelaars heeft. Bij ontbreken daarvan blijft kwalificatie gesloten. Publicatie vereist een afzonderlijk besluit.
