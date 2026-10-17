import type { ComplianceV2Report } from '@/lib/compliance/compliance-v2'

export function ComplianceV2ReportView({ report }: { report: ComplianceV2Report }) {
  return <div className="space-y-6">
    <section className="rounded-card border border-brand-primary/20 bg-brand-primary-subtle p-6">
      <h2 className="text-xl font-bold text-brand-dark">Samenvatting</h2>
      <p className="mt-3 text-text-secondary">{report.summary.order} op orde · {report.summary.attention} aandacht nodig · {report.summary.action} actie vereist · {report.summary.notAssessed} niet beoordeeld · {report.summary.notApplicable} niet van toepassing</p>
      <p className="mt-2 text-sm text-text-secondary">Beoordelingsversie {report.assessmentVersion} · rapportversie {report.reportVersion}</p>
    </section>
    {report.results.map(result => <article key={result.id} className="rounded-card border border-border bg-surface p-6 shadow-card">
      <h2 className="text-xl font-bold text-brand-dark">{result.title}</h2>
      <p className="mt-2 font-semibold text-brand-dark">{result.statusLabel}</p>
      {!result.sufficientlyAssessed && <p className="mt-2 text-text-secondary">Dit onderwerp is nog niet voldoende beoordeeld. Bekende aandachtspunten blijven hieronder zichtbaar.</p>}
      <p className="mt-3 whitespace-pre-line text-text-secondary">{result.explanation}</p>
      {result.missingQuestionCodes.length > 0 && <div className="mt-3 text-text-secondary"><h3 className="font-semibold">Nog te verduidelijken</h3><ul className="mt-2 list-disc pl-5">{result.missingQuestionCodes.map(code => <li key={code}>{report.definitionSnapshot.modules.flatMap(m => m.questions).find(q => q.code === code)?.prompt ?? 'Aanvullende informatie ontbreekt.'}</li>)}</ul></div>}
      <h3 className="mt-4 font-semibold text-brand-dark">Aanbevolen vervolgstap</h3>
      <p className="mt-2 whitespace-pre-line text-text-secondary">{result.nextStep}</p>
      <ul className="mt-4 space-y-2 text-text-secondary">{result.evidence.map(e => <li key={e.ruleId}>
        <strong>{e.basis === 'LEGAL_REQUIREMENT' ? 'Wettelijke verplichting' : 'Praktische aanbeveling'}:</strong> {e.explanation}
      </li>)}</ul>
      <ul className="mt-4 space-y-2 text-sm">{result.sources.map(source => <li key={`${source.id}-${source.claimId}`}>
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-brand-primary underline focus-visible:outline-2 focus-visible:outline-offset-4">{source.title}</a> · {source.publisher} · beoordeeld {source.reviewedAt}
      </li>)}</ul>
    </article>)}
    <p className="text-sm text-text-secondary">{report.disclaimer}</p>
  </div>
}
