'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ZodError } from 'zod'
import { Button } from '@/components/ui/button'
import { fieldClassName } from '@/components/auth/auth-shell'
import { AcademyMediaUpload } from './academy-media-upload'
import { validateAcademyBundle, type AcademyCourseBundle } from '@/lib/learning/academy-content-standard'
import { saveCourse, prepareCourseRevision } from '@/app/platformbeheer/academy/cursussen/actions'

type Json = null | boolean | number | string | Json[] | { [key: string]: Json }
const labels: Record<string, string> = {
  title: 'Titel', description: 'Beschrijving', subtitle: 'Ondertitel', courseCode: 'Cursuscode', slug: 'Adresnaam', courseVersion: 'Cursusversie', examVersion: 'Toetsversie',
  objectives: 'Leerdoelen', paragraphs: 'Alinea’s', body: 'Tekst', items: 'Onderdelen', steps: 'Stappen', footer: 'Afsluiting', label: 'Bijschrift', estimatedMinutes: 'Studieduur (minuten)',
  text: 'Tekst', value: 'Antwoordcode', isCorrect: 'Juist antwoord', correctAnswer: 'Juiste antwoorden', questionText: 'Vraag', explanation: 'Feedback en uitleg', options: 'Antwoordmogelijkheden',
  learningObjective: 'Leerdoel', knowledgeAreas: 'Kennisthema’s', chapterNumber: 'Hoofdstuknummer', cognitiveLevel: 'Begrip/toepassen/analyseren', difficulty: 'Moeilijkheid',
  criticalConcept: 'Kritiek onderwerp', legalReviewRequired: 'Juridische beoordeling vereist', sourceIds: 'Broncodes', url: 'Bronverwijzing', scope: 'Toepasselijkheid', status: 'Bronstatus',
  code: 'Code', version: 'Versie', type: 'Soort', data: 'Inhoud', questionCode: 'Vraagcode', src: 'Afbeelding', alt: 'Tekstalternatief', caption: 'Bijschrift',
  prompt: 'Opdracht', tone: 'Presentatie', position: 'Volgorde', learningObjectives: 'Leerdoelen', eyebrow: 'Bovenregel', estimatedDurationLabel: 'Studieduur',
  certificateTemplateVersion: 'Certificaattype', passingScore: 'Benodigde juiste antwoorden', passingPercentage: 'Slagingspercentage', questionCount: 'Aantal toetsvragen', attemptLimit: 'Maximum pogingen',
  consentCopy: 'Toestemming kennisbehoud', annualConsentCopy: 'Toestemming jaarherinnering', sources: 'Bronnen', checkedAt: 'Broncontroledatum', id: 'Broncode',
}
const choices: Record<string, string[]> = {
  type: ['HEADING', 'TEXT', 'CALLOUT', 'PROCESS', 'SUMMARY', 'SINGLE_CHOICE', 'MULTI_CHOICE', 'IMAGE'],
  cognitiveLevel: ['B', 'T', 'A'], status: ['CHECKED', 'MANUAL_REVIEW_REQUIRED'],
  certificateTemplateVersion: ['ACADEMY-CERT-2.0', 'ACADEMY-CERT-1.0', 'WL-001-CERT-1.0'],
}
const fixed = new Set(['code', 'courseCode', 'slug', 'questionCode', 'version', 'position', 'chapterNumber', 'formatVersion', 'contentStatus', 'futureLearningBenefit', 'reviewFlags', 'reviewStage', 'bankVersion', 'programVersion', 'selectionPolicyVersion', 'consentVersion', 'annualCheckVersion', 'annualConsentVersion', 'programCode', 'questionCount', 'passingPercentage', 'courseVersion', 'correctAnswer'])

