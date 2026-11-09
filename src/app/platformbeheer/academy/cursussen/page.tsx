import Link from 'next/link'
import { readAcademyCourseIndex } from '@/lib/learning/academy-course-results'

export default async function CoursesPage() {
  const courses = await readAcademyCourseIndex()
  return <section className="space-y-4">
    <h1 className="text-3xl font-bold">Academy · Cursussen</h1>
    <p>Kies een cursusversie voor deelnemers, studievoortgang, eindtoetsen en certificaten.</p>
    {courses.length === 0 && <p>Er zijn nog geen cursussen.</p>}
    {courses.map(course => <section key={course.id}>
      <h2 className="text-xl font-semibold">{course.code} · {course.title}</h2>
      <ul>{course.versions.map(version => <li key={version.id}>
        <Link className="inline-flex min-h-11 items-center underline" href={`/platformbeheer/academy/cursussen/${version.id}`}>Versie {version.version}</Link>
      </li>)}</ul>
    </section>)}
  </section>
}
