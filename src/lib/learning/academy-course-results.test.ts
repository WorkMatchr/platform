import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  enabled: vi.fn(), authorize: vi.fn(), courses: vi.fn(), version: vi.fn(),
}))
vi.mock('server-only', () => ({}))
vi.mock('./learning-runtime-policy', () => ({ isLearningRuntimeEnabled: m.enabled }))
vi.mock('@/lib/platform-admin/platform-admin-authorization', () => ({ requirePlatformOperator: m.authorize }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({
  learningCourse: { findMany: m.courses }, learningCourseVersion: { findUnique: m.version },
}) }))
import { readAcademyCourseIndex, readAcademyCourseResults } from './academy-course-results'

const id = '12345678-1234-4567-abcd-abcdef012345'
describe('Academy-beheer per cursusversie', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    m.enabled.mockReturnValue(true)
    m.authorize.mockResolvedValue({ membershipRole: 'OWNER' })
  })
  it('sluit beide leesroutes vóór het opvragen van cursistgegevens als LMS uit staat', async () => {
    m.enabled.mockReturnValue(false)
    await expect(readAcademyCourseIndex()).rejects.toThrow()
    await expect(readAcademyCourseResults(id, 1)).rejects.toThrow()
    expect(m.authorize).not.toHaveBeenCalled()
    expect(m.courses).not.toHaveBeenCalled()
    expect(m.version).not.toHaveBeenCalled()
  })
  it('controleert de actuele beheerbevoegdheid bij beide queries', async () => {
    m.authorize.mockRejectedValue(new Error('geen toegang'))
    await expect(readAcademyCourseIndex()).rejects.toThrow('geen toegang')
    await expect(readAcademyCourseResults(id, 1)).rejects.toThrow('geen toegang')
    expect(m.courses).not.toHaveBeenCalled()
    expect(m.version).not.toHaveBeenCalled()
  })
  it.each([0, 1.5, NaN, 100001])('weigert ongeldige pagina %s', async page => {
    await expect(readAcademyCourseResults(id, page)).rejects.toThrow()
    expect(m.version).not.toHaveBeenCalled()
  })
  it('laadt alleen de gevraagde cursusversie met een begrensde deelnemerspagina en ingeleverde toetsen', async () => {
    m.version.mockResolvedValue({ version: 'v1', enrollments: [] })
    await readAcademyCourseResults(id, 2)
    expect(m.version).toHaveBeenCalledWith(expect.objectContaining({
      where: { id }, select: expect.objectContaining({ enrollments: expect.objectContaining({
        take: 25, skip: 25, select: expect.objectContaining({ examAttempts: expect.objectContaining({
          where: { submittedAt: { not: null } },
        }) }),
      }) }),
    }))
  })
})
