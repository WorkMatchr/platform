# F4 — Knowledge-claimreview en publicatiecontrole

18 oktober 2026 · PR #49 / issue #48 · **NO-GO voor inhoudelijke frameworkpublicatie.**

## Bewijsgrens

Read-only productie-inventaris: 46 claims, 85 toegepaste migraties. Geen framework 2.1 en geen claim gepubliceerd. De [volledige claiminventaris](compliance-f4-claim-review.json) bevat de werkelijk aangetroffen claim-, citatie- en bronrevisie-ID’s, hashes en statussen. Dit is geen juridische goedkeuring. Alle 46 zijn DRAFT / UNVALIDATED / HISTORICAL / OUTDATED; alle bronrevisies vragen review, alle citatiefragmenten vragen review, menselijke goedkeuring ontbreekt en copyrightcontrole is niet voltooid. Alle hebben een historische citatie; de ontbrekende citatie is een **actuele, beoordeelde primaire** onderbouwing, niet noodzakelijk een ontbrekend historisch record. Het bestaande historische materiaal blijft behouden.

De [141-regelmatrix](compliance-f4-legal-matrix.json) bevat per regel de uitspraak, artikel/lid, exacte condities, alle antwoorduitkomsten, vervolgactie, bronrevisie-/fragmentreferenties en templatehash. `legalConclusionSupported=false` betekent: geen publiceerbare juridische binding; het is geen ontkenning dat de genoemde wet bestaat. De 107 bestaande kandidaatblokken zijn terug te vinden met hun werkelijke sectiepad en hash in [de broninventaris](compliance-f4-source-evidence.json). De twee huidige wetsimports staan nog op REVIEW_REQUIRED. Webpagina’s zijn geen stilzwijgend aangemaakte Knowledge-revisies.

## Alle 46 claims

CANDIDATE = inhoudelijk aanknopingspunt na menselijke review; geen toestemming om de bestaande historische claim te promoveren. OUTSIDE_F4 = geen passende zelfstandige regel in deze 141-regelset, afzonderlijke specialistische review nodig. CONTEXT = geen zelfstandig nalevingsbewijs. REWRITE_REVIEW = betekenis/type moet inhoudelijk worden afgebakend. HISTORICAL_ONLY/EXTRACTION_REVIEW = niet hergebruiken als actuele norm. Ook een kandidaat moet via het bestaande versie-/reviewproces een actuele, passende claimbinding krijgen.

