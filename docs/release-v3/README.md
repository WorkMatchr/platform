# WorkMatchr V3.0 – integratiekandidaat

Doeldatum 1 januari 2027. Deze branch is uitgesloten van automatische Vercel-deployments. Test uitsluitend met een lege lokale PostgreSQL-fixture en synthetische accounts. Actuele testuitslagen horen bij de exacte head in de Draft PR.

## Herkomst

| Onderdeel | Vastgezette bron |
| --- | --- |
| main | ecf2f578c31f654298d4eaf071fc16b3022d5dd1 |
| B4, inclusief schorsing, herstel, vier ogen en dossierbinding | abf3cc705c7e830edb6532504cc30d09d2b357ff |
| Marketplace-herstel inclusief B4 | 199992b544d612dbf86463feca1cc1a0e40496a7 |
| ACCOUNT-01, apart overgenomen | e16be9632acbc99dbe81f779bad7651e8d06c750 |
| Marketplace-audit, bewijsbron | e7961a9a89769fa78e993d432e56049aac0753ad |
| Pre-launchaudit, bewijsbron | 52789518839927fa1d34e38d57e0ec6772bc45c4 |

## Profiel en toelating

ACCOUNT-02 beoordeelt de organisatie, sector, dienst met leveringsvorm en het werkgebied voor iedere dienstverlenende organisatie. De vijf aanvullende dossieronderdelen tonen hun feitelijke status. Een uitnodiging aan een medewerker verandert de vereisten voor de organisatie niet. Bestaande dossierrevisies en besluiten worden bij deze overgang alleen gelezen.

Ook een bestaande organisatie heeft voor deelname een in de tijd geldig platformbesluit en dienstbesluiten op dezelfde goedgekeurde dossierbasis nodig. De projectie moet bij de actuele profielversie horen. De afzonderlijke controle op gebruiker, lidmaatschap, rol en schorsing blijft gelden. Een oude projectie zonder bewijs geeft geen toegang. Bij ontbrekende gegevens vult de aanbieder het dossier aan en doorloopt de bestaande bevoegde beoordeling. Laat vóór uitrol per testorganisatie vaststellen welke stap nog openstaat.

## Financiële vrijgave

De pre-launchaudit reproduceerde verlies van een succesvolle verlenging na een eerdere mislukte poging, terugloop van de betaalde einddatum en statuswijziging door een laat mislukt bericht. De financiële diensten van deze kandidaat komen uit main. PR #104 en de geïntegreerde opvolgers bevatten afzonderlijke reparaties. Vereist zijn een geslaagde onafhankelijke proef voor elk van de drie scenario’s, met controle op periode, actuele status, één factuur, ledger, Jortt en idempotente replay, gevolgd door dezelfde proef op de geïntegreerde SHA. Tot dan geldt financieel NO-GO.

## Schone start – uitsluitend een voorstel

1. Platformbeheer bevriest een manifest van de goedgekeurde schema-, applicatie- en configuratieversies. De dry-run gebruikt uitsluitend een tijdelijke lokale fixture. Voer met psql de transactie in [de SQL-inventaris](../../ops/release-v3/clean-start-inventory.sql) uit. Bewaar alleen tellingen en schema-afhankelijkheden. Iedere onbekende of ongevalideerde relatie vereist beoordeling.
2. Kies bij afzonderlijke goedkeuring een **nieuw leeg doel**. Behoud de oorspronkelijke administratie geïsoleerd en herstelbaar, inclusief factuurreeksen, audit, dossiers, betalingen en wettelijke bewaarplichten. Controleer bewijs van herstel, rechtmatige bewaring en bevoegde beheerders vooraf. Laat finance per actieve of onzekere providerincasso de status bevestigen. Alleen een lege applicatiedatabase voorkomt een externe incasso niet.
3. Maak een expliciete toelatingslijst van referentiedata op tabel- én recordniveau. Controleer versie, checksums, bron, eigenaar, verwijzingen, gekoppelde bestanden en de afwezigheid van persoonsgegevens. Behoud alleen goedgekeurde cursusinhoud, toetsen, taxonomieën, prijscontracten en platformconfiguratie. Beoordelingen, certificaten van deelnemers, sessies, uploads van klanten, organisatiekoppelingen, testsaldi, aankopen en abonnementen horen niet in de nieuwe administratie.
4. Controleer inkomende en uitgaande foreign keys, unieke sleutels en externe referenties. Een afhankelijkheid van een testgebruiker of organisatie blokkeert overname totdat een beheerder de juiste bestemming onderbouwt. Alleen een bestaande leverancier, bank of boekhouder kan externe status bevestigen. Laat financiële nummerreeksen en open posten afzonderlijk aansluiten vóór enig verkeer. Geen hergebruik van testmandaten of herverzending van oude outboxrecords.
5. Bewijs op het lege doel nul klantaccounts, sessies, testcredits, open bestellingen, provideropdrachten en te verwerken outboxregels. Verifieer de aantallen en inhoudschecksums van de toegestane configuratie, cursussen, prijzen en taxonomie. De database-inventaris alleen bewijst deze eindtoestand niet. Platformbeheer en financiën tekenen ieder hun controles af. Bij verschil blijft het doel gesloten.
6. Voor daadwerkelijk omschakelen zijn afzonderlijke besluiten nodig voor archivering, aanmaken van het doel, een getest onderhoudsvenster inclusief alle schrijvers, providerafstemming en vrijgave. Na de eerste nieuwe boeking vereist terugkeer een gecontroleerde aansluiting van alle tussentijdse mutaties. Dit voorstel voert geen verwijderingen, kopieën of omschakeling uit.
