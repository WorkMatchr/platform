import type { LearningBlockSeed, LearningQuestionSeed } from './learning-prototype-content'

export const learningChapter5SourceMetadata = {
  chapter: 'maatregelen-bepalen', checkedAt: '2026-09-26',
  reviewStatus: 'PROTOTYPE_REQUIRES_CONTENT_AND_LEGAL_REVIEW',
  sourceIds: ['arbowet-current', 'arboportaal-arbobeleid'],
  sources: [
    { title: 'Arboportaal — Persoonlijke beschermingsmiddelen en arbeidshygiënische strategie', url: 'https://www.arboportaal.nl/onderwerpen/persoonlijke-beschermingsmiddelen/persoonlijke-beschermingsmiddelen-als-hulpmiddel-voor-gezond-en-veilig-werken' },
    { title: 'Nederlandse Arbeidsinspectie — STOP-strategie', url: 'https://www.nlarbeidsinspectie.nl/onderwerpen/arbeidsomstandighedenwet-gevaarlijke-stoffen/stoffencheck-voor-gevaarlijke-stoffen/wat-kan-ik-zelf-doen' },
    { title: 'Nederlandse Arbeidsinspectie — Stap 3: Maatregelen', url: 'https://www.nlarbeidsinspectie.nl/onderwerpen/toelichting-zelfinspectie-werken-met-gevaarlijke-stoffen/maatregelen' },
  ],
  reviewNotes: 'CONTENT REVIEW REQUIRED: arbotechnische/juridische review en studentvalidatie. Didactische hiërarchie; specifieke risico’s kennen eigen voorschriften. Geen universele maatregelenscore, kostenformule of automatische maatregelkeuze.',
} as const

function question(code: string, type: LearningQuestionSeed['type'], knowledgeArea: string, difficulty: number,
  learningObjective: string, questionText: string, explanation: string,
  choices: Array<[value: string, text: string, correct: boolean]>): LearningQuestionSeed {
  return { code: `WL001-H5-${code}`, questionVersion: 1, type, knowledgeArea, difficulty, learningObjective,
    questionText, explanation, correctAnswer: choices.filter((item) => item[2]).map((item) => item[0]),
    options: choices.map(([value, text, isCorrect]) => ({ value, text, isCorrect })) }
}

