import { getCurrentUser } from '@/lib/authorization'
import { getPlatformOperatorContext } from '@/lib/platform-admin/platform-admin-authorization'
import { getPrisma } from '@/lib/prisma'
import { isLearningRuntimeEnabled } from '@/lib/learning/learning-runtime-policy'
import { currentAcademyAccess } from '@/lib/learning/academy-access-policy'
import { readLearningMedia } from '@/lib/learning/learning-media-storage'
export async function GET(_: Request, { params }: { params: Promise<{ key: string }> }) {
  const unavailable = () => new Response('Niet gevonden', { status: 404, headers: { 'Cache-Control': 'no-store' } })
  try {
    if (!isLearningRuntimeEnabled()) return unavailable()
    const user = await getCurrentUser()
    if (!user || user.status !== 'ACTIVE') return unavailable()
    const { key } = await params
    let admin = false
    try { await getPlatformOperatorContext(user.id); admin = true } catch { /* Enrollment authorization is still required. */ }
    if (!admin) {
      const mediaPath = `/learning-media/${key}`
      const allowed = await getPrisma().learningCourseVersion.findFirst({
        where: {
          status: { in: ['PUBLISHED', 'RETIRED'] },
          OR: [
            { status: 'PUBLISHED', sourceMetadata: { path: ['authoring', 'content', 'image'], equals: mediaPath } },
            { enrollments: { some: { userId: user.id, ...currentAcademyAccess() } }, chapters: { some: { contentBlocks: { some: { OR: [
              { data: { path: ['src'], equals: mediaPath } },
              { data: { path: ['captions'], equals: mediaPath } },
            ] } } } } },
          ],
        }, select: { id: true },
      })
      if (!allowed) return unavailable()
    }
    const media = await readLearningMedia(key)
    if (!media) return unavailable()
    return new Response(new Uint8Array(media.bytes), { headers: {
      'Content-Type': media.mediaType, 'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox",
    } })
  } catch { return unavailable() }
}
