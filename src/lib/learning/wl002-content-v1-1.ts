import { wl002CourseBundle as original } from './wl002-course-bundle'
import { validateAcademyBundle, type AcademyQuestion } from './academy-content-standard'
import { formativeRevisions } from './wl002-formative-v1-1'
import { examRevisions, retentionRevisions, type ChoiceRevision } from './wl002-assessments-v1-1'

// v1.0 remains an unchanged, reproducible source. Never re-run its option
// rotation on edited stems: every correct value and option position is retained.
function revise(question: AcademyQuestion, revision?: ChoiceRevision): AcademyQuestion {
  const result = structuredClone(question); result.version = 2
  if (!revision) return result
  const correct = typeof revision[0] === 'string' ? [revision[0]] : revision[0]
  if (correct.length !== question.correctAnswer.length || revision[1].length !== question.options.length - correct.length) throw new Error(`WL002_REVISION_CARDINALITY:${question.code}`)
  let right = 0, wrong = 0
  result.options = question.options.map((option) => ({ ...option, text: option.isCorrect ? correct[right++] : revision[1][wrong++] }))
  return result
}

const bundle = structuredClone(original)
bundle.courseVersion = 'WL-002-COURSE-1.1'; bundle.examVersion = 'WL-002-EXAM-1.1'; bundle.checkedAt = '2026-10-25'
bundle.definition.retention.programVersion = 'WL-002-RETENTION-1.1'
bundle.definition.retention.bankVersion = 'WL-002-RETENTION-1.1'
bundle.definition.retention.annualCheckVersion = 'WL-002-ANNUAL-CHECK-1.1'
bundle.sources.push(
  { id: 'arbo12-wet', title: 'Staatsblad 2026, 18 — artikel III, wijziging Arbowet artikel 12', url: 'https://zoek.officielebekendmakingen.nl/stb-2026-18.html', status: 'CHECKED', scope: 'Wet 28 januari 2026, gepubliceerd 3 februari 2026. Primaire wijzigingstekst artikel 12; ingangsdatum aanvullend bevestigd met Arboportaal. Geen integraal geconsolideerde Arbowet.' },
  { id: 'arbo12-2026', title: 'Arboportaal — werknemersraadpleging vanaf 1 juli 2026', url: 'https://www.arboportaal.nl/actueel/nieuws/2026/06/29/regels-voor-raadpleging-van-werknemers-aangepast-per-1-juli-2026', status: 'CHECKED', scope: 'Publicatie 29 juni 2026; raadpleging onderscheiden van instemming. Geconsolideerde wettekst blijft formeel te controleren.' },
  { id: 'rie-toetsing', title: 'Steunpunt RI&E — toetsing en erkende instrumenten', url: 'https://www.rie.nl/over-rie/toetsen', status: 'CHECKED', scope: 'Toepasselijke branche en erkend instrument op het relevante moment; geen vrijstelling door personeelsaantal alleen.' },
  { id: 'ap-gezondheid', title: 'Autoriteit Persoonsgegevens — regels bij zieke werknemers', url: 'https://autoriteitpersoonsgegevens.nl/themas/werk-en-uitkering/zieke-werknemers/regels-voor-werkgevers-bij-zieke-werknemers', status: 'CHECKED', scope: 'Doelbinding en bijzondere gezondheidsgegevens; werkgerichte preventie scheiden van medische beoordeling. Specifieke casustoepassing blijft review vereist.' },
)

