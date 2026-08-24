'use client'

import { useState, useTransition } from 'react'
import { analyzeKnowledgeSourceUploadBatchAction, analyzeStoredKnowledgeSourceUploadAction, confirmKnowledgeDocumentFamilyAction, confirmKnowledgeSourceUploadAction } from '@/app/platformbeheer/kennisbank/bronnen/uploaden/actions'
import type { KnowledgeDocumentFamilyRole } from '@/generated/prisma/enums'
import type { KnowledgeBatchAnalysis } from '@/lib/knowledge/knowledge-source-upload-metadata'
import { duplicateChecksumIndexes, KNOWLEDGE_SOURCE_UPLOAD_CONCURRENCY, validateKnowledgeSourceUploadBatch } from '@/lib/knowledge/knowledge-source-upload-batch-contract'
import type { KnowledgeSourceUploadMetadata, KnowledgeSourceUploadPreview } from '@/lib/knowledge/knowledge-source-upload-service'

type Item = { id: string; file: File; state: 'WAITING' | 'ANALYZING' | 'READY' | 'ERROR' | 'IMPORTED'; preview?: KnowledgeSourceUploadPreview; metadata?: KnowledgeSourceUploadMetadata; message?: string; sourceVersionId?: string; relationshipTargetId?: string; relationshipDecision?: string; relationshipReviewed?: boolean }
type Family = { code: string; title: string; enabled: boolean; members: Array<{ checksum: string; role: KnowledgeDocumentFamilyRole }> }
const control = 'mt-1 min-h-11 w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-text-primary'

function metadataFrom(preview: KnowledgeSourceUploadPreview): KnowledgeSourceUploadMetadata {
  const p = preview.proposal
  return { sourceCode: p.sourceCode.value ?? '', title: p.title.value ?? preview.proposedTitle, publisher: p.publisher.value ?? '', versionLabel: p.versionLabel.value ?? '', canonicalFamily: p.canonicalFamily.value ?? '', sourceType: p.sourceType.value ?? '', authorityStatus: p.authorityStatus.value ?? '', temporalStatus: p.temporalStatus.value ?? '', canonicalUrl: '', series: p.series.value ?? '', publicationCode: p.publicationCode.value ?? '', edition: p.edition.value ?? '', publicationYear: p.publicationYear.value ? String(p.publicationYear.value) : '', isbn: p.isbn.value ?? '', jurisdiction: p.jurisdiction.value ?? '', applicabilityScope: p.applicabilityScope.value ?? '', scopeCode: p.scopeCode.value ?? '', scopeEffect: 'APPLIES', topics: p.topics.value ?? [] }
}

async function checksum(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (new TextDecoder('latin1').decode(bytes.slice(0, 5)) !== '%PDF-') throw new Error('Dit bestand heeft geen geldige PDF-header.')
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map((value) => value.toString(16).padStart(2, '0')).join('')
}

async function uploadAndAnalyze(file: File, hash: string) {
  if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) throw new Error('Alleen PDF-bestanden zijn toegestaan.')
  const targetResponse = await fetch('/api/knowledge-source-uploads/presign', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ checksum: hash, bytes: file.size, fileName: file.name, mediaType: file.type }) })
  const target = await targetResponse.json() as { ok: boolean; storageKey?: string; uploadUrl?: string; alreadyStored?: boolean; message?: string }
  if (!targetResponse.ok || !target.ok || !target.storageKey) throw new Error(target.message ?? 'De veilige upload kon niet worden voorbereid.')
  if (!target.alreadyStored) {
    const uploaded = await fetch(target.uploadUrl!, { method: 'PUT', headers: { 'content-type': 'application/pdf' }, body: file })
    if (!uploaded.ok) throw new Error('Het bronbestand kon niet veilig worden opgeslagen.')
  }
  const result = await analyzeStoredKnowledgeSourceUploadAction({ storageKey: target.storageKey, fileName: file.name, mediaType: file.type })
  if (!result.ok) throw new Error(result.message)
  if (result.preview.checksum !== hash) throw new Error('De opgeslagen bron komt niet overeen met het geselecteerde bestand.')
  return result.preview
}

