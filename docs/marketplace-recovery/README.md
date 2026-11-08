# Marketplace-herstel van publicatie tot gunning

De herstelbranch begint op main `ecf2f578` en bevat de kwalificatieservices van Draft PR #114 op `abf3cc705c7e830edb6532504cc30d09d2b357ff`. De reviewdiff gebruikt #114 als basis. Het eerdere lokale auditbewijs staat op `e7961a9a89769fa78e993d432e56049aac0753ad`.

## Bevindingen en herstel

| Bevinding | Oorzaak en wijziging |
| --- | --- |
| M01 – werkgebied | Bij een fysieke opdracht maakte de oude expressie voor werken op afstand de geografische uitsluiting onbereikbaar. De matcher controleert nu eerst dienst, uitvoeringsvorm en dekking. Bij fysieke uitvoering zijn de provincie of landelijke dekking vereist. Onbekende provincie of meerdere fysieke locaties zonder bewezen volledige provinciedekking laten alleen landelijke dekking toe. Een combinatie met remote behoudt de fysieke eis. Expliciete remote-uitvoering gebruikt de bestaande remotelevering of het remote-werkgebied. Sector blijft een scorefactor. De aanvullende deskundigheid doorloopt dezelfde harde voorwaarden. |
| M02 – schorsing | Main miste de B4-controle van actuele besluiten en profielversie op meerdere ingangen. De kandidaat gebruikt de ongewijzigde B4-besluitvorming, vier ogen en de actuele projectie. Ook de laatste herlezing na drie transactieconflicten controleert opnieuw lidmaatschap, organisatie en projectie. Een nieuw geldig herstelbesluit levert een nieuwe projectie op. De oude uitnodiging blijft gesloten. |
| M03 – meldingen | Deelname en afwijzing gebruikten de interne Assignment-ID. Beide gebruiken nu de canonieke Request-ID, of bij een zelfstandige legacyopdracht de Assignment-ID. Eerder opgeslagen deelnamemeldingen worden bij het lezen binnen de toegestane opdrachtgevercontext vertaald. Het opgeslagen bericht blijft intact. Opdrachtgeversmeldingen voor selectie en offertes gaan naar actieve OWNER/ADMIN. Gunningsmeldingen gaan naar de professionele leden van de betrokken aanbieder. |

Nieuwe selecties bewaren regelversie `WORKMATCHR-RULES-2`. Historische beslisrapporten blijven leesbaar. Een beheerder kan geen nieuwe uitnodiging afleiden uit de oude geografische rangschikking. Bestaande uitnodigingen zijn niet achteraf ingetrokken. Controleer vóór uitrol of er nog open fysieke uitnodigingen onder de oude regel vallen.

## Geïsoleerde acceptatie

Alle gegevens waren synthetisch. De browser gebruikte een lokale productiebuild en loopback-PostgreSQL 18. De mailopvang simuleerde de provider. De financiële integratietest gebruikte de bestaande fake betaalgateway.

| Scenario | Waargenomen uitkomst |
| --- | --- |
| A – drie offertes | Drie organisaties geselecteerd, vier opt-in-mailontvangers. Drie aankopen van elk 27 testcredits, drie ingediende offertes, één gunning en twee afwijzingen. Herhaald accepteren laat één deelname en één afschrijving achter. |
| B – fysieke opdracht Utrecht | Aanbieder met uitsluitend Noord-Holland uitgesloten vóór de rangschikking, zonder score, uitnodiging of deelname. Een aparte PostgreSQL-proef selecteerde voor dezelfde provincie een landelijke aanbieder en sloot de regionale aanbieder met aanvullende expertise uit. Een lege selectie leverde nul uitnodigingen, mutaties en meldingen op. |
| C – schorsing | Een organisatieschorsing blokkeerde detail en aankoop op de bestaande uitnodiging zonder saldoverandering. Een afzonderlijke dienstschorsing via de bevoegde beoordelaars blokkeerde een bestaande betaalde deelname, conceptwijziging en indiening. Er bleef één afschrijving. Na vierogenherstel werkte de nieuwe projectie en bleef de oude link geblokkeerd. Ook platformbesluit, verval, gelijke ingangsdata en gelijktijdige herberekening doorliepen de B4-regressie. |
| D – tijdelijk falende e-mail | Vier unieke berichten bij vijf transportpogingen. De worker herstelde na HTTP 500. Eén aanbieder kocht en diende in, één wees af, de opdrachtgever gunde één offerte. Bij een verloren ontvangstbevestiging hield de fake provider de herhaalde poging idempotent. |

Een geïnjecteerde fout bij de databasecommit liet saldo, deelname en kanaal onveranderd. Gelijktijdige conceptwijzigingen gaven één geslaagde wijziging en één conflict. De PostgreSQL-suites controleerden ook het drieplaatsenplafond, ongewijzigde dossiersnapshots, auditregistratie, afgeschermde prijzen en tenantisolatie.

## Gecombineerde proef op locatie en B4-accountintegratie

Eén opdrachtgever publiceerde via de browser een fysieke opdracht in Utrecht. Drie aanbieders met Utrechtse of landelijke dekking doorliepen de hele keten. Een vierde had toepasselijke deskundigheid en bediende uitsluitend Noord-Holland.

