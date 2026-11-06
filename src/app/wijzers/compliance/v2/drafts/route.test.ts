import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ enabled: true, access: vi.fn(), list: vi.fn(), save: vi.fn() }))
vi.mock('@/lib/compliance/compliance-f4-framework', () => ({ isF4Enabled: () => mocks.enabled }))
vi.mock('@/lib/arbo-guides/arbo-guide-access', () => ({ getArboGuideApiAccess: mocks.access }))
vi.mock('@/lib/compliance/compliance-f4-drafts', () => ({ listF4Drafts: mocks.list, saveF4Draft: mocks.save }))
vi.mock('@/lib/arbo-guides/arbo-guide-run-service', () => ({ ArboGuideRunError: class extends Error { constructor(public code: string) { super(code) } } }))
import { GET, POST } from './route'
import { ArboGuideRunError } from '@/lib/arbo-guides/arbo-guide-run-service'
const request = (body = '{}') => new Request('http://localhost/wijzers/compliance/v2/drafts', { method: 'POST', headers: { 'content-type': 'application/json' }, body })
beforeEach(() => { vi.clearAllMocks(); mocks.enabled = true; mocks.access.mockResolvedValue({ authorized: true, userId: 'trusted', organizationId: 'trusted' }); mocks.list.mockResolvedValue([]); mocks.save.mockResolvedValue({ revision: 0 }) })
it('staat gesloten en weigert anonieme toegang vóór opslag', async () => { mocks.enabled = false; expect((await GET(request())).status).toBe(404); expect(mocks.access).not.toHaveBeenCalled(); mocks.enabled = true; mocks.access.mockResolvedValue({ authorized: false, status: 401 }); expect((await POST(request())).status).toBe(401); expect(mocks.save).not.toHaveBeenCalled() })
it('cachet geen conceptantwoorden', async () => { expect((await GET(request())).headers.get('cache-control')).toBe('no-store') })
it('begrensd verzoek en JSON zonder serverdetails', async () => { expect((await POST(request('x'.repeat(17000)))).status).toBe(413); expect((await POST(request('{'))).status).toBe(400); expect(mocks.save).not.toHaveBeenCalled() })
it('gebruikt uitsluitend sessie-identiteit', async () => { expect((await POST(request())).status).toBe(200); expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ userId: 'trusted', organizationId: 'trusted' }), {}) })
it('weigert ingetrokken rechten en meldt conflict', async () => { mocks.save.mockRejectedValue(new ArboGuideRunError('ACCESS_DENIED')); expect((await POST(request())).status).toBe(403); mocks.save.mockRejectedValue(new ArboGuideRunError('CONFLICT')); expect((await POST(request())).status).toBe(409) })
