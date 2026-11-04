import { requireAuthor } from '@/lib/learning/academy-authoring-service'
import { saveLearningMedia, learningMediaLimit } from '@/lib/learning/learning-media-storage'
export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' }
  // A multipart upload must originate from this application, including behind a proxy.
  const trusted = process.env.NEXT_PUBLIC_APP_URL
  if (!trusted || request.headers.get('origin') !== new URL(trusted).origin) {
    return Response.json({ error: 'Upload niet toegestaan.' }, { status: 403, headers })
  }
  try {
    await requireAuthor()
    const length = Number(request.headers.get('content-length'))
    if (!Number.isFinite(length) || length <= 0 || length > learningMediaLimit + 16384) return Response.json({ error: 'Maximaal 3 MB per bestand.' }, { status: 413, headers })
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return Response.json({ error: 'Kies een bestand.' }, { status: 400, headers })
    return Response.json({ path: await saveLearningMedia(file) }, { headers })
  } catch {
    return Response.json({ error: 'Upload niet beschikbaar. Controleer rechten, bestand en opslagconfiguratie.' }, { status: 400, headers })
  }
}
