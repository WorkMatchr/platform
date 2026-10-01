'use server'

import { revalidatePath } from 'next/cache'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'
import { updateComplianceAction } from '@/lib/compliance/compliance-action-service'

export async function updateComplianceActionFromForm(formData: FormData) {
  const { user, activeMembership } = await requireOrganizationMembership(undefined, '/dashboard/compliance')
  const actionId = String(formData.get('actionId') ?? '')
  const status = String(formData.get('status') ?? '')
  const assigned = String(formData.get('assignedUserId') ?? '')
  const dueAtValue = String(formData.get('dueAt') ?? '')

  await updateComplianceAction(
    { userId: user.id, organizationId: activeMembership.organization.id },
    {
      actionId,
      status,
      assignedUserId: assigned || null,
      dueAt: dueAtValue ? new Date(dueAtValue + 'T12:00:00.000Z') : null,
    },
  )

  revalidatePath('/dashboard/compliance')
}
