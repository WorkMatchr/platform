import { parseAdminFilter } from '@/lib/learning/academy-question-bank-admin-model'
import { AcademyAdminReadError, readAcademyAdminQuestions } from '@/lib/learning/academy-question-bank-admin-service'
import { buildAcademyReviewPdf } from '@/lib/learning/academy-question-bank-admin-pdf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'X-Content-Type-Options': 'nosniff' }
export async function GET(request: Request) {
  try {
    const filter = parseAdminFilter(Object.fromEntries(new URL(request.url).searchParams))
    const data = await readAcademyAdminQuestions(filter)
    if (!data.total) return new Response('Geen vragen gevonden.', { status: 404, headers })
    const bytes = await buildAcademyReviewPdf(data.rows)
    return new Response(Buffer.from(bytes), { headers: { ...headers, 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="Academy-review-${filter.course}-${filter.bank}.pdf"` } })
  } catch (error) {
    const status = error instanceof AcademyAdminReadError ? error.status : error instanceof Error && error.name === 'ZodError' ? 400 : 500
    return new Response('Vraagbank niet beschikbaar.', { status, headers })
  }
}
