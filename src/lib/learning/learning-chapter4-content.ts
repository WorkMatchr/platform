import type { LearningBlockSeed, LearningQuestionSeed } from './learning-prototype-content'

export const learningChapter4SourceMetadata = {
  chapter: 'risicos-beoordelen', checkedAt: '2026-09-25',
  reviewStatus: 'PROTOTYPE_REQUIRES_CONTENT_AND_LEGAL_REVIEW',
  sources: [
    { title: 'Arboportaal — Waaruit bestaat de RI&E?', url: 'https://www.arboportaal.nl/onderwerpen/arbowet--en--regelgeving/risico-inventarisatie---evaluatie/waaruit-bestaat-de-rie' },
    { title: 'Arboportaal — Lawaai op het werk', url: 'https://www.arboportaal.nl/onderwerpen/fysische-factoren/geluid' },
    { title: 'Steunpunt RI&E — Algemene RI&E-instrumenten', url: 'https://www.rie.nl/hulpmiddelen/algemene-rie-instrumenten' },
  ],
  reviewNotes: 'Didactische voorbeelden, geen universele matrix, grenswaarden of wettelijke actietermijnen. Specifieke risico’s kunnen nadere beoordelingsvoorschriften hebben. CONTENT REVIEW REQUIRED: arbotechnische review en toetsing met studenten vóór productacceptatie.',
} as const

// Explanations cover each alternative using the existing question-level feedback model.
function question(code: string, type: LearningQuestionSeed['type'], knowledgeArea: string, difficulty: number,
  learningObjective: string, questionText: string, explanation: string,
  choices: Array<[value: string, text: string, correct: boolean]>): LearningQuestionSeed {
  return { code: `WL001-H4-${code}`, questionVersion: 1, type, knowledgeArea, difficulty, learningObjective,
    questionText, explanation, correctAnswer: choices.filter((item) => item[2]).map((item) => item[0]),
    options: choices.map(([value, text, isCorrect]) => ({ value, text, isCorrect })) }
}