function ValueEditor({ value, onChange, label, path, locked = false }: { value: Json; onChange: (value: Json) => void; label: string; path: string; locked?: boolean }) {
  const key = path.split('.').at(-1)!
  const readOnly = locked || fixed.has(key)
  const available = key === 'type' && typeof value === 'string' && ['SINGLE_CHOICE', 'MULTI_CHOICE'].includes(value) ? ['SINGLE_CHOICE', 'MULTI_CHOICE'] : choices[key]
  if (value === null) return <label className="block">{label}<input className={fieldClassName} type="number" min={1} placeholder="Onbeperkt" disabled={readOnly} value="" onChange={event => onChange(event.target.value ? Number(event.target.value) : null)} /></label>
  if (typeof value === 'boolean') return <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={value} disabled={readOnly} onChange={event => onChange(event.target.checked)} />{label}</label>
  if (typeof value === 'number') return <label className="block">{label}<input type="number" className={fieldClassName} value={value} disabled={readOnly} onChange={event => onChange(event.target.value === '' ? null : Number(event.target.value))} /></label>
  if (typeof value === 'string') return <label className="block">{label}{available ? <select className={fieldClassName} value={value} disabled={readOnly} onChange={event => onChange(event.target.value)}>{available.map(option => <option key={option}>{option}</option>)}</select> : <textarea className={`${fieldClassName} min-h-20`} rows={value.length > 300 ? 5 : 2} value={value} readOnly={readOnly} onChange={event => onChange(event.target.value)} />}</label>
  if (Array.isArray(value)) return <fieldset className="space-y-3 border-l-2 border-border pl-3"><legend className="font-semibold">{label}</legend>{value.map((item, index) => <div key={index} className="space-y-2"><ValueEditor value={item} label={`${label} ${index + 1}`} path={`${path}.${index}`} locked={readOnly} onChange={next => onChange(value.map((old, at) => index === at ? next : old))} />{!readOnly && <Button type="button" variant="outline" onClick={() => onChange(value.filter((_, at) => at !== index))}>Verwijder {label.toLocaleLowerCase('nl')} {index + 1}</Button>}</div>)}{!readOnly && <Button type="button" variant="outline" onClick={() => onChange([...value, typeof value[0] === 'object' ? structuredClone(value[0]) : ''])}>Voeg {label.toLocaleLowerCase('nl')} toe</Button>}</fieldset>
  return <fieldset className="space-y-4"><legend className="font-semibold">{label}</legend>{Object.entries(value).map(([field, item]) => <ValueEditor key={field} value={item} label={labels[field] ?? field} path={`${path}.${field}`} locked={readOnly} onChange={next => onChange({ ...value, [field]: next })} />)}</fieldset>
}

function withAnswers(value: unknown) {
  const question = value as AcademyCourseBundle['examQuestions'][number]
  return { ...question, correctAnswer: question.options.filter(option => option.isCorrect).map(option => option.value) }
}
const sections = [['course', 'Cursus en certificaat'], ['chapter', 'Hoofdstuk en leerdoelen'], ['blocks', 'Lessen en praktijkopdrachten'], ['questions', 'Kennisvragen'], ['exam', 'Eindtoetsvragen'], ['settings', 'Eindtoetsinstellingen'], ['retention', 'Kennisbehoudvragen'], ['sources', 'Bronverwijzingen']]