const stems: Record<string, string> = {
  'WL002-H2-Q07': 'De werkplaats kan een oplosmiddel mogelijk vervangen, maar het PvA mist uitvoering en controle. Welke aanpak verbindt de maatregelenhiërarchie met een uitvoerbare actie?',
  'WL002-H8-Q09': 'Een leverancier noemt een rondgang een formele RI&E-toetsing en vraagt u ook medische beperkingen vast te stellen. Welke rolafbakening is nodig?',
  'WL002-H1-Q09': 'De werkgever koopt extern RI&E-advies in. Welke vraag houdt de interne kerntaken en de werkgeversverantwoordelijkheid zichtbaar?',
  'WL002-H2-Q09': 'Een nieuw proces valt mogelijk buiten het gebruikte branche-instrument. Welke vervolgvraag verbindt actualiteit en de voorwaarden voor een toetsingsuitzondering?',
  'WL002-H3-Q07': 'Na de ronde betwist een werknemer de interpretatie en staan acties nog open. Welke twee stappen verbinden verduidelijking met opvolging?',
  'WL002-H4-Q08': 'In een team zijn er terugkerende routeproblemen én signalen over hoog werktempo en weinig herstel. Welke signalen kunnen nader onderzoek van de arbeidsomstandigheden rechtvaardigen?',
  'WL002-H4-Q09': 'Een tijdelijke medewerker deelt in een apart gesprek medische informatie over een werkknelpunt. Welke aanpak verbindt zorgvuldig betrekken met passende verslaglegging?',
  'WL002-H5-Q08': 'Een uitzendkracht moet voor het eerst een complexe storingssituatie afhandelen. Waarom bewijst een toolbox van tien minuten op zichzelf nog geen passende voorbereiding?',
  'WL002-H6-Q09': 'De structurele oplossing is vertraagd en de tijdelijke bescherming past niet meer. Wat moet het voortgangsoverleg concreet vastleggen?',
  'WL002-H7-Q08': 'De OR wordt pas na de definitieve benoeming geïnformeerd en ziet alleen afgeronde acties. Welke informatie ontbreekt voor tijdige, inhoudelijke betrokkenheid?',
  'WL002-H8-Q08': 'De onderbouwing van bescherming is onzeker terwijl het werk doorgaat. Welke reactie past bij zorgvuldig preventiewerk?',
  'WL002-H9-Q07': 'Nieuwe gebruikers krijgen andere werkzaamheden met hetzelfde hulpmiddel. Welke twee afspraken helpen de borging aan deze verandering aan te passen?',
  'WL002-H10-Q07': 'Werkstroom bereidt overleg met werkgever, werknemersvertegenwoordiging en deskundigen voor. Welke twee informatiegroepen verbinden documenten met het dagelijkse werk?',
  'WL002-H8-Q02': 'U ondersteunt een organisatie waar zowel blootstellingsgegevens ontbreken als een complexe machinebeveiliging is gewijzigd. Welke twee situaties kunnen aanvullende deskundigheid vereisen?',
  'WL002-H10-Q02': 'Werkstroom heeft een advies ontvangen, maar een proef maakt nieuwe onzekerheden zichtbaar. Welke onderdelen horen bij het vervolgen van de volledige verbetercyclus?',
  'WL002-H10-Q06': 'De nieuwe route werkt rustig goed, maar tijdens piekdrukte kiezen werknemers een onveilige doorgang. Welke vervolgaanpak past bij deze uitkomst?',
}
const analysisExercises = new Set(['H2-Q08', 'H2-Q09', 'H3-Q08', 'H3-Q09', 'H4-Q08', 'H4-Q09', 'H6-Q08', 'H7-Q05', 'H7-Q09', 'H8-Q04', 'H8-Q05', 'H8-Q08', 'H9-Q05', 'H9-Q08', 'H10-Q02', 'H10-Q03', 'H10-Q06', 'H10-Q08', 'H10-Q09'])
for (const [chapterIndex, chapter] of bundle.chapters.entries()) {
  chapter.questions = chapter.questions.map((question, index) => {
    const revision = formativeRevisions[chapterIndex]?.[index]
    if (!revision) throw new Error(`WL002_MISSING_EXERCISE:${question.code}`)
    const updated = revise(question, [revision[0], revision[1]])
    updated.questionText = stems[question.code] ?? question.questionText
    updated.explanation = revision[2]
    updated.cognitiveLevel = analysisExercises.has(question.code.replace('WL002-', '')) ? 'A' : 'T'
    updated.difficulty = updated.cognitiveLevel === 'A' ? 3 : 2
    return updated
  })
  for (const block of chapter.blocks) if (block.questionCode) {
    const question = chapter.questions.find((entry) => entry.code === block.questionCode)!
    block.data.prompt = question.questionText
  }
}
bundle.examQuestions = bundle.examQuestions.map((question, index) => revise(question, examRevisions[index]))
bundle.retentionQuestions = bundle.retentionQuestions.map((question, index) => revise(question, retentionRevisions[index + 1]))