| Bestaande sleutel | Beoordeling | Concrete resterende review / kandidaatgrondslag |
| --- | --- | --- |
| ai-01:c1 | CONTEXT | Praktische context; geen zelfstandige wettelijke eis aan een managementsysteem. AW 3; arbobeleid. |
| ai-01:c2 | CONTEXT | PDCA is een mogelijke werkwijze; de cyclus zelf niet als wettelijk verplicht beoordelen. AW 3 lid 4; AW 5 lid 4. |
| ai-01:c3 | CANDIDATE | Actuele normen en prioritering zijn bruikbaar voor RI&E, maar claimtype INSPECTION_POINT bewijst geen wettelijke plicht. AW 5 leden 1–4. |
| ai-01:c4 | CANDIDATE | Werkgeversverantwoordelijkheid onderscheiden van gedelegeerde uitvoering; concrete actuele wettelijke claim ontbreekt. AW 3 leden 1 en 3. |
| ai-01:c5 | REWRITE_REVIEW | Inbreng werknemers niet verwarren met gecertificeerde toetsing; huidige formulering vraagt afbakening. AW 12, 13 en 14. |
| ai-01:c6 | CONTEXT | Samenwerking kan toelichting geven; draagvlak is geen zelfstandig nalevingscriterium. AW 12. |
| ai-01:c7 | CANDIDATE | Kandidaat voor praktische taakbewaking CW2-PVA-03; geen algemeen verplicht formulier of budgetbedrag afleiden. AW 3 lid 3; AW 5 lid 3. |
| ai-01:c8 | CANDIDATE | Effectiviteit/actualisatie beoordelen met huidige omstandigheden; geen vaste universele frequentie afleiden. AW 3 lid 4; AW 5 lid 4. |
| ai-02:c1 | OUTSIDE_F4 | Gezondheidsclaim vraagt actuele ergonomische onderbouwing; geen van de 141 regels beoordeelt deze individuele blootstelling. AB 5.9; Arboportaal beeldschermwerk. |
| ai-02:c2 | OUTSIDE_F4 | Ergonomische maatregel; toepasselijkheid en huidige inrichtingseisen separaat beoordelen. AB 5.12; Arboregeling 5.1. |
| ai-02:c3 | OUTSIDE_F4 | Maatvoering niet uit publicatie uit 2000 als actuele norm overnemen. AB 5.12; Arboregeling 5.1. |
| ai-02:c4 | OUTSIDE_F4 | Houding en invoermiddelen zijn situatieafhankelijk; geen universele numerieke norm. AB 5.12; Arboregeling 5.1. |
| ai-02:c5 | OUTSIDE_F4 | Taakafwisseling heeft actuele wettelijke context; duur en toepasselijkheidsuitzonderingen apart controleren. AB 5.8 en 5.10. |
| ai-02:c6 | OUTSIDE_F4 | Softwaregeschiktheid is contextafhankelijk; geen ongedocumenteerde productiviteitstoets. Arboregeling 5.3. |
| ai-02:c7 | HISTORICAL_ONLY | Expliciet historisch normenoverzicht; uitsluitend archief. Niet promoveren tot actuele norm. Historische editie; actuele normen niet vastgesteld. |
| ai-02:c8 | HISTORICAL_ONLY | Historische checklist/score niet gevalideerd als actuele beoordelingsmethodiek. AB 5.9 biedt geen validatie van deze score. |
| ai-03:review:c1 | OUTSIDE_F4 | Materiaalherkenning/asbestinventarisatie vraagt deskundigheid en actuele uitzonderingen; geen F4-regel. AB hoofdstuk 4 afdeling asbest; exact toepasselijk artikel nog te verifiëren. |
| ai-03:review:c2 | OUTSIDE_F4 | Kritieke gezondheidsclaim: actuele medische onderbouwing én onafhankelijke bron vereist; niet beschikbaar in claimbinding. Actuele primaire medische bron ontbreekt. |
| ai-04:review:c1 | OUTSIDE_F4 | Blootstellingsmeting afhankelijk van werkelijke geluidsrisico's; oude grenswaarden niet hergebruiken. AB 6.7; exacte voorwaarden opnieuw beoordelen. |
| ai-04:review:c2 | OUTSIDE_F4 | Arbeidshygiënische volgorde bruikbaar; directe actuele claim ontbreekt. AB 6.8. |
| ai-05:review:c1 | OUTSIDE_F4 | Kritiek beslotenruimterisico: ventilatie alleen is geen veiligverklaring; specialistische meet-/reddingsvoorwaarden ontbreken. AB 3.5g; Arboportaal verstikkingsgevaar. |
| ai-05:review:c2 | OUTSIDE_F4 | Redding besloten ruimte is niet gedekt door algemene BHV-claim; aparte deskundige review en tweede onafhankelijke bron. AB 3.5g; AW 15. |
| ai-06:review:c1 | OUTSIDE_F4 | Substitutie-eis kent actuele stof-/technische context; historische categorieën niet overnemen. AB 4.17; Arboportaal kankerverwekkende stoffen. |
| ai-06:review:c2 | OUTSIDE_F4 | Hiërarchie maatregelen niet reduceren tot voldoende PPE; actuele blootstellingsvoorwaarden ontbreken. AB 4.18; AW 3 lid 1 onder b. |
| ai-07:review:c1 | OUTSIDE_F4 | Comfortbeleving is geen zelfstandig juridisch temperatuurcriterium. AB 6.1; exacte comfortclaim nog te verifiëren. |
| ai-07:review:c2 | OUTSIDE_F4 | Aanbevolen daglicht/uitzicht niet presenteren als onvoorwaardelijke eis voor elke scheidingswand. AB 6.3; toepasselijkheid en uitzondering nog te verifiëren. |
| ai-08:review:c1 | OUTSIDE_F4 | Taakvariatie als maatregel vraagt actuele risico-inventarisatie; geen vaste wettelijke wisselfrequentie afleiden. AB 5.2 en 5.3. |
| ai-08:review:c2 | OUTSIDE_F4 | Werkhoogte afhankelijk van taak/persoon; oude maatvoering geen actuele universele norm. AB 5.2 en 5.3. |
| ai-09:review:c1 | OUTSIDE_F4 | Blootstelling/categorieën van agentia afzonderlijk vaststellen; algemene F4-vragen bevatten die feiten niet. AB 4.85; Arboportaal biologische agentia. |
| ai-09:review:c2 | OUTSIDE_F4 | Maatregelenhiërarchie vraagt werkelijke blootstelling en huidige classificatie. AB 4.87; Arboportaal maatregelen biologische agentia. |
| ai-10:c1 | CANDIDATE | Werkgeversverantwoordelijkheid kan worden hergebruikt als context na actuele review; uitbesteding is geen algemene vrijstelling. AW 15 lid 1. |
| ai-10:c10 | CONTEXT | Hoofd-BHV/overdracht niet als algemene wettelijke organisatiestructuur gebruiken; lokale afspraken nodig. AW 15 ondersteunt niet automatisch deze bevelstructuur. |
| ai-10:c2 | CANDIDATE | Scenario's helpen risicogebaseerde organisatie; geen verplicht standaardformat. AW 15 lid 3 en AW 5. |
| ai-10:c3 | CANDIDATE | Alleen risicogebaseerde bezetting; oude 1:50-norm uitdrukkelijk niet hergebruiken. AW 15 lid 3. |
| ai-10:c4 | CANDIDATE | Niet-zelfredzaamheid is scenariofactor, geen zelfstandig bewijs dat BHV voldoet. AW 15 lid 2 onder c en lid 3. |
| ai-10:c5 | CONTEXT | BHV-plan is praktische invulling; geen universele afzonderlijke planplicht uit historische lijst afleiden. AW 15; sectorspecifieke eisen afzonderlijk. |
| ai-10:c6 | CANDIDATE | Alarmeringsmiddelen afhankelijk van risico's en bereikbaarheid; concrete inrichting controleren. AW 15 leden 2–3. |
| ai-10:c7 | REWRITE_REVIEW | Historische indeling in vier taken niet gelijkstellen aan de actuele wettelijke opsomming. AW 15 lid 2 onder a–c. |
| ai-10:c8 | CANDIDATE | Opleiding afgestemd op risico/taak; geen universele herhalingsfrequentie of certificeringsplicht claimen. AW 15 lid 3. |
| ai-10:c9 | CONTEXT | Scenario-oefening is praktische methode; aanwezigheid van oefenplan geen nalevingsbewijs. AW 15 lid 3. |
| ai-11:review:c1 | EXTRACTION_REVIEW | Fragmentsectie is 'NEE': mogelijke extractie-/contextfout. Eerst originele passage valideren, geen conclusie uit kop. AB hoofdstuk 7; exact artikel en bronfragment ontbreken. |
| ai-11:review:c2 | OUTSIDE_F4 | Restenergie na stop is specifieke machineveiligheid; geen algemene F4-positiefregel. AB hoofdstuk 7; deskundige technische review vereist. |
| ai-12:review:c1 | CANDIDATE | Kandidaat bij bijzondere groepen; zwangerschap/blootstelling en specifieke maatregelen apart vaststellen. AB 1.41; AW 5; Arboportaal zwangerschap. |
| ai-12:review:c2 | OUTSIDE_F4 | Nacht-/overwerkclaim vereist mede Arbeidstijdenwet en individuele medische context; ontbreekt in bindings. ATW 4:5–4:8: actuele primaire revisie nog te verifiëren. |
| ai-13:review:c1 | OUTSIDE_F4 | Taakanalyse kassawerk is praktische ergonomische invulling; niet een algemene F4-plicht. AB 5.2 en 5.3. |
| ai-13:review:c2 | CANDIDATE | Agressierisico kan PSA-context ondersteunen, maar kassawerkclaim is geen volledige PSA-policybinding. AW 3 lid 2; AB 2.15. |

