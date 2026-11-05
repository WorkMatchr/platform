import { wl002RemediatedCourseBundle as checkpoint } from './wl002-content-v1-1'
import { validateAcademyBundle } from './academy-content-standard'
import type { ChoiceRevision } from './wl002-assessments-v1-1'

// Closing review of the previously unchanged retention items. v1.1 was already
// imported as DRAFT in the isolated environment and remains fully reproducible.
const revisions: Record<number, ChoiceRevision> = {
  22: ['Plaats, taak en feitelijk gebruik van de doorgang beschrijven.', ['De kabel als oorzaak registreren zonder het gebruik van de doorgang te bekijken.', 'De notitie beperken tot een foto zonder taakcontext of moment.', 'Een algemene score uit de checklist overnemen zonder de situatie te beschrijven.']],
  23: ['Piekbelasting en afwijkende diensten kunnen buiten beeld blijven.', ['De rustige dagdienst als representatief beschouwen omdat dezelfde middelen worden gebruikt.', 'Een complete checklist als bewijs voor iedere dienst gebruiken.', 'De uitkomsten zonder aanvullende waarneming naar onderhoudswerk uitbreiden.']],
  27: [['Bevindingen met betrokkenen verduidelijken.', 'Beoordeling en vervolg met verantwoordelijken afspreken.'], ['De ronde afronden zodra de rapportage is verzonden.', 'Iedere bevinding dezelfde prioriteit geven zonder risicoafweging.']],
  30: ['De feiten en werkcontext gezamenlijk verduidelijken.', ['De betwiste bevinding verwijderen voordat het verschil in waarneming is onderzocht.', 'De foto zonder aanvullende context als doorslaggevend bewijs gebruiken.', 'De ervaring van de observator als voldoende reden voor de conclusie nemen.']],
  34: ['Waar loopt u bij deze handeling in de praktijk tegenaan?', ['U heeft de hulpmiddelen toch beschikbaar gekregen?', 'Kunt u bevestigen dat de instructie voldoende duidelijk was?', 'Zou een herhaling van dezelfde uitleg het probleem voor u oplossen?']],
  42: [['De veilige handeling demonstreren.', 'Passend begeleid oefenen.', 'Het handelen bij storingen bespreken.'], ['Na algemene uitleg zelfstandig laten starten zonder beheersing na te gaan.']],
  47: [['Geschikte hulpmiddelen beschikbaar maken.', 'Werkafspraken en passend toezicht organiseren.'], ['Uit een ondertekende instructie afleiden dat middelen steeds bereikbaar zijn.', 'Dezelfde veilige uitvoerbaarheid bij ieder werktempo veronderstellen.']],
  49: ['De term verbinden aan de concrete veilige handeling en begrip nagaan.', ['De term handhaven en begrip uitsluitend uit het ontbreken van vragen afleiden.', 'Het woord schrappen zonder uit te leggen welke veiligheidsbetekenis behouden moet blijven.', 'Een leesbevestiging als voldoende controle op de vakterm gebruiken.']],
  52: [['Een eigenaar voor het dagelijkse beheer.', 'Afspraken over onderhoud en controle.', 'Opvolging van afwijkingen.'], ['De afgeronde investeringsaanvraag als volledige beheerafspraak gebruiken.']],
  53: ['Beschikbaarheid en geschiktheid voor de werkelijke taken onderzoeken.', ['Een nieuwe instructie plannen zonder de praktische bruikbaarheid te bekijken.', 'Het leveringsbewijs als voldoende effectcontrole nemen.', 'Het bestaande middel vervangen voordat het gebruiksprobleem is verduidelijkt.']],
  57: [['Doel, gebruik en beperkingen uitleggen.', 'Een aanspreekpunt voor praktische problemen afspreken.'], ['Het projectarchief als enige overdracht aan het team beschouwen.', 'Beheerverantwoordelijkheid veronderstellen zonder die met het team af te spreken.']],
  58: ['Ook de nieuwe risico’s en neveneffecten onderzoeken.', ['De evaluatie beperken tot de oorspronkelijk bedoelde verbetering.', 'Het nieuwe knelpunt bewaren voor een vaste evaluatiedatum zonder de urgentie te beoordelen.', 'Het oorspronkelijke effect als voldoende compensatie voor ieder neveneffect zien.']],
  60: ['Beoordelen of de oplossing ook bij andere taken en gebruikers past.', ['De uitkomst zonder taakvergelijking naar alle locaties overnemen.', 'Een succesvolle demonstratie als bewijs voor iedere dienst gebruiken.', 'Dezelfde productnaam als voldoende onderbouwing voor gelijk effect nemen.']],
  62: [['Werk- en blootstellingsvragen afbakenen.', 'Onnodige medische gegevens buiten de preventierapportage houden.'], ['Een lijst individuele diagnoses als standaardbasis voor het preventieoverleg gebruiken.', 'De preventiemedewerker medische oorzaken laten vaststellen voordat taken worden besproken.']],
  67: [['Advies en beslissingsverantwoordelijkheid onderscheiden.', 'Terugkoppeling over vervolgacties afspreken.'], ['Een adviesrapport zonder besluit als uitvoeringsopdracht behandelen.', 'De rapporteur automatisch verantwoordelijk maken voor elk uitvoeringsbesluit.']],
  72: [['Onvoldoende informatie over schadelijke blootstelling.', 'Complexe technische beveiligingsvragen.'], ['Een afgesproken actie waarvan alleen de administratieve eigenaar moet worden bevestigd.', 'Een bekende overlegafspraak die in de agenda moet worden verwerkt.']],
  76: ['Of aantoonbare expertise bij het risico en de concrete vraag past.', ['Of de algemene functietitel voor iedere onderzochte situatie volstaat.', 'Of een standaardrapport zonder taakgegevens kan worden geleverd.', 'Of de adviseur de eerder gewenste conclusie vooraf wil bevestigen.']],
  79: ['Doel, onderzoeksscope en vereiste deskundigheid onderscheiden.', ['De externe afzender als bewijs nemen dat beide activiteiten gelijkwaardig zijn.', 'De handtekening als voldoende bewijs voor formele toetsing beschouwen.', 'Een werkplekrondgang zonder scopecontrole in de plaats van de vereiste toets gebruiken.']],
  81: ['Actuele risico’s, open acties en relevante veranderingen gebruiken.', ['De vaste vergadercyclus leidend maken zonder risico’s of acties te verbinden.', 'De agenda vullen vanuit de vorige training zonder nieuwe behoeften te onderzoeken.', 'De beschikbaarheid van de adviseur als enige planningsbasis nemen.']],
  82: [['Voortgang van PvA-acties.', 'Werking van genomen maatregelen.', 'Nieuwe signalen en veranderingen in het werk.'], ['Verstuurde instructieberichten als zelfstandig bewijs voor risicoreductie tellen.']],
  86: ['De gevolgen van de verbouwing in risico’s en planning verwerken.', ['De bestaande jaarkalender handhaven zonder de wijziging inhoudelijk te beoordelen.', 'De verbouwing pas voor de volgende jaarcyclus meenemen.', 'Uit de goedgekeurde planning afleiden dat tussentijds geen beoordeling nodig is.']],
  87: [['Instelling en toepassing passend controleren.', 'Nieuwe gebruikers via inwerkafspraken instrueren.'], ['De aanschafregistratie als voldoende borging voor iedere gebruiker gebruiken.', 'Beheer uitstellen totdat een nieuwe gebruiker een probleem meldt.']],
  88: ['De uitvoeringsbelemmering en het benodigde besluit bespreken.', ['Een nieuwe datum vastleggen zonder de oorzaak van herhaald uitstel te onderzoeken.', 'De oude score handhaven als reden om de vertraging niet te bespreken.', 'De actie bij de melder beleggen zonder diens taak of middelen af te stemmen.']],
  90: ['Bij nieuwe relevante informatie over risico’s of de werking van bescherming.', ['Pas bij de volgende vaste jaarevaluatie, ongeacht tussentijdse wijzigingen.', 'Alleen nadat een externe adviseur de nieuwe informatie heeft bevestigd.', 'Na administratieve afsluiting geen nieuwe beoordeling van dezelfde taak meer starten.']],
  92: [['Risico’s en ontbrekende informatie onderzoeken.', 'Maatregelen uitvoeren en hun werking evalueren.', 'Opvolging en actualisatie organiseren.'], ['Het adviesrapport als eindpunt gebruiken zonder uitvoering en effect te beoordelen.']],
  97: [['Werksignalen verbinden met actuele risico-informatie.', 'Uitvoering, effectcontrole en benodigde besluiten samenbrengen.'], ['Het aantal verstuurde berichten als voldoende prestatiebeeld gebruiken.', 'De administratieve projectstatus zonder gebruikerservaringen als eindbeoordeling nemen.']],
  98: ['De vraag afbakenen, expertise regelen en tussentijdse bescherming volgen.', ['Het bestaande oordeel ongewijzigd laten zolang geen specialistisch rapport beschikbaar is.', 'De nieuwe taak zonder inhoudelijke vergelijking onder de oude beoordeling plaatsen.', 'Alleen de meest ervaren gebruiker laten bepalen dat geen vervolgonderzoek nodig is.']],
}
const bundle = structuredClone(checkpoint)
bundle.courseVersion='WL-002-COURSE-1.2';bundle.examVersion='WL-002-EXAM-1.2'
bundle.definition.retention.programVersion='WL-002-RETENTION-1.2'
bundle.definition.retention.bankVersion='WL-002-RETENTION-1.2'
bundle.definition.retention.annualCheckVersion='WL-002-ANNUAL-CHECK-1.2'
for (const question of [...bundle.chapters.flatMap((chapter)=>chapter.questions),...bundle.examQuestions,...bundle.retentionQuestions]) question.version=3
for (const [index,question] of bundle.retentionQuestions.entries()) {
  const revision=revisions[index+1];if(!revision)continue
  const correct=typeof revision[0]==='string'?[revision[0]]:revision[0]
  if(correct.length!==question.correctAnswer.length||revision[1].length!==question.options.length-correct.length)throw new Error(`WL002_FINAL_CARDINALITY:${question.code}`)
  let right=0,wrong=0
  question.options=question.options.map((option)=>({...option,text:option.isCorrect?correct[right++]:revision[1][wrong++]}))
}
export const wl002RemediatedCourseBundle=validateAcademyBundle(bundle)