const analysisExam = new Set([7,10,15,19,25,26,29,30,32,34,36,39,44,46,47,49,50])
const recallExam = new Set([3,13,18,28,43])
for (const [index, question] of bundle.examQuestions.entries()) {
  question.cognitiveLevel = analysisExam.has(index + 1) ? 'A' : recallExam.has(index + 1) ? 'B' : 'T'
  question.difficulty = question.cognitiveLevel === 'A' ? 3 : question.cognitiveLevel === 'B' ? 1 : 2
}
const recallRetention = new Set([1,2,5,14,18,32,37,42,47,61,67,74,81,84,89,92])
const analysisRetention = new Set([9,19,26,39,46,50,58,60,65,69,75,80,85,88,93,98,100])
for (const [index, question] of bundle.retentionQuestions.entries()) {
  question.cognitiveLevel = analysisRetention.has(index + 1) ? 'A' : recallRetention.has(index + 1) ? 'B' : 'T'
  question.difficulty = question.cognitiveLevel === 'A' ? 3 : question.cognitiveLevel === 'B' ? 1 : 2
}

function block(code: string) {
  const found = bundle.chapters.flatMap((chapter) => chapter.blocks).find((entry) => entry.code === code)
  if (!found) throw new Error(`WL002_UNKNOWN_BLOCK:${code}`)
  return found
}
function extend(code: string, text: string) {
  const found = block(code)
  found.data.paragraphs = [...(found.data.paragraphs as string[]), text]
}

