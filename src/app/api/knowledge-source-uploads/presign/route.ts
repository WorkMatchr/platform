import { NextResponse } from 'next/server'
import { createKnowledgeSourceUploadTarget } from '@/lib/knowledge/knowledge-source-upload-storage'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  await requirePlatformAdministrator('/platformbeheer/kennisbank/bronnen/uploaden')
  try {
    const body = await request.json() as { checksum?: unknown; bytes?: unknown; mediaType?: unknown; fileName?: unknown }
    if (typeof body.checksum !== 'string' || !/^[0-9a-f]{64}$/u.test(body.checksum)
      || !Number.isInteger(body.bytes) || Number(body.bytes) < 1 || Number(body.bytes) > 10 * 1024 * 1024
      || body.mediaType !== 'application/pdf' || typeof body.fileName !== 'string' || !body.fileName.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ ok: false, message: 'Het PDF-bestand voldoet niet aan de uploadvoorwaarden.' }, { status: 400 })
    }
    const target = await createKnowledgeSourceUploadTarget({ checksum: body.checksum, bytes: Number(body.bytes) })
    return NextResponse.json({ ok: true, ...target }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ ok: false, message: 'De private upload kon niet veilig worden voorbereid.' }, { status: 503 })
  }
}