export const learningChapter5Questions: LearningQuestionSeed[] = [
  question('OPENING', 'CASE_STUDY', 'Maatregelenhiërarchie', 2, 'Hogere maatregelen onderzoeken vóór uitsluitend PBM',
    'Een machine veroorzaakt veel lawaai. De werkgever wil iedereen gehoorbescherming geven. Wat is zonder verdere analyse de beste vervolgaanpak?',
    'Onderzoek hogere maatregelen, zoals bronaanpassing en technische beheersing. Gehoorbescherming kan ondertussen noodzakelijk zijn. Snelheid of correct dragen alleen onderbouwt niet waarom hogere maatregelen achterwege blijven; taakroulatie doet dat evenmin.', [
      ['snel', 'Voer PBM in en vergelijk hogere maatregelen pas bij de volgende evaluatie.', false],
      ['gebruik', 'Concentreer de beoordeling op goed dragen en voldoende voorraad PBM.', false],
      ['hoger', 'Onderzoek bron- en technische maatregelen, met waar nodig ook PBM.', true],
      ['roulatie', 'Kies kortere diensten bij de machine en laat de bron verder ongewijzigd.', false],
    ]),
  question('BRON', 'SINGLE_CHOICE', 'Bronaanpak', 2, 'Substitutie als bronmaatregel herkennen',
    'Een reinigingsproces gebruikt een schadelijk product. Een technisch geschikt minder schadelijk alternatief is beschikbaar. Welke maatregel ligt het hoogst in de hiërarchie?',
    'Vervanging pakt het gevaar bij de bron aan. Instructie en beperking van de blootstellingsduur veranderen vooral de werkwijze. Handschoenen en adembescherming beschermen de persoon. Beoordeel ook de risico’s van het vervangende product.', [
      ['instructie', 'Medewerkers vaker instrueren over veilig productgebruik.', false],
      ['vervangen', 'Het product vervangen door het minder schadelijke alternatief.', true],
      ['pbm', 'Passende handschoenen en adembescherming voorschrijven.', false],
      ['duur', 'De blootstellingsduur per medewerker verder beperken.', false],
    ]),
  question('ORDENEN', 'SORTING', 'Maatregelenhiërarchie', 2, 'Concrete maatregelen volgens voorkeursvolgorde ordenen',
    'Orden deze maatregelen volgens de aangeleerde voorkeursvolgorde voor het onderzoeken van maatregelen.',
    'Onderzoek eerst vervanging van de stof, daarna technische beheersing met afzuiging, vervolgens beperking via de organisatie en waar nodig PBM. De volgorde helpt onderzoeken; zij bepaalt niet dat ieder niveau in iedere situatie nodig is.', [
      ['bron', 'Schadelijke stof vervangen', true], ['technisch', 'Lokale afzuiging installeren', true],
      ['organisatie', 'Blootstellingsduur beperken', true], ['pbm', 'Ademhalingsbescherming gebruiken', true],
    ]),
  question('STOP', 'SINGLE_CHOICE', 'STOP', 2, 'Een technische STOP-maatregel herkennen',
    'Een schadelijke stof kan nu niet worden vervangen. Een gesloten doseersysteem voorkomt bij normaal gebruik rechtstreeks contact met de stof. Welke STOP-stap past hierbij?',
    'Dit is een technische maatregel: het systeem beperkt blootstelling. Substitutie zou de stof vervangen. Organisatie verandert bijvoorbeeld toegang of taakduur. PBM worden door de persoon gedragen; het doseersysteem is geen PBM.', [
      ['s', 'Substitutie', false], ['t', 'Technische maatregel', true], ['o', 'Organisatorische maatregel', false], ['p', 'Persoonlijk beschermingsmiddel', false],
    ]),
  question('PBM', 'TRUE_FALSE', 'PBM', 2, 'Een lagere maatregelkeuze onderbouwen',
    'Een technisch geschikt minder schadelijk product is beschikbaar. Alleen omdat de bestaande werkwijze goedkoper is, kiest de werkgever zonder verdere onderbouwing voor handschoenen en adembescherming. Past dit bij de hiërarchie?',
    'Nee. Onderzoek eerst de hogere maatregel en onderbouw de keuze binnen de toepasselijke voorschriften. Een prijsverschil is niet automatisch voldoende. PBM kunnen nodig blijven, maar hun beschikbaarheid vervangt dat onderzoek niet.', [
      ['ja', 'Ja', false], ['nee', 'Nee', true],
    ]),
  question('COMBINATIE', 'TRUE_FALSE', 'Combinatie van maatregelen', 2, 'Aanvullende beheersing bij resterende blootstelling herkennen',
    'Een machineaanpassing vermindert het geluid duidelijk. Er blijft relevante blootstelling bestaan. Is het maatregelenproces automatisch afgerond?',
    'Nee. Beoordeel de resterende blootstelling en onderzoek passende aanvullende maatregelen. Een duidelijke verbetering bewijst nog geen voldoende beheersing. Een combinatie kan nodig zijn; dat betekent niet dat altijd alle vier niveaus nodig zijn.', [
      ['ja', 'Ja', false], ['nee', 'Nee', true],
    ]),
  question('NIEUW', 'TRUE_FALSE', 'Nieuwe risico’s', 2, 'Nieuwe risico’s van een maatregel meenemen',
    'Een mechanisch hulpmiddel vermindert handmatig tillen, maar introduceert knel- en aanrijdpunten. Is het hulpmiddel daarmee automatisch geschikt?',
    'Nee. Bekijk zowel de verminderde tilbelasting als de nieuwe knel- en aanrijdrisico’s. Dit is ook geen reden om het hulpmiddel automatisch af te wijzen: onderzoek of de totale werksituatie passend kan worden beheerst.', [
      ['ja', 'Ja', false], ['nee', 'Nee', true],
    ]),
  question('INSTRUCTIE', 'CASE_STUDY', 'Organisatorische maatregelen', 2, 'Instructie onderscheiden van bron- en technische maatregelen',
    'Medewerkers tillen dagelijks zware lasten. De enige maatregel is een jaarlijkse tilinstructie. Welke vervolgstap past het beste?',
    'Onderzoek bron- en technische mogelijkheden, zoals procesaanpassing of hulpmiddelen. Instructie kan nodig zijn, maar een getekende presentielijst, vaker herhalen of ervaren medewerkers inzetten bewijst geen voldoende beheersing van de tilbelasting.', [
      ['aanwezig', 'Controleer aanwezigheid bij de instructie en sluit de maatregel af.', false],
      ['vaker', 'Verhoog eerst de instructiefrequentie zonder het proces te onderzoeken.', false],
      ['hoger', 'Onderzoek of procesaanpassing of hulpmiddelen de belasting verminderen.', true],
      ['ervaren', 'Laat ervaren medewerkers tillen en gebruik ervaring als onderbouwing.', false],
    ]),
  question('PROCEDURE', 'TRUE_FALSE', 'Effectiviteit', 2, 'Een procedure niet gelijkstellen aan beheersing',
    '“We hebben een werkinstructie voor deze taak, dus het risico is beheerst.” Klopt deze redenering altijd?',
    'Nee. Bekijk het risico, het echte werk, begrijpelijkheid, naleving, toezicht en technische voorzieningen. Een procedure kan helpen, maar neemt het gevaar vaak niet weg. Alleen een document hebben bewijst niet dat het werkt.', [
      ['ja', 'Ja', false], ['nee', 'Nee', true],
    ]),
  question('NOORD-TILLEN', 'MULTI_CHOICE', 'Technische maatregelen', 3, 'Hogere maatregelen voor fysieke belasting onderzoeken',
    'Orderpickers van Logistiek Noord tillen meerdere uren per dienst. Tilhulpmiddelen zijn niet op alle relevante locaties beschikbaar. Welke maatregelen onderzoekt u vanuit de hiërarchie als eerste? Selecteer alle passende antwoorden.',
    'Proces- of opslagaanpassing kan tilhandelingen voorkomen of verminderen. Beschikbare en geschikte hulpmiddelen kunnen de belasting technisch beperken. Instructie kan aanvullen. Alleen een rugband voorschrijven vervangt het onderzoek naar deze hogere maatregelen niet.', [
      ['instructie', 'Medewerkers opnieuw instrueren over tiltechniek als primaire oplossing.', false],
      ['hulpmiddel', 'Geschikte mechanische hulpmiddelen beschikbaar maken waar wordt getild.', true],
      ['proces', 'Opslag of proces aanpassen zodat handmatig tillen wordt verminderd.', true],
      ['rugband', 'Medewerkers een rugband laten dragen als primaire oplossing.', false],
    ]),
  question('NOORD-VERKEER', 'CASE_STUDY', 'Technische maatregelen', 3, 'Afhankelijkheid van individueel gedrag vergelijken',
    'Heftrucks en voetgangers delen routes bij Logistiek Noord. Welke passende maatregel kan de ontmoetingen het meest onafhankelijk van dagelijks individueel gedrag beperken?',
    'Fysieke scheiding kan ontmoetingen voorkomen zonder dat iedereen telkens zelf afstand hoeft te houden. Snelheidsregels, instructie, vesten en markering kunnen aanvullen, maar zijn afhankelijker van gedrag. Onderzoek wel uitvoerbaarheid, kruisingen en nieuwe risico’s.', [
      ['regels', 'Snelheidsregels vastleggen en bestuurders extra instrueren.', false],
      ['scheiding', 'Verkeersstromen fysiek scheiden waar dit passend uitvoerbaar is.', true],
      ['vest', 'Voetgangers voorzien van opvallende waarschuwingsvesten.', false],
      ['markering', 'Looproutes markeren en medewerkers instrueren binnen de lijnen te blijven.', false],
    ]),
  question('EFFECT', 'SINGLE_CHOICE', 'Effectiviteit', 2, 'Uitvoering onderscheiden van daadwerkelijke werking',
    'Lokale afzuiging is geïnstalleerd. Op papier is de maatregel uitgevoerd. Wat moet vervolgens vooral worden vastgesteld?',
    'Controleer de werking bij de echte taken en de vermindering van blootstelling. Een factuur, opleverdatum of productbelofte bewijst die werking niet. Onderhoud en correct gebruik blijven nodig om het effect te behouden.', [
      ['factuur', 'Of factuur en opleverdatum volledig in het dossier zijn opgenomen.', false],
      ['werking', 'Of de afzuiging goed functioneert en het risico voldoende vermindert.', true],
      ['belofte', 'Of de productbeschrijving een gunstige afzuigcapaciteit vermeldt.', false],
      ['aanwezig', 'Of medewerkers weten dat de nieuwe installatie aanwezig is.', false],
    ]),
  question('CHECK-01', 'SINGLE_CHOICE', 'Bronaanpak', 2, 'De voorkeursrichting van de hiërarchie toepassen',
    'Wat is het belangrijkste uitgangspunt bij het onderzoeken van maatregelen?',
    'Onderzoek eerst hoe het gevaar zo hoog mogelijk, bij voorkeur bij de bron, kan worden voorkomen of verminderd. Snelheid, vertrouwdheid en aanschafkosten kunnen praktische vragen oproepen, maar vervangen de hiërarchische afweging niet.', [
      ['snel', 'Begin met wat snel invoerbaar is en beoordeel hogere opties later.', false],
      ['bekend', 'Begin met bekende oplossingen en pas de werkzaamheden daarop aan.', false],
      ['bron', 'Begin met voorkomen of verminderen bij de bron en onderzoek daarna verder.', true],
      ['kosten', 'Begin met de laagste aanschafkosten en voeg bescherming toe bij klachten.', false],
    ]),
  question('CHECK-02', 'SORTING', 'Maatregelenhiërarchie', 2, 'De didactische voorkeursvolgorde zelfstandig toepassen',
    'Zet de niveaus in de aangeleerde voorkeursvolgorde voor het onderzoeken van maatregelen.',
    'Bronaanpak staat voorop, gevolgd door technische/collectieve en organisatorische/individuele maatregelen, en waar nodig PBM. De precieze wettelijke uitwerking hangt af van het risico; de indeling is geen universele maatregelenscore.', [
      ['bron', 'Bronaanpak', true], ['technisch', 'Technische/collectieve maatregel', true],
      ['organisatie', 'Organisatorische/individuele maatregel', true], ['pbm', 'Persoonlijke beschermingsmiddelen', true],
    ]),
  question('CHECK-03', 'CASE_STUDY', 'PBM', 3, 'PBM afwegen tegenover mogelijke collectieve beheersing',
    'Een organisatie gebruikt uitsluitend PBM. Een technisch haalbare collectieve maatregel lijkt beschikbaar voor hetzelfde risico. Wat is de meest passende vervolgstap?',
    'Onderzoek of de collectieve maatregel passend en effectief is. PBM kunnen voorlopig of aanvullend nodig blijven. Betere PBM, goed draaggedrag of wachten op klachten vervangt dit onderzoek niet. Stop noodzakelijke bescherming niet zonder passende beheersing.', [
      ['beter', 'Verbeter alleen de PBM-selectie en houd de bestaande werkwijze aan.', false],
      ['collectief', 'Onderzoek de collectieve maatregel en behoud zo nodig aanvullende PBM.', true],
      ['dragen', 'Beperk het onderzoek tot correct dragen omdat PBM al beschikbaar zijn.', false],
      ['klachten', 'Wacht op klachten om te bepalen of de collectieve maatregel nodig is.', false],
    ]),
  question('CHECK-04', 'MULTI_CHOICE', 'Nieuwe risico’s', 3, 'Een voorgestelde maatregel in samenhang beoordelen',
    'Welke aspecten zijn relevant bij het beoordelen van een voorgestelde beheersmaatregel? Selecteer alle passende antwoorden.',
    'Onderzoek effectiviteit, nieuwe risico’s en betrouwbare toepassing bij het echte werk. De bestaande inkoopvoorkeur als doorslaggevend bewijs van risicobeheersing gebruiken is onvoldoende: gemak van inkopen toont geen werking aan.', [
      ['effect', 'De verwachte vermindering van het bedoelde risico.', true],
      ['nieuw', 'Mogelijke nieuwe of veranderde risico’s door de maatregel.', true],
      ['toepassing', 'Betrouwbare toepasbaarheid in de feitelijke werksituatie.', true],
      ['inkoop', 'De bestaande inkoopvoorkeur als doorslaggevend bewijs van beheersing.', false],
    ]),
  question('CHECK-05', 'CASE_STUDY', 'Combinatie van maatregelen', 3, 'Bron, techniek en aanvullende maatregelen in samenhang onderzoeken',
    'Bij Productiebedrijf Orion veroorzaakt een machine hoge geluidsbelasting. Componentvervanging, geluidsisolatie, kortere blootstelling en gehoorbescherming worden overwogen. Welke aanpak past het beste bij de hiërarchie?',
    'Onderzoek eerst bronaanpassing en technische beheersing; beoordeel het resterende risico en vul waar nodig aan. Alleen de kortste invoertijd, de bekende werkwijze of een administratieve afspraak als uitgangspunt nemen kan hogere beheersing overslaan.', [
      ['snel', 'Kies de snelst in te voeren optie en onderzoek de overige pas bij klachten.', false],
      ['bron', 'Onderzoek component en isolatie eerst; vul aan op basis van resterende blootstelling.', true],
      ['pbm', 'Optimaliseer eerst het dragen van PBM en beschouw de machine als vast gegeven.', false],
      ['duur', 'Verkort eerst de taakduur en gebruik de planning als bewijs van voldoende beheersing.', false],
    ]),
]