export function KnowledgeSourceUploadForm({ storageConfigured }: { storageConfigured: boolean }) {
  const [items, setItems] = useState<Item[]>([])
  const [analysis, setAnalysis] = useState<KnowledgeBatchAnalysis | null>(null)
  const [families, setFamilies] = useState<Family[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const choose = (files: FileList) => {
    const selected = Array.from(files); setMessage(null); setAnalysis(null); setFamilies([])
    const validation = validateKnowledgeSourceUploadBatch(selected)
    if (validation.batchError) return setMessage(validation.batchError)
    setItems(selected.map((file, index) => ({ id: `${file.name}-${file.size}-${index}`, file, state: validation.fileErrors.has(index) ? 'ERROR' : 'WAITING', message: validation.fileErrors.get(index) })))
  }

  const analyze = () => startTransition(async () => {
    const analyzed = new Map<string, Item>()
    const hashed = await Promise.all(items.map(async (item) => {
      if (item.state === 'ERROR') { analyzed.set(item.id, item); return null }
      try { return { item, hash: await checksum(item.file) } } catch (error) { analyzed.set(item.id, { ...item, state: 'ERROR', message: error instanceof Error ? error.message : 'Analyse mislukt.' }); return null }
    }))
    const duplicates = duplicateChecksumIndexes(hashed.map((entry) => entry?.hash ?? null))
    const queue = hashed.flatMap((entry, index) => {
      if (!entry) return []
      if (duplicates.has(index)) { analyzed.set(entry.item.id, { ...entry.item, state: 'ERROR', message: 'Duplicaat binnen deze uploadbatch; het Blob-object wordt niet nogmaals aangemaakt.' }); return [] }
      return [entry]
    })
    setItems((current) => current.map((entry) => analyzed.get(entry.id) ?? entry))
    await Promise.all(Array.from({ length: Math.min(queue.length, KNOWLEDGE_SOURCE_UPLOAD_CONCURRENCY) }, async () => {
      for (;;) {
        const work = queue.shift(); if (!work) return
        const { item, hash } = work
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, state: 'ANALYZING' } : entry))
        try {
          const preview = await uploadAndAnalyze(item.file, hash)
          analyzed.set(item.id, { ...item, preview, metadata: metadataFrom(preview), relationshipTargetId: preview.existingRelations[0]?.sourceVersionId, state: preview.status === 'DUPLICATE' ? 'ERROR' : 'READY', message: preview.status === 'DUPLICATE' ? 'Duplicaat: deze bronversie bestaat al.' : undefined })
        } catch (error) { analyzed.set(item.id, { ...item, state: 'ERROR', message: error instanceof Error ? error.message : 'Analyse mislukt.' }) }
        setItems((current) => current.map((entry) => entry.id === item.id ? analyzed.get(item.id)! : entry))
      }
    }))
    const previews = [...analyzed.values()].flatMap((item) => item.preview ? [item.preview] : [])
    if (!previews.length) return
    const result = await analyzeKnowledgeSourceUploadBatchAction({ previews })
    if (!result.ok) return setMessage(result.message)
    setAnalysis(result.analysis)
    setFamilies(result.analysis.familySuggestions.map((family) => ({ code: family.code, title: family.title, enabled: true, members: family.members.map((member) => ({ checksum: member.checksum, role: member.role })) })))
  })

  const update = (id: string, name: keyof KnowledgeSourceUploadMetadata, value: string) => setItems((current) => current.map((item) => item.id === id && item.metadata ? { ...item, metadata: { ...item.metadata, [name]: name === 'topics' ? value.split(',').map((part) => part.trim()).filter(Boolean) : value } } : item))
  const applyShared = () => setItems((current) => current.map((item) => {
    if (!analysis || !item.metadata) return item
    const shared = analysis.sharedMetadata
    return { ...item, metadata: { ...item.metadata, ...(shared.publisher && { publisher: shared.publisher }), ...(shared.publicationYear && { publicationYear: String(shared.publicationYear), versionLabel: item.metadata.versionLabel || String(shared.publicationYear) }), ...(shared.canonicalFamily && { canonicalFamily: shared.canonicalFamily }), ...(shared.jurisdiction && { jurisdiction: shared.jurisdiction }), ...(shared.applicabilityScope && { applicabilityScope: shared.applicabilityScope }), ...(shared.topics && { topics: shared.topics }) } }
  }))
  const importOne = (id: string) => startTransition(async () => {
    const item = items.find((entry) => entry.id === id); if (!item?.preview || !item.metadata) return
    const target = item.preview.existingRelations.find((relation) => relation.sourceVersionId === item.relationshipTargetId)
    const role = item.relationshipDecision
    const storedRole = role === 'SUPPLEMENT' ? 'BACKGROUND_EVIDENCE' : role
    const relationship = target && ['BACKGROUND_EVIDENCE','APPENDIX','SUMMARY'].includes(storedRole ?? '') ? { existingSourceVersionId: target.sourceVersionId, existingSourceCode: target.sourceCode, existingSourceTitle: target.sourceTitle, role: storedRole as 'BACKGROUND_EVIDENCE' | 'APPENDIX' | 'SUMMARY' } : undefined
    const result = await confirmKnowledgeSourceUploadAction({ preview: item.preview, metadata: item.metadata, explicitlyConfirmed: true, relationshipReviewed: Boolean(item.relationshipReviewed), relationship })
    setItems((current) => current.map((entry) => entry.id !== id ? entry : result.ok ? { ...entry, state: 'IMPORTED', sourceVersionId: result.result.sourceVersionId, message: 'Als concept geïmporteerd; inhoudelijke review blijft vereist.' } : { ...entry, message: result.message }))
  })
  const saveFamilies = () => startTransition(async () => {
    for (const family of families.filter((entry) => entry.enabled)) {
      const members = family.members.map((member, index) => ({ sourceVersionId: items.find((item) => item.preview?.checksum === member.checksum)?.sourceVersionId ?? '', role: String(member.role) === 'SUPPLEMENT' ? 'BACKGROUND_EVIDENCE' as const : member.role, sequence: index + 1 }))
      if (members.some((member) => !member.sourceVersionId)) return setMessage('Importeer eerst alle bevestigde familieleden afzonderlijk.')
      const result = await confirmKnowledgeDocumentFamilyAction({ code: family.code, title: family.title, members })
      if (!result.ok) return setMessage(result.message)
    }
    setMessage('De bevestigde documentfamilies zijn vastgelegd.')
  })

  return <div className="space-y-6">
    <section className="rounded-card border border-border bg-surface p-5">
      <h2 className="font-bold text-brand-dark">Stap 1 — Upload één of meerdere bronnen</h2>
      <p className="mt-1 text-sm text-text-secondary">Kies 1–10 PDF’s, maximaal 10 MB per document en 50 MB per batch. Bestanden worden rechtstreeks en privé opgeslagen.</p>
      <label onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (event.dataTransfer.files.length) choose(event.dataTransfer.files) }} className="mt-4 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed border-brand-primary/40 bg-brand-primary/5 px-4 text-center"><span className="font-semibold text-brand-primary">Selecteer of sleep PDF-bestanden</span><span className="text-sm text-text-secondary">Analyse start pas na uw bevestiging.</span><input className="sr-only" type="file" multiple accept="application/pdf,.pdf" disabled={!storageConfigured || pending} onChange={(event) => event.target.files && choose(event.target.files)} /></label>
      {items.length ? <ul className="mt-4 space-y-2">{items.map((item) => <li key={item.id} className="flex justify-between gap-3 rounded-control border border-border px-3 py-2 text-sm"><span className="break-all">{item.state === 'READY' || item.state === 'IMPORTED' ? '✓' : item.state === 'ERROR' ? '⚠' : '•'} {item.file.name}</span><span className="shrink-0 text-text-secondary">{{ WAITING: 'wacht', ANALYZING: 'analyseert', READY: 'analyse gereed', ERROR: 'controle nodig', IMPORTED: 'geïmporteerd' }[item.state]}</span></li>)}</ul> : null}
      {items.length ? <button type="button" onClick={analyze} disabled={pending || !storageConfigured} className="mt-4 min-h-11 rounded-control bg-brand-primary px-5 font-semibold text-white disabled:opacity-50">Veilig uploaden en analyseren</button> : null}
      {message ? <p role="status" className="mt-3 text-sm text-text-secondary">{message}</p> : null}
    </section>
    {analysis ? <section className="rounded-card border border-border bg-surface p-5"><h2 className="font-bold text-brand-dark">Gezamenlijke analyse</h2><p className="mt-1 text-sm text-text-secondary">Controleer gedeelde metadata en voorgestelde relaties vóór import.</p>
      {Object.keys(analysis.sharedMetadata).length ? <button type="button" onClick={applyShared} className="mt-3 min-h-10 rounded-control border border-brand-primary px-4 text-sm font-semibold text-brand-primary">Gedeelde metadata toepassen</button> : <p className="mt-3 text-sm">Geen volledig gedeelde metadata herkend.</p>}
      {families.map((family, familyIndex) => <fieldset key={family.code} className="mt-4 rounded-control border border-border p-4"><legend className="px-2 font-semibold">Voorgestelde documentfamilie</legend><label className="flex gap-2 text-sm"><input type="checkbox" checked={family.enabled} onChange={(event) => setFamilies((current) => current.map((entry, index) => index === familyIndex ? { ...entry, enabled: event.target.checked } : entry))} />Relatie na menselijke controle bevestigen</label><label className="mt-3 block text-sm font-medium">Familienaam<input className={control} value={family.title} onChange={(event) => setFamilies((current) => current.map((entry, index) => index === familyIndex ? { ...entry, title: event.target.value } : entry))} /></label><ul className="mt-3 space-y-2">{family.members.map((member, memberIndex) => <li key={member.checksum} className="grid gap-2 sm:grid-cols-[1fr_14rem]"><span className="break-all text-sm">{items.find((item) => item.preview?.checksum === member.checksum)?.file.name}</span><select className={control} value={member.role} onChange={(event) => setFamilies((current) => current.map((entry, index) => index === familyIndex ? { ...entry, members: entry.members.map((child, childIndex) => childIndex === memberIndex ? { ...child, role: event.target.value as KnowledgeDocumentFamilyRole } : child) } : entry))}>{['PRIMARY_GUIDELINE','BACKGROUND_EVIDENCE','SUPPLEMENT','SUMMARY','CHECKLIST','APPENDIX'].map((role) => <option key={role}>{role}</option>)}</select></li>)}</ul></fieldset>)}
    </section> : null}
    {items.map((item) => item.preview && item.metadata ? <MetadataCard key={item.id} item={item} pending={pending} update={update} importOne={importOne} updateItem={(patch) => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, ...patch } : entry))} /> : null)}
    {families.some((family) => family.enabled) ? <button type="button" onClick={saveFamilies} disabled={pending} className="min-h-11 rounded-control bg-brand-primary px-5 font-semibold text-white disabled:opacity-50">Bevestigde documentfamilies vastleggen</button> : null}
  </div>
}

