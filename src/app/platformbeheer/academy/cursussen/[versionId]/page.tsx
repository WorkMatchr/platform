import { AcademyBundleEditor } from '@/components/learning/academy-bundle-editor'
import { isAcademyBundle } from '@/lib/learning/academy-bundle-contract'
import { authoringMetadata } from '@/lib/learning/academy-authoring-service'
import { AcademyCourseEditor } from '@/components/learning/academy-course-editor'
import { AcademyCourseReview } from '@/components/learning/academy-course-review'
import { allowsAssignedPilot, isLocalPilot } from '@/lib/learning/learning-exam-runtime-version'
import { PilotResults } from '@/components/learning/pilot-results'
import Link from 'next/link'
import { CourseDiscountForm } from '@/components/learning/course-discount-form'
import { readCourseReport, readAcademyCourseResults } from '@/lib/learning/academy-course-results'

export default async function CourseVersionPage({ params, searchParams }: {
  params: Promise<{ versionId: string }>, searchParams: Promise<{ pagina?: string }>
}) {
  const { versionId } = await params
  const page = Number((await searchParams).pagina ?? 1)
  const version = await readAcademyCourseResults(versionId, page)
  const metadata = version.sourceMetadata
  const editable = metadata && typeof metadata === 'object' && ('authoring' in metadata || 'bundle' in metadata)
    ? authoringMetadata(metadata) : null
  const report=await readCourseReport(versionId)
  const base = `/platformbeheer/academy/cursussen/${versionId}`
  return <section className="min-w-0 space-y-5">
    <Link href="/platformbeheer/academy/cursussen" className="underline">Alle cursussen</Link>
    <h1 className="text-2xl font-bold">{version.course.title} · {version.version}</h1>
    {allowsAssignedPilot(version.course.code, version.version) && <p>{version.status==='PUBLISHED'?'Afgeschermde synthetische pilot. Alleen aangewezen testcursisten kunnen zich inschrijven.':'Cursusconcept voor de afgeschermde pilot.'}</p>}
    {editable ? <>
      <AcademyCourseReview localClassroom={isLocalPilot() && !isAcademyBundle(editable.authoring.content) && Boolean(editable.authoring.content.management)} legal={!isAcademyBundle(editable.authoring.content) && editable.authoring.content.management?.legalReviewRequired} id={versionId} revision={editable.authoring.revision} state={version.status === 'DRAFT' ? editable.authoring.state : version.status} />
      {isAcademyBundle(editable.authoring.content)
        ? <AcademyBundleEditor initial={editable.authoring.content} id={versionId} revision={editable.authoring.revision} />
        : <AcademyCourseEditor id={versionId} revision={editable.authoring.revision} initial={editable.authoring.content} readOnly={version.status !== 'DRAFT' || editable.authoring.state !== 'DRAFT'} />}
    </> : <p>Historische cursusversie. De oorspronkelijke inhoud is alleen-lezen.</p>}
    {allowsAssignedPilot(version.course.code,version.version) && <PilotResults versionId={versionId} chapterCount={version.chapters.length}/>}
    {editable && !isAcademyBundle(editable.authoring.content) && editable.authoring.content.management && version.status!=='RETIRED' && !['WL-001','WL-002','WL-003'].includes(version.course.code) && <CourseDiscountForm versionId={versionId}/>}
    <details className="rounded-card border p-4"><summary>Cursusrapport</summary><dl className="grid grid-cols-2 gap-2">{report.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><a className="underline" href={base+'/rapport'} download>Rapport downloaden (CSV)</a></details>
    <h2 className="text-xl font-semibold">Deelnemers en resultaten ({version._count.enrollments})</h2>
    {!version.enrollments.length && <p>Geen inschrijvingen op deze pagina.</p>}
    {version.enrollments.map(enrollment => <article key={enrollment.id} className="space-y-2 rounded-card border border-border p-4">
      <h3 className="font-semibold">{enrollment.user.displayName || 'Deelnemer zonder weergavenaam'}</h3>
      <details><summary>Voortgang per hoofdstuk</summary><ul>{version.chapters.map(chapter => <li key={chapter.id}>
        {chapter.title} · {enrollment.progress.find(progress => progress.chapterId === chapter.id)?.progressPercentage ?? 0}%
      </li>)}</ul></details>
      {enrollment.examAttempts.length === 0 && <p>Nog geen ingeleverde eindtoets.</p>}
      {enrollment.examAttempts.map(attempt => <p key={attempt.attemptNumber}>Poging {attempt.attemptNumber} · {attempt.score}/{attempt.maxScore} · {attempt.passed ? 'Geslaagd' : 'Niet geslaagd'}</p>)}
      {enrollment.certificates.map(cert => <p key={cert.certificateNumber} className="break-words">
        {cert.firstName} {cert.lastName} · {cert.status === 'ACTIVE' ? 'Geldig' : 'Ingetrokken'} · <Link prefetch={false} className="underline" href={`/certificaat/${cert.certificateNumber}`}>Controleer certificaat {cert.certificateNumber}</Link>
      </p>)}
    </article>)}
    <nav aria-label="Deelnemerspagina’s" className="flex gap-4">
      {page > 1 && <Link className="underline" href={`${base}?pagina=${page - 1}`}>Vorige deelnemers</Link>}
      {page * 25 < version._count.enrollments && <Link className="underline" href={`${base}?pagina=${page + 1}`}>Volgende deelnemers</Link>}
    </nav>
  </section>
}
