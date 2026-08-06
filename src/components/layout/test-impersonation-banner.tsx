import { stopTestImpersonationAction } from '@/app/platformbeheer/test-account-actions'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/layout/container'
import { getCurrentAuthenticationContext } from '@/lib/test-impersonation/test-impersonation-context'
import { getPrisma } from '@/lib/prisma'

const roleLabels = {
  OWNER: 'Eigenaar',
  ADMIN: 'Beheerder',
  MEMBER: 'Medewerker',
} as const

export async function TestImpersonationBanner() {
  const context = await getCurrentAuthenticationContext()
  if (!context?.impersonation) return null

  const target = await getPrisma().user.findUnique({
    where: { id: context.impersonation.effectiveUserId },
    select: {
      email: true,
      displayName: true,
      platformRole: true,
      memberships: {
        take: 1,
        select: {
          role: true,
          organization: { select: { name: true } },
        },
      },
    },
  })
  const membership = target?.memberships[0] ?? null
  const name = target?.displayName?.trim() || target?.email || 'onbeschikbaar testaccount'

  return (
    <aside
      className="border-y border-amber-400 bg-amber-50 text-amber-950"
      aria-label="Actieve testmodus"
    >
      <Container className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold">Testmodus: u bekijkt WorkMatchr als {name}</p>
          <p className="mt-0.5 overflow-wrap-anywhere text-sm [overflow-wrap:anywhere]">
            {target?.email ?? 'Het gekozen testaccount is niet meer beschikbaar.'}
            {target && membership
              ? ` · ${membership.organization.name} · ${roleLabels[membership.role]}`
              : target
                ? ` · Platformaccount · ${target.platformRole === 'ADMIN' ? 'Platformbeheerder' : 'Platformgebruiker'}`
                : ''}
            {!context.impersonation.valid ? ' · Toegang geblokkeerd' : ''}
          </p>
        </div>
        <form action={stopTestImpersonationAction} className="shrink-0">
          <Button type="submit" variant="outline" className="w-full border-amber-700 bg-white sm:w-auto">
            Terug naar platformbeheer
          </Button>
        </form>
      </Container>
    </aside>
  )
}
