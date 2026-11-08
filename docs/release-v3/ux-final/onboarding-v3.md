# V3.0 — standaardtoelating en dienstspecifieke kwalificatie

De standaardtoelating heeft vier verplichte matchingonderdelen: organisatiegegevens, sector, dienst met leveringsvorm en werkgebied. Dit besluit vervangt de algemene polis- en verklaringsplicht uit de eerdere browserproef op `ca954abc`. De bevestigingen bij registratie, organisatieaanmaak en dossierindiening blijven onderdeel van die handelingen.

| Onderwerp | Geldende beoordelingsregel |
|---|---|
| Volledigheid en gereedheid | Dossier en gereedheidsberekening gebruiken dezelfde vier controles voor dienstverlenende organisaties. |
| Platform | Actuele goedgekeurde indiening, bevoegde beoordelaar, onafhankelijke goedkeurder, geldige verificatie van matchinggegevens en een expliciet platformbesluit. Een compleet dossier op zichzelf opent geen uitnodigingen. |
| Optioneel dossier | Verzekeringen, professionals, diploma’s, afzonderlijke dossierverklaringen en bewijsstukken blijven beschikbaar onder hun bestaande rechten. Historische registraties en auditbesluiten blijven bewaard. |
| Dienst en specialisme | De actuele gepubliceerde vereisten bepalen of aanvullende kwalificaties, geldigheidsdata of beroepsaansprakelijkheid nodig zijn. De goedkeurder ziet de toepasselijke vereisten per dienst. Ontbrekende configuratie blokkeert het dienstbesluit. Een regel met uitsluitend optionele kwalificaties staat een apart dienstbesluit zonder aanvullende stukken toe. |
| Vereist beroepsbewijs | Een verplichte kwalificatie moet tot de juiste organisatie of een aan de dienst gekoppelde professional behoren. Waar documentcontrole vereist is, worden actuele revisie, schone scan, herkomst, beoordelaar en geldigheid gecontroleerd. |
| Verplichte beroepsaansprakelijkheid | Alleen bij een toepasselijke dienstregel met `requiresProfessionalLiability` geldt de gepubliceerde dekkingsnorm voor `PROFESSIONAL_LIABILITY`. Ontbrekende normen of een onvoldoende onderbouwde polis blokkeren het dienstbesluit. |
| Deelname | Afzonderlijke platform- en dienstbesluiten, actuele selecteerbaarheid en schorsingscontroles blijven vereist. |

## Geïsoleerde acceptatie

De lokale browserproef gebruikte één nieuw geregistreerde professional, een afzonderlijke opdrachtgever, twee bevoegde testbeheerders, lokale verificatiemail en tijdelijke PostgreSQL 18. Vóór registratie werd voor de synthetische standaarddienst een gepubliceerde referentieregel zonder verplicht beroepsbewijs klaargezet. Dit is testbeleid en bepaalt geen wettelijke vrijstelling voor een echte dienst.

- Het nieuwe account heeft via de browser de organisatie en vier matchingonderdelen ingevuld en het dossier ingediend. Het dossier bevatte geen verzekering, diploma, afzonderlijke professional, bewijsstuk of geaccepteerde dossierverklaring.
- De beoordelaar heeft de vier ingediende dienst-, sector- en werkgebiedrevisies geverifieerd. Een verlopen verificatie werd geweigerd. Een andere beheerder heeft het dossier goedgekeurd en afzonderlijk het platform en de dienst gekwalificeerd. Na uitsluitend dossiergoedkeuring bleef de directe uitnodigingsroute gesloten.
- De beheerder kende via financieel beheer een synthetisch creditsaldo toe. De opdrachtgever publiceerde een opdracht en startte de selectie. De professional opende de uitnodiging, besteedde credits, bewaarde en heropende het offerteconcept en diende de offerte in. De opdrachtgever gunde de offerte met de knop **Deze offerte gunnen**. De gebruikersroute gebruikte geen databasecorrectie of vooraf ingevoerde beoordelaarsverificaties.
- In een afzonderlijke PostgreSQL-proef kreeg de organisatie het platformbesluit maar weigerde de kwalificatieservice de daadwerkelijk vereiste ontbrekende beroepskwalificatie. Er werd geen positief dienstbesluit voor die kandidaat vastgelegd. De regressie controleerde onder meer vier ogen, ingetrokken toegang bij schorsing, oude projecties en tenantisolatie.
- Lokaal slaagden 425 tests in 72 bestanden, de PostgreSQL-suite voor providerkwalificatie en de productiebuild inclusief TypeScript. Lint gaf nul fouten en vier bestaande waarschuwingen in authenticatiecomponenten. Turbopack rapporteerde drie tracingwaarschuwingen.
- De browserautomatisering verwachtte na de selectiestart aanvankelijk het selectiescherm terwijl de applicatie naar de offertes ging. Een aanvullende controle bevestigde de selectie, de bewaarde status Gegund bij de opdrachtgever en de gunningsmelding waarmee dezelfde professional de gegunde offerte opende. De lokale inloglimiet bleef actief.

Voor commerciële vrijgave moet het inhoudelijk bevoegde beheer de daadwerkelijke eisen per aangeboden dienst en specialisme vaststellen en publiceren. De uploadvoorziening blijft gesloten voor diensten die daadwerkelijk een nieuw gecontroleerd document nodig hebben.
