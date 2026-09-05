import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'

export default async function ProDownstreamRecoveryOncePage() {
  await requirePlatformAdministrator('/platformbeheer/financien')
  return (
    <main className="mx-auto max-w-xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold">Eenmalige Pro-downstream recovery</h1>
      <p>Vast doel: WM-26095005. Alleen ontbrekende factuurmail en Jortt-sync.</p>
      <form method="post" action="/api/platformbeheer/financien/pro/downstream-recovery-once">
        <button type="submit" className="min-h-11 rounded bg-blue-700 px-5 py-3 font-semibold text-white">
          Voer exact één downstream-recovery uit
        </button>
      </form>
    </main>
  )
}
