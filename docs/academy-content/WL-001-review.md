# WL-001 — RI&E in de praktijk: inhoudelijk reviewdossier

Status: **DRAFT — menselijke inhoudelijke, juridische en assessmentacceptatie OPEN**. Laatst inhoudelijk onderzocht: 2026-11-04. Dit is een nieuwe zelfstandige contentkandidaat, geen publicatie of wijziging van bestaande cursussen.

## Herkomst en behoud

Canonieke identiteit: WL-001 / `rie-in-de-praktijk`. Bron `prototype-0.17`, de tien hoofdstukken uit `learning-prototype-content.ts` en `learning-chapter2/4–10-content.ts`, definitief examenbankbestand **v1.1**, bestaande 100 retentievragen. De bronbestanden en historische resultaten blijven intact. Historische reviewrapporten gaven geen volledige menselijke juridische goedkeuring; dit dossier neemt die niet aan.

Kandidaat: `WL-001-COURSE-1.0-DRAFT`; examen `WL-001-EXAM-1.2-DRAFT`; retentiebank `WL-001-RETENTION-1.1-DRAFT`. De JSON gebruikt het bestaande `AcademyCourseBundle`-contract, geen nieuwe opslagarchitectuur. SHA-256: `4474134f46cac62f4123fb247f8998ab0c6a5ae833e1d651411f3cc7d87bf3dd`. De JSON-reviewdescriptor bevat per bronbestand de hash en per vraag de herkomst, versie, antwoordmapping en concrete wijziging.

## Doelgroep, voorkennis en resultaat

Voor werkgevers, beginnende preventiemedewerkers, leidinggevenden en HR-/facilitair betrokkenen. Geen formele vooropleiding vereist; kunnen lezen van Nederlandse werksituaties en enige kennis van de eigen praktijk volstaan. De deelnemer leert inventariseren, onzekerheid herkennen, risico’s beoordelen, maatregelen onderbouwen en opvolgen. Dit is geen opleiding tot gecertificeerd RI&E-toetser en geen individuele juridische beoordeling.

## Volledigheid en studieplan

| H | Hoofdstuk | Blokken | Formatieve vragen | Checkvragen* | Minutenraming |
| --- | --- | ---: | ---: | ---: | ---: |
| 1 | Waarom een RI&E? | 29 | 10 | 3 | 12 |
| 2 | Wie doet wat? | 28 | 13 | 5 | 20 |
| 3 | Risico’s inventariseren | 47 | 14 | 5 | 18 |
| 4 | Risico’s beoordelen | 44 | 19 | 5 | 24 |
| 5 | Maatregelen bepalen | 40 | 17 | 5 | 22 |
| 6 | Plan van Aanpak: van risico naar actie | 44 | 16 | 5 | 23 |
| 7 | Toetsing van de RI&E | 50 | 28 | 5 | 30 |
| 8 | RI&E actueel houden | 48 | 21 | 5 | 30 |
| 9 | Van papier naar praktijk | 55 | 31 | 5 | 33 |
| 10 | Integrale praktijkcasus | 72 | 45 | 8 | 43 |

*De 51 checkvragen zijn een subset van de 214 formatieve vragen, geen extra bank. Alle 455 bestaande inhoudsblokken zijn overgenomen; twee zichtbare oriëntatie-/afrondingscallouts brengen de kandidaat op 457 blokken. Elk hoofdstuk heeft leerdoelen, uitleg, voorbeelden, oefenfeedback, samenvatting en toetsen. De machineleesbare dekkingsmatrix bevat alle 104 specifieke hoofdstukleerdoelen, met per doel de concrete oefenblokken, formatieve vraagcodes en wel/niet aanwezige examendekking. Alle tien hoofdstukken komen terug in examen én retentie; dat betekent niet dat ieder specifiek leerdoel volledig summatief wordt getoetst.

Raming: **255 minuten hoofdstukken + 45 minuten examen = 300 minuten**. Dit is geen gemeten doorlooptijd. De telling omvat 11359 woorden lesblokken en 20098 woorden formatieve vraagtekst, antwoordopties en feedback (zonder dubbele weergave van dezelfde vraag in een block). Rekenbasis: circa 200 woorden/minuut, gemiddeld 15 seconden extra afweging per oefenvraag, plus aparte reflectie/notities. De descriptor specificeert dit per hoofdstuk. Langzamer lezen (bijvoorbeeld180 woorden/minuut), notities en herhaling kunnen de duur boven vijf uur brengen. Een echte doelgroep-pilot blijft noodzakelijk; de hoeveelheid oefenwerk is niet kunstmatig verminderd om een tijdsbelofte te halen.

De 100 retentievragen horen bij vrijwillig kennisbehoud na afronding, niet bij de eerste vijf uur. Praktische werkplekonderzoeken buiten de les vallen niet in deze raming.

## Oefeningen, examen en certificaat

Antwoordmodellen staan in de versiegebonden vragen als volledige juiste antwoordset en verklarende feedback. De lesblokken bevatten geen `correctAnswer`, `isCorrect` of `answerKey`. Meerkeuze vereist de volledige juiste set; een subset of extra fout antwoord is niet juist. De bestaande cesuur blijft **40/50 (80%)**, met onbeperkt herkansen; formatieve fouten zijn leermomenten en wijzigen de examencesuur niet.

Certificaatvoorwaarden: tien hoofdstukken afronden via bestaande voortgang en een voldoende examen. Het certificaat bewijst cursusafronding, geen wettelijke beroepskwalificatie, toetsingsbevoegdheid of garantie dat een organisatie aan de Arbowet voldoet. Geen wettelijke geldigheidsduur toegekend. Geen certificaat, score, poging, inschrijving of bestaande resultaatregel is aangemaakt of gewijzigd.

## Bevestigde correcties en inhoudelijke grenzen

- `WL001-H6-NOORD-VIJF`: de bron had MULTI_CHOICE met één juist antwoord; kandidaat is SINGLE_CHOICE met dezelfde juiste inhoud.
- `WL001-H8-CHECK-02`: dubbele exacte vraagstam verduidelijkt als zelfstandige hoofdstuktoets. Herhaling als leermiddel blijft zichtbaar; geen claim van214 inhoudelijk volledig verschillende constructen.
- `WL001-H7-ATLAS`: gezamenlijke betaalde arbeidsduur en vrijwilligerssituatie expliciet opgenomen, zodat onbekende omstandigheden niet stilzwijgend een uitzondering uitsluiten.
- E31: 40-uursuitzondering onderscheiden van de praktische checklist; juiste antwoord behouden. E33: weergave van een Markdown-escape verbeterd. E45: cijferopties als ‘Bevinding 1’ enzovoort leesbaar gemaakt. Alle 50examenvraagstammen en juiste antwoordsets zijn ongewijzigd.
- Retentie: de bestaande `item()`-shuffle levert zichtbare juiste posities A14/B14/C16/D19, maximaal twee achtereen. De eerder onderzochte 61 interne A-codes en reeks 39 beschrijven uitsluitend `option.value`, niet de presentatievolgorde; er was dus geen bevestigd positie-biasdefect. Alle 100 bestaande optiesets inclusief volgorde, juiste antwoordcodes en vraagversies zijn exact behouden. De nieuwe Draft-bankidentiteit legt alleen de kandidaatbinding vast.
- 9 sorteer-/mappingvragen en14 waar/onwaarvragen zijn in nieuwe vraagversies omgezet naar het bestaande bundleformaat. Casusvormen behouden hun context. Te grote optiesets zijn samengevoegd met behoud van iedere oorspronkelijke uitspraak. Dit verandert herkenning versus ordenen en de granulariteit van antwoorden; **assessmentreview blijft expliciet OPEN**. Er is niets uit historische bronvragen verwijderd.