const objectives = ['De maatregelenhiërarchie herkennen', 'Bronmaatregelen herkennen', 'Technische/collectieve maatregelen herkennen',
  'Organisatorische/individuele maatregelen herkennen', 'PBM correct positioneren', 'STOP herkennen en uitleggen',
  'Maatregelen volgens voorkeursvolgorde onderzoeken', 'Herkennen dat één maatregel soms onvoldoende is',
  'Nieuwe risico’s door een maatregel herkennen', 'De effectiviteit van een maatregel beoordelen',
  'Uitleggen waarom instructie niet automatisch voldoende is', 'De overgang naar het Plan van Aanpak herkennen']
const paragraph = (title: string, ...paragraphs: string[]): LearningBlockSeed => ({ type: 'TEXT', data: { title, paragraphs } })
const callout = (label: string, title: string, body: string, items?: string[]): LearningBlockSeed => ({ type: 'CALLOUT', data: { label, title, body, ...(items ? { items } : {}) } })
const process = (title: string, steps: string[], footer: string): LearningBlockSeed => ({ type: 'PROCESS', data: { title, steps, footer } })
const exercise = (code: string, title: string): LearningBlockSeed => {
  const q = learningChapter5Questions.find((item) => item.code === `WL001-H5-${code}`)!
  return { type: q.type, questionCode: q.code, data: { title, prompt: q.questionText } }
}

