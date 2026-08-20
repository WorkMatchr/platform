import { ArboGuideStatus } from './arbo-guide-status'
import type { ArboGuideReportSnapshot } from '@/lib/arbo-guides/arbo-guide-run-service'

export function ArboGuideReportView({ report }: { report: ArboGuideReportSnapshot }) {
  return (
    <div className="space-y-6">
      <section className="rounded-card border border-brand-primary/20 bg-brand-primary-subtle p-6">
        <h2 className="text-xl font-bold text-brand-dark">Samenvatting</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          <li><strong>{report.summary.order}</strong> onderdelen op orde</li>
          <li><strong>{report.summary.action}</strong> onderdelen vragen actie</li>
          <li><strong>{report.summary.check}</strong> onderdelen moeten worden gecontroleerd</li>
          <li><strong>{report.summary.notApplicable}</strong> onderdelen niet van toepassing</li>
        </ul>
      </section>
      {report.results.map((result) => (
        <article key={result.id} className="rounded-card border border-border bg-surface p-6 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-xl font-bold text-brand-dark">{result.title}</h2>
            <ArboGuideStatus status={result.status} />
          </div>
          <p className="mt-3 text-text-secondary">{result.explanation}</p>
          <h3 className="mt-5 font-semibold text-brand-dark">Waarom dit relevant is</h3>
          <p className="mt-1 text-text-secondary">{result.relevance}</p>
          <h3 className="mt-5 font-semibold text-brand-dark">Aanbevolen vervolgstap</h3>
          <p className="mt-1 text-text-secondary">{result.nextStep}</p>
        </article>
      ))}
      <p className="text-sm text-text-secondary">{report.disclaimer}</p>
    </div>
  )
}
