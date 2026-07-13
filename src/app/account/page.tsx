import { AuthShell, StatusMessage } from '@/components/auth/auth-shell'
import { LogoutButton } from '@/components/auth/logout-button'
import { requireUser } from '@/lib/authorization'

export const metadata = { title: 'Uw account | WorkMatchr' }
export default async function AccountPage() { const user = await requireUser(); return <AuthShell title={`Welkom, ${user.displayName ?? 'gebruiker'}`} intro="Dit is Uw persoonlijke WorkMatchr-account."><dl className="grid gap-4"><div><dt className="font-semibold">E-mailadres</dt><dd>{user.email}</dd></div><div><dt className="font-semibold">Verificatiestatus</dt><dd>{user.emailVerified ? 'Bevestigd' : 'Niet bevestigd'}</dd></div><div><dt className="font-semibold">Platformrol</dt><dd>{user.platformRole === 'ADMIN' ? 'Beheerder' : 'Gebruiker'}</dd></div><div><dt className="font-semibold">Accountstatus</dt><dd>{user.status === 'ACTIVE' ? 'Actief' : 'Niet actief'}</dd></div></dl><div className="mt-7"><StatusMessage>Organisatie-inrichting volgt in Module 4B.</StatusMessage></div><div className="mt-7"><LogoutButton /></div></AuthShell> }
