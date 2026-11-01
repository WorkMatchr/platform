import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  database: vi.fn(() => { throw new Error('UNEXPECTED_DATABASE_ACCESS') }),
  user: vi.fn(() => { throw new Error('UNEXPECTED_SESSION_ACCESS') }),
  guidePage: vi.fn(() => { throw new Error('UNEXPECTED_GUIDE_ACCESS') }),
  guideApi: vi.fn(() => { throw new Error('UNEXPECTED_GUIDE_ACCESS') }),
}))

vi.mock('@/lib/prisma', () => ({ getPrisma: mocks.database }))
vi.mock('@/lib/authorization', () => ({ requireUser: mocks.user }))
vi.mock('@/lib/arbo-guides/arbo-guide-access', () => ({
  getArboGuidePageAccess: mocks.guidePage,
  getArboGuideApiAccess: mocks.guideApi,
}))
vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('NOT_FOUND') },
  redirect: (path: string) => { throw new Error(`NEXT_REDIRECT:${path}`) },
}))

import LearningHome from '@/app/e-learnings/page'
import LearningCatalog from '@/app/e-learnings/aanbod/page'
import MyLearning from '@/app/e-learnings/mijn/page'
import LearningCourse from '@/app/e-learnings/[courseSlug]/page'
import LearningChapter from '@/app/e-learnings/[courseSlug]/leren/[chapterSlug]/page'
import ExamLanding from '@/app/e-learnings/[courseSlug]/eindtoets/page'
import ExamAttempt from '@/app/e-learnings/[courseSlug]/eindtoets/[attemptId]/page'
import ExamResult from '@/app/e-learnings/[courseSlug]/eindtoets/resultaat/[attemptId]/page'
import RetentionProgram from '@/app/e-learnings/[courseSlug]/kennisbehoud/page'
import WeeklyRetention from '@/app/e-learnings/[courseSlug]/kennisbehoud/week/[checkId]/page'
import AnnualRetention from '@/app/e-learnings/[courseSlug]/kennisbehoud/jaarlijks/page'
import CertificateName from '@/app/e-learnings/certificaat/gegevens/page'
import PublicCertificate from '@/app/certificaat/[code]/page'
import { GET as certificatePdf } from '@/app/api/learning/certificates/[certificateId]/pdf/route'
import { completeLearningChapterAction, finishLearningBlockAction, startLearningCourseAction, submitLearningAnswerAction } from '@/app/e-learnings/actions'
import { saveFinalExamAnswerAction, startFinalExamAction, submitFinalExamAction, updateFinalExamPositionAction } from '@/app/e-learnings/exam-actions'
import { answerAnnualRetentionQuestionAction, answerRetentionQuestionAction, setAnnualReminderConsentAction, startRetentionParticipationAction, stopRetentionParticipationAction } from '@/app/e-learnings/retention-actions'
import { saveCertificateNameAction } from '@/app/e-learnings/certificaat/actions'
import ExpandedGuide from '@/app/wijzers/compliance/v2/page'
import { POST as saveExpandedGuide } from '@/app/wijzers/compliance/v2/runs/route'

const id = '00000000-0000-4000-8000-000000000001'
const courseSlug = 'rie-in-de-praktijk'
const params = Promise.resolve({ courseSlug, chapterSlug: 'waarom-een-rie', attemptId: id, checkId: id })
const searchParams = Promise.resolve({})
function formData() {
  const form = new FormData()
  form.set('courseSlug', courseSlug)
  form.set('firstName', 'Synthetisch')
  form.set('lastName', 'Voorbeeld')
  form.set('consent', 'yes')
  return form
}

// Use real route/action entry points and the real server-owned gates. Valid input
// ensures an early input rejection cannot masquerade as featuregate protection.
const learningEntrypoints: Array<[string, () => Promise<unknown>]> = [
  ['home', () => LearningHome()],
  ['catalogus', () => LearningCatalog()],
  ['mijn cursussen', () => MyLearning()],
  ['cursus', () => LearningCourse({ params })],
  ['hoofdstuk', () => LearningChapter({ params, searchParams })],
  ['eindtoets', () => ExamLanding({ params, searchParams })],
  ['toetspoging', () => ExamAttempt({ params })],
  ['toetsresultaat', () => ExamResult({ params })],
  ['kennisbehoud', () => RetentionProgram({ params })],
  ['weekcheck', () => WeeklyRetention({ params })],
  ['jaarcheck', () => AnnualRetention({ params })],
  ['certificaatnaam', () => CertificateName({ searchParams })],
  ['publiek certificaat', () => PublicCertificate({ params: Promise.resolve({ code: 'WM-RIE-2026-0123456789ABCDEF01234567' }) })],
  ['certificaat-PDF API', () => certificatePdf(new Request('https://example.invalid/api/learning/certificates/' + id + '/pdf'), { params: Promise.resolve({ certificateId: id }) })],
  ['cursus starten', () => startLearningCourseAction(formData())],
  ['blok afronden', () => finishLearningBlockAction(id)],
  ['oefenantwoord', () => submitLearningAnswerAction(id, ['A'])],
  ['hoofdstuk afronden', () => completeLearningChapterAction(id)],
  ['toets starten', () => startFinalExamAction(courseSlug)],
  ['toetsantwoord', () => saveFinalExamAnswerAction(id, id, ['A'])],
  ['toetspositie', () => updateFinalExamPositionAction(id, 1)],
  ['toets inleveren', () => submitFinalExamAction(id)],
  ['jaarcheckantwoord', () => answerAnnualRetentionQuestionAction(1, ['A'])],
  ['kennisbehoud starten', () => startRetentionParticipationAction(formData())],
  ['weekcheckantwoord', () => answerRetentionQuestionAction({ participationId: id, checkId: id, weeklyQuestionId: id, answer: ['A'] })],
  ['kennisbehoud stoppen', () => stopRetentionParticipationAction(id)],
  ['jaartoestemming', () => setAnnualReminderConsentAction(true)],
  ['certificaatnaam opslaan', () => saveCertificateNameAction(formData())],
]

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.unstubAllEnvs())

describe.each([undefined, '', 'false', 'TRUE', '1'])('gesloten featuregates (%s)', value => {
  beforeEach(() => {
    vi.stubEnv('LEARNING_RUNTIME_ENABLED', value)
    vi.stubEnv('COMPLIANCE_F4_ENABLED', value)
  })

  it.each(learningEntrypoints)('blokkeert Learning %s vóór sessie/database', async (_name, invoke) => {
    await expect(invoke()).rejects.toThrow('NOT_FOUND')
    expect(mocks.user).not.toHaveBeenCalled()
    expect(mocks.database).not.toHaveBeenCalled()
  })

  it('blokkeert de F4-pagina vóór autorisatie/database', async () => {
    await expect(ExpandedGuide()).rejects.toThrow('NOT_FOUND')
    expect(mocks.guidePage).not.toHaveBeenCalled()
    expect(mocks.database).not.toHaveBeenCalled()
  })

  it('blokkeert de F4-API vóór autorisatie, bodyverwerking en database', async () => {
    const request = new Request('https://example.invalid/wijzers/compliance/v2/runs', { method: 'POST', body: '{' })
    const response = await saveExpandedGuide(request)
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ saved: false })
    expect(request.bodyUsed).toBe(false)
    expect(mocks.guideApi).not.toHaveBeenCalled()
    expect(mocks.database).not.toHaveBeenCalled()
  })
})
