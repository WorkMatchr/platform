'use client'

import { Button } from '@/components/ui/button'
import { ComplianceFreeIntakeV2 } from './compliance-free-intake-v2'
import { ComplianceFreeIntakeLegacy } from './compliance-free-intake-legacy'
import { useComplianceDraft } from './use-compliance-draft'

export function ComplianceFreeIntake() {
  const storage = useComplianceDraft()
  if (!storage.ready) return <p role="status">Uw intake wordt klaargezet…</p>
  if (storage.legacy || storage.blocked) return <section className="mx-auto max-w-4xl rounded-card border border-border bg-surface p-6">
    <h2 className="text-xl font-bold text-brand-dark">Oud Compliance-concept gevonden</h2>
    <p className="mt-3 text-text-secondary">De nieuwe intake bevat vijf hoofdvragen. Uw bestaande antwoorden zijn niet naar nieuwe vragen omgezet. U kunt een herkend oud concept met de oorspronkelijke vijftien vragen hervatten. Een concept zonder bekende bewaardatum wordt daarbij niet automatisch opnieuw bewaard.</p>
    {storage.message && <p role="status" className="mt-3">{storage.message}</p>}
    <div className="mt-5 flex flex-wrap gap-3">
      {storage.legacy && <Button onClick={storage.resumeLegacy}>Hervat oud concept</Button>}
      <Button variant="outline" onClick={storage.forget}>Verwijder oud concept en start opnieuw</Button>
    </div>
  </section>
  return <div className="space-y-6">
    {storage.draft.questionnaireVersion === '2.0'
      ? <ComplianceFreeIntakeV2 key={storage.resetIndex} answers={storage.draft.answers} stepIndex={storage.draft.stepIndex}
          onChange={(answers, stepIndex) => storage.update({ answers, stepIndex, questionnaireVersion: '2.0' })}
          onFinish={storage.finish} onRestart={storage.restart} />
      : <><p className="rounded-control bg-brand-primary-subtle p-4 text-brand-dark">U hervat de oorspronkelijke intake met vijftien vragen. Uw antwoorden houden hun oorspronkelijke betekenis.</p><ComplianceFreeIntakeLegacy storage={storage} /></>}
    {!storage.completed && <section className="mx-auto max-w-4xl rounded-card border border-border bg-surface-subtle p-5" aria-label="Concept bewaren">
      <p id="compliance-storage-help" className="text-sm text-text-secondary">Zonder bewaren blijft uw invoer alleen in dit tabblad beschikbaar. Bewaren is optioneel, geldt voor dit apparaat en eindigt na 24 uur; openen of bewerken verlengt die termijn niet. Uitloggen verwijdert uw lokale concept na een waarschuwing. Vul geen namen, medische gegevens of ongevalsgegevens in.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="outline" onClick={storage.remember} disabled={!!storage.saved} aria-describedby="compliance-storage-help">Concept 24 uur op dit apparaat bewaren</Button>
        <Button variant="ghost" onClick={storage.forget}>Concept van dit apparaat verwijderen</Button>
      </div>
    </section>}
    {storage.message && <p role="status" className="mx-auto max-w-4xl text-sm text-text-secondary">{storage.message}</p>}
  </div>
}