## Negen bewust beperkte regelgroepen

Elke groep heeft drie antwoordregels: Ja, Gedeeltelijk en Nee blijven NOT_ASSESSED / POSSIBLY_RELEVANT / SPECIALIST_REQUIRED. Onbekend of ontbrekend geeft evenmin een positief oordeel. Een andere zelfstandig vastgestelde tekortkoming blijft zichtbaar. Er zijn geen vragen of antwoordopties toegevoegd.

| Groep | Ontbrekend bewijs / aanvullende feiten | Mogelijkheid en besluit |
| --- | --- | --- |
| RIETESTING | Exacte werknemers-/urenberekening (inclusief wettelijke uitzonderingen), toepasselijk cao-model of exact erkend branche-instrument, sector en geldigheid. AW 14 lid 1a en leden 12–13; AB 2.14b. | Beoordeling mogelijk met aanvullende feiten en actuele claimbinding. De huidige keuzes stellen die niet vast: hold behouden. |
| PREVENTIONOFFICER | Wie voert taken uit, omvang, deskundigheid, voorwaarden werkgever/directeur en externe bijstand. AW 13. | Alleen aanwijzing is onvoldoende. Hold behouden. |
| PREVENTIONCONSULTATION | OR/PVT aanwezig; instemming met persoon én positie aantoonbaar. AW 13. | Betrokkenheid is geen instemming. Hold behouden. |
| BHVAPPOINTED | Aanwijzing en beschikbaarheid afzonderlijk, bezetting/afwezigheid/risico’s. AW 15 leden 1 en 3. | Gecombineerd antwoord lokaliseert tekortkoming niet. Hold behouden. |
| EXPERTTASKSCOVERED | Per taak: RI&E-toetsing, verzuimbegeleiding, PAGO en eventuele aanstellingskeuring, deskundigheid en uitzonderingen. AW 14–14a. | Algemene bevestiging bewijst niet elke taak. Hold behouden. |
| CW2-PAGO-02 | Reikwijdte informatieplicht over vrijwilligheid versus wettelijke aanbiedingsplicht. AW 18 / voorlichting. | Geen zelfstandige overtreding afleiden uit ontbrekende uitleg; reviewer moet classificatie beoordelen. Hold behouden. |
| ACCIDENTREGISTRATION | Werkelijke registratieplichtige ongevallen, register met datum/aard; gemelde ongevallen en >3 dagen verzuim. AW 9 lid 2. | Procedure zegt niets over uitvoering; feiten nodig. Hold behouden. |
| ACCIDENTREPORTING | Werkelijke gebeurtenis, gevolgen en tijdige melding. AW 9 lid 1. | Kennis van plicht bewijst geen melding. Hold behouden. |
| CW2-ONG-01 | Wanneer ziekenhuisopname/blijvend letsel bekend werd en wanneer gemeld. AW 9 lid 1. | Vooraf geregelde procedure is geen bewijs van tijdigheid. Hold behouden. |

