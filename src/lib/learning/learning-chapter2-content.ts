import type { LearningBlockSeed, LearningQuestionSeed } from './learning-prototype-content'

// Source IDs refer to the reviewed WorkMatchr catalogue in src/content/public-sources.ts.
export const learningChapter2SourceMetadata = {
  chapter: 'wie-doet-wat',
  checkedAt: '2026-09-25',
  reviewStatus: 'PROTOTYPE_REQUIRES_CONTENT_AND_LEGAL_REVIEW',
  sourceIds: ['arbowet-current', 'arbeidsinspectie-rie', 'arboportaal-preventiemedewerker',
    'arbeidsinspectie-preventiemedewerker', 'arboportaal-arbozorg-organisatie',
    'arboportaal-werknemersraadpleging-2026', 'arboportaal-kerndeskundigen-batch2', 'arboportaal-bedrijfsarts'],
  legalReferences: ['Arbowet artikelen 3, 5, 12, 13, 14 en 14a'],
  additionalScopeEvidence: 'https://www.nlarbeidsinspectie.nl/site/binaries/site-content/collections/documents/2025/12/18/toetsen-van-de-ri-en-e/toetsen-van-de-ri-en-e-20251218.pdf',
  reviewNotes: 'Geen uitputtende WOR-uitleg of individueel oordeel over toetsingsplicht. Certificeringsscope en medische registratie zijn niet gelijkgesteld.',
} as const

