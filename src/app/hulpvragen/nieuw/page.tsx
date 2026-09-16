import { redirect } from 'next/navigation'
import { requireClientAdviceDossierViewer } from '@/lib/advice-dossiers/advice-dossier-authorization'

export default async function NewIntakePage() {
  await requireClientAdviceDossierViewer('/hulpvragen/nieuw')
  redirect('/advieswijzer')
}