Examen: 42 single/8 multi; antwoordposities9/9/14/10; uniek-langste correct23,8%. Retentie: 63 single/37 multi; uniek-langste correct33,3%. Deze meetwaarden zijn geen bewijs van psychometrische validiteit. Een pilot en inhoudelijke review blijven nodig.

### Exacte nieuwe vraagversies buiten retentie

| Broncode | Kandidaatcode | Versie | Wijziging |
| --- | --- | --- | --- |
| WL001-H1-GEVAAR-RISICO | WL001-H1-GEVAAR-RISICO | 1 → 2 | Ordenen/koppelen naar herkenning van volledige volgorde of mapping; bronantwoord volledig behouden, cognitieve vorm opnieuw beoordelen. |
| WL001-H1-INVENTARISEREN | WL001-H1-INVENTARISEREN | 1 → 2 | Waar/onwaar naar drie beargumenteerde keuzen; oorspronkelijke juiste beoordeling behouden, nieuwe afleider vraagt assessmentreview. |
| WL001-H1-CYCLUS | WL001-H1-CYCLUS | 1 → 2 | Ordenen/koppelen naar herkenning van volledige volgorde of mapping; bronantwoord volledig behouden, cognitieve vorm opnieuw beoordelen. |
| WL001-H1-AUTOBEDRIJF | WL001-H1-AUTOBEDRIJF | 1 → 2 | Casus blijft volledig behouden; type afgestemd op aantal juiste opties. |
| WL001-H1-AUTOBEDRIJF-INFO | WL001-H1-AUTOBEDRIJF-INFO | 1 → 2 | Alle oorspronkelijke uitspraken behouden in maximaal drie groepen; eventuele onjuiste opties behouden. Gezamenlijke keuze verandert scoringsgranulariteit: nieuwe vraagversie, menselijke beoordeling vereist. |
| WL001-H1-CHECK-PRODUCTIELIJN | WL001-H1-CHECK-PRODUCTIELIJN | 1 → 2 | Casus blijft volledig behouden; type afgestemd op aantal juiste opties. |
| WL001-H1-CHECK-CYCLUS | WL001-H1-CHECK-CYCLUS | 1 → 2 | Ordenen/koppelen naar herkenning van volledige volgorde of mapping; bronantwoord volledig behouden, cognitieve vorm opnieuw beoordelen. |
| WL001-H2-OPENING | WL001-H2-OPENING | 1 → 2 | Casus blijft volledig behouden; type afgestemd op aantal juiste opties. |
| WL001-H2-INTERNE-ROL | WL001-H2-INTERNE-ROL | 1 → 2 | Waar/onwaar naar drie beargumenteerde keuzen; oorspronkelijke juiste beoordeling behouden, nieuwe afleider vraagt assessmentreview. |
| WL001-H2-MEDEZEGGENSCHAP | WL001-H2-MEDEZEGGENSCHAP | 1 → 2 | Casus blijft volledig behouden; type afgestemd op aantal juiste opties. |
| WL001-H2-SCOPE | WL001-H2-SCOPE | 1 → 2 | Casus blijft volledig behouden; type afgestemd op aantal juiste opties. |
| WL001-H2-ROLLEN | WL001-H2-ROLLEN | 1 → 2 | Ordenen/koppelen naar herkenning van volledige volgorde of mapping; bronantwoord volledig behouden, cognitieve vorm opnieuw beoordelen. |
| WL001-H2-NOVA | WL001-H2-NOVA | 1 → 2 | Casus blijft volledig behouden; type afgestemd op aantal juiste opties. |
| WL001-H2-CHECK-03 | WL001-H2-CHECK-03 | 1 → 2 | Casus blijft volledig behouden; type afgestemd op aantal juiste opties. |
| WL001-H2-CHECK-04 | WL001-H2-CHECK-04 | 1 → 2 | Ordenen/koppelen naar herkenning van volledige volgorde of mapping; bronantwoord volledig behouden, cognitieve vorm opnieuw beoordelen. |
| WL001-H2-CHECK-05 | WL001-H2-CHECK-05 | 1 → 2 | Casus blijft volledig behouden; type afgestemd op aantal juiste opties. |
| WL001-H3-OPEN-MULTI | WL001-H3-OPEN-MULTI | 1 → 2 | Alle oorspronkelijke uitspraken behouden in maximaal drie groepen; eventuele onjuiste opties behouden. Gezamenlijke keuze verandert scoringsgranulariteit: nieuwe vraagversie, menselijke beoordeling vereist. |
| WL001-H3-ONZICHTBAAR | WL001-H3-ONZICHTBAAR | 1 → 2 | Waar/onwaar naar drie beargumenteerde keuzen; oorspronkelijke juiste beoordeling behouden, nieuwe afleider vraagt assessmentreview. |
| WL001-H3-BRONNEN | WL001-H3-BRONNEN | 1 → 2 | Alle oorspronkelijke uitspraken behouden in maximaal drie groepen; eventuele onjuiste opties behouden. Gezamenlijke keuze verandert scoringsgranulariteit: nieuwe vraagversie, menselijke beoordeling vereist. |
| WL001-H3-STORING | WL001-H3-STORING | 1 → 2 | Casus blijft volledig behouden; type afgestemd op aantal juiste opties. |
| WL001-H3-MAATREGEL-VOLDOENDE | WL001-H3-MAATREGEL-VOLDOENDE | 1 → 2 | Waar/onwaar naar drie beargumenteerde keuzen; oorspronkelijke juiste beoordeling behouden, nieuwe afleider vraagt assessmentreview. |
| WL001-H3-LOGISTIEK-INFO | WL001-H3-LOGISTIEK-INFO | 1 → 2 | Alle oorspronkelijke uitspraken behouden in maximaal drie groepen; eventuele onjuiste opties behouden. Gezamenlijke keuze verandert scoringsgranulariteit: nieuwe vraagversie, menselijke beoordeling vereist. |
| WL001-H3-CHECK-02 | WL001-H3-CHECK-02 | 1 → 2 | Alle oorspronkelijke uitspraken behouden in maximaal drie groepen; eventuele onjuiste opties behouden. Gezamenlijke keuze verandert scoringsgranulariteit: nieuwe vraagversie, menselijke beoordeling vereist. |
| WL001-H3-CHECK-04 | WL001-H3-CHECK-04 | 1 → 2 | Ordenen/koppelen naar herkenning van volledige volgorde of mapping; bronantwoord volledig behouden, cognitieve vorm opnieuw beoordelen. |
| WL001-H4-OPENING | WL001-H4-OPENING | 1 → 2 | Casus blijft volledig behouden; type afgestemd op aantal juiste opties. |
| WL001-H4-AANTAL | WL001-H4-AANTAL | 1 → 2 | Waar/onwaar naar drie beargumenteerde keuzen; oorspronkelijke juiste beoordeling behouden, nieuwe afleider vraagt assessmentreview. |
| WL001-H4-SCORE | WL001-H4-SCORE | 1 → 2 | Casus blijft volledig behouden; type afgestemd op aantal juiste opties. |
| WL001-H4-GELUID | WL001-H4-GELUID | 1 → 2 | Waar/onwaar naar drie beargumenteerde keuzen; oorspronkelijke juiste beoordeling behouden, nieuwe afleider vraagt assessmentreview. |
| WL001-H4-MAATREGEL | WL001-H4-MAATREGEL | 1 → 2 | Waar/onwaar naar drie beargumenteerde keuzen; oorspronkelijke juiste beoordeling behouden, nieuwe afleider vraagt assessmentreview. |
| WL001-H4-WERKING | WL001-H4-WERKING | 1 → 2 | Waar/onwaar naar drie beargumenteerde keuzen; oorspronkelijke juiste beoordeling behouden, nieuwe afleider vraagt assessmentreview. |
| WL001-H4-PRIORITEIT | WL001-H4-PRIORITEIT | 1 → 2 | Waar/onwaar naar drie beargumenteerde keuzen; oorspronkelijke juiste beoordeling behouden, nieuwe afleider vraagt assessmentreview. |
| WL001-H4-DIRECT | WL001-H4-DIRECT | 1 → 2 | Casus blijft volledig behouden; type afgestemd op aantal juiste opties. |
| WL001-H4-NOORD-BETER | WL001-H4-NOORD-BETER | 1 → 2 | Waar/onwaar naar drie beargumenteerde keuzen; oorspronkelijke juiste beoordeling behouden, nieuwe afleider vraagt assessmentreview. |
| WL001-H4-NOORD-TRANSPORT | WL001-H4-NOORD-TRANSPORT | 1 → 2 | Casus blijft volledig behouden; type afgestemd op aantal juiste opties. |
| WL001-H4-NOORD-WERKDRUK | WL001-H4-NOORD-WERKDRUK | 1 → 2 | Casus blijft volledig behouden; type afgestemd op aantal juiste opties. |
| WL001-H4-CHECK-04 | WL001-H4-CHECK-04 | 1 → 2 | Casus blijft volledig behouden; type afgestemd op aantal juiste opties. |
| WL001-H4-CHECK-05 | WL001-H4-CHECK-05 | 2 → 3 | Casus blijft volledig behouden; type afgestemd op aantal juiste opties. |
| WL001-H5-OPENING | WL001-H5-OPENING | 1 → 2 | Casus blijft volledig behouden; type afgestemd op aantal juiste opties. |
| WL001-H5-ORDENEN | WL001-H5-ORDENEN | 1 → 2 | Ordenen/koppelen naar herkenning van volledige volgorde of mapping; bronantwoord volledig behouden, cognitieve vorm opnieuw beoordelen. |
| WL001-H5-PBM | WL001-H5-PBM | 1 → 2 | Waar/onwaar naar drie beargumenteerde keuzen; oorspronkelijke juiste beoordeling behouden, nieuwe afleider vraagt assessmentreview. |
| WL001-H5-COMBINATIE | WL001-H5-COMBINATIE | 1 → 2 | Waar/onwaar naar drie beargumenteerde keuzen; oorspronkelijke juiste beoordeling behouden, nieuwe afleider vraagt assessmentreview. |
| WL001-H5-NIEUW | WL001-H5-NIEUW | 1 → 2 | Waar/onwaar naar drie beargumenteerde keuzen; oorspronkelijke juiste beoordeling behouden, nieuwe afleider vraagt assessmentreview. |
| WL001-H5-INSTRUCTIE | WL001-H5-INSTRUCTIE | 1 → 2 | Casus blijft volledig behouden; type afgestemd op aantal juiste opties. |
| WL001-H5-PROCEDURE | WL001-H5-PROCEDURE | 1 → 2 | Waar/onwaar naar drie beargumenteerde keuzen; oorspronkelijke juiste beoordeling behouden, nieuwe afleider vraagt assessmentreview. |
| WL001-H5-NOORD-VERKEER | WL001-H5-NOORD-VERKEER | 1 → 2 | Casus blijft volledig behouden; type afgestemd op aantal juiste opties. |
| WL001-H5-CHECK-02 | WL001-H5-CHECK-02 | 1 → 2 | Ordenen/koppelen naar herkenning van volledige volgorde of mapping; bronantwoord volledig behouden, cognitieve vorm opnieuw beoordelen. |
| WL001-H5-CHECK-03 | WL001-H5-CHECK-03 | 1 → 2 | Casus blijft volledig behouden; type afgestemd op aantal juiste opties. |
| WL001-H5-CHECK-05 | WL001-H5-CHECK-05 | 1 → 2 | Casus blijft volledig behouden; type afgestemd op aantal juiste opties. |
| WL001-H6-NOORD-VIJF | WL001-H6-NOORD-VIJF | 1 → 2 | Bevestigde type-inconsistentie: bron markeert MULTI_CHOICE maar heeft precies een juist antwoord; kandidaat is SINGLE_CHOICE zonder wijziging van antwoordset. |
| WL001-H7-ATLAS | WL001-H7-ATLAS | 1 → 2 | Voorwaarden expliciet gemaakt: onbekende arbeidsduur is geen bewijs dat de 40-uursuitzondering is uitgesloten. |
| WL001-H8-TRIGGERS | WL001-H8-TRIGGERS | 1 → 2 | Alle oorspronkelijke uitspraken behouden in maximaal drie groepen; eventuele onjuiste opties behouden. Gezamenlijke keuze verandert scoringsgranulariteit: nieuwe vraagversie, menselijke beoordeling vereist. |
| WL001-H8-LOGISTIEK-NOORD | WL001-H8-LOGISTIEK-NOORD | 1 → 2 | Alle oorspronkelijke uitspraken behouden in maximaal drie groepen; eventuele onjuiste opties behouden. Gezamenlijke keuze verandert scoringsgranulariteit: nieuwe vraagversie, menselijke beoordeling vereist. |
| WL001-H8-PDCA | WL001-H8-PDCA | 1 → 2 | Ordenen/koppelen naar herkenning van volledige volgorde of mapping; bronantwoord volledig behouden, cognitieve vorm opnieuw beoordelen. |
| WL001-H8-CHECK-02 | WL001-H8-CHECK-02 | 1 → 2 | Dubbele vraagstam voorzien van expliciete hoofdstuktoetscontext; bestaande herhaling inhoudelijk herkenbaar gehouden. |
| WL001-H9-PPE | WL001-H9-PPE | 1 → 2 | Alle oorspronkelijke uitspraken behouden in maximaal drie groepen; eventuele onjuiste opties behouden. Gezamenlijke keuze verandert scoringsgranulariteit: nieuwe vraagversie, menselijke beoordeling vereist. |
| WL001-H9-LOGISTICS-FACTORS | WL001-H9-LOGISTICS-FACTORS | 1 → 2 | Alle oorspronkelijke uitspraken behouden in maximaal drie groepen; eventuele onjuiste opties behouden. Gezamenlijke keuze verandert scoringsgranulariteit: nieuwe vraagversie, menselijke beoordeling vereist. |
| WL001-H9-CHECK-03 | WL001-H9-CHECK-03 | 1 → 2 | Alle oorspronkelijke uitspraken behouden in maximaal drie groepen; eventuele onjuiste opties behouden. Gezamenlijke keuze verandert scoringsgranulariteit: nieuwe vraagversie, menselijke beoordeling vereist. |
| WL001-H10-SHORTCUT-FACTORS | WL001-H10-SHORTCUT-FACTORS | 1 → 2 | Alle oorspronkelijke uitspraken behouden in maximaal drie groepen; eventuele onjuiste opties behouden. Gezamenlijke keuze verandert scoringsgranulariteit: nieuwe vraagversie, menselijke beoordeling vereist. |
| WL001-H10-CHECK-07 | WL001-H10-CHECK-07 | 1 → 2 | Alle oorspronkelijke uitspraken behouden in maximaal drie groepen; eventuele onjuiste opties behouden. Gezamenlijke keuze verandert scoringsgranulariteit: nieuwe vraagversie, menselijke beoordeling vereist. |
| E31 | WL001-EX-E31 | 1 → 2 | 40-uursuitzondering onderscheiden van een praktisch checklistinstrument; juiste antwoord en opties blijven behouden. Juridische review vereist. |
| E33 | WL001-EX-E33 | 1 → 2 | Markdown-escape in afleider vervangen door leesbare tekst; betekenis en juistheid onveranderd. |
| E45 | WL001-EX-E45 | 1 → 2 | Kale cijferopties uitgeschreven als Bevinding plus nummer; juiste antwoord C en betekenis behouden. |

