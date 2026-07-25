import { getCurrentUser } from '@/lib/authorization'
import { getPlatformAdministratorContext } from '@/lib/platform-admin/platform-admin-authorization'
import { getPlatformReportData } from '@/lib/platform-admin/platform-admin-query-service'
import { createPlatformReportCsv } from '@/lib/platform-admin/platform-admin-report'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return new Response('Niet geautoriseerd.', { status: 401 })
  try {
    await getPlatformAdministratorContext(user.id)
  } catch {
    return new Response('Niet geautoriseerd.', { status: 403 })
  }
  const csv = createPlatformReportCsv(await getPlatformReportData(user.id))
  return new Response(`\uFEFF${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="workmatchr-platformrapport-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
