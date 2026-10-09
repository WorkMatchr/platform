import { cookies } from 'next/headers'
import { PlatformAdminShellV02 } from '@/components/platform-admin/platform-admin-shell-v02'
import type { ReactNode } from 'react'
import { PlatformAdminShell } from '@/components/platform-admin/platform-admin-shell'
import { requirePlatformAuditor } from '@/lib/platform-admin/platform-admin-authorization'
import { getAvailableTestAccounts } from '@/lib/test-impersonation/test-impersonation-service'
import { isTestAccountSwitcherEnabled } from '@/lib/test-impersonation/test-impersonation-policy'

export default async function PlatformAdminLayout({ children }: { children: ReactNode }) {
  const administrator = await requirePlatformAuditor('/platformbeheer')
  let testAccountSwitcher:
    | {
        accounts: Awaited<ReturnType<typeof getAvailableTestAccounts>> | null
        unavailableReason: string | null
      }
    | null = null

  if (administrator.membershipRole !== 'MEMBER' && process.env.NODE_ENV !== 'production') {
    if (!isTestAccountSwitcherEnabled()) {
      testAccountSwitcher = {
        accounts: null,
        unavailableReason: 'Testaccountwisselaar niet beschikbaar: feature flag uitgeschakeld.',
      }
    } else {
      try {
        testAccountSwitcher = {
          accounts: await getAvailableTestAccounts(),
          unavailableReason: null,
        }
      } catch {
        testAccountSwitcher = {
          accounts: null,
          unavailableReason: 'Testaccountwisselaar is tijdelijk niet beschikbaar.',
        }
      }
    }
  }

  const Shell = (await cookies()).get('platform-admin-view')?.value === 'v02' ? PlatformAdminShellV02 : PlatformAdminShell

  return (
    <Shell
      displayName={administrator.displayName?.trim() || 'Platformbeheerder'}
      membershipRole={administrator.membershipRole}
      testAccountSwitcher={testAccountSwitcher}
    >
      {children}
    </Shell>
  )
}
