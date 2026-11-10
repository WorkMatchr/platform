import { AcademyBundleImport } from '@/components/learning/academy-bundle-editor'
import { AcademyCourseEditor } from '@/components/learning/academy-course-editor'
import { allowsAssignedPilot } from '@/lib/learning/learning-exam-runtime-version'
import { PilotForm } from './pilot-form'
import Link from 'next/link'
import { readAcademyCourseIndex } from '@/lib/learning/academy-course-results'

export default async function CoursesPage() {
  const courses = await readAcademyCourseIndex()
  const pilot=courses.flatMap(c=>c.versions.filter(v=>v.status==='PUBLISHED' && allowsAssignedPilot(c.code,v.version)).map(v=>({id:v.id,title:c.title+' · '+v.version})))
  return <section className="space-y-4">
    <h1 className="text-3xl font-bold">Academy · Cursussen</h1>
    <p>Kies een cursusversie voor deelnemers, studievoortgang, eindtoetsen en certificaten.</p>
    <p><Link className="underline" href="/platformbeheer/academy/certificaten">Uitgegeven certificaten</Link></p>
    <Link className="underline" href="/platformbeheer/academy/certificaten/sjablonen">Certificaatsjablonen beheren</Link>
    {courses.length === 0 && <p>Er zijn nog geen cursussen.</p>}
    {courses.map(course => <section key={course.id}>
      <h2 className="text-xl font-semibold">{course.code} · {course.title}</h2>
      <ul>{course.versions.map(version => <li key={version.id}>
        <Link className="inline-flex min-h-11 items-center underline" href={`/platformbeheer/academy/cursussen/${version.id}`}>Versie {version.version}</Link>
      </li>)}</ul>
    </section>)}
    {pilot.length>0 && <PilotForm versions={pilot}/>}
    <AcademyBundleImport />
    <h2 className="text-2xl font-bold">Nieuwe cursus</h2>
    <AcademyCourseEditor />
  </section>
}