## Actuele officiële bronnen opnieuw geraadpleegd

- [Arbeidsinspectie: RI&E-vragen](https://www.nlarbeidsinspectie.nl/onderwerpen/aanleveren-rie/veelgestelde-vragen-rie): toetsingsuitzonderingen, inclusief 25-medewerkers/erkend instrument en gezamenlijke 40 uur. Exacte wettelijke uitzonderingen blijven aan de wetsrevisie gebonden.
- [Arboportaal: preventiemedewerker](https://www.arboportaal.nl/onderwerpen/ondersteuning-bij-arbowet/preventiemedewerker/wat-zegt-de-wet-over-de-preventiemedewerker): deskundigheid, werkgever bij maximaal 25 werknemers en OR/PVT-instemming.
- [Arboportaal: BHV](https://www.arboportaal.nl/onderwerpen/arbozorg/bedrijfshulpverlening/wat-zegt-de-wet-over-bedrijfshulpverlening): risicogebaseerde bezetting en opleiding; geen algemene 1:50-norm.
- [Arboportaal: PAGO](https://www.arboportaal.nl/onderwerpen/arbowet--en--regelgeving/arbobeleid/pago): aanbiedingsplicht en vrijwillige deelname onderscheiden.
- [Arbeidsinspectie: arbeidsongevallen](https://www.nlarbeidsinspectie.nl/onderwerpen/arbeidsomstandighedenwet/arbeidsongevallen) en [meldvragen](https://www.nlarbeidsinspectie.nl/onderwerpen/melden/veelgestelde-vragen): meldcriteria, later bekende gevolgen, personen onder gezag, dagopname en registratie.
- [Beeldschermwerk](https://www.arboportaal.nl/onderwerpen/fysieke-belasting/computerwerk/wat-zegt-de-wet-over-beeldschermwerk), [besloten ruimten](https://www.arboportaal.nl/onderwerpen/inrichting-werkvloer/verstikkings--en-bedwelmingsgevaar), [kankerverwekkende stoffen](https://www.arboportaal.nl/onderwerpen/risicos-gevaarlijke-stoffen/kankerverwekkende-en-mutagene-stoffen), [biologische preventie](https://www.arboportaal.nl/onderwerpen/biologische-agentia/maatregelen) en [zwangerschap](https://www.arboportaal.nl/onderwerpen/rechten-plichten-werkenden/kinderwens-zwanger-borstvoeding-en-werk/zwanger): actuele context voor historische AI-kandidaten; geen volledige specialistische validatie van alle historische formuleringen.

Een extra aandachtspunt is dat de algemene meldpagina ook besmettingsgevaar noemt, terwijl de algemene AW-9-uitleg drie letselcriteria noemt. Biologische-agentia-meldplichten moeten afzonderlijk worden gekoppeld; hieruit is geen nieuwe universele F4-meldregel afgeleid. Arbeidstijdenwet, normbladen, medische en machineveiligheidsclaims buiten F4 zijn niet integraal juridisch vrijgegeven.

De rechtstreekse webcontrole van de geconsolideerde Arbowet (2026-07-01) en het Arbobesluit (2026-08-01) op wetten.overheid.nl gaf op 18 oktober een fetch/cache-fout. De reeds geïnventariseerde bronimports blijven daarom REVIEW_REQUIRED. Officiële toelichtingspagina’s zijn opnieuw bekeken, maar hun bereikbaarheid vervangt geen controle van de exacte wetsrevisie door de inhoudelijk reviewer. De [basiscontractuitleg](https://www.arboportaal.nl/onderwerpen/ondersteuning-bij-arbowet/basiscontract/waar-moet-het-basiscontract-aan-voldoen) en [wijziging werknemersraadpleging per 1 juli 2026](https://www.arboportaal.nl/actueel/nieuws/2026/06/29/regels-voor-raadpleging-van-werknemers-aangepast-per-1-juli-2026) zijn eveneens opnieuw geraadpleegd.

## Technische controle en read-only dry-run

`evaluateComplianceClaim` gebruikt de bestaande `evaluateKnowledgePublication` en voegt versie-/fragmentreview, tijdscontext, actuele menselijke validatie (niet ingetrokken), open conflicten/kruisvalidaties, directe ondersteuning en fragmenthashcontrole toe. Een PUBLISHED-claim wordt alleen voor de reeds doorlopen approval-status genormaliseerd; alle andere beleidspoorten blijven gelden. De runtime-loader voor nieuwe F2/F4-runs en de dry-run roepen dezelfde controle aan. Verlopen bronreview blokkeert nieuwe runs, niet het lezen van immutable historische snapshots. Nieuwe F2-runs met onvoldoende bronreview worden nu eveneens geweigerd; dit is een bewuste fail-closed releaseafhankelijkheid.

F4 controleert bovendien de complete vraag-/regeltemplate tegen de code, ook als iemand de frameworkchecksum opnieuw berekent. Alle tien scopebindings zijn expliciet en vereisen een afzonderlijke CONDITION-claim, niet een hergebruikte inhoudelijke claim. Dit vervangt geen menselijke beoordeling van de betekenis van die CONDITION-claim. De negen holds zijn onveranderd en contractueel getest.

Alleen voor de nog ongepubliceerde 2.1 neemt de claimbindingshash ook de citatie-ID, fragment-ID, fragmenthash en bronrevisie-ID mee. Daardoor wordt ook het verwisselen van twee fragmenten binnen hetzelfde bronbestand gedetecteerd. Bestaande v2-hashes en historische snapshots worden niet herschreven. Wettelijke regels vereisen bovendien directe PRIMARY_LEGAL-ondersteuning uit LEGISLATION/REGULATION.

Voer vanuit de F4-worktree uit, uitsluitend met bestaande geautoriseerde read-only database-toegang die apart veilig in het proces is aangeleverd:

```powershell
npx tsx scripts/check-compliance-f4-publication.ts --check
```

De runner vereist `COMPLIANCE_REVIEW_DATABASE_URL`, leest geen .env-bestanden en heeft geen apply-/publicatiemodus. Geef de waarde niet als commandoregelargument en neem haar niet op in rapporten. De operator gebruikt zijn bestaande database-leestoegang; er wordt geen gebruiker nagebootst en geen onbeveiligde webroutetoegang toegevoegd. PostgreSQL zet de gehele inspectie in een REPEATABLE READ, READ ONLY-transactie. Exit 0 = technische controle GO, 2 = inhoudelijke/technische publicatieblokkades, 1 = geen veilige controle mogelijk. GO is geen juridische goedkeuring of publicatiehandeling.

De uitvoer toont per regel claim-ID’s en redenen, de verwachte en berekende frameworkhash, regelhashes en bron-/claimhashes. Ontbreekt 2.1, dan meldt de runner FRAMEWORK_NOT_REGISTERED en alle 141 ontbrekende verwachte regels; geen automatische registratie. De frameworkhash borgt de bron-/regelbindings; templatehashes zonder bronnen zijn nooit publicatiechecksums. Bronbestanden worden niet stilzwijgend opnieuw geïmporteerd. Verificatie van hun inhoud tegen de opgeslagen bronhash hoort bij de bestaande Knowledge-bronreview.

Er is in de gecontroleerde applicatie geen operationele frameworkpublisher gevonden; de schrijvende voorbeelden zijn tijdelijke databasefixtures. De read-only inspectie is de gedeelde technische precondition voor een later afzonderlijk gereviewd publicatiepad. Dat toekomstige pad moet binnen zijn eigen transactie opnieuw controleren vóór statuswijziging; een oud GO-rapport is geen eenmalige vrijstelling. Ook bij een handmatige PUBLISHED-statuswijziging weigert de runtime nieuwe beoordelingen zodra de actuele policy faalt. Deze opdracht introduceert bewust geen schrijvende publicatie-operatie.

Concreet doet de bestaande Knowledge-actie `CONTENT_APPROVE` een menselijke `CROSS_SOURCE_CHECK` met `PARTIALLY_VALIDATED` en zet de claim op `INTERNAL_REVIEW`. Dat is terecht nog geen volledige validatie of publicatie. De dry-run accepteert dit niet als `VALIDATED/PUBLISHED`. Naast de bronreview is dus een afzonderlijk gecontroleerde volledige claimvalidatie-/publicatiestap nodig; het rapport veronderstelt niet dat deze al operationeel aanwezig is. Testfixtures met synthetische VALIDATED/PUBLISHED-records bewijzen alleen de technische controle en zijn geen manier om deze ontbrekende vrijgave over te slaan.

## Open vrijgavepunten

1. Inhoudelijk reviewer: actuele wetsrevisies, uitzonderingen, exacte citaties en rule-to-claim-entailment per 141 regels bevestigen. Alle 46 historische claims blijven ongepubliceerd; 0 actuele bruikbare bindings.
2. Knowledge-beheerder: echte actuele revisies/fragmenten en menselijke validatie registreren via het bestaande model, waaronder aparte werkgeversscope; geen testfixtures gebruiken.
3. PO: de expliciete beperkingen van de negen holds accepteren en daarna het definitieve manifest laten beoordelen. De dry-run kan pas een complete opgeslagen DRAFT controleren nadat daarvoor afzonderlijk registratieakkoord bestaat.
4. Operationeel beheer: afzonderlijk akkoord voor eventuele migratie 86, registratie/publicatie, applicatierelease en F4-activatie. In deze opdracht geen productiehandeling.
5. Integratie F3/A07: eerdere volgorde uit [publicatieplan](compliance-f4-publication-plan.md) blijft gelden; geen code overgenomen en geen wijzigingen op PR #47 of #40.

**NO-GO voor frameworkpublicatie.** Geen technische groenverklaring vervangt ontbrekende juridische review.
