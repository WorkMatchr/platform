export function hasPlatformAdministratorIdentity(
  administrator: { memberships: Array<{ organization: { systemKey: string | null } }> } | null,
): administrator is { memberships: Array<{ organization: { systemKey: string | null } }> } {
  return administrator?.memberships[0]?.organization.systemKey === 'WORKMATCHR_PLATFORM'
}