export const learningChapter4Questions: LearningQuestionSeed[] = [
  question('OPENING', 'CASE_STUDY', 'Beoordeling', 2, 'Een ontbrekende onderbouwing herkennen',
    'Logistiek Noord: heftrucks en voetgangers delen een route, medewerkers tillen regelmatig dozen en melden werkdruk tijdens pieken. Welk risico moet als eerste worden aangepakt?',
    'Aanrijdgevaar kan ernstige gevolgen hebben, maar de verkeerssituatie is nog niet uitgewerkt. Voor tillen ontbreken onder meer belasting en frequentie; voor werkdruk ontbreken aard en omvang. Met alleen deze signalen is een onderlinge rangorde onvoldoende onderbouwd. Een evidente noodzaak tot handelen hoeft ondertussen niet op een score te wachten.', [
      ['transport', 'Aanrijdgevaar: geef gedeelde routes nu de eerste plaats.', false],
      ['tillen', 'Fysieke belasting: geef het regelmatige tillen nu voorrang.', false],
      ['werkdruk', 'Werkdruk: geef de gemelde piekbelasting nu voorrang.', false],
      ['informatie', 'Nog niet vast te stellen: onderzoek eerst de omstandigheden.', true],
    ]),
  question('AANTAL', 'TRUE_FALSE', 'Blootstelling', 2, 'Aantal, aard en duur in samenhang bekijken',
    'Eén medewerker wordt dagelijks langdurig aan een schadelijke stof blootgesteld. Twintig anderen lopen maandelijks kort langs dezelfde bron. Alleen het grotere aantal maakt de tweede situatie het grootste risico.',
    'Niet waar. Twintig betrokkenen is relevante informatie, maar bewijst geen hogere blootstelling of grotere schade. Dagelijks langdurig contact kan juist zwaar wegen. Onderzoek ook aard, mate, duur, frequentie en mogelijke gevolgen; langs een bron lopen zegt nog niet hoeveel iemand binnenkrijgt.',
    [['waar', 'Waar', false], ['onwaar', 'Niet waar', true]]),
  question('SCORE', 'CASE_STUDY', 'Waarschijnlijkheid en gevolg', 2, 'Verschillen tussen scores onderzoeken',
    'Twee beoordelaars geven dezelfde situatie voor waarschijnlijkheid een 2 en een 3. Het risico komt daardoor in verschillende klassen. Wat is de beste vervolgstap?',
    'Vergelijk criteria, feiten en aannames: dat maakt het verschil bespreekbaar. De laagste score is niet vanzelf een fout en de hoogste niet vanzelf juist. Eén verschil maakt een matrix ook niet onbruikbaar; de onderbouwing bepaalt hoe bruikbaar de uitkomst is.', [
      ['afwijzen', 'Laat de laagste beoordeling vervallen vanwege het verschil.', false],
      ['stoppen', 'Laat de matrix vervallen omdat beoordelaars kunnen verschillen.', false],
      ['onderbouwen', 'Vergelijk de gebruikte criteria, gegevens en aannames.', true],
      ['hoogste', 'Neem de hoogste beoordeling over zonder verdere afstemming.', false],
    ]),
  question('GELUID', 'TRUE_FALSE', 'Verdiepend onderzoek', 2, 'Een signaal van een beoordeling onderscheiden',
    'Een medewerker zegt: “Die machine maakt ontzettend veel lawaai.” Daarmee is het geluidsrisico voldoende beoordeeld.',
    'Niet waar. De melding is een belangrijk signaal, maar beschrijft nog niet de daadwerkelijke blootstelling. Hoe sterk, hoe lang en tijdens welke taken het geluid optreedt kan aanvullend onderzoek vragen. Het signaal negeren is evenmin passend.',
    [['waar', 'Waar', false], ['onwaar', 'Niet waar', true]]),
  question('MAATREGEL', 'TRUE_FALSE', 'Bestaande maatregelen', 2, 'Werkende maatregelen meewegen',
    'Een vaste afscherming voorkomt tijdens normaal gebruik dat medewerkers bewegende machinedelen bereiken. Deze bestaande maatregel moet worden meegenomen in de beoordeling.',
    'Waar. Een effectief gebruikte afscherming beïnvloedt de blootstelling. De beoordeling hoort de feitelijke situatie te beschrijven. De maatregel weglaten zou relevante informatie missen; alleen de aanwezigheid noteren bewijst nog niet dat alle werkzaamheden veilig verlopen.',
    [['waar', 'Waar', true], ['onwaar', 'Niet waar', false]]),
  question('WERKING', 'TRUE_FALSE', 'Restrisico', 2, 'Risico na maatregelen herkennen',
    'De aanwezigheid van deze afscherming bewijst automatisch dat het risico bij alle werkzaamheden volledig beheerst is.',
    'Niet waar. Onderzoek feitelijke werking en gebruik, onderhoud, storingen en situaties waarin de afscherming wordt verwijderd. Wat na de toegepaste maatregelen overblijft is restrisico. Een werkende maatregel kan het risico verminderen zonder iedere situatie af te dekken.',
    [['waar', 'Waar', false], ['onwaar', 'Niet waar', true]]),
  question('PRIORITEIT', 'TRUE_FALSE', 'Prioritering', 2, 'Lagere prioriteit zorgvuldig opvolgen',
    'Een risico krijgt een lagere prioriteit dan andere risico’s. Daarmee hoeft het niet meer te worden opgevolgd.',
    'Niet waar. Prioritering helpt volgorde, planning, onderzoek en inzet van capaciteit bepalen. Een lagere prioriteit betekent dat passende beheersing en opvolging nodig blijven. Het label alleen bepaalt geen universele wettelijke termijn.',
    [['waar', 'Waar', false], ['onwaar', 'Niet waar', true]]),
  question('DIRECT', 'CASE_STUDY', 'Prioritering', 3, 'Methodiek noodzakelijke actie niet laten vertragen',
    'Een medewerker kan tijdens regulier werk een bewegend machineonderdeel bereiken dat ernstig letsel kan veroorzaken. Effectieve afscherming ontbreekt. Hoe gebruikt u de beoordelingsmethodiek?',
    'Overweeg passende actie direct en onderbouw de beoordeling verder. Eerst een volledige matrix afwachten kan noodzakelijke actie vertragen. Geen gemelde ongevallen bewijst geen veiligheid; een datum voor latere beoordeling lost de bereikbaarheid van bewegende delen niet op.', [
      ['matrix', 'Vul eerst de hele matrix in en bespreek daarna de situatie.', false],
      ['actie', 'Overweeg direct passende actie en werk de beoordeling verder uit.', true],
      ['incident', 'Bepaal eerst of eerder letsel is gemeld voordat u actie bespreekt.', false],
      ['planning', 'Plan eerst de volgende beoordelingsronde voor dit onderdeel.', false],
    ]),
  question('NOORD-BETER', 'TRUE_FALSE', 'Beoordeling', 2, 'Aanvullende feiten benutten zonder volledigheid te claimen',
    'Gegevens over verkeerskruisingen, bijna-aanrijdingen, tilduur en piekweken helpen Logistiek Noord de risico’s beter te beoordelen dan de eerste inventarisatie alleen.',
    'Waar. Deze feiten geven context bij de signalen uit de inventarisatie. Dat helpt de beoordeling, maar maakt haar niet automatisch volledig. Ontbrekende informatie en eventuele verdieping moeten per risico worden benoemd.',
    [['waar', 'Waar', true], ['onwaar', 'Niet waar', false]]),
  question('NOORD-TRANSPORT', 'CASE_STUDY', 'Waarschijnlijkheid en gevolg', 3, 'Transportgegevens in context beoordelen',
    'Drie heftrucks rijden dagelijks; er zijn twee kruisingen met voetgangers en twee bijna-aanrijdingen in een jaar. Welke vervolginformatie helpt de beoordeling het meest?',
    'Onderzoek wanneer routes samenvallen, hoeveel bewegingen er zijn en hoe zicht en scheiding werken. Het aantal voertuigen alleen beschrijft die ontmoetingen niet. Alleen schade tellen mist bijna-incidenten; één incidentloze dienst bewijst geen structurele beheersing.', [
      ['voertuigen', 'De rangorde van het aantal heftrucks ten opzichte van andere bedrijven.', false],
      ['schade', 'Alleen het totale bedrag aan schade na de twee bijna-aanrijdingen.', false],
      ['routes', 'De ontmoetingen, verkeersfrequentie, zichtlijnen en feitelijke scheiding.', true],
      ['dienst', 'Of tijdens de eerstvolgende dienst geen nieuwe aanrijding plaatsvindt.', false],
    ]),
  question('NOORD-TILLEN', 'MULTI_CHOICE', 'Blootstelling', 3, 'Relevante verdieping van tilbelasting kiezen',
    'Zes orderpickers tillen meerdere uren per dienst, met wisselende gewichten en niet overal beschikbare hulpmiddelen. Wat vraagt nader onderzoek?',
    'Gewichten en tilfrequentie helpen de belasting beschrijven. Hoogte, houding en reikafstand geven context aan de handeling. Beschikbaarheid én feitelijk gebruik van hulpmiddelen beïnvloeden de resterende belasting. Alleen een gemiddeld doosgewicht vastleggen verbergt zwaardere taken en verschillen tussen medewerkers.', [
      ['gewicht', 'Gewichten en tilfrequentie per taak en dienst.', true],
      ['houding', 'Tilhoogte, houding en reikafstand tijdens het werk.', true],
      ['hulpmiddelen', 'Beschikbaarheid en feitelijk gebruik van hulpmiddelen.', true],
      ['gemiddelde', 'Alleen het gemiddelde doosgewicht als volledige beoordeling.', false],
    ]),
  question('NOORD-WERKDRUK', 'CASE_STUDY', 'Verdiepend onderzoek', 3, 'Werkdruksignalen gericht verdiepen',
    'Er zijn circa tien piekweken per jaar, met hoge tijdsdruk en overwerk. Buiten die weken zijn er minder signalen. Welke aanpak past bij de beoordeling?',
    'Onderzoek taken, capaciteit, duur, herstelmogelijkheden en signalen van betrokken groepen. Jaargemiddelden kunnen pieken verbergen. Minder meldingen buiten de piek bewijzen geen beheersing tijdens de piek; afwachten tot een volgende piek levert geen huidige onderbouwing.', [
      ['jaar', 'Beoordeel de werkdruk uitsluitend op het gemiddelde jaarvolume.', false],
      ['groepen', 'Onderzoek piektaken, capaciteit, herstel en signalen per betrokken groep.', true],
      ['rust', 'Gebruik de rustigere weken als bewijs dat de piekbelasting beheerst is.', false],
      ['wachten', 'Stel de beoordeling uit tot opnieuw meldingen in een piekweek komen.', false],
    ]),
  question('AANVULLEND', 'MULTI_CHOICE', 'Blootstelling', 2, 'Aanvullende beoordelingsinformatie selecteren',
    'In een magazijn worden dozen van ongeveer 15 kg handmatig verplaatst. Welke aanvullende informatie is relevant om dit risico beter te beoordelen?',
    'Hoe vaak er wordt getild helpt herhaalde belasting bepalen. Tilhoogte en houding beïnvloeden de belasting per handeling. Het aantal medewerkers laat zien wie ermee te maken krijgt. De kleur van de dozen zegt in deze situatie niets over de tilbelasting.', [
      ['frequentie', 'Hoe vaak de dozen worden getild.', true],
      ['houding', 'Vanuit welke hoogte en houding wordt getild.', true],
      ['personen', 'Hoeveel medewerkers deze werkzaamheden uitvoeren.', true],
      ['kleur', 'Welke kleur de dozen hebben.', false],
    ]),
  question('SCHIJNPRECISIE', 'SINGLE_CHOICE', 'Risicoscore en methodiek', 2, 'Een getal binnen zijn methodiek interpreteren',
    'Een RI&E-tool berekent een score van 12. Wat kunt u zonder verdere informatie zeker concluderen?',
    'Het getal krijgt betekenis binnen de gebruikte methode en onderbouwing. Het bewijst op zichzelf geen wettelijke onacceptabiliteit, vaste actietermijn of aantoonbaar verschil met score 11 uit een onbekende beoordeling. Bekijk criteria, gegevens en aannames.', [
      ['grens', 'De score betekent dat een wettelijke acceptatiegrens is overschreden.', false],
      ['termijn', 'De score bepaalt een vaste actietermijn die voor iedere RI&E geldt.', false],
      ['vergelijk', 'Een risico met score 11 is aantoonbaar minder belangrijk dan dit risico.', false],
      ['context', 'Zonder methode, criteria en onderbouwing zegt dit getal onvoldoende.', true],
    ]),
  question('CHECK-01', 'SINGLE_CHOICE', 'Beoordeling', 2, 'Doel van beoordeling en prioritering toepassen',
    'Waarom worden geïnventariseerde risico’s beoordeeld en geprioriteerd?',
    'Beoordeling ondersteunt onderbouwde aandacht, prioriteit en vervolgaanpak. Alleen een werkverdeling maken mist de betekenis van risico’s. Een vaste ranglijst hergebruiken mist de omstandigheden. Een cijfer toekennen vervangt de onderbouwing niet.', [
      ['werkverdeling', 'Om de gevonden onderwerpen direct gelijkmatig over teams te verdelen.', false],
      ['onderbouwing', 'Om onderbouwd aandacht, prioriteit en passende vervolgaanpak te bepalen.', true],
      ['ranglijst', 'Om de bestaande ranglijst zonder nieuw onderzoek te kunnen hergebruiken.', false],
      ['cijfer', 'Om de bevindingen door één cijfer per onderwerp te kunnen vervangen.', false],
    ]),
  question('CHECK-02', 'MULTI_CHOICE', 'Blootstelling', 2, 'Relevante beoordelingsfactoren herkennen',
    'Welke informatie kan relevant zijn bij het beoordelen van een arbeidsrisico? Selecteer alle toepasselijke antwoorden.',
    'Het aantal betrokken mensen beschrijft de mogelijke blootgestelde groep. Frequentie en duur beschrijven het blootstellingspatroon. Mogelijke gevolgen beschrijven aard en ernst van schade. Alleen aanschafkosten van een maatregel gebruiken als maat voor de ernst verwart kosten met risico.', [
      ['personen', 'Hoeveel mensen kunnen worden blootgesteld.', true],
      ['duur', 'Hoe vaak of hoe lang blootstelling plaatsvindt.', true],
      ['gevolgen', 'Welke mogelijke gevolgen kunnen optreden.', true],
      ['kosten', 'Alleen de aanschafkosten van een maatregel als maat voor de ernst.', false],
    ]),
  question('CHECK-03', 'SINGLE_CHOICE', 'Risicoscore en methodiek', 3, 'Score onderbouwd gebruiken',
    'Een RI&E-methodiek geeft een risico een score van 15. Wat is de beste manier om met die uitkomst om te gaan?',
    'Gebruik criteria, gegevens en aannames om de prioritering te onderbouwen. Een getal alleen bewijst geen wettelijke overtreding. Vergelijken met een andere methodiek kan misleiden. Alleen het cijfer bewaren maakt de beoordeling niet herleidbaar.', [
      ['wet', 'Behandel de score als bewijs van een wettelijke overtreding.', false],
      ['andere', 'Vergelijk de score direct met cijfers uit iedere andere methode.', false],
      ['basis', 'Gebruik criteria, gegevens en aannames achter de score bij prioritering.', true],
      ['cijfer', 'Leg alleen de score vast zodat de registratie overzichtelijk blijft.', false],
    ]),
  question('CHECK-04', 'CASE_STUDY', 'Verdiepend onderzoek', 3, 'Ontbrekende blootstellingsinformatie herkennen',
    'Medewerkers kunnen in een lawaaiige werkruimte regelmatig moeilijk gesprekken voeren. De RI&E vermeldt alleen “Geluid — aanwezig”. Wat verdient vooral aandacht vóór een goede beoordeling?',
    'Er is informatie over daadwerkelijke blootstelling nodig; verdiepend onderzoek kan nodig zijn. Hinder is een signaal, geen complete blootstellingsbeoordeling. Een ruimtebenaming of gemiddelde van meningen vult ontbrekende blootstellingsgegevens niet in. Alleen gehoorbescherming registreren bewijst geen voldoende beheersing.', [
      ['blootstelling', 'Onderzoek de daadwerkelijke blootstelling en de benodigde verdieping.', true],
      ['ruimte', 'Gebruik de functie van de ruimte om zonder onderzoek een score te kiezen.', false],
      ['meningen', 'Vervang blootstellingsinformatie door het gemiddelde van meningen.', false],
      ['bescherming', 'Rond de beoordeling af zodra gehoorbescherming beschikbaar blijkt.', false],
    ]),
  question('CHECK-05', 'CASE_STUDY', 'Prioritering', 3, 'Een essentiële informatielacune in samenhang herkennen',
    'Technisch bedrijf Delta bekijkt drie dossiers. Acht medewerkers gebruiken dagelijks elektrisch handgereedschap; taakduur, relevante blootstellingen en feitelijke werking van beveiligingen zijn onderzocht. Bij werkdruk rond maandafsluitingen zijn taaklast, piekduur en herstelmogelijkheden van de twee melders onderzocht. Eén medewerker gebruikt wekelijks tien minuten een oplosmiddel; product en hoeveelheid zijn bekend. Er is afzuiging, maar de werking tijdens de taak is niet onderzocht. Welk dossier mist nog essentiële informatie om de beoordeling te onderbouwen?',
    'Bij het oplosmiddel moet de daadwerkelijke blootstelling nog worden onderbouwd: een aanwezige afzuiging bewijst niet dat zij tijdens het werk effectief is. Dagelijks gebruik en aantallen medewerkers zijn relevant, maar bepalen geen rangorde op zichzelf. Twee meldingen maken een onderzocht risico evenmin automatisch het hoogste. Alleen bronnen en maatregelen registreren is nog geen volledige beoordeling.', [
      ['gereedschap', 'Het gereedschapdossier: dagelijks gebruik door acht mensen moet zwaarder wegen dan incidenteel werk.', false],
      ['stof', 'Het oplosmiddeldossier: de genoemde afzuiging is nog niet op feitelijke werking onderzocht.', true],
      ['werkdruk', 'Het werkdrukdossier: twee meldingen maken de onderzochte piekbelasting het belangrijkste risico.', false],
      ['geen', 'Geen dossier: registratie van de bronnen, taken en maatregelen volstaat voor een onderlinge rangorde.', false],
    ]),
]