function MetadataCard({ item, pending, update, importOne, updateItem }: { item: Item; pending: boolean; update: (id: string, name: keyof KnowledgeSourceUploadMetadata, value: string) => void; importOne: (id: string) => void; updateItem: (patch: Partial<Item>) => void }) {
  const metadata = item.metadata!
  const proposal = item.preview!.proposal as unknown as Record<string, { confidence: string } | undefined>
  const badge = (name: keyof KnowledgeSourceUploadMetadata) => proposal[name]?.confidence ? <span className="ml-2 rounded-full bg-brand-primary/10 px-2 py-0.5 text-[11px] font-semibold text-brand-primary">{{ HIGH_CONFIDENCE: 'Hoge zekerheid', REVIEW: 'Controleren', UNKNOWN: 'Onbekend' }[proposal[name]!.confidence] ?? proposal[name]!.confidence}</span> : null
  const input = (label: string, name: keyof KnowledgeSourceUploadMetadata, value = String(metadata[name] ?? '')) => <label className="text-sm font-medium text-brand-dark">{label}{badge(name)}<input className={control} value={value} onChange={(event) => update(item.id, name, event.target.value)} /></label>
  const select = (label: string, name: keyof KnowledgeSourceUploadMetadata, options: string[]) => <label className="text-sm font-medium text-brand-dark">{label}{badge(name)}<select className={control} value={String(metadata[name])} onChange={(event) => update(item.id, name, event.target.value)}><option value="">Controleren</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>
  return <section className="rounded-card border border-border bg-surface p-5"><div className="flex flex-wrap justify-between gap-2"><div><h2 className="font-bold text-brand-dark">Stap 2 — Automatisch voorgestelde metadata</h2><p className="break-all text-sm text-text-secondary">{item.file.name}</p></div><span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold">Menselijke controle nodig</span></div>
    <div className="mt-4 grid gap-4 lg:grid-cols-2">{input('Titel', 'title')}{input('Uitgever', 'publisher')}{input('Publicatiejaar', 'publicationYear')}{input('Versie', 'versionLabel')}{input('Broncode', 'sourceCode')}{input('Openbare bron-URL (optioneel)', 'canonicalUrl')}</div>
    <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={!metadata.canonicalUrl} onChange={(event) => { if (event.target.checked) update(item.id, 'canonicalUrl', '') }} />Geen openbare URL beschikbaar</label>
    <details className="mt-5 rounded-control border border-border p-4"><summary className="cursor-pointer font-semibold text-brand-dark">Geavanceerde brongegevens</summary><div className="mt-4 grid gap-4 lg:grid-cols-2">{input('Reeks', 'series')}{input('Publicatiecode', 'publicationCode')}{input('Editie', 'edition')}{input('ISBN', 'isbn')}{select('Bronfamilie', 'canonicalFamily', ['LEGISLATION','LABOUR_INSPECTORATE','GOVERNMENT_GUIDANCE','PGS','AI_SHEET','ARBOCATALOGUE','TNO','SER','RIVM','NVAB','STANDARD','INTERNATIONAL_GUIDANCE'])}{select('Documenttype', 'sourceType', ['AI_SHEET','LEGISLATION','REGULATION','INSPECTORATE_GUIDANCE','ARBOCATALOGUE','STANDARD','RESEARCH','PROFESSIONAL_GUIDANCE','INTERNAL_EXPERTISE','CASE_LAW','OTHER'])}{select('Autoriteit', 'authorityStatus', ['OFFICIAL_PRIMARY','OFFICIAL_GUIDANCE','AUTHORIZED_PUBLICATION','PROFESSIONAL_REFERENCE','UNKNOWN'])}{select('Actualiteit', 'temporalStatus', ['CURRENT','HISTORICAL','SUPERSEDED','WITHDRAWN','UNDER_REVIEW','UNKNOWN'])}{input('Jurisdictie', 'jurisdiction')}{input('Toepassingsgebied', 'applicabilityScope')}{input('Scopecode', 'scopeCode')}{input('Onderwerpen', 'topics', metadata.topics.join(', '))}</div></details>
    {item.preview!.existingRelations.length ? <div className="mt-4 rounded-control border border-warning p-3"><h3 className="text-sm font-semibold">Mogelijke relatie met bestaande bron</h3><ul className="mt-1 space-y-1 text-sm">{item.preview!.existingRelations.map((relation) => <li key={relation.sourceId}>{relation.sourceCode} — {relation.sourceTitle}: {relation.rationale}</li>)}</ul><label className="mt-3 block text-sm font-medium">Bestaande bron<select className={control} value={item.relationshipTargetId ?? ''} onChange={(event) => updateItem({ relationshipTargetId: event.target.value, relationshipReviewed: false, relationshipDecision: '' })}>{item.preview!.existingRelations.map((relation) => <option key={relation.sourceVersionId} value={relation.sourceVersionId}>{relation.sourceCode} — {relation.sourceTitle}</option>)}</select></label><label className="mt-3 block text-sm font-medium">Beoordeelde relatie<select className={control} value={item.relationshipDecision ?? ''} onChange={(event) => updateItem({ relationshipDecision: event.target.value, relationshipReviewed: Boolean(event.target.value) })}><option value="">Kies na controle</option><option value="BACKGROUND_EVIDENCE">Koppelen als achtergronddocument</option><option value="APPENDIX">Koppelen als bijlage</option><option value="SUMMARY">Koppelen als samenvatting</option><option value="SUPPLEMENT">Koppelen als aanvullende bron</option><option value="NEW_VERSION">Nieuwe versie</option><option value="INDEPENDENT">Toch als zelfstandige bron</option></select></label></div> : <label className="mt-4 flex items-start gap-2 rounded-control border border-border p-3 text-sm"><input type="checkbox" checked={Boolean(item.relationshipReviewed)} onChange={(event) => updateItem({ relationshipReviewed: event.target.checked, relationshipDecision: event.target.checked ? 'INDEPENDENT' : '' })} />Ik heb gecontroleerd dat dit document als zelfstandige bron kan worden geïmporteerd.</label>}
    <p className="mt-3 text-xs text-text-secondary">{item.preview!.pageCount} pagina’s · {item.preview!.blockCount} bronblokken · checksum {item.preview!.checksum.slice(0, 12)}…</p>{item.message ? <p role="status" className="mt-2 text-sm text-text-secondary">{item.message}</p> : null}<button type="button" disabled={pending || !item.relationshipReviewed || item.state === 'IMPORTED' || ['DUPLICATE','CONFLICT','UNPROCESSABLE'].includes(item.preview!.status)} onClick={() => importOne(item.id)} className="mt-4 min-h-11 rounded-control bg-brand-primary px-5 font-semibold text-white disabled:opacity-50">Gecontroleerd importeren als concept</button>
  </section>
}
