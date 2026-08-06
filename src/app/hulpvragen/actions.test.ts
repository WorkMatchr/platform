import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  createIntake: vi.fn(),
  saveIntakeStep: vi.fn(),
  markReady: vi.fn(),
  reopenIntake: vi.fn(),
  archiveIntake: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  getIntakeDetail: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('@/lib/authorization', () => ({ requireUser: mocks.requireUser }))
vi.mock('@/lib/intakes/intake-service', () => ({
  createIntake: mocks.createIntake,
  saveIntakeStep: mocks.saveIntakeStep,
  markIntakeReadyForReview: mocks.markReady,
  reopenIntake: mocks.reopenIntake,
  archiveIntake: mocks.archiveIntake,
}))
vi.mock('@/lib/intakes/intake-query-service', () => ({ getIntakeDetail: mocks.getIntakeDetail }))

import { IntakeServiceError } from '@/lib/intakes/intake-errors'
import {
  createIntakeAction,
  markIntakeReadyForReviewAction,
  saveIntakeStepAction,
} from './actions'

const userId = '00000000-0000-4000-8000-000000000001'
const organizationId = '00000000-0000-4000-8000-000000000002'
const intakeId = '00000000-0000-4000-8000-000000000003'
const textQuestionId = '00000000-0000-4000-8000-000000000004'
const multiQuestionId = '00000000-0000-4000-8000-000000000005'
const booleanQuestionId = '00000000-0000-4000-8000-000000000006'
const categoryQuestionId = '00000000-0000-4000-8000-000000000007'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireUser.mockResolvedValue({ id: userId })
  mocks.createIntake.mockResolvedValue({ id: intakeId })
  mocks.saveIntakeStep.mockResolvedValue({ id: intakeId, version: 2 })
  mocks.markReady.mockResolvedValue({ id: intakeId, version: 3 })
  mocks.getIntakeDetail.mockResolvedValue({
    questionnaireVersion: 2,
    freeText: 'Wij hebben een algemene vraag over veilig werken.',
    questions: [],
  })
})

function stepFormData() {
  const formData = new FormData()
  formData.set('intakeId', intakeId)
  formData.set('category', 'HELP_REQUEST')
  formData.set('expectedIntakeVersion', '1')
  for (const questionId of [textQuestionId, multiQuestionId, booleanQuestionId]) {
    formData.append('questionId', questionId)
  }
  formData.append('multiQuestionId', multiQuestionId)
  formData.append('booleanQuestionId', booleanQuestionId)
  formData.set(`answer-${textQuestionId}`, 'Reeds ingevulde hulpvraag met voldoende lengte.')
  formData.append(`answer-${multiQuestionId}`, 'option-1')
  formData.append(`answer-${multiQuestionId}`, 'option-2')
  formData.set(`answer-${booleanQuestionId}`, 'false')
  return formData
}

