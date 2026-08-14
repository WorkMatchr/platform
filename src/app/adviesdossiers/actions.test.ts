import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getOptionalViewer: vi.fn(),
  requireViewer: vi.fn(),
  startHandoff: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('@/lib/advice-dossiers/advice-dossier-authorization', () => ({
  getOptionalAdviceDossierViewer: mocks.getOptionalViewer,
  requireClientAdviceDossierViewer: mocks.requireViewer,
}))
vi.mock('@/lib/advice-dossiers/advice-dossier-intake-handoff-service', () => {
  class AdviceDossierIntakeHandoffError extends Error {
    constructor(public readonly code: string) {
      super(code)
    }
  }
  return {
    AdviceDossierIntakeHandoffError,
    startAdviceDossierIntake: mocks.startHandoff,
  }
})
vi.mock('@/lib/advice-dossiers/advice-dossier-service', () => ({
  changeAdviceDossierStatus: vi.fn(),
}))

import {
  prepareAdviceDossierIntakeAction,
  startAdviceDossierIntakeAction,
} from './actions'

const viewer = {
  userId: 'user-1',
  organizationId: 'organization-1',
  organizationRole: 'OWNER' as const,
  isPlatformAdministrator: false,
}

describe('Adviesdossier-opdrachtintake actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getOptionalViewer.mockResolvedValue(viewer)
    mocks.requireViewer.mockResolvedValue(viewer)
  })

  it('retourneert de gekoppelde intakebestemming zonder serverredirect', async () => {
    mocks.startHandoff.mockResolvedValue({
      kind: 'INTAKE',
      intakeId: 'intake-123',
      reused: true,
    })

    await expect(prepareAdviceDossierIntakeAction('dossier-1')).resolves.toEqual({
      ok: true,
      href: '/hulpvragen/intake-123?van=adviesdossier',
    })
    expect(mocks.redirect).not.toHaveBeenCalled()
    expect(mocks.startHandoff).toHaveBeenCalledTimes(1)
  })

  it('behoudt de redirect-wrapper voor de dossierdetailpagina', async () => {
    mocks.startHandoff.mockResolvedValue({
      kind: 'INTAKE',
      intakeId: 'intake-456',
      reused: false,
    })

    await startAdviceDossierIntakeAction('dossier-1')

    expect(mocks.redirect).toHaveBeenCalledWith(
      '/hulpvragen/intake-456?van=adviesdossier',
    )
  })

  it('weigert een ontbrekende opdrachtgevercontext zonder handoff', async () => {
    mocks.getOptionalViewer.mockResolvedValue(null)

    await expect(prepareAdviceDossierIntakeAction('dossier-1')).resolves.toEqual({
      ok: false,
      code: 'ACCESS_DENIED',
    })
    expect(mocks.startHandoff).not.toHaveBeenCalled()
  })
})
