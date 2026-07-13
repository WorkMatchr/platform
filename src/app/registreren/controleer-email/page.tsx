import Link from 'next/link'
import { AuthShell, StatusMessage } from '@/components/auth/auth-shell'

export default function CheckEmailPage() { return <AuthShell title="Controleer Uw e-mail" intro="Uw registratie is ontvangen."><StatusMessage>Als registratie mogelijk was, ontvangt U een bericht om Uw e-mailadres te bevestigen.</StatusMessage><p className="mt-5 text-sm"><Link className="underline" href="/verifieer-email">Geen bericht ontvangen?</Link></p></AuthShell> }
