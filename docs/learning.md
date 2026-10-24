# WorkMatchr Learning — vertical slice 1

## Architectuur

Learning is een domein binnen de bestaande Next.js-applicatie. Het gebruikt dezelfde `User`, Better Auth-sessie en PostgreSQL/Prisma-laag. Een optioneel `LearningProfile` markeert de Learning-capability; `STUDENT` is geen globale platformrol. De prototypeopleiding is gratis toegankelijk voor actieve WorkMatchr-gebruikers. Betalingen en commerciële rechten vallen buiten deze slice.

De cursus staat los van AdviceDossier, Request, Assignment en Marketplace. Cursuscontent bevat geen automatische koppeling en maakt geen Requests of Assignments aan. De bestaande Knowledge Engine bevat gevalideerde kennisclaims en bronherkomst, maar geen lesstructuur. Learning bewaart daarom eigen course-, chapter-, content- en questionrecords met beperkte bronmetadata.

## Datamodel

- `LearningCourse` is de stabiele cursusidentiteit.
- `LearningCourseVersion` bewaart de gevolgde versie en bronmetadata. WL-001 gebruikt prototypeversies; dit is geen goedgekeurde of definitieve `1.0`.
- `LearningChapter` ordent hoofdstukken binnen één versie.
- `LearningContentBlock` bewaart gerangschikte, JSONB-gecodeerde inhoud voor de herbruikbare renderer.
- `LearningQuestion` en `LearningQuestionOption` vormen de centrale vraagbank. Correcte antwoorden blijven server-side.
- `LearningEnrollment` koppelt een gebruiker aan exact één cursusversie; een database-unieke constraint voorkomt dubbele inschrijvingen.
- `LearningChapterProgress`, `LearningQuestionAttempt` en `LearningInteractionAttempt` bewaren persoonlijke voortgang en betekenisvolle leeractiviteiten.

Samengestelde foreign keys koppelen hoofdstukvoortgang aan dezelfde cursusversie als de inschrijving en het hoofdstuk. QuestionAttempts koppelen de inschrijving ook aan dezelfde gebruiker. Gepubliceerde en gepensioneerde cursusversies, hoofdstukken, contentblokken en gebruikte vragen worden door databasetriggers beschermd tegen inhoudelijke wijziging. Een nieuwe inhoudelijke versie krijgt nieuwe records.

## Routes en autorisatie

- `/e-learnings` — startpagina;
- `/e-learnings/aanbod` — gepubliceerd aanbod;
- `/e-learnings/mijn` — persoonlijke inschrijvingen en hervatten;
- `/e-learnings/[courseSlug]` — cursusdetail;
- `/e-learnings/[courseSlug]/leren/[chapterSlug]` — generieke hoofdstukspeler.

Elke route controleert server-side de bestaande sessie en actuele actieve accountstatus. Reads filteren op de server-side User-ID. Server Actions zoeken een eigen inschrijving bij iedere voortgangs- of antwoordmutatie. Het tonen of verbergen van navigatie verleent geen toegang.

Een fout antwoord wordt opgeslagen en geeft uitleg, maar verhindert voortgang of afronding niet. Hoofdstukafronding wijzigt de `ChapterProgress`; zij markeert de volledige cursus niet als behaald. Hervatten gebruikt het laatst afgeronde contentblok.

## Prototypecontent en review

WL-001, `RI&E in de praktijk`, is in de seed uitgewerkt tot `prototype-0.17`. Deze versie bevat H1–H10; H10 staat op positie 10 met slug `integrale-praktijkcasus`. Oudere CourseVersions blijven hervatbaar met hun oorspronkelijke inhoud en hoofdstukvolgorde.

Gepubliceerde inhoud blijft onveranderlijk. Voor een inhoudelijke uitbreiding publiceert de seed een nieuwe CourseVersion met de WL-001-hoofdstukken en vragen voor die versie en retireert de vorige gepubliceerde versie. Bestaande inschrijvingen op oudere versies blijven hervatbaar; nieuwe inschrijvingen gebruiken de nieuwste gepubliceerde versie. De seed overschrijft geen hoofdstukken, blokken of vragen die al gepubliceerd zijn. Een latere inhoudelijke wijziging vraagt opnieuw om een nieuwe versie.

