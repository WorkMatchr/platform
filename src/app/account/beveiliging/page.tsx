import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthShell } from '@/components/auth/auth-shell'
import { TwoFactorSecurityPanel } from '@/components/auth/two-factor-security-panel'
import { requireUser } from '@/lib/authorization'
import { getPrisma } from '@/lib/prisma'

export const metadata: Metadata = { title: 'Beveiliging | WorkMatchr', robots: { index: false, follow: false } }

export default async function AccountSecurityPage() {
  const user = await requireUser('/account/beveiliging')
  const data = await getPrisma().user.findUnique({
    where: { id: user.id },
    select: {
      twoFactorEnabled: true,
      twoFactors: { where: { verified: true }, select: { id: true }, take: 1 },
      memberships: {
        where: {
          status: 'ACTIVE',
          role: { in: ['OWNER', 'ADMIN', 'MEMBER'] },
          organization: { status: 'ACTIVE', organizationType: 'PLATFORM_OPERATOR', systemKey: 'WORKMATCHR_PLATFORM' },
        },
        select: { role: true },
        take: 1,
      },
    },
  })
  const platformRequired = Boolean(data?.memberships[0])
  const enabled = Boolean(data?.twoFactorEnabled && data.twoFactors.length)

  return (
    <AuthShell title="Beveiliging" intro={platformRequired ? 'Tweestapsverificatie is vereist voor uw toegang tot platformbeheer.' : 'Beheer de beveiliging van uw account.'}>
      <nav aria-label="Broodkruimel" className="mb-6 text-sm text-text-secondary"><Link href="/account" className="font-semibold text-brand-primary hover:underline">Account</Link><span aria-hidden="true"> › </span><span>Beveiliging</span></nav>
      <h2 id="two-factor-status" className="font-semibold text-brand-dark">Tweestapsverificatie</h2>
      <TwoFactorSecurityPanel enabled={enabled} platformRequired={platformRequired} />
    </AuthShell>
  )
}
