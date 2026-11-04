import { createAcademyDefinition } from './academy-course-definition'
import { validateAcademyBundle, type AcademyCourseBundle, type AcademyQuestion } from './academy-content-standard'
import { wl002Curriculum } from './wl002-curriculum'
import { wl002ExamQuestions, wl002RetentionQuestions } from './wl002-question-bank'

const definition = createAcademyDefinition({ code: 'WL-002', slug: 'preventiemedewerker-in-de-praktijk', title: 'Preventiemedewerker in de praktijk', subtitle: 'Van wettelijke taak naar dagelijkse praktijk.' })

export const wl002CourseBundle: AcademyCourseBundle = validateAcademyBundle({
  formatVersion: 1, definition, courseVersion: 'WL-002-COURSE-1.0', examVersion: 'WL-002-EXAM-1.0',
  description: 'Praktische opleiding voor aankomende en bestaande preventiemedewerkers, werkgevers en leidinggevenden. Van wettelijke taken en RI&E tot rondgangen, samenwerking, deskundigheid, uitvoering en borging. Zelfstandig te volgen zonder verplichte WL-001-vooropleiding.',
  contentStatus: 'DRAFT', reviewFlags: ['CONTENT REVIEW REQUIRED — LEGAL', 'ASSESSMENT VALIDATION REQUIRED'], checkedAt: '2026-10-24',
  sources: [
    { id: 'arbo13', title: 'Arboportaal — wettelijke positie en taken preventiemedewerker', url: 'https://www.arboportaal.nl/onderwerpen/ondersteuning-bij-arbowet/preventiemedewerker/wat-zegt-de-wet-over-de-preventiemedewerker', status: 'CHECKED', scope: 'Artikel 13, deskundigheid, taken, tijd en middelen, medezeggenschap en kleine werkgever. Formele juridische review blijft vereist.' },
    { id: 'arbo8', title: 'Arbowet — artikel 8 voorlichting en onderricht', url: 'https://wetten.overheid.nl/BWBR0010346/', status: 'MANUAL_REVIEW_REQUIRED', scope: 'Primaire wettelijke bron; directe raadpleging door HTTP 429 beperkt. Toets actuele geconsolideerde tekst formeel vóór publicatie.' },
    { id: 'rie', title: 'Ondernemersplein — risico-inventarisatie en -evaluatie voor personeel', url: 'https://ondernemersplein.overheid.nl/wetten-en-regels/risico-inventarisatie-rie-voor-personeel/', status: 'CHECKED', scope: 'RI&E, Plan van Aanpak, actualisatie en voorwaardelijke toetsingsuitzonderingen; geen algemene vijfjaarsgeldigheid.' },
    { id: 'inspectie', title: 'Nederlandse Arbeidsinspectie — RI&E en Plan van Aanpak', url: 'https://www.nlarbeidsinspectie.nl/onderwerpen/arbeidsomstandighedenwet/risico-inventarisatie-evaluatie-en-plan-van-aanpak', status: 'CHECKED', scope: 'Risico-informatie verbinden aan maatregelen en uitvoering. Rondgangen zijn geen automatische formele toetsing.' },
    { id: 'ser', title: 'SER — handreiking preventiemedewerker', url: 'https://www.ser.nl/-/media/ser/downloads/overige-publicaties/2020/preventiemedewerker-handreiking.pdf', status: 'MANUAL_REVIEW_REQUIRED', scope: 'Aanvullende reviewbron voor praktische positie en samenwerking; geen onbeperkte ontslagbescherming afleiden.' },
  ],
  chapters: wl002Curriculum.map((chapter, chapterIndex) => {
    const position = chapterIndex + 1
    const questions: AcademyQuestion[] = chapter.exercises.map((questionText, index) => {
      const concept = wl002RetentionQuestions[chapterIndex * 10 + index]
      return { ...concept, code: `WL002-H${position}-Q${String(index + 1).padStart(2, '0')}`, questionText, cognitiveLevel: index < 6 ? 'T' : 'A', difficulty: index < 6 ? 2 : 3,
        explanation: `${concept.explanation}${index < 6 ? ` Toepassing: ${chapter.lessons[index].application}` : ''}` }
    })
    const blocks: AcademyCourseBundle['chapters'][number]['blocks'] = [
      { code: `H${position}-intro`, type: 'HEADING', data: { eyebrow: `WL-002 · Hoofdstuk ${position}`, title: chapter.title, body: chapter.introduction } },
      { code: `H${position}-objectives`, type: 'CALLOUT', data: { label: 'Leerdoelen', title: 'Na dit hoofdstuk kunt u', items: chapter.objectives } },
      { code: `H${position}-law`, type: 'CALLOUT', data: { label: 'Wet en praktijk', title: 'Houd verplichting en aanbeveling uit elkaar', body: chapter.legalContext } },
    ]
    for (const [index, lesson] of chapter.lessons.entries()) {
      blocks.push(
        { code: `H${position}-L${index + 1}-explanation`, type: 'TEXT', data: { title: lesson.title, paragraphs: lesson.explanation.split('\n') } },
        { code: `H${position}-L${index + 1}-case`, type: 'CALLOUT', data: { label: 'Praktijkcasus', title: lesson.title, body: lesson.practice } },
        { code: `H${position}-L${index + 1}-application`, type: 'TEXT', data: { title: 'Van inzicht naar handelen', paragraphs: [lesson.application] } },
        { code: `H${position}-L${index + 1}-exercise`, type: questions[index].type, data: { title: 'Pas toe', prompt: questions[index].questionText }, questionCode: questions[index].code },
      )
    }
    blocks.push({ code: `H${position}-summary`, type: 'SUMMARY', data: { title: 'Wat neemt u mee?', items: chapter.summary } },
      { code: `H${position}-check-intro`, type: 'HEADING', data: { title: 'Hoofdstukcheck', body: 'Pas de principes zelfstandig toe. U krijgt na beantwoording uitleg; deze oefeningen zijn geen eindtoets.' } })
    for (const question of questions.slice(6)) blocks.push({ code: `${question.code}-block`, type: question.type, data: { title: 'Hoofdstukcheck', prompt: question.questionText }, questionCode: question.code })
    return { position, title: chapter.title, slug: `hoofdstuk-${position}`, estimatedMinutes: 25, objectives: chapter.objectives, blocks, questions, chapterCheckCodes: questions.slice(6).map((question) => question.code) }
  }),
  examQuestions: wl002ExamQuestions, retentionQuestions: wl002RetentionQuestions,
})
