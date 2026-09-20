# Global action and navigation loading feedback

## Audit en scope

Bestaand: Button.loading/loadingLabel met native disabled, aria-busy, CSS-spinner en reduced-motion. Clientforms gebruiken useActionState, auth gebruikt lokale state en veilige requesthelpers, providers een gedeelde useProviderForm. Zeven routes hebben loading.tsx/Suspense-skeletten. Er was geen gedeelde globale navigatiestatus. Instant radio/checkbox/disclosure-interacties blijven zonder laadfeedback.

Gaten: generiek Bezig-label, lege foutafhandeling bij logintransportfailure, geen zichtbare save-feedback bij legacy Verder/Terug, en directe serverforms zonder submitfeedback. Alleen UI-afhandeling aangepast; geen serveraction, autorisatie, Request/Assignment/handoff, taxonomie, matching, pricing of schema gewijzigd.

## Hergebruik

- Button blijft de visuele primitive: contextuele tekst of expliciete loadingLabel, breedtereservering alleen bij loading-support, aria-hidden spinner en origineel label, reduced-motion. Geen dependency.
- usePendingAction behoudt React action state, weigert herhaling vóór queueing en levert een veilige retrybare fout. Next redirect/access-control errors blijven framework-controlflow. Versiegebonden Next guards worden bij upgrades meegetest.
- ActionForm verwerkt geldige submits expliciet, bewaart submitter name/value, behoudt ongecontroleerde velden bij error en hergebruikt de normale action. Bestaande clientvalidatie kan afbreken vóór de pending state. SubmitButton gebruikt dezelfde Button en React form status. Native validatie blijft actief waar deze al actief was.
- Auth: bestaande Better Auth-methoden en errorcontracten behouden; synchrone ref-lock tegen herhaalde submits. Login vangt ook rejected transport af. Geen passwords, sessie- of authconfigwijzigingen.
- Navigatie: NavigationLink gebruikt Next useLinkStatus, bestaande loading.tsx-skeletten melden dezelfde globale pending source. Eén provider toont na 200ms Pagina laden; completion/error-unmount verwijdert bronnen. Geen click interception, kunstmatige voortgang, polling of extra request. Desktop/mobile account-, publieke, provider- en beheernavigatie en LinkButton gebruiken dit.

## Toepassing

- Simple Advice: directe clientstap blijft direct; saveAction op Verder/Terug toont Opslaan; publicatie toont Opdracht publiceren. Double-submit guard en bestaande backend-idempotentie vullen elkaar aan.
- Organisatie, providerprofiel/professionals en bestaande publiceer/intrek/statusforms gebruiken hetzelfde patroon.
- Professional interesse/offerteplaats, offerte opslaan/indienen en selecteren/bevestigen: uitsluitend bestaande acties aangesloten.
- Relevante beheerformulieren aangesloten. Geen financiële workflows of oude AI-modules aangepast.

## Productreview

PC-035/040/043/058/062-067: handeling blijft herkenbaar, geen nieuwe bevestigingsstap, invoer en bestaande foutmeldingen blijven behouden, dubbele submit begrensd, native buttons/disabled en screenreadertekst. Geen nieuwe claims of extra persoonsgegevens. Browser-, responsive- en 200%-uitkomsten hieronder afzonderlijk vastleggen; automatisering bewijst geen volledige productacceptatie.

## Validatie

Status: GLOBAL_LOADING_FEEDBACK_PARTIAL — implementatie en geautomatiseerde validatie gereed; ingelogde browseracceptatie en echte 200%-zoom nog open.

