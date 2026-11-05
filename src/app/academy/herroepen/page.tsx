import { randomUUID } from 'node:crypto'
import { notFound } from 'next/navigation'
import { assertAcademyCommerceSandbox } from '@/lib/learning/academy-commerce-environment'
import { AcademyWithdrawalForm } from '@/components/learning/academy-withdrawal-form'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Academy-aankoop herroepen | WorkMatchr', robots: { index: false, follow: false } }
export default function WithdrawalPage() {
  try { assertAcademyCommerceSandbox() } catch { notFound() }
  return <section aria-labelledby="withdrawal-title" className="mx-auto max-w-2xl space-y-6 px-4 py-10"><h1 id="withdrawal-title" className="text-3xl font-bold">Academy-aankoop herroepen</h1><p>U hoeft niet in te loggen. Identificeer uw aankoop en bevestig daarna uw verklaring. Een reden is niet nodig. Ontvangst betekent nog geen besluit over restitutie of voltooide terugbetaling.</p><AcademyWithdrawalForm requestKey={randomUUID()}/></section>
}
