# Academy-content — eindcheckpoint

Datum: 2026-11-04. Branch `codex/academy-content-approval`, basis `c7e71db1f2850fbee50757b57c84ccf2607e6762`.

- WL-001 RI&E in de praktijk: nieuwe COURSE-1.0-DRAFT, 10 hoofdstukken, 457 blokken, 214 formatieve vragen, 50 examen, 100 retentie; 300 minuten geraamd. Alle 104 doelen vastgelegd, 18 summatieve hiaten en 25 gedeeltelijke bindingen open. Bestaande retentievolgorde/antwoorden/versies behouden; interne antwoordcodes niet verwarren met zichtbare antwoordposities.
- WL-002 Preventiemedewerker in de praktijk: nieuwe Draft 1.3 op bron1.2, 60 lessen, 342 blokken, 90 formatief, 50 examen, 100 retentie; 295 minuten geraamd. Alle 240 bronvragen behouden.
- WL-003 Veilig en gezond werken: nieuwe Draft 1.1 op bron1.0, 60 lessen, 321 blokken, 90 formatief, 50 examen, 100 retentie; 288 minuten geraamd. Drie gewijzigde vragen versie2; bronbestand ongewijzigd.
- Menselijke inhoudelijke/juridische en toetskundige vrijgave OPEN. Bereikbare officiële bronnen gecontroleerd; geconsolideerde wetten/AP/SER deels ontoegankelijk. Historische AI-bronnen niet als actuele wettelijke normen gebruikt.
- 29 gerichte tests PASS, drie bestaande importdry-runs PASS. Lint0errors/4bestaandewarnings; TypeScript0; buildexit0/3bestaandetracingwarnings. Definitieve hashes en resultaten in `validation.json`.
- Alle1120 blokken via bestaande renderer, lokale desktop/mobiel en toetsenbordhoofdstuklinks gecontroleerd. Statische review is geen ingelogde Academy-acceptatie. Geen echte cursus-pilot, schermlezertest of nieuwe200%-zoomclaim.
- Geen runtime-, seed-, migratie- of historische contentwijziging. Geen database gemaakt/gewijzigd; geen accounts, inschrijvingen, certificaten, betalingen, mails of productiepublicatie.

## Nog open in afzonderlijke LMS-integratie

`AcademyCourseBundle` heeft een rijker contract dan `AuthoringCourse`; de editor kan de geïmporteerde bundels niet verliesvrij bewerken. Importservice valideert PostgreSQL17/neondb, terwijl de lokale geïsoleerde acceptatieroute PostgreSQL18/een andere naam gebruikt. Guards niet omzeild. Geen inhoud naar één hoofdstukcheck teruggebracht.

## Hervatten

Lees `README.md` en de drie individuele reviewdossiers. Herhaal geen algemene LMS-suite. Eerst de bestaande integratieafhankelijkheden en menselijke review oplossen, dan synthetische beheerder-/cursistacceptatie van deze exacte bundels. Publicatie blijft NO-GO. Geen push, nieuwe PR, CI, merge of deployment uitgevoerd.

Checksumstrategie: waargenomen bestandshashes zijn van lokale bytes. Bronbehoudtests gebruiken daarnaast SHA-256 over UTF-8 met CRLF naar LF; importbundelchecksums volgen de bestaande canonieke JSON-strategie. Hierdoor veroorzaken Windows/Linux-regelafbrekingen geen inhoudelijke afwijking.
