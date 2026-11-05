import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AdminPageHeader, EmptyState } from '@/components/platform-admin/platform-admin-ui'
import { academyBanks, adminQuestionTypes, parseAdminFilter, publicationLabel } from '@/lib/learning/academy-question-bank-admin-model'
import { AcademyAdminReadError, listAcademyAdminCourses, readAcademyAdminQuestions } from '@/lib/learning/academy-question-bank-admin-service'

export const metadata: Metadata = { title: 'Academy — Vragen & antwoorden', robots: { index: false, follow: false, nocache: true } }
export const dynamic = 'force-dynamic'

type FilterParams = Promise<Record<string, string | string[] | undefined>>
async function loadQuestions(searchParams: FilterParams) {
  try {
    const courses = await listAcademyAdminCourses()
    if (!courses.length) return { kind: 'empty' } as const
    const params = await searchParams
    const parsed = (() => { try { return parseAdminFilter({ ...params, course: params.course ?? courses[0].code }) } catch { return null } })()
    if (!parsed) return { kind: 'invalid' } as const
    const data = await readAcademyAdminQuestions(parsed)
    return { kind: 'ready', courses, parsed, data } as const
  } catch (error) {
    if (error instanceof AcademyAdminReadError && [401, 403].includes(error.status)) redirect('/account')
    return { kind: 'error' } as const
  }
}

export default async function AcademyQuestionsPage({ searchParams }: { searchParams: FilterParams }) {
    const loaded = await loadQuestions(searchParams)
    if (loaded.kind === 'empty') return <EmptyState>Er zijn nog geen opleidingen beschikbaar voor review.</EmptyState>
    if (loaded.kind === 'invalid') return <EmptyState>De gekozen filters zijn niet geldig. <Link href="/platformbeheer/academy/vragen">Filters herstellen</Link></EmptyState>
    if (loaded.kind === 'error') return <EmptyState>Vraagbank niet beschikbaar. Probeer het later opnieuw.</EmptyState>
    const { courses, parsed, data } = loaded
    const query = new URLSearchParams(Object.entries(parsed).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)]))
    const pageLink = (page: number) => { const copy = new URLSearchParams(query); copy.set('page', String(page)); return `?${copy}` }
    const field = 'block min-h-11 w-full min-w-0 rounded-control border border-border bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand-primary'
    return <div className="min-w-0">
      <AdminPageHeader eyebrow="Academy" title="Vragen & antwoorden" description="Vertrouwelijke inzage voor inhoudelijke review. Vragen en antwoordsleutels kunnen hier niet worden gewijzigd of gepubliceerd." />
      <form className="grid gap-4 rounded-card border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3">
        <label>Opleiding<select className={field} name="course" defaultValue={parsed.course}>{courses.map((course) => <option key={course.code} value={course.code}>{course.code} — {course.title}</option>)}</select></label>
        <label>Vraagbank<select className={field} name="bank" defaultValue={parsed.bank}>{Object.entries(academyBanks).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Vraagcode of vraagtekst<input className={field} name="q" defaultValue={parsed.q} maxLength={160} /></label>
        <label>Hoofdstuk<input className={field} name="chapter" type="number" min={1} max={100} defaultValue={parsed.chapter} /></label>
        <label>Vraagtype<select className={field} name="type" defaultValue={parsed.type ?? ''}><option value="">Alle vraagtypen</option>{Object.entries(adminQuestionTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Publicatiestatus<select className={field} name="status" defaultValue={parsed.status ?? ''}><option value="">Alle statussen</option>{['DRAFT', 'PUBLISHED', 'PUBLISHED_PROTOTYPE', 'RETIRED'].map((value) => <option key={value} value={value}>{publicationLabel(value)}</option>)}</select></label>
        <label>Opleidings-, examen- of bankversie<input className={field} name="version" defaultValue={parsed.version} list="bank-versions" maxLength={120} /><datalist id="bank-versions">{data.versions.map((version) => <option key={version} value={version} />)}</datalist></label>
        <label>Vraagversie<input className={field} name="questionVersion" type="number" min={1} defaultValue={parsed.questionVersion} /></label>
        <button className="min-h-11 self-end rounded-control bg-brand-primary px-4 py-2 text-white focus-visible:outline-2" type="submit">Zoeken en filteren</button>
      </form>
      <p className="my-4">{data.total} vragen gevonden. Pagina {parsed.page} van {Math.max(1, Math.ceil(data.total / 25))}.</p>
      {parsed.bank === 'ANNUAL' && <p className="mb-4">De jaarcheck gebruikt een selectie uit deze kennisbehoudbank. Hier staan geen individuele studentvragen of resultaten.</p>}
      {data.total > 0 && <a className="inline-block min-h-11 rounded-control border border-border p-3 font-semibold underline focus-visible:outline-2" href={`/platformbeheer/academy/vragen/export?${query}`}>Vertrouwelijke review-PDF downloaden</a>}
      <div className="space-y-5 py-5">{data.rows.slice((parsed.page - 1) * 25, parsed.page * 25).map((row) => <article className="min-w-0 rounded-card border border-border bg-surface p-5 [overflow-wrap:anywhere]" key={`${row.bank}-${row.referenceVersion}-${row.code}-${row.questionVersion}`}>
        <h2 className="text-lg font-bold">{row.courseCode} · {row.code} · Vraagversie {row.questionVersion}</h2>
        <p>H{row.chapter} · {academyBanks[row.bank]} · {row.referenceVersion}</p>
        <p>Vraag: {publicationLabel(row.status)} · Versie/bank: {publicationLabel(row.referenceStatus)}</p>
        <p>{row.review.join(' · ')}</p><p>{adminQuestionTypes[row.type as keyof typeof adminQuestionTypes] ?? row.type} · Cognitief niveau: {row.cognitiveLevel ?? 'Niet vastgelegd'} · {row.knowledgeArea}</p>
        <p className="my-4 whitespace-pre-line font-semibold">{row.text}</p>
        <ul className="space-y-2">{row.options.map((option) => <li className="rounded-control border border-border p-3" key={option.value}>{option.value}. {option.text} {option.isCorrect && <strong>— Correct antwoord</strong>}</li>)}</ul>
        <p className="mt-3">Opgeslagen antwoordset / volgorde: {JSON.stringify(row.correctAnswer)}</p>
        <h3 className="mt-3 font-semibold">Toelichting</h3><p className="whitespace-pre-line">{row.explanation}</p>
        {row.correctFeedback && <p>Feedback bij juist antwoord: {row.correctFeedback}</p>}{row.incorrectFeedback && <p>Feedback bij onjuist antwoord: {row.incorrectFeedback}</p>}
      </article>)}</div>
      {!data.total && <EmptyState>Geen vragen gevonden voor deze filters.</EmptyState>}
      <nav aria-label="Pagina’s met vragen" className="flex flex-wrap gap-4">{parsed.page > 1 && <Link className="min-h-11 p-3 underline" href={pageLink(parsed.page - 1)}>Vorige pagina</Link>}{parsed.page * 25 < data.total && <Link className="min-h-11 p-3 underline" href={pageLink(parsed.page + 1)}>Volgende pagina</Link>}</nav>
    </div>
}
