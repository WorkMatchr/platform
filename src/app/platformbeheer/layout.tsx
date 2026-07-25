import type { ReactNode } from 'react'
import { PlatformAdminShell } from '@/components/platform-admin/platform-admin-shell'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'

export default async function PlatformAdminLayout({ children }: { children: ReactNode }) {
  const administrator = await requirePlatformAdministrator('/platformbeheer')
  return <PlatformAdminShell displayName={administrator.displayName?.trim() || 'Platformbeheerder'}>{children}</PlatformAdminShell>
}
