import 'server-only'
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto'
import { z } from 'zod'
import { contactSchema, contactSubjects } from './contact-contract'
import { escapeHtml, type AuthEmail } from '@/lib/email'

const contentSchema = contactSchema.omit({ website: true, requestId: true }).extend({ recipient: z.email() }).strict()
export type ContactContent = z.infer<typeof contentSchema>
const envelopeSchema = z.object({ version: z.literal(1), digest: z.string().regex(/^[a-f0-9]{64}$/),
  iv: z.string(), tag: z.string(), ciphertext: z.string().max(30000) }).strict()
export function contactDigest(content: ContactContent, key: Buffer) {
  return createHmac('sha256', key).update(JSON.stringify(contentSchema.parse(content))).digest('hex')
}
export function sealContact(content: ContactContent, key: Buffer, identity: string) {
  const validated = contentSchema.parse(content), iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  cipher.setAAD(Buffer.from(identity))
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(validated), 'utf8'), cipher.final()])
  return { version: 1 as const, digest: contactDigest(validated, key), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') }
}
export function openContact(payload: unknown, key: Buffer, identity: string): ContactContent {
  const sealed = envelopeSchema.parse(payload)
  const iv = Buffer.from(sealed.iv, 'base64'), tag = Buffer.from(sealed.tag, 'base64')
  if (iv.length !== 12 || tag.length !== 16) throw new Error('INVALID_CONTACT_ENVELOPE')
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAAD(Buffer.from(identity)); decipher.setAuthTag(tag)
  const raw: unknown = JSON.parse(Buffer.concat([decipher.update(Buffer.from(sealed.ciphertext, 'base64')), decipher.final()]).toString('utf8'))
  const content = contentSchema.parse(raw)
  if (contactDigest(content, key) !== sealed.digest) throw new Error('INVALID_CONTACT_ENVELOPE')
  return content
}
export function renderContactEmail(content: ContactContent, idempotencyKey: string): AuthEmail {
  const subject = contactSubjects[content.subject]
  return { kind: 'CONTACT_MESSAGE', to: content.recipient, subject: `${subject} | WorkMatchr`,
    text: `Onderwerp: ${subject}\nNaam: ${content.name}\nE-mailadres: ${content.email}\n\n${content.message}`,
    html: `<p>Onderwerp: ${subject}</p><p>Naam: ${escapeHtml(content.name)}</p><p>E-mailadres: ${escapeHtml(content.email)}</p><p>${escapeHtml(content.message).replaceAll('\n', '<br>')}</p>`,
    idempotencyKey }
}
