import { getPrisma } from '@/lib/prisma'
import {
  getKnowledgeSourceUploadStorage,
  knowledgeSourceUploadStorageKeyFromLocator,
} from '@/lib/knowledge/knowledge-source-upload-storage'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'

export async function GET(_request: Request, context: { params: Promise<{ sourceVersionId: string }> }) {
  const { sourceVersionId } = await context.params
  await requirePlatformAdministrator('/platformbeheer/kennisbank')
  const version = await getPrisma().knowledgeSourceVersion.findUnique({
    where: { id: sourceVersionId },
    select: {
      versionLabel: true,
      source: { select: { code: true } },
      artifacts: { where: { mediaType: 'application/pdf' }, orderBy: { retrievedAt: 'desc' }, take: 1, select: { locator: true, checksum: true } },
    },
  })
  const artifact = version?.artifacts[0]
  if (!version || !artifact) return new Response('Niet gevonden.', { status: 404 })
  try {
    const storageKey = knowledgeSourceUploadStorageKeyFromLocator(artifact.locator)
    const stored = await getKnowledgeSourceUploadStorage().read(storageKey)
    if (!stored || stored.checksum !== artifact.checksum) return new Response('Niet gevonden.', { status: 404 })
    const fileName = `${version.source.code}-${version.versionLabel}`.replace(/[^A-Za-z0-9._-]/gu, '-').slice(0, 120)
    return new Response(stored.bytes.slice().buffer as ArrayBuffer, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `attachment; filename="${fileName}.pdf"`,
        'Content-Type': 'application/pdf',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return new Response('Niet gevonden.', { status: 404 })
  }
}