De openingsopdracht voor risicosignalering gebruikt bestaande `CASE_STUDY`- en `MULTI_CHOICE`-blokken met selecteerbare, gelabelde kaarten. Er is geen `RISK_SPOTTING`-schematype, hotspotengine of authoringtool toegevoegd. De hoofdstukcheck bevat vijf Question Bank-vragen met stabiele `WL001-H3-*`-codes en difficulty-metadata. Vraagcorrectheid blijft server-side.

Enkelvoudige keuzevragen (inclusief waar/onwaar en casuskeuzes) geven direct feedback na een keuze. Multi-select en sortering houden de knop `Antwoord controleren`, zodat de gebruiker eerst de selectie of volgorde kan afmaken. Een fout antwoord kan opnieuw worden geprobeerd; na een goed antwoord worden de keuzes vergrendeld. De feedbackbox groeit mee, wrapt lange tekst en behoudt een live status voor screenreaders.

Hoofdstuk 3 en alle nieuwe vragen blijven prototypecontent waarvoor inhoudelijke en juridische review nodig is. Er wordt geen actuele statistiek getoond zolang een gevalideerde bron ontbreekt. De cursus claimt geen certificering of professionele kwalificatie.

## Hoofdstuk 2: inhoud en broncontrole

H2 gebruikt uitsluitend bestaande contenttypen en de centrale Question Bank: 13 vragen, waaronder twee koppeloefeningen en vijf afsluitende oefenvragen. Enkelvoudige keuzes en waar/onwaar geven direct feedback; multi-select en matching worden handmatig gecontroleerd. Matching vraagt naar de meest passende primaire rol en wordt pas controleerbaar wanneer alle activiteiten zijn gekoppeld. Nova bevat vier relevante partijen en één onjuiste vervangingsclaim, zodat de oefening geen automatische “selecteer alles”-vraag is.

Broncontrole uitgevoerd op 25 september 2026. De bestaande broncatalogus wordt via bron-ID’s en volledige bronmetadata opgenomen in de nieuwe cursusversie. Claims blijven beperkt tot onderstaande hoofdlijnen; de prototypeaanduiding en inhoudelijke/juridische review blijven gelden.

