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

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireUser.mockResolvedValue({ id: userId })
  mocks.createIntake.mockResolvedValue({ id: intakeId })
  mocks.saveIntakeStep.mockResolvedValue({ id: intakeId, version: 2 })
  mocks.markReady.mockResolvedValue({ id: intakeId, version: 3 })
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

  it('geeft een herkenbaar concurrencyconflict zonder invoer te verliezen', async () => {
    mocks.saveIntakeStep.mockRejectedValue(new IntakeServiceError('CONFLICT'))
    const result = await saveIntakeStepAction({}, stepFormData())
    expect(result.message).toContain('gewijzigd')
    expect(result.values?.[textQuestionId]).toBe('Reeds ingevulde hulpvraag met voldoende lengte.')
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