export const learningChapter5Blocks: LearningBlockSeed[] = [
  { type: 'HEADING', data: { title: 'Maatregelen bepalen', eyebrow: 'Hoofdstuk 5 van 10', subtitle: 'Van een beoordeeld risico naar passende beheersing.', estimatedDurationLabel: '15–20 minuten', learningObjectives: objectives } },
  callout('LEERDOELEN', 'Na dit hoofdstuk kunt u', 'U onderzoekt maatregelen vanuit de hiërarchie en kijkt naar hun feitelijke effect.', objectives),
  exercise('OPENING', 'Dan geven we iedereen gehoorbescherming'),
  process('Van beoordelen naar beheersen', ['Risico gevonden', 'Risico beoordeeld', 'Prioriteit bepaald', 'Maatregelen onderzoeken', 'Maatregel(en) kiezen', 'Uitvoeren', 'Effect controleren'], 'H4 onderbouwde waarom een risico aandacht vraagt. Nu onderzoekt u hoe het kan worden beheerst. Alleen iets doen dat veiliger lijkt is onvoldoende: er is een voorkeursvolgorde.'),
  process('De maatregelenhiërarchie', ['Bron — gevaar voorkomen of verminderen', 'Technisch/collectief — blootstelling collectief voorkomen of beperken', 'Organisatorisch/individueel — blootstelling via organisatie of werkwijze beperken', 'PBM — de persoon beschermen'], 'Begin zo hoog mogelijk: dichter bij de oorzaak van het risico. Dit is een didactische hoofdstructuur, geen verplicht pakket van vier maatregelen voor iedere situatie.'),
  callout('WETTELIJKE EIS', 'Arbeidshygiënische strategie', 'De arbeidshygiënische strategie is het wettelijke uitgangspunt voor hiërarchische risicobeheersing waar van toepassing. Onderzoek bronaanpak en geef collectieve bescherming voorrang boven individuele bescherming. Specifieke risico’s hebben eigen wettelijke uitwerkingen en afwegingsruimte.'),
  callout('BRONAANPAK', 'Voorkomen of verminderen bij de oorzaak', 'Onderzoek of het gevaar kan worden voorkomen, verwijderd of bij de oorzaak verminderd. Volledige verwijdering is niet altijd technisch mogelijk.', [
    'Een schadelijk product vervangen door een minder schadelijk alternatief.', 'Een lawaaiige component vervangen.', 'Een gevaarlijke processtap anders ontwerpen.', 'Tilhandelingen voorkomen door procesaanpassing.', 'Werk op hoogte voorkomen door een passende veilige werklocatie.']),
  exercise('BRON', 'Een ander reinigingsproduct'),
  callout('TECHNISCH / COLLECTIEF', 'Blootstelling beperken', 'Als de bron niet voldoende kan worden aangepakt, onderzoek dan technische of collectieve beheersing. Deze beschermt vaak meerdere mensen en is doorgaans minder afhankelijk van individueel gedrag.', ['Machineafscherming of een gesloten systeem.', 'Lokale afzuiging of geluidsisolatie.', 'Een geschikt mechanisch tilhulpmiddel.', 'Fysieke scheiding van verkeersstromen.']),
  callout('ORGANISATORISCH / INDIVIDUEEL', 'Het werk anders organiseren', 'Organisatorische maatregelen kunnen noodzakelijk zijn, maar nemen het gevaar vaak niet weg. Taakroulatie is niet automatisch passend: beoordeel het risico en de feitelijke omstandigheden.', ['Toegang of blootstellingsduur beperken.', 'Werkzaamheden anders plannen.', 'Het aantal blootgestelde personen beperken.', 'Werkmethoden en taakorganisatie aanpassen.']),
  callout('PBM', 'Persoonlijke bescherming kan nodig zijn', 'Gehoorbescherming, veiligheidsbrillen, geschikte handschoenen, ademhalingsbescherming en waar passend persoonlijke valbeveiliging kunnen belangrijk zijn. Onderzoek eerst hogere maatregelen; behoud noodzakelijke bescherming tijdens dat onderzoek.', ['Juiste selectie en waar relevant pasvorm.', 'Correct gebruik en begrijpelijke instructie.', 'Beschikbaarheid, onderhoud en tijdige vervanging.']),
  exercise('ORDENEN', 'Maatregelen ordenen'),
  callout('METHODIEK', 'STOP: dezelfde hiërarchische gedachte', 'STOP is een praktische uitwerking van de maatregelenhiërarchie, onder meer bij gevaarlijke stoffen. Het is geen concurrerend tweede systeem naast de arbeidshygiënische strategie.', ['S — Substitutie', 'T — Technische maatregelen', 'O — Organisatorische maatregelen', 'P — Persoonlijke beschermingsmiddelen']),
  exercise('STOP', 'Een gesloten doseersysteem'),
  exercise('PBM', 'Waarom niet meteen PBM?'),
  callout('VERDIEPING', 'Specifieke stoffen, strengere voorschriften', 'Voor bepaalde gevaarlijke stoffen, waaronder kankerverwekkende, mutagene en reprotoxische stoffen (CMR), gelden nadere voorschriften voor vervanging en beheersing. De algemene hiërarchie betekent dus niet dat iedere situatie dezelfde afwegingsruimte heeft. Dit hoofdstuk werkt die specialistische regels niet uit.'),
  callout('WETTELIJKE EIS', 'Een lagere stap onderbouwen', 'Wat redelijkerwijs mogelijk is, hangt af van de concrete situatie en toepasselijke voorschriften. Een lagere stap kiezen moet inhoudelijk onderbouwd kunnen worden. “De hogere maatregel is duurder” is niet automatisch voldoende. Voor specifieke risico’s kunnen strengere regels gelden.'),
  exercise('COMBINATIE', 'Eén maatregel is niet altijd genoeg'),
  callout('GOEDE PRAKTIJK', 'Maatregelen kunnen elkaar aanvullen', 'Bronaanpassing + technische beheersing + organisatorische maatregelen + waar nodig PBM kunnen samen nodig zijn. Onderzoek welke combinatie past; niet iedere situatie vraagt alle vier niveaus.'),
  callout('GOEDE PRAKTIJK', 'Vier vragen over effectiviteit', 'Een gekozen maatregel moet in de praktijk het bedoelde effect hebben.', ['Werkt het technisch zoals bedoeld?', 'Wordt het daadwerkelijk toegepast?', 'Vermindert het het risico voldoende?', 'Ontstaan nieuwe of veranderde risico’s?']),
  exercise('NIEUW', 'Een hulpmiddel met nieuwe risico’s'),
  exercise('INSTRUCTIE', 'Is jaarlijkse tilinstructie voldoende?'),
  exercise('PROCEDURE', 'Procedure is niet automatisch beheersing'),
  paragraph('Logistiek Noord — van beoordeling naar maatregelen', 'In H4 onderzocht u de omstandigheden rond tillen en intern transport. Nu vergelijkt u mogelijke maatregelen. Het doel is hogere maatregelen te onderzoeken, niet op basis van deze korte casus een definitieve oplossing voor te schrijven.'),
  exercise('NOORD-TILLEN', 'Logistiek Noord — fysieke belasting'),
  exercise('NOORD-VERKEER', 'Logistiek Noord — aanrijdgevaar'),
  callout('GOEDE PRAKTIJK', 'Maatregelen vergelijken', 'Gebruik deze vragen bij het onderzoeken van opties; dit is geen wettelijke beslismatrix.', ['Effectiviteit — hoeveel vermindert het bedoelde risico?', 'Hiërarchie — wordt de bron aangepakt of blijft bescherming afhankelijk van gedrag?', 'Nieuwe risico’s — welke andere gevaren ontstaan?', 'Toepasbaarheid — past de maatregel betrouwbaar bij het werk?', 'Borging — kan hij worden onderhouden, toegepast en gecontroleerd?']),
  callout('METHODIEK', 'Geen universele maatregelenscore', 'De hiërarchie geeft een voorkeursrichting. Zij levert geen puntenstelsel waarmee een bronmaatregel of PBM automatisch een vast cijfer krijgt. Onderbouw de keuze met de feiten en toepasselijke voorschriften.'),
  exercise('EFFECT', 'Uitgevoerd is niet automatisch effectief'),
  paragraph('Risicobeheersing stopt niet bij installatie', 'Afzuiging, machineafscherming, tilhulpmiddelen, PBM en verkeersafscheidingen kunnen effect verliezen door slijtage, verkeerd gebruik of gebrekkig onderhoud.', 'Controleer en onderhoud waar nodig, en kijk of de maatregel bij het feitelijke werk blijft passen.'),
  process('Terug naar het resterende risico', ['Risico', 'Maatregel(en)', 'Effect controleren', 'Resterend risico', 'Voldoende beheerst?'], 'Na maatregelen kan restrisico overblijven. Beoordeel opnieuw of aanvullende beheersing nodig is. Daarmee sluit H5 aan op H4.'),
  paragraph('Een gekozen maatregel organiseren', 'Wat gaan we doen, wie zorgt dat het gebeurt, wanneer moet het gebeuren en hoe volgen we de voortgang?', 'Deze organisatie en opvolging horen in het Plan van Aanpak. In H6 leert u gekozen maatregelen naar concrete acties te vertalen.'),
  process('Van maatregel naar Plan van Aanpak', ['Risico', 'Beoordeling', 'Maatregel bepalen', 'Plan van Aanpak', 'Uitvoeren', 'Controleren'], 'H4: het risico beoordelen. H5: maatregelen onderzoeken en kiezen. H6: de gekozen maatregelen vertalen naar concrete acties.'),
  { type: 'SUMMARY', data: { title: 'Dit neemt u mee', items: ['Begin zo hoog mogelijk in de maatregelenhiërarchie.', 'Onderzoek bronaanpak.', 'Technische/collectieve maatregelen zijn doorgaans minder afhankelijk van individueel gedrag.', 'Organisatorische maatregelen kunnen nodig zijn maar nemen het gevaar vaak niet weg.', 'PBM kunnen noodzakelijk zijn en staan lager in de hiërarchie.', 'STOP volgt dezelfde hiërarchische gedachte.', 'Combinaties van maatregelen kunnen nodig zijn.', 'Beoordeel nieuwe risico’s.', 'Controleer de feitelijke effectiviteit.', 'Kijk naar het resterende risico.', 'Leg gekozen maatregelen vast en volg ze op.'] } },
  { type: 'HEADING', data: { title: 'Hoofdstukcheck', subtitle: 'Vijf formatieve oefenvragen. Doorloop alle vragen; fouten verhinderen de afronding niet. Dit is geen examen of certificering.' } },
  exercise('CHECK-01', 'Begin bij de oorzaak'), exercise('CHECK-02', 'De voorkeursvolgorde'),
  exercise('CHECK-03', 'Een collectieve maatregel naast PBM'), exercise('CHECK-04', 'Een maatregel beoordelen'),
  exercise('CHECK-05', 'Productiebedrijf Orion'),
]