| Onderwerp | Bestaande WorkMatchr-bron | Afbakening |
| --- | --- | --- |
| Werkgeversverantwoordelijkheid, RI&E en PvA | `arbowet-current`, `arbeidsinspectie-rie` | Uitbesteden draagt de verantwoordelijkheid niet over. |
| Preventiemedewerker | `arboportaal-preventiemedewerker`, `arbeidsinspectie-preventiemedewerker` | Drie kerntaken; in beginsel intern; deskundigheid, tijd en capaciteit passend bij risico’s; geen vaste personeelsratio. |
| Werknemersraadpleging | `arboportaal-werknemersraadpleging-2026` | Aanpassing per 1 juli 2026; raadpleging via vertegenwoordiging of rechtstreeks waar toepasselijk. |
| OR/PVT en samenwerking | `arboportaal-arbozorg-organisatie` | Formele rol en passende betrokkenheid; geen uitputtende WOR-uitleg. |
| Arbodienst, bedrijfsarts en vier deskundigheden | `arboportaal-kerndeskundigen-batch2`, `arboportaal-bedrijfsarts` | Organisatie en beroepsrollen onderscheiden; medische registratie niet gelijkstellen aan persoonscertificering. |
| Toetsing en scope | `arbeidsinspectie-rie`, arbokerndeskundigenbron en [Arbeidsinspectie: toetsen van de RI&E](https://www.nlarbeidsinspectie.nl/site/binaries/site-content/collections/documents/2025/12/18/toetsen-van-de-ri-en-e/toetsen-van-de-ri-en-e-20251218.pdf) | Deskundigheid en toepasselijke scope aansluiten op risico’s; geen algemene bevoegdheid op basis van één titel. |
| Uitzondering toetsingsplicht | `arbeidsinspectie-rie` | Maximaal 25 werknemers én onder voorwaarden erkend branche-instrument; geen individuele vrijstellingsbeslissing. H7 blijft in ontwikkeling. |

De nieuwe versie gebruikt dezelfde H1/H3-inhoud en bestaande vraagversies. Oude inschrijvingen, antwoorden en voortgang worden niet verplaatst of herschreven. Er is geen schemawijziging of nieuwe migratie nodig.

## Hoofdstuk 4: beoordelen en prioriteren

H4 bevat 44 contentblokken, 19 centrale vragen met 64 antwoordopties en 12 leerdoelen. De laatste vijf vragen vormen een formatieve hoofdstukcheck; correcte antwoorden zijn geen voorwaarde voor afronding. Logistiek Noord verbindt inventariseren met beoordelen, blootstelling, bestaande maatregelen, restrisico en prioritering. De Delta-casus vraagt welke onderbouwing over de feitelijke werking van afzuiging ontbreekt.

`METHODIEK` gebruikt het bestaande generieke CALLOUT-label. Waarschijnlijkheid/gevolg en prioriteitscategorieën zijn didactische voorbeelden, zonder universele matrix, wettelijke scoregrenzen of algemene actietermijnen. De uitleg bij vragen behandelt de antwoordalternatieven via het bestaande feedbackmodel. Er is geen nieuwe engine, enum of migratie toegevoegd.

De lokale review publiceerde eerst `prototype-0.6`. Een daarna aangescherpte Delta-vraag is als `WL001-H4-CHECK-05` versie 2 opgenomen in `prototype-0.7`. Versie 0.6 en vraagversie 1 blijven behouden waar zij al bestaan. Nieuwe databases krijgen rechtstreeks 0.7 via de seed; er is geen historische inhoud nodig om oude inschrijvingen na te maken. H1–H3 gebruiken hun bestaande inhoud en vraagversies.

De lesplayer verplaatst focus bij een nieuw blok naar de kop, of naar de inhoudskaart wanneer een kop ontbreekt. Dit voorkomt dat de lezer na een lang blok onderaan de volgende les blijft staan. De afrondingskop krijgt dezelfde focusbehandeling.

Bronnen, tests, browserbevindingen en resterende reviewpunten staan in [H4-verificatie](learning-chapter4-verification.md). H4 blijft **CONTENT REVIEW REQUIRED** voor arbotechnische/juridische beoordeling en validatie met studenten.

## Hoofdstuk 5: maatregelen bepalen

H5 bevat 40 blokken, 17 centrale vragen met 60 antwoordopties, twaalf leerdoelen en vijf formatieve hoofdstukcheckvragen. Bronaanpak, technische/collectieve en organisatorische/individuele maatregelen en PBM vormen een didactische hoofdstructuur. STOP sluit daarop aan. Specifieke voorschriften, onderbouwing van een lagere stap, combinaties, nieuwe risico’s, effectiviteit en restrisico worden genuanceerd behandeld. Logistiek Noord en Productiebedrijf Orion vragen toepassing op concrete situaties. In prototype-0.12 loopt H5 door naar H6.

De seed publiceert 0.10 als nieuwe prototypeversie naast de historische versies. H1–H5 en bestaande vraagversies blijven herbruikbaar; H6 krijgt eigen inhoud en Question Bank-codes. De vorige gepubliceerde versie wordt alleen volgens het bestaande versioneringsmechanisme gepensioneerd; inschrijvingen, voortgang en pogingen blijven aan hun oorspronkelijke versie gekoppeld. De seedtransactie krijgt zestig seconden voor de grotere dataset; fouten rollen nog steeds de gehele transactie terug. H6 gebruikt het bestaande Learning-schema; geen nieuwe migratie.

Generieke sorteeropdrachten tonen de canoniek opgeslagen opties aanvankelijk in omgekeerde volgorde. Deze vaste presentatie blijft gelijk bij serverrendering, hydration en refresh. Het antwoord wordt uitsluitend server-side beoordeeld en pas na `Antwoord controleren` ingediend. Een PROCESS-blok met een sorteervraag toont de oefening zonder daarnaast de oplossingsvolgorde te tonen. Gewone PROCESS-visuals en matching blijven werken via hun bestaande renderer.

Bronnen, verificatie en reviewpunten staan in [H5-verificatie](learning-chapter5-verification.md). H5 blijft **CONTENT REVIEW REQUIRED** voor arbotechnische/juridische review en studentvalidatie.

## Hoofdstuk 6: Plan van Aanpak — van risico naar actie

H6 staat op positie 6, gebruikt slug `plan-van-aanpak` en is onderdeel van seedversie `prototype-0.12`. De lesroute bevat twaalf leerdoelen, tekst, procesvisuals, callouts, single-choice- en multi-choicevragen, een samenvatting en vijf formatieve hoofdstukcheckvragen. De Question Bank gebruikt stabiele `WL001-H6-*`-codes en difficulty 2/3. De check is geen examen of certificering; een lage score blokkeert hoofdstukafronding niet. In versie 0.12 zijn vijf veranderde toelichtingen opgeslagen als vraagversie 2; vraagversies en oudere gepubliceerde cursusversies blijven behouden.

De leerroute sluit aan op H5 (maatregelen onderzoeken en kiezen) en vormt de brug naar H7 (toetsing van de RI&E). Zij behandelt concrete actieformulering, praktische actiehouders, passende termijnen en het onderscheid tussen prioriteit en uitvoeringstermijn. Nader onderzoek mag een concrete tussenactie zijn, maar vormt niet automatisch de beheersmaatregel. Tijdelijke beheersing en de definitieve maatregel worden onderscheiden. Uitvoering, voortgang, controle van effectiviteit en bijsturen komen terug in de doorlopende casus Logistiek Noord.

De callout `WETTELIJKE EIS` beperkt zich tot de wettelijke kern rond maatregelen, hun samenhang en termijnen. `GOEDE PRAKTIJK` markeert actiehouders, status, voortgang en effectcontrole als praktische borging. `METHODIEK` beschrijft aandachtspunten voor een passende termijn zonder universele termijnmatrix. Bronnen zijn [Arbeidsomstandighedenwet, artikel 5 lid 3](https://wetten.overheid.nl/BWBR0010346/#Hoofdstuk2_Artikel5) en [Arboportaal — Waaruit bestaat de RI&E?](https://www.arboportaal.nl/onderwerpen/arbowet--en--regelgeving/risico-inventarisatie---evaluatie/waaruit-bestaat-de-rie). H6 blijft **PROTOTYPE / CONTENT REVIEW REQUIRED** voor juridisch-arbotechnische review en studentvalidatie.

H6 toont didactische voorbeelden van velden voor acties; het introduceert geen digitale PvA-module, taaktoewijzing, deadlineservice, herinneringen of notificaties. Er is geen Learning-commerce of opleidingsplaatsenfunctionaliteit toegevoegd.

## Hoofdstuk 7: toetsing van de RI&E

H7 staat op positie 7 met slug `toetsing-rie` in prototypeversie `prototype-0.13`. De route bevat 50 ContentBlocks, 14 leerdoelen, de actuele uitzonderingen op de toetsingsplicht, erkenning/toepasselijkheid van branche-RI&E-instrumenten, de vier relevante deskundigheidsrichtingen, certificerings-/registratieverschillen en deskundigheidsscope. De les onderscheidt opstellen van toetsen, introduceert systeemtoets en scopetoets alleen op hoofdlijnen en behandelt het toets- en adviesrapport, werkgeversverantwoordelijkheid en actualiteit. Een scenariogebaseerde beslisroute is uitleg, geen automatische juridische beslissing.

De Question Bank gebruikt 28 stabiele `WL001-H7-*`-codes met 115 antwoordopties: 25 `SINGLE_CHOICE`- en 3 `MULTI_CHOICE`-vragen, waaronder vijf formatieve hoofdstukcheckvragen. De toepassingsvragen onderscheiden expliciet de kleine organisatie met een erkend passend instrument, de zelfgemaakte RI&E zonder die route, de organisatie boven 25 medewerkers en voorbeeldkoppelingen van deskundigheid aan risico’s. De interacties gebruiken uitsluitend bestaande vraag- en bloktypen. Er is geen schemawijziging of migratie nodig.

Broncontrole is uitgevoerd op 26 september 2026 aan de hand van de actuele Nederlandse Arbeidsinspectie-informatie en werkinstructie (26 januari 2026), Steunpunt RI&E, Arboportaal en het toepasselijke certificatieschema. De Arbeidsinspectie noemt uitzonderingen voor organisaties waarin uitsluitend vrijwilligers werken, organisaties met betaald personeel voor in totaal ten hoogste 40 uur per week en bedrijven met 25 of minder medewerkers die een erkende branche-RI&E gebruiken. De voorwaarden en de feitelijke situatie blijven bepalend. Een arbodienst kan deskundige bijstand organiseren, maar de toets wordt uitgevoerd door een daartoe bevoegde persoon. Een BIG-geregistreerde bedrijfsarts is genoemd naast de drie gecertificeerde arbokerndeskundigen; deze registratiestatussen zijn niet gelijkgesteld.

De labels `systeemtoets` en `scopetoets` volgen de Arbeidsinspectie-werkinstructie en worden beperkt tot hoofdlijnen. De les maakt duidelijk dat dit geen twee aparte juridische goedkeuringsroutes zijn. Hun didactische afbakening blijft **CONTENT REVIEW REQUIRED**. H7 als geheel is prototypecontent en vereist arbotechnische/juridische review en studentvalidatie; er wordt geen individuele toetsingsplicht vastgesteld.

De desktopbrowseracceptatie en overige technische verificatie van H7 staan in [H7-verificatie](learning-chapter7-verification.md). Mobiele H7-browserverificatie is niet uitgevoerd vanwege een beperking van de beschikbare tooling; responsive gedrag blijft een expliciet reviewpunt.

## Hoofdstuk 8: RI&E actueel houden

H8 staat op positie 8 met slug `rie-actueel-houden` in `prototype-0.15` en is ongewijzigd opgenomen in `prototype-0.16`. De les behandelt actualisatietriggers, impactbeoordeling, incidenten en werknemerssignalen, nieuwe inzichten, organisatorische veranderingen, werknemersraadpleging en het waar nodig aanpassen van het Plan van Aanpak. De kern is dat er niet simpelweg een algemene vaste geldigheidsduur geldt: beoordeel wat een ontwikkeling betekent voor het werk en de risico’s en pas relevante onderdelen aan. Een verandering betekent niet automatisch dat de hele RI&E opnieuw moet worden opgesteld; de beoordeling wordt verbreed wanneer de impact breder is.

Management of Change en PDCA gebruiken het bestaande generieke `METHODIEK`-callout. Zij zijn didactische denkwijzen en worden niet gepresenteerd als universeel wettelijk voorgeschreven processen. Incidenten, bijna-ongevallen en signalen zijn informatiebronnen, geen automatische opdracht om de volledige RI&E te vervangen. Werknemersraadpleging wordt onderscheiden van de ondersteunende rol van de preventiemedewerker; de toepasselijke vorm hangt mede samen met OR/PVT en de organisatie.

H8 heeft vijf formatieve hoofdstukvragen in de centrale Question Bank. De check is geen examen of certificering en een lage score blokkeert afronding niet. De les sluit af met Logistiek Noord: magazijnuitbreiding, extra heftrucks, nachtdienst, orderpickinstallatie, werkdruksignalen en controle van de eerder gekozen verkeersscheiding vragen om een impactgerichte herbeoordeling. In `prototype-0.15` wees H8 vooruit naar H9; H9 volgde in `prototype-0.16` en H10 in `prototype-0.17`.

Broncontrole is uitgevoerd op 27 september 2026. De officiële [Arboportaal-uitleg over de RI&E](https://www.arboportaal.nl/onderwerpen/arbowet--en--regelgeving/risico-inventarisatie---evaluatie/waaruit-bestaat-de-rie) zegt dat werkgevers de RI&E zo vaak aanpassen als nodig en noemt gewijzigde werkmethoden/omstandigheden en nieuwe inzichten. De actuele [informatie over werknemersraadpleging vanaf 1 juli 2026](https://www.arboportaal.nl/actueel/nieuws/2026/06/29/regels-voor-raadpleging-van-werknemers-aangepast-per-1-juli-2026) wordt op hoofdlijnen gebruikt. H8 blijft **PROTOTYPE / CONTENT REVIEW REQUIRED** voor arbotechnische/juridische review en studentvalidatie; deze broncontrole is geen definitieve juridische goedkeuring.

Technische en productverificatie staat in [H8-verificatie](learning-chapter8-verification.md). Mobiele browsercontrole wordt alleen als uitgevoerd gerapporteerd wanneer een echte viewport kon worden ingesteld.

## Hoofdstuk 9: van papier naar praktijk

H9 staat op positie 9 met slug `van-papier-naar-praktijk` in `prototype-0.16`. De les heeft 55 ContentBlocks, 31 stabiele Question Bank-vragen met 130 antwoordopties en twaalf leerdoelen. Zij gebruikt Logistiek Noord: de fysieke voetgangersscheiding is gerealiseerd, maar medewerkers steken vanwege routeafstand, tijdsdruk en dagelijkse aansturing structureel door het heftruckgebied. H9 laat zien hoe directe risicobeheersing samengaat met onderzoek naar gedrag en omstandigheden, praktische uitvoerbaarheid, instructie, middelen, leidinggeven, toezicht, observaties en meldingen.

De les gebruikt work as imagined/work as done, werkplekrondes, leading/lagging informatie en Lessons Learned als didactische denkkaders of goede praktijk, niet als universele wettelijke formats. Voorlichting, taakgericht onderricht en toezicht zijn beperkt gekoppeld aan artikel 8 van de Arbeidsomstandighedenwet. De Question Bank gebruikt stabiele `WL001-H9-*`-codes en vijf formatieve hoofdstukcheckvragen. De check is geen examen; een lage score blokkeert afronding niet. Bevindingen over structureel ineffectieve maatregelen kunnen aanleiding geven om RI&E en Plan van Aanpak waar nodig bij te werken.

H9 gebruikt bestaande ContentBlock- en Question Bank-modellen; er is geen schemawijziging of migratie nodig. H9 blijft **PROTOTYPE / CONTENT REVIEW REQUIRED** voor arbotechnische/juridische beoordeling en studentvalidatie.

## Hoofdstuk 10: integrale praktijkcasus

H10 staat op positie 10 met slug `integrale-praktijkcasus` in `prototype-0.17`. De integrale casus Logistiek Noord verbindt dossier en Plan van Aanpak, rondgang, inventarisatie, beoordeling en prioritering, maatregelenhiërarchie, concrete acties, toetsing en deskundigheid, uitvoering, borging en actualisatie. Nieuwe informatie en een bijna-aanrijding laten zien hoe bevindingen kunnen teruggaan naar RI&E en Plan van Aanpak. De casus gebruikt positieve én zorgelijke observaties en vraagt om onzekerheid zichtbaar te maken in plaats van een score of oorzaak te verzinnen.

H10 bevat 71 ContentBlocks, 45 Question Bank-vragen met 189 antwoordopties, elf leerdoelen en acht formatieve integratievragen. Single-choice en multi-select gebruiken de bestaande beoordelings- en feedbackflow. Vóór de afronding staat een statisch reflectieblok; het antwoord wordt niet als vraagpoging beoordeeld of opgeslagen. Het afrondingsscherm verwijst naar de toekomstige eindtoets en claimt geen beroepskwalificatie. Er is geen schemawijziging of migratie nodig.

Met `prototype-0.17` zijn de inhoudelijke hoofdstukken H1–H10 technisch opgenomen als prototype. De eindtoets v1.0 is als aparte versie technisch geïmplementeerd en geverifieerd; dit betekent niet dat WL-001 productieklaar is. Kennisbehoud, certificaat/bewijs, commerciële opleidingsplaatsen, formele juridische/arbotechnische review, toetsvalidatie, studentvalidatie en integrale cursusreview moeten nog volgen. H1–H10 en examcontent blijven **CONTENT REVIEW REQUIRED**; technische verificatie is geen juridische of psychometrische goedkeuring.

### Eindtoets v1.1

De v1.1-implementatie introduceert de immutable toetsversie `WL-001-EXAM-1.1` met E01–E50. De cesuur blijft 40/50 (80%), zonder tijdslimiet en met onbeperkte pogingen. Inhoudelijke tekstwijzigingen gebruiken nieuwe `LearningQuestion`-versies; de historische v1.0-vraaginhoud en attempts blijven herleidbaar. Bij publicatie wordt v1.0 alleen naar de lifecycle-status `RETIRED` gezet, zonder de inhoud, scoring of mapping te wijzigen. De versie is op de geïsoleerde preflightdatabase gepubliceerd; de lokale gedeelde ontwikkeldatabase is niet gemigreerd.

Juridisch gevoelige vragen E31–E34, E39 en E44 zijn gemarkeerd als `CONTENT REVIEW REQUIRED — LEGAL`. Specialistisch onderzoek of advies en formele RI&E-toetsing zijn verschillende functies. Welke deskundigheid nodig is, hangt af van het onderwerp en het toepasselijke wettelijke kader. Deze inhoud is gecontroleerd tegen informatie van [Steunpunt RI&E](https://www.rie.nl/) en [Arboportaal](https://www.arboportaal.nl/); formele juridische/arbotechnische review blijft vereist.

Tijdens iedere multi-selectvraag staat de instructie: “Meerdere antwoorden zijn mogelijk. Selecteer alle juiste antwoorden.” Alleen de exacte correcte set levert een punt op. Er zijn geen deelpunten of negatieve punten.

Zie het [v1.1-verificatieverslag](learning-final-exam-verification.md) voor de versieovergang, de antwoordlengte-analyse en de testresultaten.

### Historische eindtoets v1.0

Voor WL-001 is een afzonderlijke immutable examversie `WL-001-EXAM-1.0` technisch gepubliceerd met de canonieke E01–E50-bank. De cesuur is voorlopig 40/50 (80%), zonder tijdslimiet en met onbeperkte pogingen. De indicatieve duur is 45–60 minuten. Tijdens de toets krijgt de deelnemer geen directe feedback; antwoorden zijn vóór inleveren wijzigbaar en pogingen blijven afzonderlijk bewaard. Single choice en multi-select leveren alleen een punt op bij exact de correcte keuze/set; alle andere combinaties leveren nul op.

Toegang vereist server-side een eigen WL-001-inschrijving en afronding van H1–H10. E31–E34 zijn gemarkeerd als `CONTENT REVIEW REQUIRED — LEGAL`. Technische publicatie heft inhoudelijke, juridische of arbotechnische review niet op. De examuitslag is geen beroepskwalificatie. Kennisbehoud en commerce zijn niet gebouwd.

De laatste inhoudelijke correcties vervangen E13 en E39. Beperkte afleiderpolish is gelogd in [het eindtoetsverificatieverslag](learning-final-exam-verification.md); correcte antwoorden, scoringregels en cesuur zijn ongewijzigd. De verificatiestatus staat in hetzelfde verslag.

Technische en browserverificatie van H10 staat in [H10-verificatie](learning-chapter10-verification.md).

### Certificaat van afronding

Voor WL-001 is een additief certificaatmodel toegevoegd. Na afronding van de tien hoofdstukken en een ingeleverde, geslaagde WL-001-eindtoetspoging kan één certificaat per student en opleiding worden uitgegeven. De eerste geslaagde poging bepaalt de behaaldatum. De naam wordt vóór uitgifte in het Learning-profiel bevestigd en als onveranderlijke voor- en achternaamsnapshot opgeslagen. Certificaatnummer, opleiding, cursus-/examversie, templateversie en status blijven herleidbaar; een certificaat kan alleen worden ingetrokken en wordt niet verwijderd.

De server genereert templateversie `WL-001-CERT-1.0` als A4-landscape-PDF met WorkMatchr-logo, verificatie-QR en de vaste disclaimer. De persoonlijke download vereist een actieve Learning-sessie. De publieke route `/certificaat/[code]` toont alleen naam, opleiding, behaaldatum, uitgever, certificaatnummer en status; zij is noindex en biedt geen lijst- of zoekroute. De mailintentie wordt transactioneel in de bestaande NotificationOutbox opgeslagen en de bestaande beveiligde onderhoudsroute kan deze verwerken met retry/idempotentie. De productieplanning is niet geactiveerd. De transactionele mail meldt kennisbehoud alleen als toekomstige vrijwillige optie wanneer het programma beschikbaar komt; er is tijdens ontwikkeling geen echte e-mail verzonden.

Certificaten bevestigen uitsluitend afronding van de WorkMatchr-opleiding en bijbehorende toets; ze geven geen beroepskwalificatie, wettelijke bevoegdheid of arbokerndeskundige-certificering. Technische verificatie vervangt geen integrale juridische/contentreview of studentvalidatie. Zie [certificaatverificatie](learning-certificate-verification.md).

## Migratie en lokale uitvoering

De nieuwe migratie is `20260924150000_add_learning_vertical_slice`; zij volgt op de 82 canonieke migraties inclusief ADR-024 en wijzigt geen bestaande migratie. De Learning-seed wordt afzonderlijk uitgevoerd met `npm run seed:learning`, nadat de migratieketen en seed-idempotentie op een geïsoleerde database zijn gevalideerd.

De catalogus en leerflows vereisen een actieve WorkMatchr-sessie. De navigatie toont `E-LEARNINGS` voor bestaande accounttypen en voor een account met `LearningProfile`; Learning-only gebruikers krijgen geen Marketplace- of organisatienavigatie. Server-side autorisatie blijft bepalend, ook wanneer een route rechtstreeks wordt geopend.

## Kennisbehoud v1 — prototypeflow

Er is een afzonderlijke retentiecontentbank R001–R100 als DRAFT voorbereid. De bank bevat 63 single-choice- en 37 multi-choicevragen, vaste feedback en chapter/knowledge-area/cognitieve metadata; zij wordt niet ge-seed of als actieve content aangeboden. De eerste automatische kwaliteitsreview vond 33/63 unieke-langste-correcte opties (52,4%); na beperkte antwoordlengte- en afleiderpolish is dit 21/63 (33,3%). Antwoordsets en scorebeleid zijn ongewijzigd. De verdelingen zijn H1–H10 5/10/10/15/15/10/10/8/8/9 en B/T/A 20/55/25. Multi-select gebruikt exact-set scoring zonder deelpunten.

De prototypecode bevat daarnaast een server-side opt-in/consentflow, idempotente persistentie van weekchecks met vijf vastgelegde vraagversies, definitieve antwoordcontrole en feedback, hervatten/resultaten, selectie op exam- en retentieprestaties, stopblokkade en scheduler-/outboxhooks. Jaarherinnering heeft een afzonderlijke consentactie, kalenderjaardatum, outbox-intent en 10-vragencheck met één vraag per hoofdstuk H1–H10. De readmodels verbergen antwoordcorrectheid tot de student de betreffende vraag definitief beantwoordt. De wekelijkse en jaarlijkse mails hebben een afzonderlijke outboxworker; deze is niet aan productieplanning gekoppeld of uitgevoerd.

R001–R100 blijven DRAFT en zijn niet ge-seed/gepubliceerd. Er is geen databaseverbinding of PostgreSQL-runtime uitgevoerd; browseracceptatie is niet uitgevoerd wegens ontbrekende bestaande ingelogde browsersessie. De code is getest met database-onafhankelijke selector-, policy- en in-memory orchestratietests, maar dit bewijst geen Prisma/PostgreSQL-transactie- of migratieruntime. Geen productiecron, outboxbezorging, echte mail, deployment of gedeelde databasewijziging is uitgevoerd.

**Status:** TECHNICALLY IMPLEMENTED PROTOTYPE — DATABASE RUNTIME NOT TESTED — ENVIRONMENT LIMITATION; BROWSER ACCEPTANCE NOT TESTED — TOOLING LIMITATION. Juridisch gevoelige vragen zijn `CONTENT REVIEW REQUIRED — LEGAL`; `ASSESSMENT/LEARNING VALIDATION REQUIRED` blijft gelden voor formele review en studentpilot. Geen WCAG-conformiteitsclaim.
