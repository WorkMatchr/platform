export function requireFinancialOrganizationId(organizationId: string | null): string {
  if (!organizationId) throw new Error('FINANCIAL_ORGANIZATION_REQUIRED')
  return organizationId
}
