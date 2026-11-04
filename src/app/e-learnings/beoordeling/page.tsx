import { randomUUID } from 'node:crypto'
import { requireLearningUser } from '@/lib/learning/learning-authorization'
import { getAcademyReviewTargets,listAcademyReviews } from '@/lib/learning/academy-review-service'
import { AcademyReviewForm } from '@/components/learning/academy-review-form'
export const dynamic='force-dynamic'
export const metadata={title:'Correctie of examenbezwaar | WorkMatchr',robots:{index:false,follow:false}}
export default async function Page(){
 const user=await requireLearningUser('/e-learnings/beoordeling')
 const [targets,events]=await Promise.all([getAcademyReviewTargets(user.id),listAcademyReviews(user.id)])
 const options=[...targets.certificates.flatMap(c=>[{value:`CERTIFICATE_NAME:${c.id}`,label:`Naamcorrectie — ${c.courseTitle}`},{value:`CERTIFICATE_ERROR:${c.id}`,label:`Certificaatfout — ${c.courseTitle}`}]),...targets.attempts.flatMap(a=>[{value:`EXAM_QUESTION:${a.id}`,label:`Examenvraag — ${a.examVersion.courseVersion.course.title}, poging ${a.attemptNumber}`},{value:`EXAM_SCORE:${a.id}`,label:`Score — ${a.examVersion.courseVersion.course.title}, poging ${a.attemptNumber}`}]),{value:`PRIVACY:${user.id}`,label:'Verzoek over mijn persoonsgegevens'}]
 return <main className="mx-auto max-w-3xl space-y-5 px-4 py-10"><h1 className="text-3xl font-bold">Correctie of examenbezwaar</h1><p>Een medewerker beoordeelt uw verzoek. Oorspronkelijke examenresultaten en certificaten worden niet stilzwijgend aangepast. U ontvangt binnen twee werkdagen een ontvangstreactie en binnen tien werkdagen een inhoudelijke reactie of statusupdate. Wettelijke rechten en termijnen blijven leidend.</p><AcademyReviewForm requestKey={randomUUID()} options={options}/><h2 className="text-xl font-bold">Mijn verzoeken</h2><ul className="space-y-3">{events.map(e=><li key={e.id} className="break-words rounded border p-3"><p>{e.createdAt.toLocaleDateString('nl-NL')} · {e.action==='REQUESTED'?'Aangevraagd':e.action==='ACCEPTED'?'Beoordeeld en geaccepteerd':e.action==='REJECTED'?'Afgewezen':e.action==='REVOKED'?'Ingetrokken':'Statusupdate'}</p><p>{e.reason}</p>{e.kind==='CERTIFICATE_NAME'&&e.action==='ACCEPTED'&&<a className="inline-flex min-h-11 items-center underline" href={`/api/learning/corrections/${e.id}`}>Correctie-exemplaar downloaden</a>}</li>)}</ul></main>
}