Alle 100 retentievragen behouden hun bestaande vraagversie en opties inclusief de bestaande shuffle. De descriptor bewaart hun één-op-één herkomstbinding zonder inhoudelijke revisie. De overige vraagteksten, casussen en feedback zijn hergebruikt, niet generiek herschreven.

## Bronnen en juridische review

Geraadpleegd op 2026-11-04. CHECKED betekent uitsluitend dat de genoemde officiële pagina toegankelijk was en de beperkte beschreven uitspraak ondersteunt; geen menselijke goedkeuring of garantie voor individuele toepasselijkheid. Iedere juridische vraag blijft voor review gemarkeerd.

- [Arbeidsomstandighedenwet](https://wetten.overheid.nl/BWBR0010346/) — MANUAL_REVIEW_REQUIRED. Artikelen 3, 5, 8, 11, 12, 13, 14 en 14a; geconsolideerde tekst niet toegankelijk (429) op 2026-11-04. Geen juridische goedkeuring.
- [Arbeidsomstandighedenbesluit](https://wetten.overheid.nl/BWBR0008498/) — MANUAL_REVIEW_REQUIRED. Risicospecifieke verplichtingen en artikel 2.14b; geconsolideerde tekst niet toegankelijk (429) op 2026-11-04.
- [Nederlandse Arbeidsinspectie — veelgestelde vragen RI&E](https://www.nlarbeidsinspectie.nl/onderwerpen/aanleveren-rie/veelgestelde-vragen-rie) — CHECKED. Geraadpleegd 2026-11-04: RI&E en plan van aanpak, toetsing; 40 gezamenlijke arbeidsuren en branche-instrument bij maximaal 25 werknemers. Geen volledige individuele uitzonderingsbeoordeling.
- [Arboportaal — risico-inventarisatie en -evaluatie](https://www.arboportaal.nl/onderwerpen/arbowet--en--regelgeving/risico-inventarisatie---evaluatie) — CHECKED. Geraadpleegd 2026-11-04: doel RI&E en plan van aanpak als basis voor risicobeheersing.
- [Arboportaal — nieuwe erkenningsprocedure branche-RI&E](https://www.arboportaal.nl/actueel/nieuws/2026/06/04/nieuwe-erkenningsprocedure-branche-rie) — CHECKED. Publicatie 2026-06-04, geraadpleegd 2026-11-04: wijziging per 1 juni 2026; oude erkenningen tot afgesproken einddatum. Geen verklaring dat een individueel instrument nu erkend is.
- [Steunpunt RI&E — toetsen](https://www.rie.nl/over-rie/toetsen) — CHECKED. Geraadpleegd 2026-11-04: passende branche en erkenning op moment van afronding; passende gecertificeerde deskundigheid.
- [WorkMatchr — bestaande WL-001-cursusbron](https://github.com/WorkMatchr/platform) — MANUAL_REVIEW_REQUIRED. Herkomst: prototype-0.17, examen v1.1 en bestaande retentiebank; synthetische praktijkcasussen en didactische uitwerking, geen externe juridische bron of menselijke goedkeuring.
- [Arboportaal — wet over preventiemedewerker](https://www.arboportaal.nl/onderwerpen/ondersteuning-bij-arbowet/preventiemedewerker/wat-zegt-de-wet-over-de-preventiemedewerker) — CHECKED. Geraadpleegd 2026-11-04: rol, deskundigheid en OR/PVT bij benoeming; individuele toepasselijkheid vraagt review.
- [Arboportaal — opbouw en actualisatie RI&E](https://www.arboportaal.nl/onderwerpen/arbowet--en--regelgeving/risico-inventarisatie---evaluatie/waaruit-bestaat-de-rie) — CHECKED. Geraadpleegd 2026-11-04: concrete risico’s, maatregelen en plan van aanpak; actualiseren wanneer nodig.
- [Nederlandse Arbeidsinspectie — arboregels voor uitzendkrachten](https://www.nlarbeidsinspectie.nl/onderwerpen/arbeidsomstandighedenwet/arboregels-voor-uitzendkrachten) — CHECKED. Geraadpleegd 2026-11-04: informatie vooraf en verantwoordelijkheid inlener en uitlener. Geen individuele aansprakelijkheidsbeoordeling.

Bij RI&E-toetsing moet de reviewer de geconsolideerde artikelen 14 lid 12/13 Arbowet en 2.14b Arbobesluit, de erkenningsvoorwaarden en passende deskundigheid nog aftekenen. De 25-werknemersroute en maximaal 40 gezamenlijke betaalde uren zijn afzonderlijke uitzonderingsroutes; een ontbrekend gegeven is geen bewezen uitsluiting. Een erkend instrument moet passen en op het relevante moment erkend zijn. De officiële publicatie van 4 juni 2026 bevestigt dat de gewijzigde erkenningsprocedure sinds 1 juni 2026 geldt en oude erkenningen hun afgesproken einddatum behouden. Er wordt geen individueel instrument goedgekeurd.

Het aangeleverde **AI-1 Arbo- en verzuimbeleid**, derde herziene druk 2002, Sdu, ISBN 9012093287 (bestand `AI-01 Arbo- en verzuimbeleid.pdf`, 57 pagina’s), is gelezen voor historische context: p. 19–22 en 29–31. De denkcyclus en praktijkgerichte benadering sluiten aan op de bestaande lessen. Oude wetsartikelen, certificeringsregels, OHSAS-verwijzingen en verzuimregels uit 2002 zijn niet als actuele juridische norm overgenomen. Geen PDF, lange citaten of persoonlijke bronpaden in Git.

## Technische verificatie en publicatiegrens

- Bestaande `validateAcademyBundle`:PASS, 364 unieke vraagcodes en genormaliseerde vraagstammen, 10 hoofdstukken, alle vragen en bronnen herleidbaar.
- Alle 214 formatieve vragen gekoppeld aan lesblokken; 50 examenvragen en 100 retentievragen in juiste namespace/volgorde.
- Vergelijking bron↔kandidaat:alle 50 examenvraagstammen en antwoordsets behouden; alle 100 retentievraagteksten en inhoudelijke optiejuistheid behouden; iedere gegroepeerde oorspronkelijke optie teruggevonden.
- Geen runtimebestanden, seed, migratie of historische cursus gewijzigd. Lint/build en gezamenlijke render-/scoringtests worden door de hoofdtaak gerapporteerd; hier niet voortijdig als PASS aangemerkt.
- Het bestaande rijke bundleformaat en de nieuwe beperkte authoringeditor zijn niet verliesloos uitwisselbaar. Publicatie/import blijft geblokkeerd totdat behoud van alle lesblokken en vragen aantoonbaar is. De JSON is een reviewartefact; geen databasepublicatie uitgevoerd.

## Open besluiten en checkpoint

- Menselijke juridische review van actuele geconsolideerde Arbowet en Arbobesluit, met name artikel 14 leden 12/13 en artikel 2.14b, scope/certificering en vrijwilligers. Wetten.overheid was niet toegankelijk; officiële toelichtingen zijn geen vervanging van deze beoordeling.
- Didactische acceptatie van nieuwe formatieve vraagversies: mapping/volgordeherkenning, drie-optievragen en gegroepeerde meerkeuze veranderen de antwoordhandeling. Alle bronbestanden blijven intact.
- Pilot met doelgroep om werkelijke studietijd, belasting van 214 formatieve vragen en begrijpelijkheid te meten; 300 minuten is een raming, geen gemeten belofte.
- Assessmentreview van behouden retentie-inhoud en E31/E33/E45 in examenversie1.2; inhoudelijke beoordeling en certificaatuitgifte niet automatisch goedgekeurd.
- LMS-integratie houdt volledige rijke inhoud aan: AuthoringCourse ondersteunt nog niet dezelfde blok-/vraagstructuur. Geen conversie met inhoudsverlies of automatische publicatie; afzonderlijke integratieacceptatie nodig.

Voorbereiding en technische contentvalidatie afgerond. **Inhoudelijke publicatie: NO-GO tot menselijke review en LMS-integratieacceptatie.** Reviewer, datum en besluit blijven leeg; geen automatische goedkeuring.

## Aanvullende eindreview: alle leerdoelen en lesseneenheden

Er zijn **73 uitleg-/lesseneenheden** (TEXT-blokken met volledige alinea’s), **10 hoofdstukken** en **457 totale contentblokken**. De 457 omvatten ook koppen, callouts, processen, samenvattingen en interactieve oefeningen; ze worden niet als 457 volledige lessen voorgesteld. Alle 104 specifieke leerdoelen staan hieronder. De tien overkoepelende koersdoelen blijven apart in `courseLearningObjectives` bewaard.

Summatieve dekkingsvoorstellen: **61 DIRECT**, **25 PARTIAL**, **18 NOT_EXPLICIT**. DIRECT betekent inhoudelijke koppeling, geen menselijke goedkeuring. PARTIAL noemt de grens. NOT_EXPLICIT betekent dat geen rechtstreekse examenvraag is gevonden; de concrete formatieve oefening blijft aanwezig. Geen nieuwe examenvragen toegevoegd en geen verborgen 100%-dekkingsclaim.

### Hoofdstuk 1 — Waarom een RI&E?

| Leerdoel | Formatieve vragen | Examen | Dekking en begrenzing |
| --- | --- | --- | --- |
| WL001-H1-LO01: Uitleggen waarvoor een RI&E wordt gebruikt | WL001-H1-CHECK-FUNCTIE | WL001-EX-E01 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H1-LO02: Het verschil tussen gevaar en risico herkennen | WL001-H1-GEVAAR-RISICO | Geen directe binding | NOT_EXPLICIT: Geen afzonderlijke rechtstreekse summatieve vraag gevonden; bestaande formatieve oefening aantoonbaar aanwezig. |
| WL001-H1-LO03: Uitleggen waarom inventariseren alleen onvoldoende is | WL001-H1-INVENTARISEREN | WL001-EX-E03 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H1-LO04: De relatie tussen RI&E, Plan van Aanpak, maatregelen en evalueren herkennen | WL001-H1-CYCLUS, WL001-H1-CHECK-CYCLUS | WL001-EX-E03 | PARTIAL: E03 toetst waarom inventariseren onvoldoende is; niet iedere stap van de volledige cyclus afzonderlijk. |
| WL001-H1-LO05: Herkennen dat veranderingen aanleiding kunnen zijn de RI&E te actualiseren | WL001-H1-ACTUALITEIT, WL001-H1-CHECK-PRODUCTIELIJN | WL001-EX-E36 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |

### Hoofdstuk 2 — Wie doet wat?

| Leerdoel | Formatieve vragen | Examen | Dekking en begrenzing |
| --- | --- | --- | --- |
| WL001-H2-LO01: Uitleggen waarom de werkgever verantwoordelijk blijft. | WL001-H2-UITBESTEDEN, WL001-H2-CHECK-01 | WL001-EX-E04, WL001-EX-E05 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H2-LO02: De rol van de preventiemedewerker herkennen. | WL001-H2-INTERNE-ROL, WL001-H2-CHECK-02 | WL001-EX-E05 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H2-LO03: Uitleggen waarom werknemers worden betrokken. | WL001-H2-NOVA-BIJDRAGEN, WL001-H2-CHECK-05 | WL001-EX-E06 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H2-LO04: De rol van OR/PVT herkennen. | WL001-H2-MEDEZEGGENSCHAP | WL001-EX-E06 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H2-LO05: Arbodienst, bedrijfsarts en arbokerndeskundigen onderscheiden. | WL001-H2-ROLLEN, WL001-H2-CHECK-04 | Geen directe binding | NOT_EXPLICIT: Geen afzonderlijke rechtstreekse summatieve vraag gevonden; bestaande formatieve oefening aantoonbaar aanwezig. |
| WL001-H2-LO06: De vier arbokerndeskundigheden herkennen. | WL001-H2-SCOPE, WL001-H2-CHECK-03 | Geen directe binding | NOT_EXPLICIT: Geen afzonderlijke rechtstreekse summatieve vraag gevonden; bestaande formatieve oefening aantoonbaar aanwezig. |
| WL001-H2-LO07: Deskundigheid bij toetsing laten aansluiten op de risico’s. | WL001-H2-SCOPE, WL001-H2-CHECK-03 | WL001-EX-E07, WL001-EX-E33 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H2-LO08: Samenwerking rond de RI&E organiseren. | WL001-H2-NOVA, WL001-H2-NOVA-BIJDRAGEN | WL001-EX-E06, WL001-EX-E07 | PARTIAL: E06/E07 toetsen betrokkenheid en passende expertise, niet zelfstandig een volledige samenwerkingsaanpak ontwerpen. |

### Hoofdstuk 3 — Risico’s inventariseren

| Leerdoel | Formatieve vragen | Examen | Dekking en begrenzing |
| --- | --- | --- | --- |
| WL001-H3-LO01: Arbeidsrisico’s systematisch opsporen | WL001-H3-OPEN-MULTI, WL001-H3-LOGISTIEK-NOORD | WL001-EX-E09 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H3-LO02: Uitleggen waarom een werkplekrondgang niet voldoende is | WL001-H3-ONZICHTBAAR | WL001-EX-E12 | PARTIAL: E12 vraagt aanvullende praktijkinformatie; geen expliciete vraag over onzichtbare risico’s bij een rondgang. |
| WL001-H3-LO03: Relevante informatiebronnen herkennen | WL001-H3-BRONNEN, WL001-H3-CHECK-02 | WL001-EX-E11, WL001-EX-E12 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H3-LO04: Werkzaamheden en processen als uitgangspunt gebruiken | WL001-H3-RUIMTE-PROCES | WL001-EX-E11, WL001-EX-E12 | PARTIAL: E11/E12 toetsen praktijkgegevens, niet rechtstreeks ruimte-indeling versus werkproces als begrippenpaar. |
| WL001-H3-LO05: Normale en afwijkende werkzaamheden meenemen | WL001-H3-STORING, WL001-H3-CHECK-01 | Geen directe binding | NOT_EXPLICIT: Geen afzonderlijke rechtstreekse summatieve vraag gevonden; bestaande formatieve oefening aantoonbaar aanwezig. |
| WL001-H3-LO06: Mogelijk blootgestelde groepen herkennen | WL001-H3-CHECK-04, WL001-H3-LOGISTIEK-INFO | WL001-EX-E08 | PARTIAL: E08 gaat over blootstelling; bijzondere categorieën en alle mogelijk blootgestelde groepen worden niet afzonderlijk getoetst. |
| WL001-H3-LO07: Bestaande beheersmaatregelen meenemen | WL001-H3-BESTAANDE-MAATREGEL | WL001-EX-E10 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H3-LO08: Inventariseren onderscheiden van beoordelen | WL001-H3-MAATREGEL-VOLDOENDE, WL001-H3-CHECK-03 | WL001-EX-E10, WL001-EX-E13 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |

### Hoofdstuk 4 — Risico’s beoordelen

| Leerdoel | Formatieve vragen | Examen | Dekking en begrenzing |
| --- | --- | --- | --- |
| WL001-H4-LO01: Inventariseren en beoordelen van elkaar onderscheiden | WL001-H4-OPENING, WL001-H4-GELUID | WL001-EX-E13, WL001-EX-E16 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H4-LO02: Relevante beoordelingsfactoren herkennen | WL001-H4-CHECK-02, WL001-H4-AANVULLEND | WL001-EX-E14, WL001-EX-E15 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H4-LO03: Aantal blootgestelde personen meenemen | WL001-H4-AANTAL | Geen directe binding | NOT_EXPLICIT: Geen afzonderlijke rechtstreekse summatieve vraag gevonden; bestaande formatieve oefening aantoonbaar aanwezig. |
| WL001-H4-LO04: Duur en frequentie van blootstelling meenemen | WL001-H4-AANTAL, WL001-H4-NOORD-TILLEN | WL001-EX-E14 | PARTIAL: E14 bevat dagelijkse blootstelling; duur en frequentie worden niet als afzonderlijke factoren getoetst. |
| WL001-H4-LO05: Waarschijnlijkheid meenemen | WL001-H4-NOORD-TRANSPORT, WL001-H4-CHECK-02 | WL001-EX-E14 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H4-LO06: Mogelijke gevolgen meenemen | WL001-H4-CHECK-01, WL001-H4-CHECK-02 | WL001-EX-E15 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H4-LO07: Bestaande maatregelen bij de beoordeling betrekken | WL001-H4-MAATREGEL | WL001-EX-E17 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H4-LO08: Restrisico herkennen | WL001-H4-WERKING | WL001-EX-E17 | PARTIAL: E17 laat bestaande afscherming meewegen; het begrip restrisico zelf wordt niet rechtstreeks gevraagd. |
| WL001-H4-LO09: Beperkingen van risicoscores en matrices uitleggen | WL001-H4-SCORE, WL001-H4-SCHIJNPRECISIE, WL001-H4-CHECK-03 | WL001-EX-E16 | PARTIAL: E16 voorkomt een ongefundeerde score; grenzen en rekenkundige schijnprecisie van matrices niet volledig bevraagd. |
| WL001-H4-LO10: Herkennen wanneer informatie onvoldoende is | WL001-H4-OPENING, WL001-H4-CHECK-04 | WL001-EX-E13, WL001-EX-E16 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H4-LO11: Herkennen wanneer verdiepend onderzoek nodig kan zijn | WL001-H4-GELUID, WL001-H4-CHECK-05 | WL001-EX-E13 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H4-LO12: Risico’s onderbouwd prioriteren | WL001-H4-PRIORITEIT, WL001-H4-CHECK-01 | WL001-EX-E15, WL001-EX-E45 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |

### Hoofdstuk 5 — Maatregelen bepalen

| Leerdoel | Formatieve vragen | Examen | Dekking en begrenzing |
| --- | --- | --- | --- |
| WL001-H5-LO01: De maatregelenhiërarchie herkennen | WL001-H5-OPENING, WL001-H5-CHECK-01 | WL001-EX-E19 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H5-LO02: Bronmaatregelen herkennen | WL001-H5-BRON | WL001-EX-E20 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H5-LO03: Technische/collectieve maatregelen herkennen | WL001-H5-STOP, WL001-H5-NOORD-VERKEER | WL001-EX-E21, WL001-EX-E24 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H5-LO04: Organisatorische/individuele maatregelen herkennen | WL001-H5-CHECK-02 | WL001-EX-E24 | PARTIAL: E24 gebruikt gecombineerde maatregelen; expliciet onderscheid organisatorisch/individueel is niet volledig getoetst. |
| WL001-H5-LO05: PBM correct positioneren | WL001-H5-PBM, WL001-H5-CHECK-03 | WL001-EX-E22 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H5-LO06: STOP herkennen en uitleggen | WL001-H5-STOP | Geen directe binding | NOT_EXPLICIT: Geen afzonderlijke rechtstreekse summatieve vraag gevonden; bestaande formatieve oefening aantoonbaar aanwezig. |
| WL001-H5-LO07: Maatregelen volgens voorkeursvolgorde onderzoeken | WL001-H5-ORDENEN, WL001-H5-CHECK-02 | WL001-EX-E19, WL001-EX-E20, WL001-EX-E22 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H5-LO08: Herkennen dat één maatregel soms onvoldoende is | WL001-H5-COMBINATIE, WL001-H5-CHECK-05 | WL001-EX-E24 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H5-LO09: Nieuwe risico’s door een maatregel herkennen | WL001-H5-NIEUW | Geen directe binding | NOT_EXPLICIT: Geen afzonderlijke rechtstreekse summatieve vraag gevonden; bestaande formatieve oefening aantoonbaar aanwezig. |
| WL001-H5-LO10: De effectiviteit van een maatregel beoordelen | WL001-H5-EFFECT | WL001-EX-E29 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H5-LO11: Uitleggen waarom instructie niet automatisch voldoende is | WL001-H5-INSTRUCTIE, WL001-H5-PROCEDURE | WL001-EX-E23 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H5-LO12: De overgang naar het Plan van Aanpak herkennen | WL001-H5-EFFECT | WL001-EX-E25 | PARTIAL: E25 toetst het Plan van Aanpak; geen expliciete overgangsvraag vanuit de maatregelenkeuze. |

### Hoofdstuk 6 — Plan van Aanpak: van risico naar actie

| Leerdoel | Formatieve vragen | Examen | Dekking en begrenzing |
| --- | --- | --- | --- |
| WL001-H6-LO01: De functie van het Plan van Aanpak uitleggen | WL001-H6-CHECK-01 | WL001-EX-E25 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H6-LO02: Een risico vertalen naar concrete acties | WL001-H6-CONCREET | WL001-EX-E26 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H6-LO03: De wettelijke kern onderscheiden van praktische borging | WL001-H6-CHECK-03 | Geen directe binding | NOT_EXPLICIT: Geen afzonderlijke rechtstreekse summatieve vraag gevonden; bestaande formatieve oefening aantoonbaar aanwezig. |
| WL001-H6-LO04: Actie-eigenaarschap duidelijk maken zonder werkgeversverantwoordelijkheid te verwarren | WL001-H6-EIGENAAR, WL001-H6-EIGENAAR-MEER | WL001-EX-E28 | PARTIAL: E28 toetst praktisch eigenaarschap; werkgever versus actiehouder blijft vooral formatief uitgewerkt. |
| WL001-H6-LO05: Een passende en opvolgbare termijn herkennen | WL001-H6-TERMIJN | WL001-EX-E26, WL001-EX-E28 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H6-LO06: Prioriteit en uitvoeringstermijn uit elkaar houden | WL001-H6-TERMIJN | Geen directe binding | NOT_EXPLICIT: Geen afzonderlijke rechtstreekse summatieve vraag gevonden; bestaande formatieve oefening aantoonbaar aanwezig. |
| WL001-H6-LO07: Onderzoek als mogelijke tussenstap herkennen | WL001-H6-ONDERZOEK, WL001-H6-CHECK-02 | WL001-EX-E27 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H6-LO08: Tijdelijke en definitieve maatregelen onderscheiden | WL001-H6-TIJDELIJK | WL001-EX-E44 | PARTIAL: E44 toetst tijdelijke beheersing naast onderzoek; niet alle verschillen met definitieve uitvoering. |
| WL001-H6-LO09: Voortgang en status praktisch volgen | WL001-H6-NOORD-ACTIE, WL001-H6-CHECK-05 | WL001-EX-E28 | PARTIAL: E28 toetst opvolgbaarheid; geen uitvoering van concrete statusregistratie. |
| WL001-H6-LO10: Uitvoering onderscheiden van effectiviteit | WL001-H6-EFFECTIEF, WL001-H6-CHECK-04 | WL001-EX-E29 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H6-LO11: Controleren en bijsturen wanneer een maatregel onvoldoende werkt | WL001-H6-WERKT-NIET | WL001-EX-E29 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H6-LO12: Het Plan van Aanpak als actief instrument gebruiken | WL001-H6-NOORD-ACTIE, WL001-H6-WERKT-NIET | WL001-EX-E27, WL001-EX-E29 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |

### Hoofdstuk 7 — Toetsing van de RI&E

| Leerdoel | Formatieve vragen | Examen | Dekking en begrenzing |
| --- | --- | --- | --- |
| WL001-H7-LO01: Uitleggen wanneer toetsing van de RI&E in beginsel nodig is | WL001-H7-ATLAS, WL001-H7-KLEIN-ZELF | WL001-EX-E30, WL001-EX-E31 | PARTIAL: E30/E31 toetsen doel en zorgvuldig vaststellen van uitzondering, niet alle juridische hoofdregelvoorwaarden. |
| WL001-H7-LO02: De uitzonderingen op de toetsingsplicht herkennen en voorwaarden controleren | WL001-H7-OPENING, WL001-H7-CHECK-01 | WL001-EX-E31, WL001-EX-E32 | PARTIAL: E31/E32 vragen voorwaarden te controleren; niet alle afzonderlijke uitzonderingsroutes worden summatief besloten. |
| WL001-H7-LO03: De route voor maximaal 25 medewerkers niet als automatische vrijstelling zien | WL001-H7-AANTAL | WL001-EX-E31 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H7-LO04: Een erkend en passend branche-RI&E-instrument herkennen | WL001-H7-INSTRUMENT, WL001-H7-HORECA, WL001-H7-CHECK-02 | WL001-EX-E32 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H7-LO05: Bedrijfsspecifieke risico’s in de RI&E blijven meenemen | WL001-H7-AANVULLEN | Geen directe binding | NOT_EXPLICIT: Geen afzonderlijke rechtstreekse summatieve vraag gevonden; bestaande formatieve oefening aantoonbaar aanwezig. |
| WL001-H7-LO06: De uitzondering voor uitsluitend vrijwilligers en maximaal 40 uur betaald personeel herkennen | WL001-H7-VRIJWILLIGERS, WL001-H7-UREN | Geen directe binding | NOT_EXPLICIT: Geen afzonderlijke rechtstreekse summatieve vraag gevonden; bestaande formatieve oefening aantoonbaar aanwezig. |
| WL001-H7-LO07: De vier relevante deskundigheidsrichtingen herkennen | WL001-H7-KERNDESKUNDIGEN, WL001-H7-CHECK-03 | Geen directe binding | NOT_EXPLICIT: Geen afzonderlijke rechtstreekse summatieve vraag gevonden; bestaande formatieve oefening aantoonbaar aanwezig. |
| WL001-H7-LO08: Certificering en BIG-registratie van elkaar onderscheiden | WL001-H7-MVK, WL001-H7-CHECK-03 | Geen directe binding | NOT_EXPLICIT: Geen afzonderlijke rechtstreekse summatieve vraag gevonden; bestaande formatieve oefening aantoonbaar aanwezig. |
| WL001-H7-LO09: Deskundigheidsscope laten aansluiten op aanwezige risico’s | WL001-H7-SCOPE-ATLAS, WL001-H7-SCOPE, WL001-H7-CHECK-04 | WL001-EX-E33 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H7-LO10: Opstellen en toetsen onderscheiden | WL001-H7-OPSTELLEN, WL001-H7-ARBODIENST | WL001-EX-E30 | PARTIAL: E30 toetst wat toetsing is; onderscheid opstellen/toetsen wordt niet afzonderlijk uitgevraagd. |
| WL001-H7-LO11: Systeemtoets en scopetoets op hoofdlijnen begrijpen | WL001-H7-SYSTEEM, WL001-H7-SCOPE | Geen directe binding | NOT_EXPLICIT: Geen afzonderlijke rechtstreekse summatieve vraag gevonden; bestaande formatieve oefening aantoonbaar aanwezig. |
| WL001-H7-LO12: Een toets- en adviesrapport gebruiken voor passende opvolging | WL001-H7-ADVIES | WL001-EX-E34 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H7-LO13: Herkennen dat de werkgever verantwoordelijk blijft | WL001-H7-VERANTWOORDELIJK | WL001-EX-E34 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H7-LO14: De RI&E na een toetsing actueel houden | WL001-H7-GETOETST, WL001-H7-VERANDERING | WL001-EX-E35, WL001-EX-E38 | PARTIAL: E35/E38 toetsen actualiteit van RI&E in het algemeen, niet specifiek na een toetsrapport. |

### Hoofdstuk 8 — RI&E actueel houden

| Leerdoel | Formatieve vragen | Examen | Dekking en begrenzing |
| --- | --- | --- | --- |
| WL001-H8-LO01: Uitleggen dat er niet simpelweg een algemene vaste geldigheidsduur voor een RI&E geldt | WL001-H8-OPENING, WL001-H8-CHECK-01 | WL001-EX-E35 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H8-LO02: Fysieke en organisatorische veranderingen herkennen die aanleiding geven tot impactbeoordeling | WL001-H8-TRIGGERS, WL001-H8-NIEUWE-MACHINE, WL001-H8-ORGANISATIE | WL001-EX-E36, WL001-EX-E37 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H8-LO03: Incidenten, bijna-ongevallen en werknemerssignalen benutten als informatie | WL001-H8-BIJNA-ONGEVAL, WL001-H8-ONGEVAL | WL001-EX-E38 | PARTIAL: E38 bevat bijna-ongevallen; medewerkerssignalen en incidenten zijn niet ieder afzonderlijk onderdeel van de score. |
| WL001-H8-LO04: Nieuwe kennis en inzichten meenemen, ook wanneer werkzaamheden gelijk blijven | WL001-H8-NIEUWE-KENNIS | WL001-EX-E36, WL001-EX-E38 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H8-LO05: Bepalen welke RI&E-onderdelen opnieuw moeten worden beoordeeld en zo nodig aangepast | WL001-H8-LOGISTIEK-NOORD, WL001-H8-CHECK-05 | WL001-EX-E37, WL001-EX-E38 | PARTIAL: E37/E38 vragen herbeoordeling; geen volledig door de deelnemer afgebakende wijzigingsscope. |
| WL001-H8-LO06: De gevolgen voor bestaande maatregelen en het Plan van Aanpak beoordelen | WL001-H8-PV-A, WL001-H8-EFFECT | WL001-EX-E37, WL001-EX-E42 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H8-LO07: Werknemers raadplegen en hun praktijkervaring benutten | WL001-H8-WERKNEMERS | Geen directe binding | NOT_EXPLICIT: Geen afzonderlijke rechtstreekse summatieve vraag gevonden; bestaande formatieve oefening aantoonbaar aanwezig. |
| WL001-H8-LO08: Periodieke review onderscheiden van actualisatie naar aanleiding van ontwikkelingen | WL001-H8-OPENING, WL001-H8-CHECK-01 | WL001-EX-E35 | PARTIAL: E35 verwerpt een vaste vervaldatum; periodieke review versus gebeurtenisgestuurde actualisatie is niet volledig getoetst. |
| WL001-H8-LO09: Management of Change herkennen als methodische denkwijze en geen universele wettelijke procedure | WL001-H8-MO-C | Geen directe binding | NOT_EXPLICIT: Geen afzonderlijke rechtstreekse summatieve vraag gevonden; bestaande formatieve oefening aantoonbaar aanwezig. |
| WL001-H8-LO10: PDCA herkennen als hulpmiddel voor doorlopende verbetering | WL001-H8-PDCA | Geen directe binding | NOT_EXPLICIT: Geen afzonderlijke rechtstreekse summatieve vraag gevonden; bestaande formatieve oefening aantoonbaar aanwezig. |

### Hoofdstuk 9 — Van papier naar praktijk

| Leerdoel | Formatieve vragen | Examen | Dekking en begrenzing |
| --- | --- | --- | --- |
| WL001-H9-LO01: Onderscheid maken tussen een maatregel invoeren en duurzaam borgen | WL001-H9-EFFECT, WL001-H9-CHECK-01 | WL001-EX-E41, WL001-EX-E42 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H9-LO02: Onderzoeken waarom werkafspraken en dagelijkse praktijk uiteenlopen | WL001-H9-WORK-IMAGINED-DONE, WL001-H9-CAUSE | WL001-EX-E40 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H9-LO03: Praktische uitvoerbaarheid van maatregelen beoordelen | WL001-H9-WORKABLE | WL001-EX-E41, WL001-EX-E49 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H9-LO04: Passende voorlichting en instructie herkennen | WL001-H9-SIGNATURE, WL001-H9-NEW-STARTERS, WL001-H9-CHANGED-WORK | WL001-EX-E39 | PARTIAL: E39 toetst tijdige instructie bij tijdelijke medewerkers; begrijpelijkheid en feedback worden vooral formatief geoefend. |
| WL001-H9-LO05: Beschikbaarheid van middelen en randvoorwaarden beoordelen | WL001-H9-TOOLS-ACCESS, WL001-H9-PPE | WL001-EX-E41 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H9-LO06: De invloed van leidinggeven en doelen op de praktijk herkennen | WL001-H9-CONFLICTING-GOALS, WL001-H9-LEADERSHIP-SIGNAL | WL001-EX-E49 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H9-LO07: Toezicht zien als naleving én informatiebron | WL001-H9-SUPERVISION | Geen directe binding | NOT_EXPLICIT: Geen afzonderlijke rechtstreekse summatieve vraag gevonden; bestaande formatieve oefening aantoonbaar aanwezig. |
| WL001-H9-LO08: Medewerkers betrekken bij het begrijpen en verbeteren van werk | WL001-H9-ASK-WORKERS | WL001-EX-E40 | PARTIAL: E40 vraagt oorzakenonderzoek; de specifieke bijdrage van werknemers is slechts een onderdeel. |
| WL001-H9-LO09: Observaties, afwijkingen en meldingen als informatie gebruiken | WL001-H9-OBSERVATION, WL001-H9-REPORT-RESPONSE | WL001-EX-E42 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H9-LO10: Gedrag en achterliggende omstandigheden samen onderzoeken | WL001-H9-LOGISTICS-FACTORS, WL001-H9-CHECK-02 | WL001-EX-E40, WL001-EX-E49 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H9-LO11: Effectiviteit van maatregelen blijven controleren | WL001-H9-EFFECT | WL001-EX-E42 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H9-LO12: Verbeteringen terugkoppelen naar RI&E en Plan van Aanpak | WL001-H9-UPDATE-RIE, WL001-H9-CHECK-05 | WL001-EX-E42, WL001-EX-E50 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |

### Hoofdstuk 10 — Integrale praktijkcasus

| Leerdoel | Formatieve vragen | Examen | Dekking en begrenzing |
| --- | --- | --- | --- |
| WL001-H10-LO01: Informatie uit een RI&E-dossier en werkplekrondgang combineren | WL001-H10-DOSSIER, WL001-H10-ROUND | WL001-EX-E43 | PARTIAL: E43 combineert waarnemingen; geen zelfstandig dossieronderzoek door de deelnemer. |
| WL001-H10-LO02: Nieuwe risico’s en veranderingen herkennen zonder automatisch alles opnieuw te doen | WL001-H10-CHANGED, WL001-H10-REWRITE | WL001-EX-E43 | PARTIAL: E43 prioriteert signalen; impactgericht aanpassen versus volledig herbeginnen is vooral formatief getoetst. |
| WL001-H10-LO03: Onzekerheid herkennen en ontbrekende informatie gericht verzamelen | WL001-H10-SOLUTION-FIRST, WL001-H10-LIFT-INFO, WL001-H10-CHARGING-AREA | WL001-EX-E44 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H10-LO04: Risico’s op hoofdlijnen onderbouwen en prioriteren | WL001-H10-SCORE, WL001-H10-PRIORITY | WL001-EX-E45 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H10-LO05: De maatregelenhiërarchie toepassen op een praktijksituatie | WL001-H10-TRANSPORT-MEASURES, WL001-H10-CHECK-03 | WL001-EX-E46 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H10-LO06: Onderzoek, tijdelijke beheersing en definitieve maatregelen onderscheiden | WL001-H10-RESEARCH-END-MEASURE, WL001-H10-TEMPORARY | WL001-EX-E44 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H10-LO07: Een concreet en opvolgbaar Plan van Aanpak herkennen | WL001-H10-ACTION-PLAN, WL001-H10-CHECK-04 | WL001-EX-E47 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H10-LO08: Toetsing en passende deskundigheid zorgvuldig positioneren | WL001-H10-EXPERTISE, WL001-H10-BRANCH-CHECK, WL001-H10-CHECK-05 | WL001-EX-E48 | PARTIAL: E48 toetst passende deskundigheid; de wettelijke toetsingsuitzonderingen worden via E31/E32 deels en formatief breder behandeld. |
| WL001-H10-LO09: Uitvoering onderscheiden van borging en effectiviteit | WL001-H10-EFFECT, WL001-H10-CHECK-06 | WL001-EX-E49 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H10-LO10: Gedrag en omstandigheden samen onderzoeken | WL001-H10-SHORTCUT-FACTORS, WL001-H10-CHECK-07 | WL001-EX-E49 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |
| WL001-H10-LO11: Bijna-ongevallen benutten om de RI&E-cyclus te verbeteren | WL001-H10-NEAR-MISS-RESPONSE, WL001-H10-CHECK-08 | WL001-EX-E50 | DIRECT: De genoemde vraag beoordeelt de beschreven kernhandeling; deze inhoudelijke koppeling is een reviewvoorstel, geen menselijke goedkeuring. |

De reviewer beslist vóór publicatie of alle bovengenoemde formatieve doelen afzonderlijk summatief moeten worden afgedekt of dat de huidige examensteekproef verantwoord is. De bestaande 50 vragen/40 juiste antwoorden blijven tijdens die beslissing onveranderd. Juridische en assessmentacceptatie blijven OPEN.

Promptcontrole: alle 214 interactieve blokprompts zijn gelijkgezet aan de gekoppelde nieuwe vraagtekst. Casusinhoud in `body` blijft behouden. Zo toont de herkenningsoefening geen oude sorteeraanwijzing en bevat de Atlas-vraag ook in de zichtbare instructie de benodigde arbeidsduur- en vrijwilligerscontext.

Zichtbare leerroute: `WL001-H1-ORIENTATION` beschrijft doelgroep, voorkennis, studieaanpak en grenzen van de opleiding; `WL001-H10-COMPLETION` beschrijft afronding, 40/50, volledige antwoordsets, onbeperkt herkansen en certificaatbegrenzing. Beide zijn compacte aanvullende CALLOUT-blokken; alle 455 bronblokken blijven behouden. Hun woorden zijn meegerekend binnen de circa-vijf-uursraming.

Meetinterpretatie retentie: de bestaande `academyContentQuality`-velden `correctPositions` en `longestCorrectPositionRun` tellen interne optiecodes. Voor zichtbare positie is afzonderlijk de index in de `options`-array gemeten: A14/B14/C16/D19 en maximale reeks 2. De eerdere biasconclusie is ingetrokken; er zijn geen 100 onnodige vraagrevisies overgebleven.
