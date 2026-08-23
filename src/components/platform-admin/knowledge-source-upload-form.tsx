'use client'

import { useState, useTransition } from 'react'
import {
  analyzeKnowledgeSourceUploadAction,
  confirmKnowledgeSourceUploadAction,
} from '@/app/platformbeheer/kennisbank/bronnen/uploaden/actions'
import type { KnowledgeSourceUploadMetadata, KnowledgeSourceUploadPreview } from '@/lib/knowledge/knowledge-source-upload-service'

const initialMetadata: KnowledgeSourceUploadMetadata = {
  sourceCode: '', title: '', publisher: '', versionLabel: '', canonicalFamily: 'GOVERNMENT_GUIDANCE',
  sourceType: 'PROFESSIONAL_GUIDANCE', authorityStatus: 'UNKNOWN', temporalStatus: 'UNKNOWN',
  canonicalUrl: '', jurisdiction: 'NL', applicabilityScope: '', scopeCode: '', scopeEffect: 'APPLIES', topics: [],
}

const fieldClass = 'mt-1 min-h-11 w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-text-primary'

export function KnowledgeSourceUploadForm({ storageConfigured }: { storageConfigured: boolean }) {
  const [preview, setPreview] = useState<KnowledgeSourceUploadPreview | null>(null)
  const [metadata, setMetadata] = useState(initialMetadata)
  const [message, setMessage] = useState<string | null>(null)
  const [result, setResult] = useState<{ sourceVersionId: string; status: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const analyze = (file: File | undefined) => {
    if (!file) return
    const formData = new FormData(); formData.set('file', file)
    setMessage(null)
    startTransition(async () => {
      const response = await analyzeKnowledgeSourceUploadAction(formData)
      if (!response.ok) return setMessage(response.message)
      setPreview(response.preview)
      setMetadata((current) => ({ ...current, title: response.preview.proposedTitle }))
    })
  }

  const update = (name: keyof KnowledgeSourceUploadMetadata, value: string) => {
    setMetadata((current) => ({ ...current, [name]: name === 'topics' ? value.split(',').map((topic) => topic.trim()).filter(Boolean) : value }))
  }

  const confirm = () => {
    if (!preview) return
    setMessage(null)
    startTransition(async () => {
      const response = await confirmKnowledgeSourceUploadAction({ preview, metadata, explicitlyConfirmed: true })
      if (!response.ok) return setMessage(response.message)
      setResult({ sourceVersionId: response.result.sourceVersionId, status: response.result.status })
    })
  }

  if (result) return (
    <div className="rounded-card border border-success bg-surface p-5" role="status">
      <h2 className="font-bold text-brand-dark">Bron als concept verwerkt</h2>
      <p className="mt-2 text-sm text-text-secondary">De volledige brontekst is opgeslagen. De bron blijft in menselijke review en is niet gepubliceerd.</p>
      <p className="mt-2 text-xs text-text-secondary">Bronversie: {result.sourceVersionId}</p>
    </div>
  )

  return <div className="space-y-6">
    <section aria-labelledby="upload-title">
      <h2 id="upload-title" className="text-lg font-bold text-brand-dark">1. PDF analyseren</h2>
      <p className="mt-1 text-sm text-text-secondary">PDF, maximaal 10 MB. Bestandsnaam en gevonden metadata gelden alleen als voorstel.</p>
      <label
        className={`mt-3 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed border-border bg-surface p-6 text-center ${!storageConfigured ? 'cursor-not-allowed opacity-60' : 'hover:border-brand-primary'}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => { event.preventDefault(); if (storageConfigured) analyze(event.dataTransfer.files[0]) }}
      >
        <span className="font-semibold text-brand-dark">Sleep een PDF hierheen of selecteer een bestand</span>
        <input className="sr-only" type="file" name="file" accept="application/pdf,.pdf" disabled={!storageConfigured || pending} onChange={(event) => analyze(event.target.files?.[0])} />
      </label>
    </section>

    {message ? <p className="rounded-control border border-error bg-surface p-3 text-sm text-error" role="alert">{message}</p> : null}
    {pending ? <p className="text-sm text-text-secondary" role="status">Bezig met veilige verwerking…</p> : null}

    {preview ? <section aria-labelledby="preview-title">
      <h2 id="preview-title" className="text-lg font-bold text-brand-dark">2. Analyse controleren</h2>
      <div className="mt-3 grid gap-3 rounded-card border border-border bg-surface p-4 text-sm sm:grid-cols-2">
        <p><strong>Bestand:</strong> {preview.fileName}</p><p><strong>Grootte:</strong> {(preview.bytes / 1024 / 1024).toFixed(2)} MB</p>
        <p><strong>Pagina’s:</strong> {preview.pageCount}</p><p><strong>Bronblokken:</strong> {preview.blockCount}</p>
        <p><strong>Classificatie:</strong> {preview.status === 'POSSIBLE_DUPLICATE' ? 'Mogelijk duplicaat' : 'Metadata controleren'}</p>
        <p><strong>Checksum:</strong> gecontroleerd</p>
      </div>
      {preview.duplicate ? <p className="mt-3 rounded-control border border-warning bg-surface p-3 text-sm text-warning">Deze inhoud bestaat mogelijk al als {preview.duplicate.sourceCode}, versie {preview.duplicate.versionLabel}. Import blijft geblokkeerd.</p> : null}
      <ul className="mt-3 list-disc pl-5 text-sm text-text-secondary">{preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <TextField label="Broncode" name="sourceCode" value={metadata.sourceCode} update={update} />
        <TextField label="Titel" name="title" value={metadata.title} update={update} />
        <TextField label="Uitgever" name="publisher" value={metadata.publisher} update={update} />
        <TextField label="Versie of publicatiejaar" name="versionLabel" value={metadata.versionLabel} update={update} />
        <SelectField label="Bronfamilie" name="canonicalFamily" value={metadata.canonicalFamily} update={update} options={['LEGISLATION','LABOUR_INSPECTORATE','GOVERNMENT_GUIDANCE','PGS','AI_SHEET','ARBOCATALOGUE','TNO','SER','RIVM','NVAB','STANDARD','INTERNATIONAL_GUIDANCE']} />
        <SelectField label="Documenttype" name="sourceType" value={metadata.sourceType} update={update} options={['AI_SHEET','LEGISLATION','REGULATION','INSPECTORATE_GUIDANCE','ARBOCATALOGUE','STANDARD','RESEARCH','PROFESSIONAL_GUIDANCE','INTERNAL_EXPERTISE','CASE_LAW','OTHER']} />
        <SelectField label="Autoriteitsstatus" name="authorityStatus" value={metadata.authorityStatus} update={update} options={['OFFICIAL_PRIMARY','OFFICIAL_GUIDANCE','AUTHORIZED_PUBLICATION','PROFESSIONAL_REFERENCE','UNKNOWN']} />
        <SelectField label="Temporaliteit" name="temporalStatus" value={metadata.temporalStatus} update={update} options={['CURRENT','HISTORICAL','SUPERSEDED','WITHDRAWN','UNDER_REVIEW','UNKNOWN']} />
        <TextField label="Canonieke HTTPS-URL" name="canonicalUrl" value={metadata.canonicalUrl} update={update} />
        <TextField label="Jurisdictie" name="jurisdiction" value={metadata.jurisdiction} update={update} />
        <TextField label="Toepassingsgebied" name="applicabilityScope" value={metadata.applicabilityScope} update={update} />
        <TextField label="Scopecode" name="scopeCode" value={metadata.scopeCode} update={update} />
        <SelectField label="Scope-effect" name="scopeEffect" value={metadata.scopeEffect} update={update} options={['APPLIES','CONDITIONAL','EXCLUDES']} />
        <TextField label="Onderwerpen (komma-gescheiden)" name="topics" value={metadata.topics.join(', ')} update={update} />
      </div>
      <button type="button" disabled={pending || Boolean(preview.duplicate)} onClick={confirm} className="mt-5 min-h-11 rounded-control bg-brand-primary px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Gecontroleerd importeren als concept</button>
      <p className="mt-2 text-xs text-text-secondary">Deze actie publiceert niets en maakt geen gevalideerde kennis.</p>
    </section> : null}
  </div>
}

function TextField({ label, name, value, update }: { label: string; name: keyof KnowledgeSourceUploadMetadata; value: string; update: (name: keyof KnowledgeSourceUploadMetadata, value: string) => void }) {
  return <label className="text-sm font-medium text-brand-dark">{label}<input className={fieldClass} value={value} onChange={(event) => update(name, event.target.value)} /></label>
}

function SelectField({ label, name, value, options, update }: { label: string; name: keyof KnowledgeSourceUploadMetadata; value: string; options: string[]; update: (name: keyof KnowledgeSourceUploadMetadata, value: string) => void }) {
  return <label className="text-sm font-medium text-brand-dark">{label}<select className={fieldClass} value={value} onChange={(event) => update(name, event.target.value)}>{options.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}</select></label>
}
