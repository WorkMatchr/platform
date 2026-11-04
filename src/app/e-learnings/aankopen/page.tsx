import { financialPurchaseStatusLabels } from '@/lib/finance/platform-financial-presentation'
import { formatEuro } from '@/lib/finance/financial-contract'
import Link from 'next/link'
import { requireLearningUser } from '@/lib/learning/learning-authorization'
import { listAcademyOrders } from '@/lib/learning/academy-commerce-service'
export const metadata={title:'Mijn Academy-aankopen | WorkMatchr',robots:{index:false,follow:false}}
export default async function Page(){const user=await requireLearningUser('/e-learnings/aankopen');const orders=await listAcademyOrders(user.id);return <main className="mx-auto max-w-4xl space-y-5 px-4 py-10"><h1 className="text-3xl font-bold">Mijn Academy-aankopen</h1><p>Sandbox — geen commerciële verkoop. TAX REVIEW REQUIRED.</p><Link className="inline-flex min-h-11 items-center underline" href="/e-learnings/aankopen/nieuw">Nieuwe testbestelling</Link><Link className="inline-flex min-h-11 items-center underline" href="/academy/herroepen">Een aankoop herroepen zonder inlogverplichting</Link><ul className="space-y-4">{orders.map(o=><li key={o.id}><Link className="inline-flex min-h-11 items-center underline" href={`/e-learnings/aankopen/${o.id}`}>{o.courseVersion.course.title} — {o.quantity} plaats(en) — {formatEuro(o.purchase.amountInclVatCents)} — {financialPurchaseStatusLabels[o.purchase.status]}</Link></li>)}</ul></main>}
