# F4 — bronbinding en gecontroleerde frameworkvrijgave

Beoordeling: 17 oktober 2026. PR #49 / issue #48. **NO-GO voor publicatie van NL_ARBO_GUIDE / 2.1.** Dit document bereidt een latere vrijgave voor; het registreert of publiceert niets. `COMPLIANCE_F4_ENABLED` blijft standaard uitgeschakeld. Geen productiegegevens of frameworkstatussen zijn gewijzigd.

## Bewijs en afbakening

- [Vraagmatrix](compliance-f4-legal-matrix.md): alle 21 bestaande en 25 nieuwe definities, plus twee contextvelden. Vraagteksten/antwoordopties zijn niet gewijzigd.
- [Machineleesbare matrix](compliance-f4-legal-matrix.json): 48 unieke vraag-ID's, exacte voorwaarden en opties, 131 antwoordregels en tien scope-onzekerheidsregels. Per regel staan identiteit, grondslag, conditie, status, vervolgactie en templatechecksum vast.
- [Read-only broninventaris](compliance-f4-source-evidence.json): bestaande bronversie-ID's, importrevisies, checksums, 107 kandidaatfragmenten en 19 historische claimkandidaten met hun bestaande citatie-ID's. Dit zijn waargenomen referenties, geen nieuw verzonnen Knowledge-identiteiten. Fragmentselecties per vraag zijn kandidaat-artikelen; precieze lid/fragmentbinding moet nog worden gereviewd.
- De actuele WorkMatchr-productiebranch is read-only bevraagd: 85 geslaagde migraties, 124 bronversies en 46 claims. Alle 46 claims zijn DRAFT / UNVALIDATED / HISTORICAL / OUTDATED, zonder reviewdatum. **Nul claims zijn nu direct bruikbaar voor frameworkpublicatie.** De enige geregistreerde frameworkversie is NL_ARBO_LEGACY / 1; 2.1 ontbreekt. Bestaande lokale testfixtures zijn geen productiebronbewijs.
- Arbowet-revisie `2026-07-01_0` en Arbobesluit-revisie `2026-08-01_0`, beide importrevisie 1, bestaan met status REVIEW_REQUIRED. De inventaris bevat hun daadwerkelijke hashes. Niet bevestigd dat de oorspronkelijke bestanden nu opnieuw dezelfde hash opleveren: daarvoor is verificatie van de originele bronbestanden nodig.
- Wetten.overheid.nl was bij deze controle niet rechtstreeks uitleesbaar (fouten/429). Opgeslagen wetsfragmenten zijn onderzocht en vergeleken met de officiële voorlichting die in de matrix is gelinkt. Dit bewijst geen volledige actualiteit van de geconsolideerde wet. Die controle blijft een publicatievoorwaarde.

## Inhoudelijke uitkomst

De matrix onderscheidt wettelijke eisen, praktische aanbevelingen, situatieafhankelijke regels en onvoldoende onderbouwde gevolgtrekkingen. Een algemene wettelijke plicht maakt niet automatisch iedere ja/nee-vraag tot een betrouwbare nalevingstoets. Een antwoord blijft een zelfverklaring, geen gecontroleerd bewijsstuk.

