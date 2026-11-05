'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { certificateDateLabel, certificateStatusLabel, type CertificateList, type CertificateFilter } from '@/lib/learning/academy-certificate-admin-model'
import { Button } from '@/components/ui/button'

const field = 'block min-h-11 w-full min-w-0 rounded-control border border-border bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand-primary'
const empty: CertificateFilter = { q: '', course: '', status: '', from: '', until: '', page: 1 }
export function AcademyCertificateList({ courses, initial }: { courses: Array<{code: string;title: string}>; initial: CertificateList }) {
  const [filter, setFilter] = useState(empty)
  const [data, setData] = useState(initial)
  const [applied, setApplied] = useState(empty)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const busy = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)
  async function search(next: CertificateFilter) {
    if (busy.current) return
    busy.current = true; setPending(true); setError('')
    try {
      const response = await fetch('/platformbeheer/academy/certificaten/zoeken', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(next), cache: 'no-store' })
      if (!response.ok) throw new Error('SEARCH_FAILED')
      setData(await response.json()); setApplied(next)
      heading.current?.focus()
    } catch { setError('Certificaten konden niet worden opgehaald. Controleer uw filters en probeer het opnieuw.') }
    finally { busy.current = false; setPending(false) }
  }
  return <>
    <form className="grid gap-4 rounded-card border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={event => { event.preventDefault(); void search({...filter,page:1}) }}>
      <label>Naam, e-mailadres of certificaatnummer<input className={field} name="q" maxLength={160} value={filter.q} onChange={e => setFilter({...filter,q:e.target.value})} /></label>
      <label>Opleiding<select className={field} name="course" value={filter.course} onChange={e => setFilter({...filter,course:e.target.value})}><option value="">Alle opleidingen</option>{courses.map(c => <option key={c.code} value={c.code}>{c.code} — {c.title}</option>)}</select></label>
      <label>Status<select className={field} name="status" value={filter.status} onChange={e => setFilter({...filter,status:e.target.value as CertificateFilter['status']})}><option value="">Alle statussen</option><option value="ACTIVE">Geldig</option><option value="REVOKED">Ingetrokken</option></select></label>
      <label>Behaald vanaf<input className={field} type="date" name="from" value={filter.from} onChange={e => setFilter({...filter,from:e.target.value})} /></label>
      <label>Behaald tot en met<input className={field} type="date" name="until" value={filter.until} onChange={e => setFilter({...filter,until:e.target.value})} /></label>
      <Button type="submit" loading={pending} className="self-end">Zoeken en filteren</Button>
    </form>
    {error && <p role="alert" className="my-4 text-error">{error}</p>}
    <h2 ref={heading} tabIndex={-1} className="my-5 text-lg font-bold focus-visible:outline-2">Gevonden certificaten</h2>
    <p role="status" className="mb-4">{pending ? 'Certificaten ophalen…' : data.total + ' certificaten gevonden. Pagina ' + data.page + ' van ' + data.pageCount + '.'}</p>
    {!data.rows.length && <p>Er zijn geen certificaten die aan deze filters voldoen.</p>}
    <div className="grid min-w-0 gap-4 xl:grid-cols-2" aria-busy={pending}>{data.rows.map(row => <article key={row.id} className="min-w-0 rounded-card border border-border bg-surface p-5 [overflow-wrap:anywhere]">
      <h3 className="text-lg font-bold"><Link prefetch={false} className="underline focus-visible:outline-2" href={'/platformbeheer/academy/certificaten/' + row.id}>{row.firstName} {row.lastName}</Link></h3>
      <dl className="my-4 space-y-2"><div><dt className="font-semibold">Opleiding</dt><dd>{row.courseTitle}</dd></div><div><dt className="font-semibold">Certificaatnummer</dt><dd>{row.certificateNumber}</dd></div><div><dt className="font-semibold">Behaald op</dt><dd>{certificateDateLabel(row.issuedAt)}</dd></div><div><dt className="font-semibold">Status</dt><dd>{certificateStatusLabel(row.status)}</dd></div></dl>
      <div className="flex flex-wrap gap-4">{row.status === 'ACTIVE' && <a className="inline-flex min-h-11 items-center underline focus-visible:outline-2" href={'/platformbeheer/academy/certificaten/' + row.id + '/pdf'}>Download certificaat</a>}<Link prefetch={false} className="inline-flex min-h-11 items-center underline focus-visible:outline-2" href={'/certificaat/' + encodeURIComponent(row.certificateNumber)}>Verifieer certificaat</Link></div>
    </article>)}</div>
    <nav className="my-6 flex flex-wrap gap-3" aria-label="Certificatenpagina's">
      <Button variant="outline" disabled={pending || data.page <= 1} onClick={() => void search({...applied,page:data.page-1})}>Vorige pagina</Button>
      <Button variant="outline" disabled={pending || data.page >= data.pageCount} onClick={() => void search({...applied,page:data.page+1})}>Volgende pagina</Button>
    </nav>
  </>
}