block('H1-law').data.body = 'Wettelijk: artikel 13 Arbowet regelt deskundige bijstand. Die omvat meewerken aan RI&E, advies en samenwerking en medewerking aan maatregelen. De werkgever blijft verantwoordelijk en moet passende kennis, tijd en middelen organiseren. Waar OR/PVT is ingesteld, zijn keuze van de persoon en diens positionering aan instemming verbonden. Bij maximaal 25 werknemers kan de werkgever de taken onder voorwaarden zelf verrichten. Praktisch aanbevolen: maak taken en overleg schriftelijk werkbaar. De precieze inrichting hangt af van risico’s en organisatie.'
extend('H1-L5-explanation', 'Wettelijk moet de werkgever zelfstandige en onafhankelijke bijstand mogelijk maken. Een werknemer mag wegens een juiste taakuitoefening niet in zijn positie worden benadeeld. Dat is geen algemene garantie tegen ieder ontslag of ieder conflict. Maak bij een belemmering de feiten en besluitlijn zichtbaar; laat de toepassing van beschermingsregels zo nodig juridisch beoordelen.')
extend('H1-L3-explanation', 'De kleine-werkgeversmogelijkheid betreft de werkgever die de taken zelf verricht; het woord directeur alleen bewijst niet dat aan de voorwaarden is voldaan. Beoordeel de feitelijke werkgeverscontext, deskundigheid en beschikbare capaciteit. Een gevolgde opleiding is daarvoor informatie, geen automatische vrijstelling.')
extend('H2-L4-application', 'Uitgewerkt fictief PvA-voorbeeld: avondploeg tilt zakken handmatig vanuit een lage opslag; frequentie en haalbaarheid van bronaanpassing zijn nog onvoldoende bekend. Actie: verantwoordelijke teamleider laat de taak en alternatieven onderzoeken, organiseert passende tussentijdse bescherming en legt vóór ingebruikname van de gekozen oplossing een evaluatiemoment vast. Het besluit vermeldt eigenaar, middelen en een concrete lokale termijn. Controle: is de handmatige belasting onder representatieve omstandigheden voldoende verminderd en wordt de oplossing gebruikt? De termijn in dit voorbeeld is geen algemene wettelijke termijn.')
extend('H2-L5-explanation', 'Beslisvoorbeeld: een kleine werkgever wil een branche-instrument gebruiken. Controleer naast het aantal werknemers of de onderneming tot de betreffende branche behoort, welk instrument wordt gebruikt en of het op het relevante moment erkend was. Maak de RI&E bedrijfsspecifiek. Ontbreekt die onderbouwing, concludeer dan niet automatisch dat een uitzondering geldt; laat de toepasselijke toetsingsplicht nagaan. Dit voorbeeld beschrijft niet alle wettelijke uitzonderingssituaties.')
extend('H2-L6-application', 'Voorbeeld actualisatietrigger: de avondploeg krijgt een andere stof en een langere reinigingstaak. Beoordeel die wijziging vóór toepassing van de oude conclusie en pas waar nodig RI&E, maatregelen, instructie en PvA aan. De recente rapportdatum is geen zelfstandige onderbouwing.')
extend('H3-L2-application', 'Voorbeeld ronde-notitie: dinsdag 16:10, laadzone B, orderverzamelen tijdens piek. Een pallet versmalt de looproute; werknemers wijken uit naar voertuigverkeer. Noteer de feitelijke handeling, aanwezige bescherming en nog onbekende duur/frequentie. Bespreek passende onmiddellijke bescherming via de veiligheidsafspraak en beleg onderzoek en vervolg bij een verantwoordelijke. Trek uit één foto geen organisatiebrede risicoscore.')
extend('H3-L5-explanation', 'Een preventiebenoeming geeft niet automatisch een algemene technische stilleggingsbevoegdheid. Volg bij gevaar de passende veiligheidsprocedure en schakel de verantwoordelijke in; laat urgente bescherming niet wachten op een gewone vergadercyclus. De precieze bevoegdheid en wettelijke rechten in een concrete noodsituatie vragen afzonderlijke beoordeling.')
extend('H4-L5-explanation', 'Ook wanneer iemand vrijwillig medische informatie noemt, is vastleggen in een algemeen preventiedossier niet vanzelf toegestaan of nodig. Beschrijf het werkknelpunt en een passend vervolg. Bespreek medische vragen via bedrijfsarts of arbodienst en beoordeel doel, noodzakelijkheid en toegang tot informatie; beloof geen onbeperkte vertrouwelijkheid die de organisatie niet kan waarmaken.')
extend('H5-L3-explanation', 'De werkgever moet informatie en onderricht laten aansluiten op taken en risico’s en toezien op de passende toepassing van instructies en voorzieningen. De benodigde uitleg en begeleiding worden niet alleen bepaald door contractduur. Stem bij ingeleende krachten de informatie- en uitvoeringsafspraken tussen inlener en uitlener af, zonder de verantwoordelijkheid voor de eigen werkplek uit beeld te verliezen. Jongeren en andere groepen kunnen extra aandacht voor instructie en toezicht nodig hebben.')
extend('H6-L2-application', 'Fictief effectcontroledossier: na wijziging van de laadroute observeert de teamleider twee representatieve laadpieken en bespreekt afwijkingen met gebruikers. Criterium: de beoogde scheiding blijft onder die omstandigheden daadwerkelijk bruikbaar. Een afwijking wordt met oorzaak, tijdelijke bescherming, eigenaar en hercontrolemoment vastgelegd. Een rustige proef is geen bewijs voor alle diensten; waar metingen of specialistische beoordeling nodig zijn, vervangt deze observatie die niet.')
block('H7-law').data.body = 'Wettelijk: werkgevers moeten werknemers over het arbobeleid raadplegen; de verduidelijkte regels gelden sinds 1 juli 2026. Dat gebeurt waar van toepassing via OR/PVT en anders door rechtstreekse raadpleging van de belanghebbende werknemers. Raadpleging is niet hetzelfde als het instemmingsrecht van een ingestelde OR/PVT over keuze en positionering van de preventiemedewerker. Artikel 13 regelt daarnaast advies en samenwerking. Praktisch aanbevolen: spreek doel, moment, besluitlijn en terugkoppeling af. De procedure en precieze rechten moeten bij de organisatie passen.'
extend('H7-L2-explanation', 'Maak het onderscheid zichtbaar: voor een voorgenomen benoeming/positionering regelt u de toepasselijke instemming vóór het definitieve besluit. Bij arbobeleid moeten werknemers ook zonder OR/PVT worden geraadpleegd; een externe adviseur of benoemde preventiemedewerker vervangt dat gesprek niet. Noteer welke informatie vooraf beschikbaar is, welke reacties volgen en hoe het besluit wordt teruggekoppeld. De geconsolideerde wettelijke tekst en casustoepassing blijven formeel te controleren.')
extend('H8-L6-application', 'Vraag bij een aanbod voor formele toetsing welke scope, deskundigheid en vereisten gelden. Leg het antwoord naast de concrete RI&E en eventuele toepasselijke uitzondering. Een rondgang kan nuttige informatie leveren zonder daarmee de formele toetsingsopdracht te vervullen.')
extend('H9-L1-application', 'Fictieve jaarplanning: bij aanvang open PvA-acties en hun eigenaren nalopen; vóór de nieuwe avondtaak gewijzigde risico’s en instructie beoordelen; na invoering effectcontrole onder relevante piekdrukte; bij de kwartaalbespreking vastgelopen besluiten escaleren; vóór vakantie beheer en overdracht controleren. De datum van een verbouwing of nieuw signaal kan tussentijds een extra beoordeling vragen. Deze gekozen overlegfrequentie is een praktische organisatieafspraak, geen algemene wettelijke jaarkalender.')