export function AcademyBundleEditor({ initial, id, revision = 0 }: { initial: AcademyCourseBundle; id?: string; revision?: number }) {
  const [bundle, setBundle] = useState(initial)
  const [editable, setEditable] = useState(!id)
  const [part, setPart] = useState('course')
  const [chapter, setChapter] = useState(0)
  const [index, setIndex] = useState(0)
  const [version, setVersion] = useState(`${initial.courseVersion.match(/\d+\.\d+/)?.[0] ?? '1.0'}-edit1`)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const alert = useRef<HTMLParagraphElement>(null)
  const router = useRouter()
  const current = bundle.chapters[chapter]

  function exportBundle() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(bundle, null, 2) + '\n'], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = `${bundle.definition.courseCode}-${bundle.courseVersion}.json`; link.click(); URL.revokeObjectURL(url)
  }
  async function prepare() {
    if (!id) return
    setBusy(true)
    try {
      const result = await prepareCourseRevision(id, version)
      if (!result.ok) { setMessage(result.message); return }
      setBundle(result.bundle); setEditable(true); setMessage('Nieuwe conceptversie voorbereid. Controleer uw wijzigingen en sla ze op.')
    } catch { setMessage('De voorbereiding is niet gelukt. Er is niets opgeslagen.') }
    finally { setBusy(false) }
  }
  async function save() {
    setBusy(true); setMessage('')
    try {
      validateAcademyBundle(bundle)
      const result = await saveCourse(bundle, id, revision)
      if (!result.ok) throw Error(result.message)
      setMessage('De volledige cursus is als conceptversie opgeslagen.')
      router.push(`/platformbeheer/academy/cursussen/${result.id}`); router.refresh()
    } catch (error) {
      setMessage(error instanceof ZodError ? `Controleer ${error.issues[0]?.path.join(' → ') || 'de cursusinhoud'}. Een verplicht veld ontbreekt of heeft een ongeldige waarde. Uw invoer blijft staan.` : error instanceof Error && !error.message.startsWith('ACADEMY_') ? error.message : 'De vraag-, antwoord- of bronkoppelingen zijn onvolledig. Controleer het gewijzigde onderdeel. Uw invoer blijft staan.')
      requestAnimationFrame(() => alert.current?.focus())
    } finally { setBusy(false) }
  }

  let selected: unknown
  let replace: (value: unknown) => void
  if (part === 'course') {
    selected = { title: bundle.definition.title, subtitle: bundle.definition.subtitle, description: bundle.description, courseVersion: bundle.courseVersion, certificateTemplateVersion: bundle.definition.certificateTemplateVersion }
    replace = value => {
      const next = value as { title: string; subtitle: string; description: string; courseVersion: string; certificateTemplateVersion: AcademyCourseBundle['definition']['certificateTemplateVersion'] }
      setBundle({ ...bundle, description: next.description, courseVersion: next.courseVersion, definition: { ...bundle.definition, title: next.title, subtitle: next.subtitle, certificateTemplateVersion: next.certificateTemplateVersion, schemaVersion: next.certificateTemplateVersion === 'ACADEMY-CERT-2.0' ? 2 : 1 } })
    }
  } else if (part === 'sources') {
    selected = bundle.sources; replace = value => setBundle({ ...bundle, sources: value as typeof bundle.sources })
  } else if (part === 'settings') {
    selected = { ...bundle.definition.exam, attemptLimit: bundle.examSettings?.attemptLimit ?? null }
    replace = value => {
      const next = value as typeof bundle.definition.exam & { attemptLimit: number | null }
      setBundle({ ...bundle, examSettings: { attemptLimit: next.attemptLimit }, definition: { ...bundle.definition, schemaVersion: 2, certificateTemplateVersion: 'ACADEMY-CERT-2.0', exam: { code: next.code, questionCount: 50, passingScore: next.passingScore, passingPercentage: Math.floor(next.passingScore * 2) } } })
    }
  } else if (part === 'exam' || part === 'retention') {
    const key = part === 'exam' ? 'examQuestions' : 'retentionQuestions'
    selected = bundle[key][index]; replace = value => setBundle({ ...bundle, [key]: bundle[key].map((question, at) => at === index ? withAnswers(value) : question) })
  } else if (part === 'chapter') {
    selected = { title: current.title, estimatedMinutes: current.estimatedMinutes, objectives: current.objectives }
    replace = value => setBundle({ ...bundle, chapters: bundle.chapters.map((item, at) => at === chapter ? { ...item, ...value as object } : item) })
  } else {
    const key = part === 'blocks' ? 'blocks' : 'questions'
    selected = current[key][index]
    replace = value => setBundle({ ...bundle, chapters: bundle.chapters.map((item, at) => at === chapter ? { ...item, [key]: item[key].map((entry, position) => position === index ? (key === 'questions' ? withAnswers(value) : value) : entry) } : item) })
  }
  const length = part === 'exam' ? 50 : part === 'retention' ? 100 : part === 'blocks' ? current.blocks.length : part === 'questions' ? current.questions.length : 0
  const preview = part === 'blocks' && (selected as { type?: string })?.type === 'IMAGE' ? (selected as { data: { src: string; alt: string; caption?: string } }).data : null
  function imageUploaded(src: string) {
    const blocks = preview ? current.blocks.map((block, at) => at === index ? { ...block, data: { ...block.data, src } } : block) : [...current.blocks, { code: `${bundle.definition.courseCode.replace('-', '')}-H${chapter + 1}-IMAGE-${current.blocks.length + 1}`, type: 'IMAGE' as const, data: { src, alt: 'Beschrijf deze afbeelding', caption: '' } }]
    setBundle({ ...bundle, chapters: bundle.chapters.map((item, at) => at === chapter ? { ...item, blocks } : item) })
    if (!preview) setIndex(blocks.length - 1)
  }
  return <section className="space-y-5" aria-label="Volledige cursus bewerken">
    <p>Alle teksten, vragen, antwoorden en bronverwijzingen blijven behouden. Bestaande versies worden niet overschreven. Sla wijzigingen op als een nieuwe conceptversie.</p>
    <Button type="button" variant="outline" onClick={exportBundle}>Cursus exporteren</Button>
    {id && !editable && <div className="space-y-3"><label className="block">Nieuwe conceptversie<input className={fieldClassName} maxLength={18} value={version} onChange={event => setVersion(event.target.value)} /></label><Button disabled={busy} onClick={prepare}>Nieuwe conceptversie voorbereiden</Button></div>}
    <div className="grid gap-3 sm:grid-cols-2">
      <label>Onderdeel<select className={fieldClassName} value={part} onChange={event => { setPart(event.target.value); setIndex(0) }}>{sections.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      {['chapter', 'blocks', 'questions'].includes(part) && <label>Hoofdstuk<select className={fieldClassName} value={chapter} onChange={event => { setChapter(Number(event.target.value)); setIndex(0) }}>{bundle.chapters.map((item, at) => <option key={item.slug} value={at}>{at + 1}. {item.title}</option>)}</select></label>}
      {length > 0 && <label>Onderdeelnummer<select className={fieldClassName} value={index} onChange={event => setIndex(Number(event.target.value))}>{Array.from({ length }, (_, at) => <option key={at} value={at}>{at + 1}</option>)}</select></label>}
    </div>
    <fieldset disabled={!editable || busy} className="min-w-0 space-y-4 rounded-card border border-border p-4">
      <legend className="sr-only">Geselecteerde cursusinhoud</legend>
      {preview && <figure className="space-y-2"><Image src={preview.src} alt={preview.alt} width={640} height={360} unoptimized className="h-auto max-w-full" /><figcaption>{preview.caption}</figcaption></figure>}
      <ValueEditor value={selected as Json} path={part} label="Bewerken" onChange={replace} />
      {part === 'blocks' && <AcademyMediaUpload onUploaded={imageUploaded} />}
    </fieldset>
    <p ref={alert} tabIndex={-1} role="status" aria-live="polite" className="break-words whitespace-pre-wrap">{message}</p>
    <Button disabled={!editable || busy} onClick={save}>{busy ? 'Bezig met opslaan…' : 'Conceptversie opslaan'}</Button>
  </section>
}

export function AcademyBundleImport() {
  const [bundle, setBundle] = useState<AcademyCourseBundle | null>(null)
  const [error, setError] = useState('')
  return <section className="space-y-4"><h2 className="text-2xl font-bold">Bestaande cursus importeren</h2><label className="block">Cursusbestand<input className={fieldClassName} type="file" accept=".json,application/json" onChange={async event => {
    setError(''); setBundle(null)
    try {
      const file = event.target.files?.[0]
      if (!file) return
      if (file.size > 2 * 1024 * 1024) throw Error('FILE_TOO_LARGE')
      setBundle(validateAcademyBundle(JSON.parse(await file.text())))
    } catch { setError('Dit cursusbestand is ongeldig. Controleer de grootte (maximaal 2 MB), versie, vragen, antwoorden en bronverwijzingen. Er is niets opgeslagen.') }
  }} /></label>{error && <p role="alert">{error}</p>}{bundle && <AcademyBundleEditor initial={bundle} />}</section>
}
