import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { GET } from '@/app/api/platformbeheer/financien/pro/downstream-recovery-once/route'

export default async function ProDownstreamRecoveryOncePage() {
  await requirePlatformAdministrator('/platformbeheer/financien')
  const result = await (await GET()).json()
  return (
    <main className="mx-auto max-w-xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold">Eenmalige Pro-downstream recovery</h1>
      <p>Vast doel: WM-26095005. Alleen ontbrekende factuurmail en Jortt-sync.</p>
      <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
    </main>
  )
}