export const learningChapter2Questions: LearningQuestionSeed[] = [
  {
    code: 'WL001-H2-OPENING', type: 'CASE_STUDY', knowledgeArea: 'Werkgeversverantwoordelijkheid', difficulty: 2,
    learningObjective: 'Verantwoordelijkheid en uitvoering onderscheiden',
    questionText: 'Directeur Karin laat de RI&E geheel aan de preventiemedewerker over. Wat vindt u hiervan?',
    explanation: 'De preventiemedewerker kan het werk aan de RI&E ondersteunen. De werkgever blijft verantwoordelijk voor het arbobeleid en de RI&E en moet de uitvoering organiseren. Niet alles zelf doen is iets anders dan de verantwoordelijkheid overdragen.',
    correctAnswer: ['werkgever'],
    options: [
      { value: 'preventiemedewerker', text: 'Dat klopt; de preventiemedewerker is verantwoordelijk voor de RI&E.', isCorrect: false },
      { value: 'deskundig', text: 'Dat kan, zolang de preventiemedewerker voldoende deskundig is.', isCorrect: false },
      { value: 'werkgever', text: 'De preventiemedewerker kan een belangrijke rol hebben, maar de werkgever blijft verantwoordelijk.', isCorrect: true },
      { value: 'arbodienst', text: 'Alleen een arbodienst mag een RI&E opstellen.', isCorrect: false },
    ],
  },
  {
    code: 'WL001-H2-UITBESTEDEN', type: 'SINGLE_CHOICE', knowledgeArea: 'Werkgeversverantwoordelijkheid', difficulty: 2,
    learningObjective: 'Herkennen dat uitbesteden verantwoordelijkheid niet overdraagt',
    questionText: 'Een werkgever besteedt de volledige RI&E uit aan een adviesbureau. Wie blijft verantwoordelijk dat er een passende RI&E is?',
    explanation: 'Het adviesbureau voert de afgesproken opdracht uit. De werkgever moet zorgen dat de organisatie over een passende RI&E en een Plan van Aanpak beschikt. Een contract voor uitvoering draagt die verantwoordelijkheid niet over.',
    correctAnswer: ['werkgever'],
    options: [
      { value: 'adviseur', text: 'De adviseur, omdat deze de inhoud van de RI&E opstelt.', isCorrect: false },
      { value: 'werkgever', text: 'De werkgever, ook als een adviseur de RI&E opstelt.', isCorrect: true },
      { value: 'toetser', text: 'De toetser, omdat deze de kwaliteit van de RI&E beoordeelt.', isCorrect: false },
      { value: 'preventie', text: 'De preventiemedewerker, omdat deze het interne contact verzorgt.', isCorrect: false },
    ],
  },
  {
    code: 'WL001-H2-INTERNE-ROL', type: 'TRUE_FALSE', knowledgeArea: 'Preventiemedewerker', difficulty: 2,
    learningObjective: 'De interne preventierol en passende deskundigheid herkennen',
    questionText: 'Voor de rol van preventiemedewerker moet een organisatie altijd een externe veiligheidskundige inhuren.',
    explanation: 'De preventiemedewerker is in beginsel een interne deskundige werknemer. Welke kennis, ervaring, tijd en capaciteit nodig zijn, hangt af van de organisatie en de risico’s. Externe expertise kan aanvullen; een externe veiligheidskundige is niet altijd nodig voor deze rol.',
    correctAnswer: ['onwaar'],
    options: [{ value: 'waar', text: 'Waar', isCorrect: false }, { value: 'onwaar', text: 'Niet waar', isCorrect: true }],
  },
  {
    code: 'WL001-H2-MEDEZEGGENSCHAP', type: 'CASE_STUDY', knowledgeArea: 'Werknemersvertegenwoordiging', difficulty: 3,
    learningObjective: 'Passende betrokkenheid van de OR herkennen',
    questionText: 'De directie wil de OR pas informeren nadat een nieuwe RI&E definitief is. Wat is het belangrijkste aandachtspunt?',
    explanation: 'De OR heeft een formele rol in het arbobeleid. Organiseer de betrokkenheid tijdens het RI&E-proces, passend bij de wettelijke rol, en werk samen met de preventiemedewerker. Alleen een definitief document toesturen borgt die betrokkenheid niet.',
    correctAnswer: ['betrekken'],
    options: [
      { value: 'achteraf', text: 'Laat de OR na vaststelling opmerkingen voor de volgende herziening verzamelen.', isCorrect: false },
      { value: 'delegatie', text: 'Laat de preventiemedewerker namens de OR alle keuzes met de directie afstemmen.', isCorrect: false },
      { value: 'betrekken', text: 'Betrek de OR tijdens het proces, passend bij haar wettelijke rol in het arbobeleid.', isCorrect: true },
      { value: 'toetsing', text: 'Laat de OR de deskundige toetsing uitvoeren voordat het document wordt gedeeld.', isCorrect: false },
    ],
  },
  {
    code: 'WL001-H2-SCOPE', type: 'CASE_STUDY', knowledgeArea: 'Arbokerndeskundigheid', difficulty: 3,
    learningObjective: 'Deskundigheid laten aansluiten op de te toetsen risico’s',
    questionText: 'Eén deskundige wordt gevraagd een RI&E met machineveiligheid, gevaarlijke stoffen en werkdruk te toetsen. Waar moet de werkgever op letten?',
    explanation: 'De deskundigheid moet passen bij de betrokken risico’s. Voor gecertificeerde arbokerndeskundigen is ook de toepasselijke certificeringsscope van belang. Eén deskundige dekt niet automatisch alle onderwerpen; aanvullende deskundigheid kan nodig zijn.',
    correctAnswer: ['aansluiting'],
    options: [
      { value: 'aansluiting', text: 'Of deskundigheid en toepasselijke scope aansluiten op de risico’s die worden getoetst.', isCorrect: true },
      { value: 'ervaring', text: 'Of ervaring in deze sector voldoende is om alle afzonderlijke deskundigheidsgebieden te dekken.', isCorrect: false },
      { value: 'contract', text: 'Of een breed arbodienstcontract voldoende is om aanvullende expertise achterwege te laten.', isCorrect: false },
      { value: 'grootste', text: 'Of expertise in het grootste risico voldoende is om ook de overige onderwerpen te toetsen.', isCorrect: false },
    ],
  },
  {
    code: 'WL001-H2-ROLLEN', type: 'SORTING', knowledgeArea: 'Samenwerking', difficulty: 2,
    learningObjective: 'De meest passende primaire rol bij een activiteit herkennen',
    questionText: 'Koppel elke activiteit aan de meest passende primaire rol. Andere partijen kunnen meewerken.',
    explanation: 'De werkgever draagt verantwoordelijkheid; de preventiemedewerker helpt intern met RI&E en maatregelen; werknemers brengen praktijkervaring in; de kerndeskundige toetst waar vereist binnen passende deskundigheid; OR/PVT vertegenwoordigt werknemers formeel. Dit zijn primaire rollen, geen exclusieve taken.',
    correctAnswer: { beleid: 'werkgever', preventie: 'preventiemedewerker', praktijk: 'werknemers', toetsen: 'kerndeskundige', vertegenwoordigen: 'or/pvt' },
    options: [
      { value: 'praktijk', text: 'Vanuit het eigen werk vertellen waar procedures in de praktijk knellen.', isCorrect: true },
      { value: 'toetsen', text: 'Waar vereist de RI&E toetsen binnen passende deskundigheid.', isCorrect: true },
      { value: 'beleid', text: 'Verantwoordelijk zijn dat passend arbobeleid en een RI&E aanwezig zijn.', isCorrect: true },
      { value: 'vertegenwoordigen', text: 'Werknemers formeel vertegenwoordigen bij het arbobeleid.', isCorrect: true },
      { value: 'preventie', text: 'Als interne preventierol meewerken aan de RI&E en preventieve maatregelen.', isCorrect: true },
    ],
  },
  {
    code: 'WL001-H2-NOVA', type: 'CASE_STUDY', knowledgeArea: 'Samenwerking', difficulty: 3,
    learningObjective: 'Verantwoordelijkheid en samenwerking toepassen in een organisatie',
    questionText: 'De directeur van Metaalbedrijf Nova laat de hele RI&E aan de preventiemedewerker over. Wat is de belangrijkste misvatting?',
    explanation: 'De preventiemedewerker heeft belangrijke taken, maar vervangt de verantwoordelijkheid van de werkgever niet. Bij Nova zijn ook praktijkkennis van werknemers, betrokkenheid van de OR en passende deskundige bijstand relevant. De directeur moet die samenwerking en de uitvoering organiseren.',
    correctAnswer: ['samenwerking'],
    options: [
      { value: 'extra', text: 'Met een tweede preventiemedewerker kan de directie de hele verantwoordelijkheid overdragen.', isCorrect: false },
      { value: 'contract', text: 'Met het arbodienstcontract ligt de verantwoordelijkheid voor de RI&E bij de arbodienst.', isCorrect: false },
      { value: 'or', text: 'Na akkoord van de OR kan de directie verantwoordelijkheid voor de uitvoering overdragen.', isCorrect: false },
      { value: 'samenwerking', text: 'De werkgever blijft verantwoordelijk en moet samenwerking met relevante partijen organiseren.', isCorrect: true },
    ],
  },
  {
    code: 'WL001-H2-NOVA-BIJDRAGEN', type: 'MULTI_CHOICE', knowledgeArea: 'Samenwerking', difficulty: 2,
    learningObjective: 'Relevante bijdragen van interne en externe partijen onderscheiden',
    questionText: 'Welke bijdragen zijn relevant voor de RI&E van Nova? Selecteer alle passende antwoorden.',
    explanation: 'Werknemers kennen het dagelijkse werk. De OR brengt de formele werknemersvertegenwoordiging in. De preventiemedewerker ondersteunt het interne preventiewerk. Relevante arbodeskundigen leveren passende specialistische kennis. Een contractbeheerder kan afspraken bewaken, maar vervangt deze bijdragen niet.',
    correctAnswer: ['werknemers', 'or', 'preventie', 'deskundigen'],
    options: [
      { value: 'werknemers', text: 'Werknemers: ervaring met de feitelijke werkzaamheden en knelpunten.', isCorrect: true },
      { value: 'or', text: 'OR: inbreng vanuit de formele werknemersvertegenwoordiging.', isCorrect: true },
      { value: 'contractbeheer', text: 'Contractbeheerder: vervangt de interne inbreng door het externe contract.', isCorrect: false },
      { value: 'preventie', text: 'Preventiemedewerker: interne kennis van preventie en opvolging.', isCorrect: true },
      { value: 'deskundigen', text: 'Relevante arbodeskundigen: deskundigheid passend bij de arbeidsrisico’s.', isCorrect: true },
    ],
  },
  {
    code: 'WL001-H2-CHECK-01', type: 'SINGLE_CHOICE', knowledgeArea: 'Werkgeversverantwoordelijkheid', difficulty: 2,
    learningObjective: 'Werkgeversverantwoordelijkheid bij uitbesteden toepassen',
    questionText: 'Een externe adviseur voert de RI&E volledig uit. Wie blijft verantwoordelijk dat de organisatie een passende RI&E heeft?',
    explanation: 'De werkgever blijft verantwoordelijk. De adviseur levert een bijdrage op basis van de opdracht; uitbesteden verandert niet wie binnen de organisatie voor een passende RI&E en de opvolging moet zorgen.',
    correctAnswer: ['werkgever'],
    options: [
      { value: 'toetser', text: 'De kerndeskundige die de volledigheid van de RI&E toetst.', isCorrect: false },
      { value: 'preventie', text: 'De preventiemedewerker die de interne afstemming verzorgt.', isCorrect: false },
      { value: 'werkgever', text: 'De werkgever die de uitvoering van de RI&E heeft uitbesteed.', isCorrect: true },
      { value: 'adviseur', text: 'De externe adviseur die de RI&E en het advies oplevert.', isCorrect: false },
    ],
  },
  {
    code: 'WL001-H2-CHECK-02', type: 'MULTI_CHOICE', knowledgeArea: 'Preventiemedewerker', difficulty: 3,
    learningObjective: 'De wettelijke kerntaken van de preventiemedewerker herkennen',
    questionText: 'Welke activiteiten passen bij de wettelijke rol van de preventiemedewerker? Selecteer alle passende antwoorden.',
    explanation: 'De preventiemedewerker helpt met de RI&E, adviseert en werkt samen met OR/PVT en arbodeskundigen, en helpt arbeidsbeschermende maatregelen uitvoeren. Zelfstandig deskundige toetsing verrichten hoort niet automatisch bij deze rol; daarvoor gelden afzonderlijke deskundigheidseisen.',
    correctAnswer: ['rie', 'adviseren', 'maatregelen'],
    options: [
      { value: 'rie', text: 'Meewerken aan het opstellen en uitvoeren van de RI&E.', isCorrect: true },
      { value: 'toetsen', text: 'Vanuit de benoeming zelfstandig alle RI&E-onderwerpen deskundig toetsen.', isCorrect: false },
      { value: 'adviseren', text: 'Adviseren en samenwerken met OR/PVT en arbodeskundigen over maatregelen.', isCorrect: true },
      { value: 'maatregelen', text: 'Meewerken aan de uitvoering van maatregelen voor veilig en gezond werken.', isCorrect: true },
    ],
  },
  {
    code: 'WL001-H2-CHECK-03', type: 'CASE_STUDY', knowledgeArea: 'Arbokerndeskundigheid', difficulty: 3,
    learningObjective: 'Passende deskundigheid bij gecombineerde risico’s selecteren',
    questionText: 'Een RI&E bevat machineveiligheid, gevaarlijke stoffen en psychosociale arbeidsbelasting. Wat is bij toetsing een belangrijk aandachtspunt?',
    explanation: 'Controleer of de betrokken deskundigen de betreffende onderwerpen kunnen beoordelen binnen hun toepasselijke deskundigheid en scope. De aanwezigheid van één titel of één contactpersoon onderbouwt dat niet. Leg waar nodig aanvullende deskundigheid vast.',
    correctAnswer: ['scope'],
    options: [
      { value: 'sector', text: 'Ervaring in de sector vervangt de controle op afzonderlijke deskundigheidsgebieden.', isCorrect: false },
      { value: 'scope', text: 'Deskundigheid en toepasselijke scope sluiten aan op de verschillende arbeidsrisico’s.', isCorrect: true },
      { value: 'titel', text: 'Een kerndeskundigentitel volstaat voor alle onderwerpen binnen dezelfde organisatie.', isCorrect: false },
      { value: 'contract', text: 'Een breed contract maakt een controle op de deskundigheid van de uitvoerder overbodig.', isCorrect: false },
    ],
  },
  {
    code: 'WL001-H2-CHECK-04', type: 'SORTING', knowledgeArea: 'Samenwerking', difficulty: 2,
    learningObjective: 'Primaire rollen toepassen zonder samenwerking uit te sluiten',
    questionText: 'Koppel de activiteiten aan de meest passende primaire rol. De partijen blijven samenwerken.',
    explanation: 'De werkgever organiseert en draagt verantwoordelijkheid. De preventiemedewerker ondersteunt de interne preventie. De werknemer brengt eigen werkervaring in. De kerndeskundige levert passende toetsingsdeskundigheid waar vereist. Deze verdeling sluit samenwerking niet uit.',
    correctAnswer: { organiseren: 'werkgever', ondersteunen: 'preventiemedewerker', signaleren: 'werknemer', beoordelen: 'kerndeskundige' },
    options: [
      { value: 'beoordelen', text: 'Binnen passende deskundigheid de RI&E toetsen wanneer dat vereist is.', isCorrect: true },
      { value: 'signaleren', text: 'Vanuit het eigen dagelijkse werk onpraktische instructies signaleren.', isCorrect: true },
      { value: 'ondersteunen', text: 'Vanuit de interne preventierol aan RI&E en maatregelen meewerken.', isCorrect: true },
      { value: 'organiseren', text: 'Verantwoordelijkheid dragen en middelen voor de RI&E organiseren.', isCorrect: true },
    ],
  },
  {
    code: 'WL001-H2-CHECK-05', type: 'CASE_STUDY', knowledgeArea: 'Samenwerking', difficulty: 3,
    learningObjective: 'Een RI&E-proces beoordelen op verantwoordelijkheid en betrokkenheid',
    questionText: 'Een externe RI&E ligt definitief klaar zonder inbreng van werknemers, preventiemedewerker of OR. Wat verdient vooral aandacht?',
    explanation: 'Borg de werkgeversverantwoordelijkheid en de passende betrokkenheid van interne partijen in het proces. Hun praktijkinformatie en formele rollen verdwijnen niet door externe uitvoering. Alleen achteraf toezenden of laten tekenen herstelt een ontbrekend samenwerkingsproces niet vanzelf.',
    correctAnswer: ['proces'],
    options: [
      { value: 'proces', text: 'Verantwoordelijkheid en passende interne betrokkenheid moeten in het proces worden geborgd.', isCorrect: true },
      { value: 'toezenden', text: 'Het toesturen van het definitieve document kan alle eerdere interne betrokkenheid vervangen.', isCorrect: false },
      { value: 'ondertekenen', text: 'Een handtekening van de preventiemedewerker kan het interne overleg achteraf vervangen.', isCorrect: false },
      { value: 'extern', text: 'De externe deskundigheid maakt inbreng van werknemers en vertegenwoordiging overbodig.', isCorrect: false },
    ],
  },
]