// Version 1 remains referenced by the locally reviewed prototype-0.6.
learningChapter4Questions.find((item) => item.code === 'WL001-H4-CHECK-05')!.questionVersion = 2

export const learningChapter4Objectives = [
  'Inventariseren en beoordelen van elkaar onderscheiden', 'Relevante beoordelingsfactoren herkennen',
  'Aantal blootgestelde personen meenemen', 'Duur en frequentie van blootstelling meenemen',
  'Waarschijnlijkheid meenemen', 'Mogelijke gevolgen meenemen', 'Bestaande maatregelen bij de beoordeling betrekken',
  'Restrisico herkennen', 'Beperkingen van risicoscores en matrices uitleggen',
  'Herkennen wanneer informatie onvoldoende is', 'Herkennen wanneer verdiepend onderzoek nodig kan zijn',
  'Risico’s onderbouwd prioriteren',
]

const exercise = (code: string, title: string): LearningBlockSeed => {
  const item = learningChapter4Questions.find((entry) => entry.code === `WL001-H4-${code}`)!
  return { type: item.type, questionCode: item.code, data: { title, prompt: item.questionText } }
}
const callout = (label: string, title: string, body: string, items?: string[]): LearningBlockSeed => ({ type: 'CALLOUT', data: { label, title, body, ...(items ? { items } : {}) } })
const paragraph = (title: string, ...paragraphs: string[]): LearningBlockSeed => ({ type: 'TEXT', data: { title, paragraphs } })
const process = (title: string, steps: string[], footer: string): LearningBlockSeed => ({ type: 'PROCESS', data: { title, steps, footer } })

