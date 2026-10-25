'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireLearningUser } from '@/lib/learning/learning-authorization'
import { saveLearningCertificateName } from '@/lib/learning/learning-certificate-service'

const nameSchema = z.object({
  firstName: z.string().trim().min(1, 'Vul uw voornaam in.').max(100, 'Uw voornaam mag maximaal 100 tekens bevatten.'),
  lastName: z.string().trim().min(1, 'Vul uw achternaam in.').max(100, 'Uw achternaam mag maximaal 100 tekens bevatten.'),
})

export async function saveCertificateNameAction(formData: FormData) {
  const user = await requireLearningUser('/e-learnings/certificaat/gegevens')
  const parsed = nameSchema.safeParse({ firstName: formData.get('firstName'), lastName: formData.get('lastName') })
  if (!parsed.success) redirect('/e-learnings/certificaat/gegevens?melding=naam')
  await saveLearningCertificateName(user.id, parsed.data.firstName, parsed.data.lastName)
  redirect('/e-learnings/mijn?certificaat=beschikbaar')
}
