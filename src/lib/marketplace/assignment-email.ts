import { z } from 'zod'
import { escapeHtml, type AuthEmail } from '@/lib/email'
import { assignmentPreviewSchema, assignmentPreviewStart } from './assignment-purchase-preview'

export const assignmentEmailPayloadSchema = z.object({ schemaVersion: z.literal(2), invitationId: z.uuid(), preview: assignmentPreviewSchema })
export function renderAssignmentEmail(payload: unknown, to: string, origin: string, idempotencyKey: string): AuthEmail {
  const { invitationId, preview: p } = assignmentEmailPayloadSchema.parse(payload)
  const base = new URL(origin)
  if (base.username || base.password || (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(base.hostname)))) throw new Error('EMAIL_ORIGIN_INVALID')
  const url = new URL(`/uitnodigingen/${invitationId}`, base.origin).href
  const additional = p.matchType === 'ADDITIONAL'
  if (!p.matchType || !p.recipientExpertise || !p.expertise) throw new Error('EMAIL_MATCH_INVALID')
  const subject = `Nieuwe opdracht ${additional ? 'mogelijk relevant voor' : 'voor'} ${p.recipientExpertise} | WorkMatchr`
  const date = (value: Date | null) => value ? value.toLocaleDateString('nl-NL', { timeZone: 'Europe/Amsterdam' }) : 'In overleg'
  const lines = [
    additional ? 'Uw deskundigheid is als aanvullende deskundigheid geselecteerd voor deze opdracht.' : 'Bekijk vrijblijvend de opdrachtpreview en de actuele ontgrendelprijs.',
    additional ? 'Nieuwe opdracht die mogelijk aansluit bij uw expertise' : 'Nieuwe opdracht die aansluit bij uw expertise',
    `Er staat een nieuwe opdracht op WorkMatchr waarvoor ${p.expertise} als primaire deskundigheid${additional ? ` en ${p.recipientExpertise} als aanvullende deskundigheid zijn geselecteerd` : ' is geselecteerd'}. Uw actieve profiel sluit aan bij deze selectie.`,
    'Waar gaat de opdracht over?', p.kind, p.safeSummary, `Opdrachtnummer: ${p.assignmentId}`,
    'Opdracht in het kort', `Primaire deskundigheid: ${p.expertise}`,
    `Uw match: ${p.recipientExpertise} — ${additional ? 'aanvullend' : 'primair'}`,
    `Uitvoering: ${p.allowsRemoteWork ? 'Op afstand mogelijk' : 'Op locatie'}`,
    `Locatie: ${p.region ?? 'Regio niet vermeld'}`, `Sector: ${p.sector ?? 'Niet vermeld'}`,
    `Gewenste start: ${assignmentPreviewStart(p)}`, `Reageren mogelijk tot: ${date(p.responseDeadline)}`,
    `Volledige opdracht ontgrendelen: ${p.priceCredits} credits`,
    'De genoemde prijs is de vastgelegde WorkMatchr-prijs voor deze opdracht.',
    'Interesse? Bekijk eerst vrijblijvend de opdrachtpreview op WorkMatchr. U beslist daarna zelf of u de volledige opdracht wilt ontgrendelen.',
    'Na ontgrendeling krijgt u toegang tot de volledige opdrachtgegevens die WorkMatchr voor deelnemers beschikbaar stelt.',
  ]
  return { kind: 'MARKETPLACE_ASSIGNMENT', to, subject, idempotencyKey,
    text: `${lines.join('\n\n')}\n\nBekijk de gratis preview: ${url}`,
    html: `<html lang="nl"><body>${lines.map(line => `<p>${escapeHtml(line)}</p>`).join('')}<p><a href="${escapeHtml(url)}">Bekijk de gratis preview</a></p></body></html>`,
  }
}
