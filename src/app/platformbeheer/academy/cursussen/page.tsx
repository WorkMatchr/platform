import { requirePlatformOperator } from '@/lib/platform-admin/platform-admin-authorization'
import { AcademyBundleImport } from '@/components/learning/academy-bundle-editor'
import { notFound } from 'next/navigation'
import { isLearningRuntimeEnabled } from '@/lib/learning/learning-runtime-policy'
import Link from 'next/link'
import { readAuthoringCourses } from '@/lib/learning/academy-authoring-service'
import { AcademyCourseEditor } from '@/components/learning/academy-course-editor'
export default async function CoursesPage(){if(!isLearningRuntimeEnabled())notFound();await requirePlatformOperator('/platformbeheer/academy/cursussen');const courses=await readAuthoringCourses();return <div className="space-y-8"><h1 className="text-3xl font-bold">Cursussen beheren</h1><p>Maak een cursusversie, controleer de preview en leg de inhoudelijke review vast voordat u publiceert. Richtlijn: vier tot vijf uur inclusief eindtoets.</p><ul className="space-y-3">{courses.map(c=><li key={c.id}><h2 className="text-xl font-semibold">{c.title}</h2>{c.versions.map(v=><Link key={v.id} className="mr-4 inline-flex min-h-11 items-center underline" href={`/platformbeheer/academy/cursussen/${v.id}`}>Versie {v.version}</Link>)}</li>)}</ul><AcademyBundleImport/><h2 className="text-2xl font-bold">Nieuwe cursus</h2><AcademyCourseEditor/></div>}
