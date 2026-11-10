import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireLearningUser } from '@/lib/learning/learning-authorization'
import { paidPilotEnabled } from '@/lib/learning/learning-exam-runtime-version'
import { getPrisma } from '@/lib/prisma'

const topics = {
  inhoud: 'Inhoud',
  niveau: 'Moeilijkheid',
  bediening: 'Gebruiksgemak',
  fouten: 'Technische fouten',
  toets: 'Onduidelijke toetsvragen',
} as const
const choices = ['Geen opmerkingen', 'Verbetering gewenst', 'Bespreken met pilotbeheer'] as const
async function save(data: FormData) {
  'use server'
  if (!paidPilotEnabled()) return
  const user = await requireLearningUser('/e-learnings/pilot')
  const grant = z.uuid().parse(data.get('grant'))
  const minutes = z
    .string()
    .regex(/^\d{1,4}$/)
    .transform(Number)
    .pipe(z.number().max(1440))
    .parse(data.get('minutes'))
  const feedback = Object.fromEntries(
    Object.keys(topics).map((key) => [key, z.enum(choices).parse(data.get(key))]),
  )
  await getPrisma().learningPilotAssignment.updateMany({
    where: {
      id: grant,
      userId: user.id,
      paidSlot: { not: null },
      redeemedAt: { not: null },
      enrollment: { accessRevokedAt: null },
    },
    data: { offlineMinutes: minutes, feedback },
  })
  redirect('/e-learnings/pilot?melding=feedback')
}
export function PilotFeedback({
  grant,
  title,
  minutes,
  feedback,
}: {
  grant: string
  title: string
  minutes: number | null
  feedback: unknown
}) {
  const stored = feedback && typeof feedback === 'object' ? (feedback as Record<string, string>) : {}
  return (
    <details>
      <summary>Studietijd en feedback voor {title}</summary>
      <form action={save} className="space-y-2">
        <input type="hidden" name="grant" value={grant} />
        <label className="block">
          Totaal offline bestede minuten{' '}
          <input type="number" min={0} max={1440} name="minutes" defaultValue={minutes ?? ''} required />
        </label>
        {Object.entries(topics).map(([key, label]) => (
          <label className="block" key={key}>
            {label}{' '}
            <select aria-label={label} name={key} defaultValue={stored[key] ?? ''} required>
              <option value="">Maak een keuze</option>
              {choices.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        ))}
        <button>Evaluatie opslaan</button>
      </form>
    </details>
  )
}
