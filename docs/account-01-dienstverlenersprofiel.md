# ACCOUNT-01 — Account en dienstverlenersprofiel

Lokale integratie op `codex/account-01-provider-interface`. Vergeleken met `main` op `ecf2f578`, PR #114 op `abf3cc70` en de lokale Marketplace-herstelbranch met dezelfde basis. De integratiedelta raakt uitsluitend presentatie, navigatie en tests. Het databaseschema, de opslagservices en de toelatingsbesluiten zijn gelijk aan de B4-basis.

## Account- en organisatieroutes

De inventaris op main bevat 24 pagina's onder account, organisatie, dashboard en aanbiedersdossier. Alle 24 routebestanden blijven bestaan.

| Pagina's | Main | B4 en ACCOUNT-01 |
| --- | --- | --- |
| Account en beveiliging | Persoonlijke instellingen en sessies | Dezelfde routes. Persoonlijke instellingen, uitloggen en financiële navigatie blijven onafhankelijk van het dossier bereikbaar. |
| Organisatie, nieuw, profiel, gebruikers | Zakelijke stamgegevens, organisatiesectoren, medewerkers en oude dienstverlenerstatus | De organisatiepagina verwijst de professional naar de actuele dossierbeoordeling. De organisatiesectoren blijven gescheiden van de sectorervaring voor matching. Medewerkersbeheer behoudt zijn rolcontrole. |
| Dashboard, dashboard/compliance | Marketplace-overzicht en afzonderlijke Compliance-pagina | Het providerdashboard toont de cohortgebonden checklist. Dashboard en dossier gebruiken dezelfde labels voor selecteerbaarheid, inclusief geblokkeerde en verouderde gegevens. Compliance is ongewijzigd. |
| Dossieroverzicht, bedrijfsgegevens, profiel en voorvertoning | Dossier, bedrijfsgegevens en afzonderlijke profielpresentatie | De presentatie blijft afzonderlijk te bewerken. De invulhulp voor de presentatie heeft een eigen label. De dossiersidebar geeft de presentatie geen afgeleide gereedstatus. |
| Diensten en ervaring, diensten, sectorervaring, werkgebied | Overzicht met afzonderlijke invoerpagina's | Eén versiegecontroleerd formulier voor diensten, specialismen, leveringsvormen, sectorervaring en werkgebied. Open acties wijzen direct naar het juiste veldblok. De drie oude URL's blijven doorverwijzen. |
| Professionals, nieuw, detail en kwalificaties per professional | Afzonderlijke, afgeschermde dossiers | De checklist opent ook reeds ingevulde en optionele rubrieken. Kwalificaties per persoon blijven bereikbaar via de professionalslijst. |
| Verzekeringen, bewijsstukken, verklaringen, controleren | Bewijs, verklaringen en beoordeling met eigen routes | De bestaande services blijven verantwoordelijk voor inzage, sectiesloten en historische versies. Niet-toepasselijke checklistregels hebben geen bewerklink. |

De bovenste organisatienavigatie houdt de snelkoppeling naar Mijn dienstverlening buiten het dossier. Binnen het dossier staat die bestemming in de dossiernavigatie. Het organisatieblok in de zijbalk toont de actieve organisatie en rol. De eerder ook aan alleen-lezenleden getoonde beheerlink is verwijderd.

## Cohorten en overgangsvoorstel

- Bij een nieuwe dienstverlenende organisatie tellen bedrijfsgegevens, diensten met leveringsvormen, sectorervaring en werkgebied. Een volledig dossier geeft op zichzelf geen platformkwalificatie of recht op een opdracht.
- Bij een bestaande organisatie blijft de checklist voor bestaande gebruikers negen rubrieken tellen. Een later uitgenodigde professional kan de vier controles krijgen door diens eigen provisionering. De toelating van andere leden volgt hun bestaande grondslag. Een actueel schorsings- of vervalbesluit blijft bindend.
- Behoud voorlopig de huidige cohorten. Stel vóór een mogelijke overgang een alleen-lezen telling op van organisaties en betrokken leden per cohort, met ontbrekende gegevens en de verwachte gevolgen voor bestaande uitnodigingen en offertes. Laat de Product Owner doelgroep, ingangsdatum, communicatie en uitzonderingen expliciet vaststellen. Vergelijk voor en na een synthetische proef dezelfde dossierversies, kwalificatiebesluiten, bewijsverwijzingen, verklaringen en Marketplace-toegang. Stop bij onverklaarde verschillen. Deze wijziging bevat geen omzetting, backfill of herbeoordeling.

