import { getArboGuideApiAccess } from '@/lib/arbo-guides/arbo-guide-access'
import { ArboGuideRunError } from '@/lib/arbo-guides/arbo-guide-run-service'
import { isF4Enabled } from '@/lib/compliance/compliance-f4-framework'
import { listF4Drafts, saveF4Draft } from '@/lib/compliance/compliance-f4-drafts'
export const runtime = 'nodejs'
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
async function handle(request: Request, write: boolean) {
  if (!isF4Enabled()) return json({}, 404)
  const actor = await getArboGuideApiAccess()
  if (!actor.authorized) return json({}, actor.status)
  try {
    if (!write) return json({ drafts: await listF4Drafts(actor) })
    if (!request.headers.get('content-type')?.startsWith('application/json')) return json({}, 415)
    if (Number(request.headers.get('content-length')) > 16_384) return json({}, 413)
    const text = await request.text()
    if (new TextEncoder().encode(text).length > 16_384) return json({}, 413)
    return json({ draft: await saveF4Draft(actor, JSON.parse(text)) })
  } catch (error) {
    return json({ message: 'Uw concept kon niet worden geopend of opgeslagen. Uw huidige invoer blijft behouden.' }, error instanceof ArboGuideRunError ? error.code === 'ACCESS_DENIED' ? 403 : 409 : 400)
  }
}
export const GET = (request: Request) => handle(request, false)
export const POST = (request: Request) => handle(request, true)