- 244 tests in 35 bestanden PASS: pendingtekst/disabled/aria-busy, dubbele klik en Enter-repeat, foutrecovery/invoerbehoud, submitter name/value, logintransport, navigatiedelay/completion/unmount, Simple Advice Route A/B en primary/additional.
- Request- en marketplace-databasesuites PASS: publicatieketen, exact een Assignment/handoff, idempotentie, tenantisolatie en snapshots/audit.
- Lint, typecheck, productiebuild, git diff --check en secrets-patterncontrole op de 70 taakbestanden PASS.
- Lokale browser: Inloggen… en disabled zichtbaar tijdens vertraagd verzoek; onjuiste login levert toegankelijke fout en opnieuw bruikbare knop. Geen echte credentials in logs.
- Publieke Advieswijzer: clientvalidatie zonder blijvende spinner; Ja/HVK met aanvullende Arbeidshygiënist; Verder met muis en Enter; controlepagina; Wijzigen behoudt invoer. Instant checkbox/disclosure zonder pending.
- Desktop 1280 px, tablet 800 px, mobiel 390 px: visueel leesbaar, controls bereikbaar, geen horizontale documentoverflow. Mobiele disclosure open/dicht en aria-expanded correct.
- Publieke navigatie voltooit en laat geen blijvende indicator achter. Delay/fout-unmount geautomatiseerd bewezen; vertraagde dashboardnavigatie nog niet browsermatig afgetekend.
- Open: gebruiker moet met bestaand lokaal testaccount inloggen voor een Opslaan-actie en dashboardnavigatie. Lokale publicatie nog niet browsermatig uitgevoerd; keten is met databasesuites getoetst. Echte 200%-browserzoom wacht op handmatige bevestiging; viewportcontrole geldt niet als browserzoom.

Onverwante bestaande wijzigingen blijven buiten deze opdracht: .gitignore, gegenereerd next-env.d.ts en docs/published-request-dashboard-chain-investigation.md. Geen businesslogica of database-schema gewijzigd.

 Tijdelijke lokale acceptatiedatabase en een externe lokale vertragingsproxy maken pending zichtbaar zonder productcode, providers of productie te vertragen. Bestaand example.invalid-testaccount met ongewijzigde credentials; uitsluitend synthetische organisatie. Geen productiepublicatie. Geen commit/push/deployment.

## Gewijzigde bestanden

- `src/app/aanbiedersdossier/loading.tsx`
- `src/app/adviesdossiers/loading.tsx`
- `src/app/hulpvragen/loading.tsx`
- `src/app/layout.tsx`
- `src/app/loading.tsx`
- `src/app/offertes/[quoteId]/page.tsx`
- `src/app/offertes/nieuw/page.tsx`
- `src/app/opdrachten/[assignmentId]/offertes/page.tsx`
- `src/app/opdrachten/[assignmentId]/publiceren/loading.tsx`
- `src/app/opdrachten/[assignmentId]/selectie/page.tsx`
- `src/app/opdrachten/loading.tsx`
- `src/app/organisatie/loading.tsx`
- `src/app/platformbeheer/gebruikers/[userId]/page.tsx`
- `src/app/platformbeheer/loading.tsx`
- `src/app/platformbeheer/organisaties/[organizationId]/page.tsx`
- `src/app/platformbeheer/platformbeheerders/page.tsx`
- `src/app/professional/opdrachten/[requestId]/page.tsx`
- `src/components/assignments/assignment-edit-form.tsx`
- `src/components/assignments/assignment-list.tsx`
- `src/components/assignments/assignment-publication-actions.tsx`
- `src/components/assignments/assignment-status-actions.tsx`
- `src/components/assignments/submit-intake-form.tsx`
- `src/components/auth/activate-account-form.tsx`
- `src/components/auth/email-request-form.tsx`
- `src/components/auth/login-form.tsx`
- `src/components/auth/register-form.tsx`
- `src/components/auth/reset-password-form.tsx`
- `src/components/intakes/intake-card.tsx`
- `src/components/intakes/intake-review.tsx`
- `src/components/layout/accordion-navigation.tsx`
- `src/components/layout/footer.tsx`
- `src/components/layout/header-brand-link.tsx`
- `src/components/layout/header.tsx`
- `src/components/layout/public-navigation.tsx`
- `src/components/organizations/account-lifecycle-dialog.tsx`
- `src/components/organizations/invitation-resend-button.tsx`
- `src/components/organizations/logo-manager.tsx`
- `src/components/organizations/organization-form.tsx`
- `src/components/organizations/organization-invitation-form.tsx`
- `src/components/organizations/organization-role-dialog.tsx`
- `src/components/organizations/role-notification-resend-button.tsx`
- `src/components/platform-admin/knowledge-improvement-handling-form.tsx`
- `src/components/platform-admin/knowledge-review-forms.tsx`
- `src/components/platform-admin/platform-admin-audit-row.tsx`
- `src/components/platform-admin/platform-admin-shell.tsx`
- `src/components/platform-admin/platform-admin-ui.tsx`
- `src/components/platform-admin/platform-role-workload.tsx`
- `src/components/providers/provider-breadcrumbs.tsx`
- `src/components/providers/provider-capability-form.tsx`
- `src/components/providers/provider-decision-profile.tsx`
- `src/components/providers/provider-dossier-navigation.tsx`
- `src/components/providers/provider-onboarding-forms.tsx`
- `src/components/providers/provider-open-actions.tsx`
- `src/components/providers/provider-profile-form.tsx`
- `src/components/providers/provider-profile-selection-form.tsx`
- `src/components/providers/provider-sector-form.tsx`
- `src/components/providers/provider-work-area-form.tsx`
- `src/components/providers/use-provider-form.ts`
- `src/components/requests/request-publication-form.tsx`
- `src/components/requests/simple-advice-form.test.tsx`
- `src/components/requests/simple-advice-form.tsx`
- `src/components/ui/action-form.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/link-button.tsx`
- `src/components/ui/loading-feedback.test.tsx`
- `src/components/ui/navigation-feedback.tsx`
- `src/components/ui/navigation-link.tsx`
- `src/components/ui/use-pending-action.ts`