| Onderwerp | Bevinding / noodzakelijke verificatie |
| --- | --- |
| RI&E | Artikel 5 onderbouwt inventarisatie, bijzondere groepen, plan met termijnen, actualisatie bij aanleiding en toegang. Geen generieke jaarlijkse vernieuwingsplicht toegevoegd. |
| Toetsingsuitzonderingen | Arbowet 14 lid 12 en Arbobesluit 2.14b onderscheiden gezamenlijk ten hoogste 40 uur en de maximaal-25-route. DGA-telling, cao-model, geregistreerd instrument, bedrijfsspecifieke toepassing en geldigheid moeten afzonderlijk vaststaan. OTHER bewijst niet dat geen geldige uitzondering bestaat. |
| Branche-instrumenten | De officiële wijziging van de erkenningsprocedure per 1 juni 2026 moet worden meegenomen. Een antwoord 'erkend' is geen gecontroleerde erkenning van de gebruikte versie. [Arboportaal](https://www.arboportaal.nl/actueel/nieuws/2026/06/04/nieuwe-erkenningsprocedure-branche-rie). |
| Preventiemedewerker | Artikel 13: persoon/positie met instemming OR/PVT, deskundigheid, tijd/middelen en kerntaken. Betrokkenheid is niet hetzelfde als instemming. Werkgever/directeur bij maximaal 25 en uitzonderlijke externe bijstand vragen afzonderlijke toetsing. |
| BHV | Risicogerichte organisatie, voldoende inzetbaarheid, opleiding en uitrusting. Geen vaste ratio, algemene diplomaplicht of verplichte jaarlijkse cursus afgeleid. De samengestelde vraag over aanwijzing/vervanging is onvoldoende voor een definitief oordeel. |
| Bedrijfsarts/basiscontract | Artikel 14 onderbouwt toegang, werkplekbezoek, second opinion en klachtenprocedure. Second opinion kent zwaarwegende uitzonderingen. 'Alle taken gedekt' bewijst niet de toepasselijkheid en uitvoering van elke afzonderlijke taak. |
| PAGO | Risicogericht aanbod en vrijwillige deelname; geen algemeen vast interval. Dat deelname vrijwillig is, bewijst niet een zelfstandige wettelijke norm voor precies de gevraagde uitleg. |
| Raadpleging | De wijziging per 1 juli 2026 van artikel 12 is meegenomen: OR/PVT, anders belanghebbende werknemers. De oudere algemene bron alleen is onvoldoende. [Arboportaal](https://www.arboportaal.nl/actueel/nieuws/2026/06/29/regels-voor-raadpleging-van-werknemers-aangepast-per-1-juli-2026). |
| PSA | Mogelijke blootstelling onderzoeken; passende maatregelen en uitvoering. Geen klachten betekent niet geen risico. Een lokale uitsluitingsoptie maakt de hele PSA-module niet niet-van-toepassing. |
| Ongevallen | Melden bij overlijden, blijvend letsel of ziekenhuisopname, ook zodra een ernstig gevolg later bekend wordt. Register: gemelde ongevallen én meer dan drie werkdagen verzuim, aard/datum. Proces of kennis bewijst geen feitelijke melding/registratie. [Nederlandse Arbeidsinspectie](https://www.nlarbeidsinspectie.nl/onderwerpen/arbeidsomstandighedenwet/arbeidsongevallen). |

Voor negen vragen is de regeluitkomst daarom geblokkeerd in `compliance-f4-rule-review.ts`: RIETESTING, PREVENTIONOFFICER, PREVENTIONCONSULTATION, BHVAPPOINTED, EXPERTTASKSCOVERED, CW2-PAGO-02, ACCIDENTREGISTRATION, ACCIDENTREPORTING en CW2-ONG-01. JA/NEE/GEDEELTELIJK levert voor deze regels uitsluitend Niet beoordeeld op. Deze holds vervangen geen ontbrekende bronbindingen. Opheffen vereist een afzonderlijk beoordeelde norm-/antwoordmapping en een nieuwe definitiechecksum. De vraagteksten blijven behouden.

Ontbrekende/UNKNOWN antwoorden leveren geen groen of overtreding op. Een onafhankelijk bevestigde tekortkoming in dezelfde module blijft Actie vereist. Het vijfstatuscontract blijft intact; er wordt geen nieuwe modulebrede uitsluitingsregel verzonnen. Historische v1/F2-rapporten worden niet herberekend. Met alle positieve zelfverklaringen blijven nu zes modules Niet beoordeeld en vier indicatief Op orde; dat is geen publicatiegoedkeuring.

## Knowledge-binding en checksums

Hergebruik is alleen mogelijk na actuele inhoudelijke beoordeling. De historische AI-01/AI-10/AI-12-kandidaten kunnen als zoekingang dienen, niet als automatische DIRECT_SUPPORT. De huidige wetsteksten bieden kandidaatfragmenten; daarop moeten echte claims en citaties met toepasselijkheidsgrenzen, broncontrole en review worden vastgesteld. Niet alle webvoorlichting heeft een geregistreerde KnowledgeSourceVersion; diens ID en hash blijven daarom null.

De vaste frameworkidentiteit is `f4000000-0000-4000-8000-000000000021`, code NL_ARBO_GUIDE, versie 2.1. Vraag- en regelidentiteiten worden al deterministisch uit code/versie afgeleid. Dat is iets anders dan bron-/claimidentiteiten. De matrix bevat geen synthetische testbron.

- `questionChecksum`: SHA-256 van de bestaande canonieke JSON-vraagdefinitie.
- `templateChecksum`: dezelfde strategie voor de regel **zonder sources**; uitsluitend controle van de ontwerptekst/conditie.
- `sourceChecksum`: waargenomen echte bronrevisiehash, waar beschikbaar.
- `claimChecksum`, `boundRuleChecksum` en definitieve frameworkchecksum: **null zolang echte gereviewde bindingen ontbreken**. Een templatechecksum mag niet worden gebruikt om een framework te publiceren.
- Bij publicatie alle bound checksums berekenen met `complianceChecksum`, onafhankelijk van JSON-inspringing of platformregeleinden; vervolgens opnieuw uit de database inlezen en vergelijken.

Twee technische grenzen moeten vóór publicatie worden opgelost/gecontroleerd:

1. De bestaande scope-onzekerheidsregel erft de bron van de eerste wettelijke vraag van zijn module. Dat is niet vanzelf bewijs voor werkgeversscope. Een afzonderlijk gereviewde scopeclaim moet expliciet in de bronbindingsset voor iedere betrokken regel zijn opgenomen en met de runtime-reconstructie overeenkomen; zo nodig moet de binding-API gericht worden uitgebreid. Alleen de matrix invullen lost dit niet op.
2. `loadComplianceV2Framework` controleert onder andere PUBLISHED, reviewdatum, directe ondersteuning en checksums, maar voert niet opnieuw alle controles uit `evaluateKnowledgePublication` uit. Publicatiestatus/reviewdatum alleen bewijst geen actuele, conflictvrije, volledige bronvalidatie. Een gecontroleerde publicatiepreflight moet de bestaande Knowledge-policy daadwerkelijk toepassen, inclusief reviewverval, temporele geldigheid, bronautoriteit en vereiste menselijke beoordeling. Voor gewijzigde/ingetrokken bronnen is ook expliciete stop-/herreviewcontrole van nieuwe runs nodig. Deze taak heeft de gedeelde F2-loader niet verbreed.

## Publicatieplan — niet uitgevoerd

1. Inhoudelijk reviewer verifieert de actuele geconsolideerde artikelen, uitzonderingen en iedere regelvariant tegen de kandidaatfragmenten. Beoordeel de negen holds; zonder voldoende basis blijft de uitkomst Niet beoordeeld. PO beoordeelt dat deze beperkingen passend zichtbaar zijn.
2. Knowledge-beheerder laat bronrevisies en claims via de bestaande review-/publicatieprocedure controleren. Leg DIRECT_SUPPORT, concrete citatiefragmenten, revisiehashes, toepasselijkheid, reviewer en reviewdatum vast. Geen productieimport via testfixtures; geen hergebruik van een verouderde publicatieflag.
3. Maak een volledig manifest met exact de matrix-identiteiten, per-regel claim/citatie/bronbindingen (ook scope), vraagvoorwaarden, vijf statussen en bound checksums. Leg de afwijkingen ten opzichte van deze ontwerpchecksums expliciet vast. Sla de goedgekeurde manifestchecksum en reviewreferentie op in de releaseadministratie.
4. Implementeer/review vóór uitvoering een gecontroleerde dry-run/registratieroute binnen het bestaande frameworkmodel. Er is nu geen afzonderlijke operationele F4-publicatierunner. De databasefixture is uitsluitend voor tests. Valideer Knowledge-policy, volledig bindingsbereik, versie-uniciteit, runtime-reconstructie, ronde-trip, tenant/idempotentie en historische rapporten eerst op een tijdelijke database.
5. Herhaal productiepreflight read-only. Verwacht momenteel 85 migraties en geen 2.1. STOP bij onbekende versie, checksum of gedeeltelijke migratie. PO geeft afzonderlijk toestemming voor alleen migratie 86 (`20261017100000_add_compliance_question_visibility`) en bevestigt herstelroute; uitvoeren is niet onderdeel van deze taak.
6. Registreer uitsluitend na afzonderlijk akkoord de gecontroleerde 2.1 als DRAFT in het bestaande model en lees haar volledig terug. Vergelijk canonieke checksums en bronbindingen met het manifest. Geen updates aan gepubliceerde frameworkversies, bestaande runs, snapshots of PDF's.
7. Laat inhoudelijk reviewer en PO de vrijgave expliciet goedkeuren. Publiceer alleen dat manifest; iedere inhoudelijke wijziging nadien vereist nieuwe versiehistorie. Nieuwe bronrevisie/claim is geen stilzwijgende wijziging van bestaande historische rapporten.
8. Applicatierelease, frameworkpublicatie en activering zijn afzonderlijke handelingen. Houd F4 uit tot migratie, bronnen, manifest, accountgebonden acceptatie en runtimecontrole PASS zijn. Controleer direct na latere activering versie/checksum in nieuwe snapshots. Geen betalingen of historische herberekening.

Rollback: F4-gate uit, nieuwe F4-starts stoppen; oude wijzer en bestaande rapportlezers behouden. Geen terugdraaien van historische beoordelingen of destructieve schema-rollback. Bij foutieve bronbinding de versie gecontroleerd blokkeren/retireren voor nieuwe runs en opvolgversie reviewen; historische snapshots blijven ongewijzigd uitleesbaar.

## F3 / A07-integratie

Read-only vergeleken op 17 oktober 2026:

| PR | Gecontroleerde head | Stand / relatie |
| --- | --- | --- |
| F3 #47 | `9941ef521806a39ceb8f28353f51d0de55c869cd` | Draft/open; gratis intake, expliciet opslaan en logout. |
| A07 #40 | `70374ed71f195feef3feca1549c48c5a9ad567fd` | Draft/open; privacy/sessies en oudere opslagvariant. |
| F4 #49 (basis van deze review) | `07397585f3770bdcad680cc11021a3939828a48f` | Draft/open; uitbreidingsroute gebruikt geen F3/A07-conceptopslag. |

F4 raakt met beide alleen `docs/README.md` rechtstreeks. F3 en A07 overlappen onderling wél in Compliance-opslag/hook en logout. De logoutcomponent is op de gecontroleerde heads gelijk; opslag/hook verschillen. F3 kent de nieuwere questionnaireVersion/versie-3-envelop. Een latere A07-merge mag die niet terugzetten naar de oudere opslagvorm of een bewaartermijn opnieuw laten beginnen.

Veilige volgorde: F3 afzonderlijk accepteren/mergen; A07 daarna op actuele main afstemmen en tests voor 24-uurslease, legacy-keuze, tabbladen, geblokkeerde opslag en logout herhalen; alleen de nog eigen A07-sessie/privacywijzigingen beoordelen. F4 op de dan actuele main toetsen en README-links behouden. F4-vrijgave vereist niet dat A07-loginwijzigingen worden overgenomen. Expliciete toekomstige F3→F4-profieloverdracht moet versiegebonden en afzonderlijk beoordeeld zijn; ontbrekende risicodata mogen niet automatisch NO worden. Deze review heeft geen code uit F3/A07 overgenomen en geen van beide branches aangepast.

## Vrijgavebesluit en verantwoordelijkheden

**NO-GO**, ook wanneer technische tests groen zijn. Concrete open punten:

1. Inhoudelijk reviewer: actuele wetsrevisies/uitzonderingen en exacte claim-/fragmentbindingen valideren; 46 bestaande claims zijn niet vrijgegeven.
2. Knowledge-beheerder + ontwikkelaar: echte manifestbindingen inclusief scope en volledige Knowledge-publicatiepreflight; gecontroleerde registratieroute en bronwijzigingscontrole.
3. PO: beperkingen van de negen holds en uiteindelijke inhoudelijke/ingelogde functionele acceptatie; eerdere 200%-goedkeuring is vastgelegd als PO-goedkeuring, niet als nieuwe technische zoommeting.
4. PO/operationeel beheer: afzonderlijke toestemming voor migratie, frameworkregistratie/publicatie, applicatierelease en activering. Geen van deze productiestappen is nu uitgevoerd.

Technische testuitkomsten staan in [het F4-implementatierapport](compliance-f4-expanded-guide.md). Artefactconsistentietests bewijzen versie-/hashdekking, niet zelfstandig juridische juistheid.