const workstream = [
  'Werkstroom verhuist orderverzameling naar hal B en voegt een avondploeg toe. De preventiemedewerker hoort van vaste en tijdelijke krachten dat pallets tijdens piekdrukte in de looproute staan. Het overzicht mist de duur en frequentie van de blokkade.',
  'Het onderzoek van Werkstroom laat zien dat de oude verkeersbeoordeling alleen de rustige dagdienst beschrijft. Ook een nieuw reinigingsmiddel wordt langer gebruikt. Welke informatie en passende expertise voor beoordeling nodig zijn, is nog niet vastgesteld.',
  'Werkstroom vergelijkt routeaanpassing en werkorganisatie met extra waarschuwingen. Een eerste routevariant blokkeert een laadplek. Gebruikers en deskundige onderzoeken hoe de bron van het conflict kan worden aangepakt en welke tijdelijke bescherming nodig is.',
  'De nieuwe route is bij Werkstroom in de dagdienst ingevoerd. Tijdelijke krachten in de avondploeg kennen de lokale werkwijze nog onvoldoende. Het PvA vermeldt een opleverdatum, maar nog geen controle van instructie en beschikbaarheid tijdens die ploeg.',
  'Bij de effectcontrole van Werkstroom blijkt de route tijdens rustige uren bruikbaar. Bij piekdrukte wijken werknemers opnieuw uit naar de voertuigzone. De projectgroep moet werktempo, opstelling en gebruik onderzoeken voordat de actie kan worden afgesloten.',
  'Werkstroom past na de piekproef de opstelling aan. De teamleider belegt beheer, instructie en storingsopvolging en plant een passende hercontrole. Een nieuwe bevinding leidt waar nodig tot bijstelling van RI&E en PvA; overblijvende onzekerheden krijgen een eigenaar.',
]
for (const [index, scenario] of workstream.entries()) block(`H10-L${index + 1}-case`).data.body = scenario

for (const question of [...bundle.chapters.flatMap((chapter) => chapter.questions), ...bundle.examQuestions, ...bundle.retentionQuestions]) {
  if ([1,4,7,8].includes(question.chapterNumber)) question.legalReviewRequired = true
  if (question.chapterNumber === 4) question.sourceIds = ['ap-gezondheid', 'arbo12-2026']
  if (question.chapterNumber === 7) question.sourceIds = ['arbo13', 'arbo12-2026']
  if (question.chapterNumber === 7) question.sourceIds.push('arbo12-wet')
  if (question.chapterNumber === 2 || (question.chapterNumber === 8 && /toets/i.test(question.questionText))) question.sourceIds = [...new Set([...question.sourceIds, 'rie-toetsing'])]
}
bundle.examQuestions[34].explanation = 'Ook zonder OR/PVT moeten belanghebbende werknemers over het arbobeleid worden geraadpleegd. Dit verschilt van instemming over persoon en positie door een ingestelde OR/PVT. Controleer de toepasselijke procedure; een adviseur vervangt de raadpleging niet.'
bundle.retentionQuestions[63].explanation = bundle.examQuestions[34].explanation
bundle.retentionQuestions[5].explanation = 'De werkgever moet zelfstandige en onafhankelijke preventiebijstand mogelijk maken. Een passende overleglijn ondersteunt dat. Bescherming bij juiste taakuitoefening is geen algemene garantie tegen ieder arbeidsrechtelijk besluit; juridische casustoepassing blijft review vereist.'

export const wl002RemediatedCourseBundle = validateAcademyBundle(bundle)