| Controle | Bewijs uit browser en PostgreSQL |
| --- | --- |
| Matching en e-mail | Drie uitnodigingen en drie lokaal opgevangen mails aan de juiste professionals. Alle drie de links brachten de ontvanger na het inloggen terug naar de eigen uitnodiging. De vierde kandidaat had alleen de uitsluitingsreden `WERKGEBIED_PAST_NIET`, zonder rang of score. Voor deze professional waren er nul mails, uitnodigingen en deelnames. Het saldo bleef 200 testcredits. |
| Autorisatie | De uitgesloten professional kreeg via de link van een andere organisatie geen inzage of koopknop. Bij tijdelijke schorsing van een uitgenodigde organisatie weigerden de lees- en aankoopservice de bestaande uitnodiging. Er ontstond geen deelname of afschrijving. |
| Offertes en gunning | Elke deelnemer betaalde precies één keer 27 testcredits, bewaarde en heropende een concept en diende de offerte definitief in. De database bevatte drie verschillende ingediende versies, één gunning en twee afwijzingen. Zes opdrachtgevermeldingen voor deelname en indiening verwezen naar het offerteoverzicht van dezelfde opdracht. |
| Account en historie | Vanuit Account opende de professional via Organisatie de pagina Mijn dienstverlening. De vastgelegde dienst, sector en regio stonden aangevinkt, ook na het openen van de drie oude profielroutes. De dossierstatus was zichtbaar. PostgreSQL bevestigde behoud van de geverifieerde dienstrevisie, de sector- en regiorevisies, de oorspronkelijke beoordelingen en de vertrouwde projectie. De bestaande organisatie kreeg geen nieuw onboarding-event. |

Bij een afwijzing van alle gevraagde deskundigheden koos de matcher voorheen altijd de motivering van de primaire deskundigheid. Daardoor kon een aanvullende aanbieder die uitsluitend buiten het werkgebied viel, ook de melding krijgen dat de dienst ontbrak. De matcher verklaart de uitsluiting nu aan de hand van een daadwerkelijk aangeboden deskundigheid als die er is. Een geschikte primaire kandidaat houdt voorrang en een uitgesloten kandidaat krijgt geen score of uitnodiging. De PostgreSQL-regressie controleert de exacte reden en het uitblijven van een extra accountmelding.

[Mijn dienstverlening met bestaande keuzes](mijn-dienstverlening.png)

## Meldingen en browser

Zeven bestaande meldingstypen zijn bij de bedoelde ontvanger en een andere organisatie in Edge geopend. Het betrof primaire en aanvullende uitnodigingen, deelname, afwijzing van een uitnodiging, indiening, gunning en afwijzing van een offerte. Publicatie heeft een bevestigingspagina en een publicatie-event. De sluiting bij gunning heeft statushistorie en de meldingen over de afzonderlijke offertes. Er is geen extra berichttype toegevoegd.

De offerte en de vergelijking zijn gemeten bij 1414, 820 en 390 CSS-pixels en bij 707 CSS-pixels met echte 200% browserzoom (DPR 2). Op deze pagina's was de documentbreedte gelijk aan de viewportbreedte. De geteste WCAG A/AA-regels van axe rapporteerden nul overtredingen. Op elk formaat bereikte Tab vanaf de prijs de prijstoelichting. De volledige site en een handmatige schermlezerbeoordeling vallen buiten deze meting.

[Uitnodiging op mobiel](uitnodiging-mobiel.png) · [Gunningsresultaten op desktop](gunning-desktop.png) · [Vergelijking op tablet](gunning-tablet.png) · [Volledige Edge-viewport bij 200%](gunning-200-procent.png)

## Reproduceerbare controles

- Na de correctie van de afwijsmotivering zijn de 65 betrokken Vitest-bestanden opnieuw uitgevoerd. Alle 480 tests slaagden. De aangescherpte PostgreSQL-test controleerde ook de uitsluitingsreden en het aantal accountmeldingen.
- Eerdere volledige Vitest-suite met twee workers. 3432 geslaagd, 0 mislukt, 26 overgeslagen. De afzonderlijke PostgreSQL-harness test de databasegebonden routes.
- PostgreSQL met `test:db:assignment-notifications`, `test:db:marketplace-concurrency`, `test:db:requests`, `test:db:request-offer-slots` en `test:db:request-interests`. De eerste suite gebruikt de beperkte synthetische runtimerol en omvat 17 meldingsfixtures.
- B4 met `scripts/test-provider-offering-database.ts` op een lege loopback-database. Deze ingang controleert zowel de kwalificatie- als de onboardingmatrix.
- TypeScript, lokale productiebuild en ESLint. Vier bestaande lintwaarschuwingen in de authenticatieformulieren. De tijdelijke browserharness staat buiten de repositorycontroles.
- De GitHub Actions bij de head van de Draft PR geven het onafhankelijke CI-resultaat.

De kandidaat bevat geen Prisma- of schemawijziging. De herstelbranch is uitgesloten van automatische Vercel-deployments. Voor integratie op main is eerst een besluit over de B4-afhankelijkheid nodig.