## Acceptatie


| Controle | Bewijs op de ACCOUNT-01-kandidaat |
| --- | --- |
| Routes | Dezelfde 24 routepaden op main en de kandidaat. De routes voor accountbeveiliging, medewerkers, professionals, individuele kwalificaties en bewijsstukken blijven bestaan. |
| Regressie | 448 gerichte Vitest-tests in 79 bestanden en 14 schedulertests geslaagd. Geen mislukkingen of skips in deze selectie. |
| PostgreSQL 18 | Alle 85 migraties zijn op een lege loopback-database uitgevoerd en tegen het bestaande checksumregister gecontroleerd. De offering- en onboardingproef verifieert versieconflicten, behoud van geverifieerde revisies bij een profielwijziging, archiveren en herstellen, sectiesloten, vierogenbesluiten, schorsing, tenantisolatie en de verschillende cohortregels. |
| Bronkwaliteit | Productiebuild geslaagd, inclusief 172 statische pagina's. Afzonderlijke TypeScript-controle geslaagd. ESLint op de projectbron gaf nul fouten en vier bestaande navigatiewaarschuwingen in de authformulieren. De eerste lintuitvoering nam tevens twee CommonJS-imports in de tijdelijke lokale mailstub mee. |

| Browser, nieuw | Ingelogd in Edge met een synthetische professional. Organisatie aangemaakt, directe uitnodigingsroute afgeschermd, vier rubrieken afgerond, bijgewerkt op mobiel en heropend. Vier verplichte rubrieken afgerond, vier optioneel leeg en twee niet van toepassing. Dezelfde labels op dashboard en dossier. Geen horizontale overflow of door axe gevonden WCAG A/AA-overtredingen op 1414, 820, 390 en 707 CSS-pixels (200% browserzoom). |
| Browser, bestaand | Synthetische legacy-eigenaar op desktop en mobiel. Negen verplichte rubrieken op dashboard en dossier. Vanuit de organisatiepagina naar de dossierstatus en verzekering genavigeerd. Uitnodigingen bleven toegankelijk. Een sector gewijzigd, heropend en teruggezet. De geselecteerde waarden kwamen na herladen overeen met de beginsituatie. Geen gemeten overflow of axe-overtredingen op beide schermformaten. |
| Testafwijking | De eerste legacy-browserassertie vond nul verplichte regels. De tijdelijke controle wachtte aanvankelijk niet op de checklist. Na toevoegen van die wachtstap bleek de vergelijkingswaarde ook een verkeerd gecodeerd scheidingsteken te bevatten. Na correctie van de test is de complete proef voor beide cohorten opnieuw geslaagd. |
| Opruiming | De tijdelijke loopbackserver is beëindigd en de afzonderlijke PostgreSQL-testcontainers zijn met hun eigen volumes verwijderd. |

## Integratiebesluit

**GO voor ACCOUNT-01 op B4-commit abf3cc70.** De actuele Marketplace-herstelworktree bevatte daarnaast lokale wijzigingen zonder nieuwe kandidaatcommit. Een patchcontrole tegen die werkbestanden is alleen bewijs van toepasbaarheid. Voer bij een vastgelegde nieuwere Marketplace-commit de geïntegreerde account-, uitnodigings- en dossierproef uit vóór gezamenlijke vrijgave. Een eventuele omzetting van bestaande organisaties is een afzonderlijk Product Owner-besluit.

## Gewijzigde bestanden

- `docs/account-01-dienstverlenersprofiel.md`
- `src/app/aanbiedersdossier/bedrijfsgegevens/page.tsx`
- `src/app/aanbiedersdossier/layout.tsx`
- `src/app/aanbiedersdossier/profiel/page.tsx`
- `src/app/organisatie/page.tsx`
- `src/components/layout/account-navigation-integration.test.tsx`
- `src/components/layout/account-workspace-shell.tsx`
- `src/components/layout/workspace-shell.test.tsx`
- `src/components/layout/workspace-shell.tsx`
- `src/components/marketplace/marketplace-dashboard.tsx`
- `src/components/organizations/organization-form.tsx`
- `src/components/providers/provider-completeness.test.tsx`
- `src/components/providers/provider-completeness.tsx`
- `src/components/providers/provider-dossier-navigation.tsx`
- `src/lib/providers/provider-dossier-open-actions.test.ts`
- `src/lib/providers/provider-dossier-open-actions.ts`
