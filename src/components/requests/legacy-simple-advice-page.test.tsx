import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const mocks = vi.hoisted(() => ({ viewer: vi.fn(), load: vi.fn(), save: vi.fn(), publish: vi.fn() }))
vi.mock('@/lib/advice-dossiers/advice-dossier-authorization', () => ({ requireClientAdviceDossierViewer: mocks.viewer }))
vi.mock('@/lib/requests/legacy-simple-advice-service', () => ({ getLegacySimpleAdvice: mocks.load }))
vi.mock('@/app/hulpvragen/simple-actions', () => ({ saveLegacySimpleAdviceAction: mocks.save, publishLegacySimpleAdviceAction: mocks.publish }))
vi.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`) }, notFound: () => { throw new Error('NOT_FOUND') } }))
vi.mock('@/lib/requests/request-service', () => ({ RequestServiceError: class extends Error {} }))
vi.mock('./simple-advice-form', () => ({ SimpleAdviceForm: (props: { draftId: string; initialVersion: number }) => <div data-draft={props.draftId} data-version={props.initialVersion}>Shared form</div> }))

import { LegacySimpleAdvicePage } from './legacy-simple-advice-page'
import LegacyCategoryPage from '@/app/hulpvragen/[intakeId]/[category]/page'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.viewer.mockResolvedValue({ userId: 'existing-user', organizationId: 'existing-tenant' })
  mocks.load.mockResolvedValue({ initialValues: { requestDescription: 'Bestaand concept' }, version: 3, locations: [] })
})

describe('legacy route gebruikt de gedeelde intake', () => {
  it('laadt dezelfde conceptidentiteit zonder publicatie of save op openen', async () => {
    const html = renderToStaticMarkup(await LegacySimpleAdvicePage({ intakeId: 'existing-draft' }))
    expect(html).toContain('data-draft="existing-draft"')
    expect(html).toContain('data-version="3"')
    expect(mocks.load).toHaveBeenCalledWith({ userId: 'existing-user', organizationId: 'existing-tenant' }, 'existing-draft')
    expect(mocks.save).not.toHaveBeenCalled()
    expect(mocks.publish).not.toHaveBeenCalled()
  })
  it('behoudt de legacy URL en ID in de categoriewrapper', async () => {
    const element = await LegacyCategoryPage({ params: Promise.resolve({ intakeId: 'existing-draft', category: 'hulpvraag' }) })
    expect(element.type).toBe(LegacySimpleAdvicePage)
    expect(element.props.intakeId).toBe('existing-draft')
  })
  it.each([
    [{ publishedRequestId: 'request-id' }, '/aanvragen/request-id/gepubliceerd'],
    [{ historicalAssignmentId: 'assignment-id' }, '/opdrachten/assignment-id'],
  ])('bewerkt gepubliceerde historie niet', async (result, destination) => {
    mocks.load.mockResolvedValue(result)
    await expect(LegacySimpleAdvicePage({ intakeId: 'existing-draft' })).rejects.toThrow(`REDIRECT:${destination}`)
    expect(mocks.save).not.toHaveBeenCalled()
    expect(mocks.publish).not.toHaveBeenCalled()
  })
})
