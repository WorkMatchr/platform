import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireOrganizationMembership: vi.fn(),
  publishIntake: vi.fn(),
  updateAssignment: vi.fn(),
  markReady: vi.fn(),
  reopen: vi.fn(),
  cancel: vi.fn(),
  publish: vi.fn(),
  withdraw: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('@/lib/organizations/organization-authorization', () => ({
  requireOrganizationMembership: mocks.requireOrganizationMembership,
}))
vi.mock('@/lib/assignments/intake-assignment-publication-service', () => ({
  publishIntakeAsAssignment: mocks.publishIntake,
}))
vi.mock('@/lib/assignments/assignment-service', () => ({
  updateAssignment: mocks.updateAssignment,
  markAssignmentReadyForReview: mocks.markReady,
  reopenAssignment: mocks.reopen,
  cancelAssignment: mocks.cancel,
}))
vi.mock('@/lib/assignments/assignment-publication-service', () => ({
  publishAssignment: mocks.publish,
  withdrawPublishedAssignment: mocks.withdraw,
}))

import { AssignmentServiceError } from '@/lib/assignments/assignment-errors'
import {
  cancelAssignmentAction,
  publishAssignmentAction,
  publishIntakeAction,
  updateAssignmentAction,
  withdrawPublishedAssignmentAction,
} from './actions'

const userId = '00000000-0000-4000-8000-000000000001'
const organizationId = '00000000-0000-4000-8000-000000000002'
const intakeId = '00000000-0000-4000-8000-000000000003'
const assignmentId = '00000000-0000-4000-8000-000000000004'
const locationId = '00000000-0000-4000-8000-000000000005'

function formData() {
  const data = new FormData()
  data.set('intakeId', intakeId)
  data.set('expectedIntakeVersion', '7')
  data.set('confirmed', 'on')
  return data
}

function organizationContext(role: 'OWNER' | 'ADMIN' | 'MEMBER' = 'OWNER') {
  return {
    user: { id: userId, status: 'ACTIVE' },
    activeMembership: { role, organization: { id: organizationId } },
  }
}

function editFormData() {
  const data = new FormData()
  data.set('assignmentId', assignmentId)
  data.set('expectedAssignmentVersion', '3')
  data.set('title', 'Veiligheidskundige ondersteuning')
  data.set('description', 'Een zakelijke en voldoende uitgebreide omschrijving van de opdracht.')
  data.set('employeeCount', '25')
  data.set('desiredStartDate', '2099-08-01')
  data.set('locationType', 'REGISTERED')
  data.set('locationId', locationId)
  data.set('locationCity', '')
  data.set('locationRegion', '')
  data.set('locationDescription', '')
  data.set('locationCount', '')
  data.set('organizationId', '00000000-0000-4000-8000-000000000099')
  return data
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireOrganizationMembership.mockResolvedValue(organizationContext())
  mocks.publishIntake.mockResolvedValue({ id: assignmentId, status: 'OPEN', version: 3, idempotent: false })
  mocks.updateAssignment.mockResolvedValue({ id: assignmentId, status: 'DRAFT', version: 4 })
  mocks.cancel.mockResolvedValue({ id: assignmentId, status: 'CANCELLED', version: 4 })
  mocks.publish.mockResolvedValue({ id: assignmentId, status: 'OPEN', version: 4, idempotent: false })
  mocks.withdraw.mockResolvedValue({ id: assignmentId, status: 'CANCELLED', version: 5, idempotent: false })
})

