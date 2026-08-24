import type { Metadata } from 'next'
import Link from 'next/link'
import { AdminPageHeader, AdminSection } from '@/components/platform-admin/platform-admin-ui'
import { KnowledgeSourceUploadForm } from '@/components/platform-admin/knowledge-source-upload-form'
import { isKnowledgeSourceUploadStorageConfigured } from '@/lib/knowledge/knowledge-source-upload-storage'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'

export const metadata: Metadata = { title: 'Bron uploaden | Kennisbeheer | WorkMatchr' }

export default async function KnowledgeSourceUploadPage() {
  await requirePlatformAdministrator('/platformbeheer/kennisbank/bronnen/uploaden')
  const storageConfigured = isKnowledgeSourceUploadStorageConfigured()
  return <div>
    <AdminPageHeader
      eyebrow="Kennisbeheer"
      title="Bron uploaden"
      description="Analyseer een PDF, controleer de bronmetadata en bevestig daarna pas de import als interne conceptkennis. Uploaden publiceert nooit automatisch."
      action={<Link className="inline-flex min-h-10 items-center rounded-control border border-brand-primary px-4 text-sm font-semibold text-brand-primary" href="/platformbeheer/kennisbank">Terug naar kennisbeheer</Link>}
    />
    {!storageConfigured ? <div className="rounded-card border border-warning bg-surface p-4" role="status">
      <h2 className="font-bold text-brand-dark">Upload nog niet geactiveerd</h2>
      <p className="mt-1 text-sm leading-6 text-text-secondary">Een private, duurzame object-storagevoorziening moet nog worden gekozen en aangesloten. WorkMatchr slaat bronbestanden niet tijdelijk op het serverfilesystem of als base64 in de database op.</p>
    </div> : null}
    <AdminSection title="Gecontroleerde bronimport" description="Alleen PDF-bestanden tot 10 MB. Metadata uit het document is een voorstel en blijft menselijke controle vereisen.">
      <KnowledgeSourceUploadForm storageConfigured={storageConfigured} />
    </AdminSection>
  </div>
}