Ook dit rapport en de link in docs/ui-components.md horen bij de werkset. Buiten scope: reeds bestaande .gitignore, gegenereerd next-env.d.ts en docs/published-request-dashboard-chain-investigation.md.


## Publicatiefoutdiagnose — 16 september 2026

Status: GLOBAL_LOADING_FEEDBACK_BLOCKED. De product owner bevestigt echte 200%-zoom PASS. De gemelde publicatiefout is nog niet exact gereproduceerd; geen READY-conclusie.

- Beschikbare lokale browsertab staat op http://127.0.0.1:3001/inloggen. Poort 3001 is de lokale vertragingsproxy naar de acceptatie-app op 3002. Er luistert geen server op 3000.
- De lokale proxyregistratie bevat alleen de eerdere onjuiste login, geen publicatie-POST. Het lokale serverlog bevat geen publicatie-exception. De exacte foutpagina, invoer en bijbehorende HTTP-response zijn daarom nog niet vastgesteld.
- Tijdelijke acceptatiedatabase: 80 migraties, 0 failed; gebruiker/CLIENT, organisatie en OWNER-membership actief; canonieke SPECIALISM v3 met 20/20 actieve mappings.
- Dezelfde ongewijzigde publicatieservice afzonderlijk uitgevoerd voor HVK + Arbeidshygienist en Route B/UNKNOWN, uitsluitend in lokale diagnostische transacties met verplichte rollback. Beide bereiken Request PUBLISHED, Assignment OPEN, aanwezige handoff, juiste tenant en responseDeadline. Expertisevelden blijven respectievelijk HVK/Arbeidshygienist en leeg/leeg. Geen testpublicatie blijft opgeslagen.
- Gitvergelijking met HEAD toont geen wijziging aan simple-actions, simple-advice-service, request-service of request-assignment-handoff.
- De gerapporteerde tekst wordt door de bestaande serveraction teruggegeven bij een niet-RequestServiceError uit publishSimpleAdviceRequest. Het is niet de nieuwe generieke ActionForm/usePendingAction-fouttekst. De tekst identificeert op zichzelf geen databasefout en bewijst evenmin een loadingregressie.
- FormData wordt opgebouwd voor de pendingstate; hidden payload/submissionId/draftVersion blijven aanwezig. Bestaande gerichte tests dekken dubbel submitten, inputbehoud en submitterwaarden. Exacte mislukte browserpayload nog niet beschikbaar; loadingregressie niet definitief uitgesloten.
- Geen productfix uitgevoerd omdat geen concrete regressie is bewezen. Voor definitieve classificatie A/B/C en succesvolle browseracceptatie ontbreken de exacte lokale URL/invoer en toegang tot de ingelogde foutflow.

Validatie in deze diagnose: lokale canonieke publicatieservice Route A/B met rollback PASS; referentiedata/identitycontrole PASS; publicatiecodediff gelijk aan HEAD. De eerdere 244 tests, databasesuites, lint, typecheck en build blijven de laatste volledige validatie. Geen codewijziging, commit, push, deployment of productiepublicatie.
