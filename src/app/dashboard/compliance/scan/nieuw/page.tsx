import { AuthShell } from '@/components/auth/auth-shell'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'
import { FullComplianceScan } from './full-compliance-scan'

export const metadata = { title: 'Volledige Arbo Compliance Scan | WorkMatchr' }

export default async function NewComplianceScanPage() {
  await requireOrganizationMembership(undefined, '/dashboard/compliance/scan/nieuw')
  return (
    <AuthShell title="Volledige Arbo Compliance Scan" intro="Beantwoord alleen de onderwerpen die op basis van uw gratis intake relevant of mogelijk relevant zijn." wide>
      <FullComplianceScan />
    </AuthShell>
  )
}