function questionBlock(code: string, type: LearningBlockSeed['type'], title: string, body?: string, categories?: string[]): LearningBlockSeed {
  const question = learningChapter2Questions.find((item) => item.code === code)
  if (!question) throw new Error(`Missing chapter 2 question: ${code}`)
  return { type, questionCode: code, data: { title, prompt: question.questionText, ...(body ? { body } : {}),
    ...(categories ? { categories, items: question.options.map(({ value, text }) => ({ value, text })) } : {}) } }
}

export const learningChapter2Blocks: LearningBlockSeed[] = [
  { type: 'HEADING', data: { eyebrow: 'Hoofdstuk 2 van 10', title: 'Wie doet wat?', estimatedDurationLabel: '12–15 minuten',
    subtitle: 'De RI&E vraagt om samenwerking. Wie draagt verantwoordelijkheid en wie levert welke bijdrage?',
    learningObjectives: ['Uitleggen waarom de werkgever verantwoordelijk blijft.', 'De rol van de preventiemedewerker herkennen.', 'Uitleggen waarom werknemers worden betrokken.', 'De rol van OR/PVT herkennen.', 'Arbodienst, bedrijfsarts en arbokerndeskundigen onderscheiden.', 'De vier arbokerndeskundigheden herkennen.', 'Deskundigheid bij toetsing laten aansluiten op de risico’s.', 'Samenwerking rond de RI&E organiseren.'] } },
  questionBlock('WL001-H2-OPENING', 'CASE_STUDY', 'Van wie is de RI&E?', 'Directeur Karin zegt: “Onze preventiemedewerker doet de RI&E. Ik krijg hem wel te zien als hij klaar is.” Wat vindt u hiervan?'),
  { type: 'PROCESS', data: { title: 'Het speelveld: samenwerken aan RI&E en Plan van Aanpak', steps: [
    'Werkgever — verantwoordelijk; organiseert de inzet en de opvolging.',
    'Preventiemedewerker — ondersteunt het interne preventiewerk.',
    'Werknemers — brengen ervaringen met het dagelijkse werk in.',
    'OR/PVT — brengt de formele werknemersvertegenwoordiging in.',
    'Deskundige bijstand — arbodienst, bedrijfsarts en andere kerndeskundigen ondersteunen vanuit passende expertise.',
  ], footer: 'Dit is een samenwerkingsmodel. De nummers zijn geen hiërarchie of verplichte uitvoeringsvolgorde. De bedrijfsarts is zelf ook een kerndeskundige; de arbodienst is een organisatie.' } },
  { type: 'TEXT', data: { title: 'De werkgever: verantwoordelijkheid en uitvoering', paragraphs: [
    'De werkgever moet zorgen voor veilige en gezonde arbeidsomstandigheden, een passende RI&E en een Plan van Aanpak. Dat vraagt om inzet, middelen en opvolging.',
    'De uitvoering kan worden verdeeld over interne medewerkers en externe adviseurs. De werkgeversverantwoordelijkheid blijft bestaan, ook wanneer anderen het onderzoek en de rapportage verzorgen.',
  ] } },
  questionBlock('WL001-H2-UITBESTEDEN', 'SINGLE_CHOICE', 'Uitbesteden: wat verandert er?'),
  { type: 'PROCESS', data: { title: 'De preventiemedewerker: drie kerntaken', steps: [
    'RI&E — meewerken aan het opstellen en uitvoeren.',
    'Adviseren en samenwerken — met OR/PVT en arbodeskundigen over preventieve maatregelen.',
    'Uitvoering — meewerken aan maatregelen voor veilig en gezond werken.',
  ], footer: 'De preventiemedewerker ondersteunt de werkgever. Deze rol neemt diens verantwoordelijkheid niet over.' } },
  questionBlock('WL001-H2-INTERNE-ROL', 'TRUE_FALSE', 'Altijd een externe veiligheidskundige?'),
  { type: 'TEXT', data: { title: 'Deskundigheid, tijd en capaciteit', paragraphs: [
    'De preventiemedewerker is in beginsel een deskundige werknemer binnen de organisatie. Passende externe expertise kan aanvullen wanneer interne deskundigheid ontoereikend is.',
    'Kennis, ervaring, beschikbare tijd en capaciteit moeten passen bij de werkzaamheden en de risico’s. Het benodigde aantal preventiemedewerkers volgt uit wat de organisatie nodig heeft; er is geen vaste rekentabel per aantal werknemers.',
  ] } },
  { type: 'CALLOUT', data: { label: 'PRAKTIJKKENNIS', title: 'Wie weet hoe het werk echt wordt uitgevoerd?', body: 'Werknemers kennen omstandigheden die in een procedure of rondgang niet altijd zichtbaar zijn. Verschillende partijen brengen verschillende informatie mee.', items: [
    'Feitelijke werkmethoden en afwijkingen van procedures.', 'Storingen en onpraktische hulpmiddelen.', 'Werkdruk en bijna-ongevallen.', 'Instructies die onvoldoende aansluiten op het dagelijkse werk.',
  ] } },
  { type: 'TEXT', data: { title: 'Werknemers raadplegen', paragraphs: [
    'Sinds 1 juli 2026 moeten werkgevers in alle bedrijven werknemers raadplegen over het arbobeleid. De RI&E is een van de uitdrukkelijk genoemde onderwerpen, naast onder meer deskundige bijstand en voorlichting.',
    'Raadpleging gebeurt vaak via de OR of PVT. Bij ontbreken daarvan, of bij minder dan tien werknemers, raadpleegt de werkgever de belanghebbende werknemers rechtstreeks. Werknemers kunnen voorstellen doen en advies geven over veilig en gezond werken.',
    'Praktijkervaring meenemen maakt de RI&E sterker. Vraag bijvoorbeeld waar een werkinstructie niet aansluit en bespreek wat er met de inbreng gebeurt.',
  ] } },
  { type: 'TEXT', data: { title: 'OR en PVT: formele werknemersvertegenwoordiging', paragraphs: [
    'De ondernemingsraad (OR) en personeelsvertegenwoordiging (PVT) hebben een formele rol binnen het arbobeleid. Betrek de aanwezige vertegenwoordiging passend bij haar wettelijke rol in het RI&E-proces.',
    'De preventiemedewerker adviseert en werkt met de werknemersvertegenwoordiging samen. Die samenwerking is niet hetzelfde als de verantwoordelijkheid van de werkgever overnemen. Dit hoofdstuk behandelt de hoofdlijnen, niet alle afzonderlijke medezeggenschapsrechten.',
  ] } },
  questionBlock('WL001-H2-MEDEZEGGENSCHAP', 'CASE_STUDY', 'De OR pas achteraf informeren', 'De directie laat een nieuwe RI&E maken. De organisatie heeft een OR, maar die mag de RI&E pas zien wanneer alles definitief is.'),
  { type: 'CALLOUT', data: { label: 'BEGRIPPEN', title: 'Arbodienst, bedrijfsarts en andere kerndeskundigen', items: [
    'Arbodienst: een organisatie die verschillende vormen van deskundige arbodienstverlening kan leveren.',
    'Bedrijfsarts: medisch specialist op het gebied van arbeid en gezondheid, met wettelijke taken en een onafhankelijke professionele rol.',
    'Andere arbokerndeskundigen: specialisten in arbeidsrisico’s vanuit hun eigen deskundigheidsgebied.',
  ] } },
  { type: 'CALLOUT', data: { label: 'VIER DESKUNDIGHEIDSGEBIEDEN', title: 'Welke expertise is nodig?', items: [
    'Hogere veiligheidskundige: veiligheidskundige expertise, bijvoorbeeld rond machines en het voorkomen van ongevallen.',
    'Arbeidshygiënist: expertise rond blootstelling en factoren in de werkomgeving.',
    'Arbeids- en organisatiedeskundige: expertise rond arbeid, organisatie en psychosociale arbeidsbelasting.',
    'Bedrijfsarts: medische expertise rond arbeid en gezondheid.',
  ], body: 'Eén deskundige is niet automatisch deskundig voor ieder RI&E-onderwerp. De bedrijfsarts kent een medische registratie; die is niet hetzelfde als het persoonscertificaat van de andere arbokerndeskundigen.' } },
  { type: 'TEXT', data: { title: 'Deskundigheid moet passen bij de risico’s', paragraphs: [
    'Bij RI&E-toetsing moet de expertise aansluiten op de onderwerpen die worden getoetst. Voor gecertificeerde arbokerndeskundigen geldt de toepasselijke certificeringsscope: het gebied waarvoor zij gecertificeerd zijn.',
    'Bespreek daarom welke risico’s aanwezig zijn, welke deskundigheid wordt ingezet en of aanvullende deskundigen nodig zijn. Een brede functietitel is op zichzelf geen bewijs dat alle risico’s worden gedekt.',
  ] } },
  questionBlock('WL001-H2-SCOPE', 'CASE_STUDY', 'Verschillende risico’s, passende deskundigheid'),
  { type: 'CALLOUT', data: { label: 'TOETSING IN HOOFDLIJNEN', title: 'Niet iedere organisatie zit in dezelfde situatie', body: 'Er zijn uitzonderingen op de toetsingsplicht. Organisaties met maximaal 25 werknemers kunnen onder voorwaarden zijn vrijgesteld wanneer zij een erkend branche-RI&E-instrument gebruiken. Klein zijn alleen is dus niet voldoende. Hoofdstuk 7 behandelt de toetsing van de RI&E uitgebreid; dat hoofdstuk is nog in ontwikkeling.' } },
  questionBlock('WL001-H2-ROLLEN', 'SORTING', 'Wie doet wat?', undefined, ['Werkgever', 'Preventiemedewerker', 'Werknemers', 'Kerndeskundige', 'OR/PVT']),
  { type: 'PROCESS', data: { title: 'Rollen zijn geen geïsoleerde vakjes', steps: [
    'Een werknemer signaleert een knelpunt in het dagelijkse werk.',
    'De preventiemedewerker onderzoekt het signaal en ondersteunt de aanpak.',
    'De werkgever besluit en organiseert tijd, middelen en uitvoering.',
    'OR/PVT wordt betrokken passend bij haar rol in het arbobeleid.',
    'Een deskundige ondersteunt of toetst waar dat nodig is.',
  ], footer: 'Dit is een voorbeeld van samenwerking. De precieze samenwerking hangt af van de situatie; meerdere partijen kunnen aan dezelfde activiteit bijdragen.' } },
  questionBlock('WL001-H2-NOVA', 'CASE_STUDY', 'Metaalbedrijf Nova', 'Nova heeft 47 medewerkers, een directeur, één preventiemedewerker, een OR, productiepersoneel en kantoorfuncties. Er is een arbodienstcontract. De directeur vraagt: “Kun jij de RI&E volledig maken, laten toetsen en daarna uitvoeren? Laat maar weten wanneer alles klaar is.”'),
  questionBlock('WL001-H2-NOVA-BIJDRAGEN', 'MULTI_CHOICE', 'Nova: informatie en deskundigheid'),
  { type: 'SUMMARY', data: { title: 'Een RI&E is teamwork. Verantwoordelijkheid niet.', items: [
    'De werkgever blijft verantwoordelijk en organiseert de RI&E en het Plan van Aanpak.',
    'De preventiemedewerker ondersteunt de RI&E en de uitvoering van preventieve maatregelen.',
    'Werknemers leveren praktijkkennis; OR/PVT heeft een formele vertegenwoordigende rol.',
    'Deskundige bijstand sluit aan op de risico’s en op wat voor de betreffende taak vereist is.',
    'Samenwerking maakt de RI&E bruikbaar. Zij heft de verantwoordelijkheid van de werkgever niet op.',
  ] } },
  { type: 'HEADING', data: { title: 'Hoofdstukcheck', body: 'Vijf oefenvragen om toe te passen wat u hebt geleerd. Dit is geen examen. Een fout antwoord geeft uitleg en verhindert afronding niet.' } },
  questionBlock('WL001-H2-CHECK-01', 'SINGLE_CHOICE', '1. Uitvoering en verantwoordelijkheid'),
  questionBlock('WL001-H2-CHECK-02', 'MULTI_CHOICE', '2. De taken van de preventiemedewerker'),
  questionBlock('WL001-H2-CHECK-03', 'CASE_STUDY', '3. Deskundigheid bij toetsing'),
  questionBlock('WL001-H2-CHECK-04', 'SORTING', '4. Rollen koppelen', undefined, ['Werkgever', 'Preventiemedewerker', 'Werknemer', 'Kerndeskundige']),
  questionBlock('WL001-H2-CHECK-05', 'CASE_STUDY', '5. Samenwerking in het hele proces', 'Een organisatie heeft een preventiemedewerker en een OR. De directie laat extern een RI&E maken zonder hen of de werknemers tijdens het proces te betrekken. Het document ligt nu als definitieve RI&E klaar.'),
]
