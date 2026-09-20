"use server"

import { requireUser } from '@/lib/authorization'
import { getPrisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function updateAssignmentEmailPreference(_previous: { message: string }, form: FormData) {
  const user = await requireUser('/account')
  const result = await getPrisma().user.updateMany({
    where: { id: user.id, status: 'ACTIVE', accountType: 'PROFESSIONAL' },
    data: { assignmentEmailEnabled: form.get('assignmentEmailEnabled') === 'on' },
  })
  if (result.count !== 1) return { message: 'Uw voorkeur kon niet worden opgeslagen.' }
  revalidatePath('/account')
  return { message: 'Uw e-mailvoorkeur is opgeslagen.' }
}