describe('opdrachtpublicatie-Server Actions', () => {
  function publicationFormData(confirmed = true) {
    const data = new FormData()
    data.set('assignmentId', assignmentId)
    data.set('expectedAssignmentVersion', '3')
    data.set('organizationId', '00000000-0000-4000-8000-000000000099')
    data.set('maxSelections', '3')
    if (confirmed) data.set('confirmed', 'on')
    return data
  }

  it('publiceert via de bestaande service met uitsluitend de server-side tenant', async () => {
    await publishAssignmentAction({}, publicationFormData())
    expect(mocks.publish).toHaveBeenCalledWith(userId, organizationId, {
      assignmentId,
      expectedAssignmentVersion: 3,
    })
    expect(mocks.redirect).toHaveBeenCalledWith(
      `/opdrachten/${assignmentId}?status=gepubliceerd`,
    )
  })

  it('publiceert niet zonder expliciete bevestiging', async () => {
    const result = await publishAssignmentAction({}, publicationFormData(false))
    expect(result.errors?.confirmed).toBeDefined()
    expect(mocks.publish).not.toHaveBeenCalled()
  })

  it.each(['4', '5'])('blokkeert %s offerteplaatsen vóór de publicatieservice', async (maxSelections) => {
    const data = publicationFormData()
    data.set('maxSelections', maxSelections)
    const result = await publishAssignmentAction({}, data)
    expect(result.message).toBe('Betaling voor extra offerteplaatsen wordt binnenkort beschikbaar.')
    expect(result.values?.maxSelections).toBe(maxSelections)
    expect(mocks.publish).not.toHaveBeenCalled()
  })

  it('behoudt veilige bevestigingscontext bij een concurrencyconflict', async () => {
    mocks.publish.mockRejectedValue(
      new AssignmentServiceError(
        'CONFLICT',
        'De opdracht is intussen gewijzigd. Vernieuw de gegevens en probeer het opnieuw.',
      ),
    )
    const result = await publishAssignmentAction({}, publicationFormData())
    expect(result.message).toContain('intussen gewijzigd')
    expect(result.values?.confirmed).toBe('on')
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it('trekt alleen in met een geldige reden en expliciete bevestiging', async () => {
    const data = publicationFormData()
    data.set('reason', 'De organisatie trekt deze publicatie bewust en definitief in.')
    await withdrawPublishedAssignmentAction({}, data)
    expect(mocks.withdraw).toHaveBeenCalledWith(userId, organizationId, {
      assignmentId,
      expectedAssignmentVersion: 3,
      reason: 'De organisatie trekt deze publicatie bewust en definitief in.',
    })
    expect(mocks.redirect).toHaveBeenCalledWith(
      `/opdrachten/${assignmentId}?status=ingetrokken`,
    )
  })

  it('behoudt de intrekkingsreden wanneer bevestiging ontbreekt', async () => {
    const data = publicationFormData(false)
    data.set('reason', 'De organisatie trekt deze publicatie bewust en definitief in.')
    const result = await withdrawPublishedAssignmentAction({}, data)
    expect(result.errors?.confirmed).toBeDefined()
    expect(result.values?.reason).toContain('bewust en definitief')
    expect(mocks.withdraw).not.toHaveBeenCalled()
  })
})

describe('opdrachtmutatie-Server Actions', () => {
  it('geeft uitsluitend toegestane bewerkvelden en de server-side tenant door', async () => {
    await updateAssignmentAction({}, editFormData())
    expect(mocks.updateAssignment).toHaveBeenCalledWith(userId, organizationId, {
      assignmentId,
      expectedAssignmentVersion: 3,
      title: 'Veiligheidskundige ondersteuning',
      description: 'Een zakelijke en voldoende uitgebreide omschrijving van de opdracht.',
      employeeCount: 25,
      desiredStartDate: '2099-08-01',
      locationType: 'REGISTERED',
      locationId,
      locationCity: null,
      locationRegion: null,
      locationDescription: null,
      locationCount: null,
    })
    expect(mocks.redirect).toHaveBeenCalledWith(`/opdrachten/${assignmentId}?gewijzigd=1`)
  })

  it('behoudt ingevulde waarden en veldfouten na servervalidatie', async () => {
    const data = editFormData()
    data.set('title', 'Kort')
    const result = await updateAssignmentAction({}, data)
    expect(result.errors?.title).toBeDefined()
    expect(result.values).toMatchObject({ title: 'Kort', description: 'Een zakelijke en voldoende uitgebreide omschrijving van de opdracht.' })
    expect(mocks.updateAssignment).not.toHaveBeenCalled()
  })

  it('overschrijft niets bij een concurrencyconflict en behoudt de invoer', async () => {
    mocks.updateAssignment.mockRejectedValue(new AssignmentServiceError('CONFLICT', 'De opdracht is intussen gewijzigd. Vernieuw de pagina en controleer de actuele gegevens.'))
    const result = await updateAssignmentAction({}, editFormData())
    expect(result.message).toContain('intussen gewijzigd')
    expect(result.values?.title).toBe('Veiligheidskundige ondersteuning')
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it('annuleert niet zonder expliciete bevestiging en bewaart de reden', async () => {
    const data = new FormData()
    data.set('assignmentId', assignmentId)
    data.set('expectedAssignmentVersion', '3')
    data.set('reason', 'Deze opdracht wordt bewust door de organisatie ingetrokken.')
    const result = await cancelAssignmentAction({}, data)
    expect(result.errors?.confirmed).toBeDefined()
    expect(result.values?.reason).toBe('Deze opdracht wordt bewust door de organisatie ingetrokken.')
    expect(mocks.cancel).not.toHaveBeenCalled()
  })
})

describe('opdrachtpublicatie vanuit de intake', () => {
  it.each(['OWNER', 'ADMIN'] as const)('publiceert voor een actieve %s in één server-side handeling', async (role) => {
    mocks.requireOrganizationMembership.mockResolvedValue(organizationContext(role))
    await publishIntakeAction({}, formData())
    expect(mocks.publishIntake).toHaveBeenCalledWith(userId, organizationId, intakeId, {
      expectedIntakeVersion: 7,
    })
    expect(mocks.redirect).toHaveBeenCalledWith(`/opdrachten/${assignmentId}?status=gepubliceerd`)
  })

  it.each(['4', '5'])('blokkeert %s offerteplaatsen vóór conversie of publicatie', async (maxSelections) => {
    const data = formData()
    data.set('maxSelections', maxSelections)
    const result = await publishIntakeAction({}, data)
    expect(result.message).toBe('Betaling voor extra offerteplaatsen wordt binnenkort beschikbaar.')
    expect(mocks.publishIntake).not.toHaveBeenCalled()
  })

  it.each(['niet ingelogd', 'BLOCKED', 'ARCHIVED'])('stopt wanneer de accountcontext %s is', async () => {
    mocks.requireOrganizationMembership.mockRejectedValue(new Error('Geen actieve sessie of account'))
    await expect(publishIntakeAction({}, formData())).rejects.toThrow('Geen actieve sessie of account')
    expect(mocks.publishIntake).not.toHaveBeenCalled()
  })

  it('weigert MEMBER zonder de conversieservice aan te roepen', async () => {
    mocks.requireOrganizationMembership.mockResolvedValue(organizationContext('MEMBER'))
    mocks.publishIntake.mockRejectedValue(new AssignmentServiceError('ACCESS_DENIED'))
    await expect(publishIntakeAction({}, formData())).resolves.toEqual({ message: 'U mag deze opdracht niet publiceren.' })
  })

  it('weigert een intake uit een andere organisatie generiek', async () => {
    mocks.publishIntake.mockRejectedValue(new AssignmentServiceError('ACCESS_DENIED'))
    await expect(publishIntakeAction({}, formData())).resolves.toEqual({ message: 'U mag deze opdracht niet publiceren.' })
  })

  it('geeft voor een verkeerde status een veilige melding', async () => {
    mocks.publishIntake.mockRejectedValue(new AssignmentServiceError('INVALID_STATUS'))
    await expect(publishIntakeAction({}, formData())).resolves.toEqual({ message: 'Controleer de opdracht voordat u deze publiceert.' })
  })

  it('vertaalt een concurrencyconflict zonder technische details', async () => {
    mocks.publishIntake.mockRejectedValue(new AssignmentServiceError('CONFLICT'))
    await expect(publishIntakeAction({}, formData())).resolves.toEqual({
      message: 'Deze opdracht is ondertussen gewijzigd. Controleer de actuele gegevens voordat u opnieuw publiceert.',
    })
  })

  it.each([false, true])('redirect na %s idempotent succes rechtstreeks naar de gepubliceerde opdracht', async (idempotent) => {
    mocks.publishIntake.mockResolvedValue({ id: assignmentId, status: 'OPEN', version: 3, idempotent })
    await publishIntakeAction({}, formData())
    expect(mocks.redirect).toHaveBeenCalledWith(`/opdrachten/${assignmentId}?status=gepubliceerd`)
  })

  it('blijft bij validatiefouten op het controleoverzicht en toont concrete antwoordfouten', async () => {
    mocks.publishIntake.mockRejectedValue(new AssignmentServiceError(
      'VALIDATION_ERROR',
      undefined,
      [{ questionKey: 'BHV_EMPLOYEE_COUNT', message: 'Deze vraag moet nog worden beantwoord.' }],
    ))

    await expect(publishIntakeAction({}, formData())).resolves.toEqual({
      message: 'De opdracht is nog niet volledig. Controleer de ontbrekende gegevens.',
      errors: { BHV_EMPLOYEE_COUNT: ['Deze vraag moet nog worden beantwoord.'] },
    })
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it('valideert een gemanipuleerd publicatieverzoek opnieuw en geeft de bewerklink terug', async () => {
    const readinessIssue = {
      code: 'REQUIRED_ANSWER_MISSING',
      section: 'SITUATION',
      questionId: '00000000-0000-4000-8000-000000000010',
      questionKey: 'BHV_EMPLOYEE_COUNT',
      message: 'Hoeveel medewerkers werken er ongeveer?',
      editHref: `/hulpvragen/${intakeId}/huidige-situatie?wijzig=1`,
    }
    mocks.publishIntake.mockRejectedValue(new AssignmentServiceError(
      'VALIDATION_ERROR',
      undefined,
      [{
        questionId: readinessIssue.questionId,
        questionKey: readinessIssue.questionKey,
        message: readinessIssue.message,
      }],
      {},
      [readinessIssue],
    ))

    await expect(publishIntakeAction({}, formData())).resolves.toMatchObject({
      message: 'Uw opdracht kan nog niet worden gepubliceerd. Vul eerst de ontbrekende gegevens aan.',
      readinessIssues: [readinessIssue],
    })
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
})
