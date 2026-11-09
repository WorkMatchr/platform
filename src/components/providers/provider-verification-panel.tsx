import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { recordVerificationAction } from '@/app/beheer/dossiers/actions'
import type { getReviewSubjects } from '@/lib/marketplace/provider-review-query-service'

type Props = {
  profileId: string; version: number; candidateId: string; caseId: string; editable: boolean
  data: Awaited<ReturnType<typeof getReviewSubjects>>
}

export function ProviderVerificationPanel({ profileId, version, candidateId, caseId, editable, data }: Props) {
  return <Card className="mt-6" id="verificaties">
    <h2 className="text-lg font-semibold">Ingediende onderdelen verifiëren</h2>
    <p>Controleer de ingediende gegevens en het bijbehorende bewijs. Vraag bij ontbrekend bewijs een aanvulling via Bevindingen.</p>
    <ul className="mt-4 grid gap-3">
      {data.map(s => <li key={s.id}><details className="rounded-control border border-border p-4">
        <summary className="cursor-pointer font-semibold">{s.label} {s.title} · {s.status}</summary>
        <p>Revisie {s.version}. {s.details}</p>
        {s.validFrom && <p>Ingang {s.validFrom.slice(0, 10)}</p>}
        {s.validUntil && <p>Einddatum {s.validUntil.slice(0, 10)}</p>}
        {s.evidenceHash && <p className="break-all">Geregistreerde bestandscontrole (SHA-256): {s.evidenceHash}. De bestandsinhoud is hier nog niet beschikbaar.</p>}
        {s.missingEvidence && <p>Het gekoppelde bewijs ontbreekt of heeft geen schone bestandscontrole.</p>}
        {s.reviewEnd && <p>Verificatie geldig tot {s.reviewEnd.toISOString().slice(0, 10)} (exclusief, UTC).</p>}
        {editable && <form action={recordVerificationAction} className="mt-3 grid gap-3">
          <input type="hidden" name="providerProfileId" value={profileId} />
          <input type="hidden" name="candidateId" value={candidateId} />
          <input type="hidden" name="reviewCaseId" value={caseId} />
          <input type="hidden" name="expectedVersion" value={version} />
          <input type="hidden" name="type" value={s.type} /><input type="hidden" name="revisionId" value={s.id} />
          <label>Uitkomst<select required name="outcome" defaultValue="" className="block w-full">
            <option value="">Kies een uitkomst</option><option value="VERIFIED">Geverifieerd</option>
            <option value="DOCUMENT_CHECKED">Document gecontroleerd</option><option value="CHANGES_REQUESTED">Aanvulling nodig</option>
            <option value="REJECTED">Afgekeurd</option>
          </select></label>
          <label>Onderbouwing<textarea required minLength={10} maxLength={500} name="justification" className="block w-full rounded-control border p-2" /></label>
          <label>Geldig tot (exclusief, UTC)<input required type="date" name="until" className="block" /></label>
          <Button type="submit" className="justify-self-start">Verificatie opslaan</Button>
        </form>}
      </details></li>)}
    </ul>
    {editable && <p className="mt-4">Na verificatie kan de onafhankelijke goedkeurder het dossier beoordelen.</p>}
  </Card>
}