describe('intake Server Actions', () => {
  it('controleert de gebruiker vóór intakeaanmaak en navigeert na succes', async () => {
    const formData = new FormData()
    formData.set('organizationId', organizationId)
    formData.set('freeText', 'Wij hebben ondersteuning nodig bij veilig werken.')

    await createIntakeAction({}, formData)

    expect(mocks.requireUser).toHaveBeenCalledOnce()
    expect(mocks.createIntake).toHaveBeenCalledWith(userId, organizationId, {
      freeText: 'Wij hebben ondersteuning nodig bij veilig werken.',
    })
    expect(mocks.requireUser.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.createIntake.mock.invocationCallOrder[0],
    )
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/hulpvragen')
    expect(mocks.redirect).toHaveBeenCalledWith(`/hulpvragen/${intakeId}`)
  })

  it('behoudt vrije tekst en toont de veldfout wanneer aanmaken mislukt', async () => {
    mocks.createIntake.mockRejectedValue(
      new IntakeServiceError('VALIDATION_ERROR', 'Controleer de hulpvraag.', [
        { questionId: textQuestionId, questionKey: 'HELP_REQUEST_DESCRIPTION', message: 'Gebruik minimaal 20 tekens.' },
      ]),
    )
    const formData = new FormData()
    formData.set('organizationId', organizationId)
    formData.set('freeText', 'Te kort')

    const result = await createIntakeAction({}, formData)

    expect(result.values).toEqual({ freeText: 'Te kort' })
    expect(result.errors?.freeText).toContain('Gebruik minimaal 20 tekens.')
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it('behoudt tekst, meerkeuze en booleanwaarden na een veldfout', async () => {
    mocks.saveIntakeStep.mockRejectedValue(
      new IntakeServiceError('VALIDATION_ERROR', 'Controleer de gemarkeerde velden.', [
        { questionId: textQuestionId, message: 'Gebruik minimaal 20 tekens.' },
      ]),
    )

    const result = await saveIntakeStepAction({}, stepFormData())

    expect(result.values).toEqual({
      [textQuestionId]: 'Reeds ingevulde hulpvraag met voldoende lengte.',
      [multiQuestionId]: ['option-1', 'option-2'],
      [booleanQuestionId]: false,
    })
    expect(result.errors?.[textQuestionId]).toEqual(['Gebruik minimaal 20 tekens.'])
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it('behoudt de locatiekeuze en koppelt een locatievalidatiefout aan het juiste veld', async () => {
    const locationModeQuestionId = '00000000-0000-4000-8000-000000000008'
    const registeredLocationQuestionId = '00000000-0000-4000-8000-000000000009'
    mocks.saveIntakeStep.mockRejectedValue(
      new IntakeServiceError('VALIDATION_ERROR', 'Controleer de gemarkeerde velden.', [
        { questionId: registeredLocationQuestionId, message: 'Kies een actieve organisatielocatie.' },
      ]),
    )
    const formData = new FormData()
    formData.set('intakeId', intakeId)
    formData.set('category', 'LOCATION')
    formData.set('expectedIntakeVersion', '1')
    formData.append('questionId', locationModeQuestionId)
    formData.append('questionId', registeredLocationQuestionId)
    formData.set(`answer-${locationModeQuestionId}`, 'location-mode-option')

    const result = await saveIntakeStepAction({}, formData)

    expect(result.values?.[locationModeQuestionId]).toBe('location-mode-option')
    expect(result.errors?.[registeredLocationQuestionId]).toEqual(['Kies een actieve organisatielocatie.'])
  })

  it('geeft een herkenbaar concurrencyconflict zonder invoer te verliezen', async () => {
    mocks.saveIntakeStep.mockRejectedValue(new IntakeServiceError('CONFLICT'))
    const result = await saveIntakeStepAction({}, stepFormData())
    expect(result.message).toContain('gewijzigd')
    expect(result.values?.[textQuestionId]).toBe('Reeds ingevulde hulpvraag met voldoende lengte.')
  })

  it('keert na een wijziging vanaf het controleoverzicht rechtstreeks terug naar de controle', async () => {
    const formData = stepFormData()
    formData.set('returnToReview', 'true')

    await saveIntakeStepAction({}, formData)

    expect(mocks.saveIntakeStep).toHaveBeenCalledOnce()
    expect(mocks.redirect).toHaveBeenCalledWith(
      `/hulpvragen/${intakeId}/controle?opgeslagen=1`,
    )
    expect(mocks.getIntakeDetail).toHaveBeenCalledOnce()
  })

  it.each([
    ['WORKPLACE_CONTEXT_KITCHEN_V2', 'MANIPULATED_OPTION'],
    ['WORKPLACE_CONTEXT_KITCHEN_V1', 'KITCHEN_CUT_HEAT_FIRE'],
  ])('weigert een gemanipuleerd of verouderd verduidelijkingsantwoord server-side', async (setId, optionId) => {
    mocks.getIntakeDetail.mockResolvedValue({
      questionnaireVersion: 2,
      freeText: 'Hoe kunnen wij veilig werken in een keuken?',
      questions: [{
        id: categoryQuestionId,
        key: 'CONFIRMED_HELP_CATEGORY',
        value: null,
      }],
    })
    const formData = new FormData()
    formData.set('intakeId', intakeId)
    formData.set('category', 'HELP_REQUEST')
    formData.set('expectedIntakeVersion', '1')
    formData.append('questionId', categoryQuestionId)
    formData.set(`answer-${categoryQuestionId}`, '00000000-0000-4000-8000-000000007207')
    formData.set('classificationClarificationSetId', setId)
    formData.set('classificationClarificationOptionId', optionId)

    const result = await saveIntakeStepAction({}, formData)

    expect(result.errors?.[categoryQuestionId]).toEqual(['De gekozen verduidelijking is niet geldig.'])
    expect(mocks.saveIntakeStep).not.toHaveBeenCalled()
  })

  it('ververst overzicht en detail na gereedmelden', async () => {
    const formData = new FormData()
    formData.set('intakeId', intakeId)
    formData.set('expectedIntakeVersion', '2')
    await markIntakeReadyForReviewAction({}, formData)
    expect(mocks.markReady).toHaveBeenCalledWith(userId, intakeId, {
      intakeId,
      expectedIntakeVersion: 2,
    })
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/hulpvragen')
    expect(mocks.redirect).toHaveBeenCalledWith(`/hulpvragen/${intakeId}/controle?gereed=1`)
  })
})
