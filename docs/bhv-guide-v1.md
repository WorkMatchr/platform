# BHV-wijzer v1

## Doel en begrenzing

De BHV-wijzer is een gratis, indicatieve Arbo-wijzer voor werkgevers. De wijzer helpt de samenhang beoordelen tussen RI&E/restrisico’s, geloofwaardige incidentscenario’s, taken, feitelijke inzetbaarheid, middelen, opleiding, oefenen en bijstellen. De uitkomst is geen formele toets, certificering of garantie.

De wijzer berekent bewust geen exact aantal BHV’ers en gebruikt geen historische verhouding zoals één BHV’er per aantal werknemers. Aantallen opgeleide en minimaal feitelijk aanwezige BHV’ers zijn contextinformatie; dekking wordt daarnaast beoordeeld op werktijden, locaties, pauzes, vervanging en gelijktijdige taken.

## Versie en besliscontract

- Wijzerversie: `1`.
- Rapportversie: `1.0`.
- Statussen: `ORDER`, `ACTION`, `CHECK`, `NOT_APPLICABLE`.
- Resultaatcodes: `BHV_ORGANISATION`, `AVAILABILITY_COVERAGE`, `ALARM_COMMUNICATION`, `FIRST_AID`, `FIRE_EVACUATION`, `SELF_RELIANCE`, `EQUIPMENT_PROVISIONS`, `TRAINING_EXERCISES`, `EMERGENCY_SERVICES_COORDINATION`, `RIE_CHANGE_MANAGEMENT`.
- Antwoorden zijn uitsluitend begrensde aantallen en vaste keuzen `YES`, `NO`, `UNKNOWN`; vrije persoonsgegevens zijn niet nodig.

Een duidelijk ontbrekende voorziening geeft `ACTION`. Onbekende of onvoldoende aantoonbare informatie geeft `CHECK`. Alleen samenhangende positieve antwoorden geven `ORDER`. Bij bijzondere scenario’s schrijft WorkMatchr geen specialistische middelen voor: de uitkomst verlangt dan een passende deskundige beoordeling.

## Zes stappen

1. Organisatie en aanwezigheid.
2. Locatie en zelfredzaamheid.
3. Risico’s en incidentscenario’s.
4. Feitelijke dekking en organisatie.
5. Middelen en voorzieningen.
6. Opleiding, oefenen en verbeteren.

Vragen over buitenuren en spreiding verschijnen alleen wanneer de eerdere context die relevant maakt. Na een stapwissel scrollt de container naar de kop, respecteert de wijzer `prefers-reduced-motion` en verplaatst de toetsenbordfocus naar de nieuwe staptitel.

## Bronnen

De publieke broncatalogus bevat de actuele Arbeidsomstandighedenwet, officiële BHV-uitleg en de werkinstructie bedrijfshulpverlening van de Nederlandse Arbeidsinspectie. AI-10 Bedrijfshulpverlening (Sdu Uitgevers, 2001) is uitsluitend als historische aanvullende vakbron opgenomen en vervangt geen wettelijke grondslag. De gedeelde bronselectie toont alle gebruikte wetgeving, maximaal één rechtstreeks relevante richtlijn en maximaal één aanvullende bron. Bronnen worden op centrale bron-ID gededupliceerd en de geselecteerde bronmetadata, inclusief categorie, wordt in ieder nieuw opgeslagen rapport gesnapshot.

De BASIC PDF gebruikt dezelfde bronselectie als het webresultaat en het centrale officiële WorkMatchr-logo. De eerste pagina bevat alleen rapportmetadata en samenvatting; de detailresultaten beginnen altijd op een nieuwe pagina. Bestaande immutable rapporten blijven hun eerder opgeslagen bronselectie behouden.

## Rapportage en historie

Het BASIC-rapport gebruikt dezelfde deterministische rapportprojectie als scherm en historie en bevat managementsamenvatting, scenario’s, de tien resultaten, aandachtspunten, bronnen en disclaimer. Aangemelde gebruikers krijgen via het bestaande `ArboGuideRun`-fundament een immutable snapshot en rapportnummer `BHV-YYYY-NNNNNN`. Anonieme gebruikers kunnen dezelfde basis-PDF downloaden zonder opslag. `EXTENDED` blijft voorbereid maar niet beschikbaar.

De Advieswijzer ontvangt alleen de centrale context-ID `BHV`; antwoorden of gevoelige informatie komen niet in de URL.
