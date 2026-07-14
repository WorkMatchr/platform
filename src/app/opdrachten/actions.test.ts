import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireOrganizationMembership: vi.fn(),
  getSubmissionContext: vi.fn(),
  convert: vi.fn(),
  updateAssignment: vi.fn(),
  markReady: vi.fn(),
  reopen: vi.fn(),
  cancel: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('@/lib/organizations/organization-authorization', () => ({
  requireOrganizationMembership: mocks.requireOrganizationMembership,
}))
vi.mock('@/lib/assignments/assignment-query-service', () => ({
  getIntakeSubmissionContext: mocks.getSubmissionContext,
}))
vi.mock('@/lib/assignments/assignment-conversion-service', () => ({
  convertIntakeToAssignment: mocks.convert,
}))
vi.mock('@/lib/assignments/assignment-service', () => ({
  updateAssignment: mocks.updateAssignment,
  markAssignmentReadyForReview: mocks.markReady,
  reopenAssignment: mocks.reopen,
  cancelAssignment: mocks.cancel,
}))

import { AssignmentServiceError } from '@/lib/assignments/assignment-errors'
import { cancelAssignmentAction, updateAssignmentAction, submitIntakeAction } from './actions'

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
  data.set('locationId', locationId)
  data.set('allowsRemoteWork', 'on')
  data.set('organizationId', '00000000-0000-4000-8000-000000000099')
  return data
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireOrganizationMembership.mockResolvedValue(organizationContext())
  mocks.getSubmissionContext.mockResolvedValue({ intakeId, version: 7, status: 'READY_FOR_REVIEW', assignmentId: null })
  mocks.convert.mockResolvedValue({ id: assignmentId, status: 'DRAFT', version: 1, idempotent: false })
  mocks.updateAssignment.mockResolvedValue({ id: assignmentId, status: 'DRAFT', version: 4 })
  mocks.cancel.mockResolvedValue({ id: assignmentId, status: 'CANCELLED', version: 4 })
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
      locationId,
      allowsRemoteWork: true,
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

describe('opdracht indien-Server Action', () => {
  it.each(['OWNER', 'ADMIN'] as const)('dient voor een actieve %s de server-side actuele versie in', async (role) => {
    mocks.requireOrganizationMembership.mockResolvedValue(organizationContext(role))
    await submitIntakeAction({}, formData())
    expect(mocks.getSubmissionContext).toHaveBeenCalledWith(userId, organizationId, intakeId)
    expect(mocks.convert).toHaveBeenCalledWith(userId, intakeId, { expectedIntakeVersion: 7 })
    expect(mocks.redirect).toHaveBeenCalledWith(`/opdrachten/${assignmentId}/aangemaakt`)
  })

  it.each(['niet ingelogd', 'BLOCKED', 'ARCHIVED'])('stopt wanneer de accountcontext %s is', async () => {
    mocks.requireOrganizationMembership.mockRejectedValue(new Error('Geen actieve sessie of account'))
    await expect(submitIntakeAction({}, formData())).rejects.toThrow('Geen actieve sessie of account')
    expect(mocks.convert).not.toHaveBeenCalled()
  })

  it('weigert MEMBER zonder de conversieservice aan te roepen', async () => {
    mocks.requireOrganizationMembership.mockResolvedValue(organizationContext('MEMBER'))
    mocks.getSubmissionContext.mockRejectedValue(new AssignmentServiceError('ACCESS_DENIED'))
    await expect(submitIntakeAction({}, formData())).resolves.toEqual({ message: 'U mag deze hulpvraag niet indienen.' })
    expect(mocks.convert).not.toHaveBeenCalled()
  })

  it('weigert een intake uit een andere organisatie generiek', async () => {
    mocks.getSubmissionContext.mockRejectedValue(new AssignmentServiceError('ACCESS_DENIED'))
    await expect(submitIntakeAction({}, formData())).resolves.toEqual({ message: 'U mag deze hulpvraag niet indienen.' })
  })

  it('geeft voor een verkeerde status een veilige melding', async () => {
    mocks.convert.mockRejectedValue(new AssignmentServiceError('INVALID_STATUS'))
    await expect(submitIntakeAction({}, formData())).resolves.toEqual({ message: 'Controleer de hulpvraag voordat U deze indient.' })
  })

  it('vertaalt een concurrencyconflict zonder technische details', async () => {
    mocks.convert.mockRejectedValue(new AssignmentServiceError('CONFLICT'))
    await expect(submitIntakeAction({}, formData())).resolves.toEqual({
      message: 'Deze hulpvraag is ondertussen gewijzigd. Controleer de actuele gegevens voordat U opnieuw indient.',
    })
  })

  it.each([false, true])('redirect na %s idempotent succes naar dezelfde veilige succesroute', async (idempotent) => {
    mocks.convert.mockResolvedValue({ id: assignmentId, status: 'DRAFT', version: 1, idempotent })
    await submitIntakeAction({}, formData())
    expect(mocks.redirect).toHaveBeenCalledWith(`/opdrachten/${assignmentId}/aangemaakt`)
  })
})
