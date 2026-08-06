import type { ReactNode } from 'react'
import { PlatformAdminShell } from '@/components/platform-admin/platform-admin-shell'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { getAvailableTestAccounts } from '@/lib/test-impersonation/test-impersonation-service'
import { isTestAccountSwitcherEnabled } from '@/lib/test-impersonation/test-impersonation-policy'

export default async function PlatformAdminLayout({ children }: { children: ReactNode }) {
  const administrator = await requirePlatformAdministrator('/platformbeheer')
  let testAccountSwitcher:
    | {
        accounts: Awaited<ReturnType<typeof getAvailableTestAccounts>> | null
        unavailableReason: string | null
      }
    | null = null

  if (process.env.NODE_ENV !== 'production') {
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

  return (
    <PlatformAdminShell
      displayName={administrator.displayName?.trim() || 'Platformbeheerder'}
      testAccountSwitcher={testAccountSwitcher}
    >
      {children}
    </PlatformAdminShell>
  )
}