export const learningChapter4Blocks: LearningBlockSeed[] = [
  { type: 'HEADING', data: { title: 'Risico’s beoordelen', eyebrow: 'Hoofdstuk 4 van 10', subtitle: 'Van gevonden risico’s naar een onderbouwde beoordeling en prioriteit.', estimatedDurationLabel: '15–20 minuten', learningObjectives: learningChapter4Objectives } },
  callout('LEERDOELEN', 'Na dit hoofdstuk kunt u', 'U leert welke informatie helpt om risico’s te begrijpen en te prioriteren.', learningChapter4Objectives),
  exercise('OPENING', 'Logistiek Noord — wat eerst?'),
  paragraph('Inventariseren en beoordelen', 'Inventariseren: wat is er? Bijvoorbeeld: medewerkers tillen dozen.', 'Beoordelen: wat betekent dat in deze situatie? Onderzoek hoeveel medewerkers tillen, welke gewichten zij hanteren, hoe vaak en hoe lang, vanuit welke houding, met welke hulpmiddelen en met welke mogelijke gezondheidseffecten.'),
  process('Van een gevonden risico naar handelen', ['Risico gevonden', 'Informatie verzamelen', 'Beoordelen', 'Prioriteren', 'Maatregelen bepalen'], 'H3 gaat over vinden, H4 over betekenis en prioriteit. De keuze van maatregelen volgt in H5.'),
  callout('BEOORDELINGSVRAAG', 'Wie?', 'Wie en hoeveel personen kunnen worden blootgesteld? Kijk ook naar verschillen tussen taken en groepen.'),
  callout('BEOORDELINGSVRAAG', 'Hoe vaak / hoe lang?', 'Wat zijn frequentie en duur van blootstelling? Eén korte handeling en herhaald werk gedurende een dienst vragen verschillende informatie.'),
  callout('BEOORDELINGSVRAAG', 'Hoe waarschijnlijk?', 'Hoe aannemelijk is het dat het gevaar onder de feitelijke omstandigheden tot schade leidt? Gebruik beschikbare feiten en maak onzekerheden zichtbaar.'),
  callout('BEOORDELINGSVRAAG', 'Wat kan het gevolg zijn?', 'Welke schade kan optreden en hoe ernstig kan die zijn? Denk ook aan gezondheidseffecten die pas later merkbaar worden.'),
  paragraph('Algemene vragen, specifieke beoordeling', 'Dit zijn algemene beoordelingsvragen. Specifieke risico’s kunnen aanvullende beoordelingscriteria, gegevens of methoden vereisen. Deze vragen vervangen zo’n specifieke beoordeling niet.'),
  exercise('AANTAL', 'Meer mensen betekent niet vanzelf een groter risico'),
  process('Waarschijnlijkheid en mogelijk gevolg', ['Waarschijnlijkheid: van minder naar meer aannemelijk onder de feitelijke omstandigheden.', 'Mogelijk gevolg: van beperkte tot ernstige schade in de onderzochte situatie.'], 'Twee invalshoeken om samen te bekijken, geen vaste volgorde of rekenformule. Een minder waarschijnlijk scenario met ernstige gevolgen kan nog steeds aandacht vragen.'),
  callout('METHODIEK', 'Een hulpmiddel om te ordenen', 'Veel beoordelingsmethoden gebruiken waarschijnlijkheid en mogelijke gevolgen om risico’s te structureren en te vergelijken. De exacte methode verschilt per instrument. Dit is geen universeel voorgeschreven risicomatrix of verplichte formule.'),
  exercise('SCORE', 'De valkuil van de score'),
  paragraph('Een score zonder onderbouwing', 'Zwak: “Tillen — score 9.”', 'Beter: “Orderpickers tillen meerdere uren per dienst regelmatig dozen van verschillende gewichten vanaf lage pallets. Hulpmiddelen zijn niet overal beschikbaar.”', 'De tweede beschrijving geeft feiten voor de beoordeling. Een toepasselijke methode kan aanvullende gegevens vragen voordat een score verantwoord is.'),
  callout('GOEDE PRAKTIJK', 'Maak de beoordeling herleidbaar', 'Leg relevante feiten, criteria en aannames vast naast de uitkomst. Benoem wat nog onzeker is. Zo kan een ander begrijpen hoe de beoordeling tot stand kwam.'),
  exercise('GELUID', 'Wanneer weet u nog te weinig?'),
  callout('VERDIEPEND ONDERZOEK', 'Van signaal naar blootstelling', 'Soms is de informatie uit de algemene RI&E onvoldoende om aard of omvang van het risico te beoordelen.', [
    'Gevaarlijke stoffen — welke blootstelling vindt werkelijk plaats?', 'Geluid — wat is de feitelijke blootstelling?',
    'Fysieke belasting — hoe zwaar, vaak en onder welke omstandigheden?', 'Werkdruk / PSA — welke factoren spelen een rol en welke groepen worden geraakt?',
    'Biologische agentia — wat zijn aard, mate en duur van de blootstelling?',
  ]),
  callout('WETTELIJKE EIS', 'Verdieping hoort bij de RI&E', 'Voor specifieke arbeidsrisico’s kunnen nadere beoordelingsvoorschriften gelden. Alleen een algemeen prioriteitslabel vervangt de noodzakelijke beoordeling niet. Welke verdieping nodig is, hangt af van het risico en de toepasselijke voorschriften.'),
  callout('METHODIEK', 'Prioriteren is niet volledig verdiepend beoordelen', 'Prioritering helpt aandacht en vervolgonderzoek ordenen. Zij levert niet automatisch alle informatie voor een specifieke blootstellingsbeoordeling. Gebruik passende deskundigheid wanneer de beoordeling daarom vraagt.'),
  exercise('MAATREGEL', 'Bestaande afscherming meenemen'),
  exercise('WERKING', 'Aanwezig is niet hetzelfde als voldoende'),
  process('Restrisico', ['Oorspronkelijk risico', 'Toegepaste beheersmaatregel', 'Resterend risico'], 'Restrisico is het risico dat overblijft nadat beheersmaatregelen zijn toegepast.'),
  paragraph('Blijf naar de feitelijke werking kijken', 'Onderzoek welke maatregel bestaat, of deze wordt gebruikt, wanneer zij werkt en wanneer niet. Onderhoud, storingen en verwijderbaarheid kunnen relevant zijn.', 'Het bestaan van restrisico betekent niet automatisch dat verdere verbetering onnodig of onmogelijk is. De keuze van aanvullende maatregelen volgt in H5.'),
  exercise('PRIORITEIT', 'Prioriteit is niet hetzelfde als uitstel'),
  exercise('DIRECT', 'Evident ernstig gevaar'),
  callout('GOEDE PRAKTIJK', 'Noodzakelijke actie niet laten wachten', 'Een beoordelingsmethodiek ondersteunt besluitvorming. Zij mag een evidente noodzaak tot passende actie niet onnodig vertragen. Dit voorbeeld introduceert geen vaste juridische categorie of universele termijn.'),
  paragraph('Logistiek Noord — meer informatie', 'Aanrijdgevaar: drie heftrucks rijden dagelijks, er zijn twee kruisingen met voetgangers en er waren twee bijna-aanrijdingen in het afgelopen jaar.', 'Fysieke belasting: zes orderpickers tillen meerdere uren per dienst, met sterk wisselende gewichten. Tilhulpmiddelen zijn niet overal beschikbaar.', 'Werkdruk: circa tien piekweken per jaar met hoge tijdsdruk en overwerk. Buiten piekperioden zijn er minder signalen.'),
  exercise('NOORD-BETER', 'Beter onderbouwd, nog niet automatisch volledig'),
  exercise('NOORD-TRANSPORT', 'Logistiek Noord — aanrijdgevaar'),
  exercise('NOORD-TILLEN', 'Logistiek Noord — fysieke belasting'),
  exercise('NOORD-WERKDRUK', 'Logistiek Noord — werkdruk'),
  callout('METHODIEK', 'Prioriteitscategorieën: een didactisch voorbeeld', 'Deze categorieën zijn een didactisch voorbeeld. De precieze categorieën, scores en grenzen hangen af van de gebruikte RI&E- en beoordelingsmethodiek.', [
    'Hogere prioriteit — snel aandacht, actie en/of verdiepend onderzoek nodig.',
    'Middelhoge prioriteit — maatregelen gericht plannen en opvolgen.',
    'Lagere prioriteit — beheersen, volgen en binnen passende planning behandelen.',
  ]),
  paragraph('Een prioriteitslabel bepaalt niet alles', 'Deze drie categorieën zijn niet universeel wettelijk voorgeschreven. Zij leggen geen vaste algemene actietermijnen vast. Een lagere prioriteit betekent niet dat niets hoeft te gebeuren.', 'Onderbouw de vervolgplanning met de feiten, de gebruikte methodiek en de toepasselijke voorschriften voor het risico.'),
  exercise('AANVULLEND', 'Welke informatie verandert uw beoordeling?'),
  exercise('SCHIJNPRECISIE', 'Schijnprecisie'),
  process('Van vinden naar handelen', ['Inventariseren — wat is er?', 'Beoordelen — wat betekent het risico?', 'Prioriteren — wat vraagt wanneer aandacht?', 'Maatregelen bepalen — wat gaan we eraan doen?', 'Plan van Aanpak — wie doet wat en wanneer?'], 'In H3 leerde u risico’s systematisch vinden. In H4 leerde u welke informatie helpt om die te begrijpen en te prioriteren. H5 gaat over passende maatregelen.'),
  { type: 'SUMMARY', data: { title: 'Dit neemt u mee', items: [
    'Een gevonden risico moet worden beoordeeld.', 'Blootstelling is relevant.', 'Frequentie en duur kunnen relevant zijn.',
    'Waarschijnlijkheid kan relevant zijn.', 'Mogelijke gevolgen zijn relevant.', 'Bestaande maatregelen worden meegenomen.',
    'Een risicoscore moet worden onderbouwd.', 'Specifieke risico’s kunnen verdieping vereisen.',
    'Prioritering helpt bepalen wat aandacht vraagt.', 'Een lagere prioriteit betekent niet automatisch niets doen.',
  ] } },
  { type: 'HEADING', data: { title: 'Hoofdstukcheck', subtitle: 'Vijf formatieve oefenvragen. Doorloop alle vragen; een fout antwoord verhindert afronding niet. Dit is geen examen of certificering.' } },
  exercise('CHECK-01', 'Het doel van beoordelen'),
  exercise('CHECK-02', 'Beoordelingsinformatie'),
  exercise('CHECK-03', 'Een risicoscore van 15'),
  exercise('CHECK-04', 'Geluid vraagt om onderbouwing'),
  exercise('CHECK-05', 'Technisch bedrijf Delta'),
]
