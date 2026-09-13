# Contextuele KE en eenvoudige intake — oplevering

SIMPLE_ADVICE_CONTEXT_REFINEMENT_READY

Datum: 13 september 2026.

Werkmap: `C:\Users\feens\OneDrive\Frank\Documenten\WorkMatchr\.codex-worktrees\simple-advice-final-release`.
Basiscommit: `944ad09087efc78f79a77d219518d7ad770b55ab`.

De bovenliggende werkmap staat op een oudere AI-intakebranch. De geaccepteerde Simple Advice Flow is daarom in deze bestaande releasewerkmap verfijnd. De reeds gemaakte responsive presentatie is vanuit de bovenliggende werkmap hergebruikt. Oudere wijzigingen in die werkmap zijn niet aangepast.

## 1. KE-integratie

Context wordt uitsluitend gelezen uit de eigen selectie. Er zijn geen classifier-, provider- of routingcalls, automatische alternatieven of mutaties van deskundigheid. Context is geen publicatievoorwaarde en verandert de snapshot of audit niet.

Zes contexten lezen rechtstreeks de bestaande canonieke dienstcontent: HVK, arbeidshygiënist, bedrijfsarts, incidentonderzoek, preventiemedewerker en BHV. Veertien aanvullende beschrijvingen bevatten alleen de reeds vastgelegde taakgebieden van de bestaande expertise-identiteiten. Er wordt geen tweede kopie van de beschikbare dienstbeschrijvingen gemaakt en er worden geen experimentele routingcontracten geïmporteerd.

## 2. Twintig expertisecontexten

Alle twintig deskundigheden hebben geteste context. HVK, bedrijfsarts en ergonoom zijn afzonderlijk gecontroleerd op uitsluitend hun eigen context. De context volgt een gewijzigde gebruikerskeuze en sluit af met de gevraagde neutrale verwijzing naar Terug. Tests bewaken de verboden adviserende formuleringen en ongewijzigde selectie.

## 3. Onderwerpcontext

Alle vijftien bestaande onderwerpen hebben beschrijvende context. Een achtergebleven expertise wordt bij Route B niet gebruikt. UNKNOWN toont algemene schrijfhulp zonder expertiseclaim.

## 4. Titelveld en technische titel

De zichtbare titelvraag is verwijderd, ook uit de controleweergave. De beschrijving blijft verplicht en bevat de gevraagde helpertekst plus de bestaande privacyhint. De technische titel blijft aanwezig: witruimte in de omschrijving wordt samengevoegd en het resultaat wordt begrensd op 200 tekens. Bestaande opgeslagen titels blijven geldig. De echte databasepublicatie met deze afgeleide titel is getest. Geen AI of migratie.

## 5. Ingelogde locatieflow

De gebruiker kan een bestaande organisatielocatie daadwerkelijk selecteren. Het ID wordt server-side binnen dezelfde publicatietransactie gecontroleerd op tenant en actieve locatie. Op andere locatie blijft beschikbaar. Een vrije plaats voor Op locatie blijft mogelijk wanneer geen vestiging is geselecteerd.

## 6. Niet-ingelogde locatieflow

Geen lege locatieselectie. Op locatie gebruikt vrije plaatsinvoer in het optionele JSON-snapshotveld `organizationLocationCity`; Op andere locatie blijft `otherLocationCity` gebruiken. Remote vraagt geen plaats. Combinatie toont en valideert uitsluitend de gekozen fysieke onderdelen. Expliciet inloggen behoudt de plaats en vervangt die niet automatisch door een vestiging. Er wordt geen OrganizationLocation aangemaakt. De bestaande Request.region/notes-projectie gebruikt de ingevoerde plaats; matching wordt niet gewijzigd. Een postcode is voor deze bestaande keten niet vereist.

## 7. Startmoment

De exacte indicatiehelper is zichtbaar en programmatisch aan het startveld gekoppeld. De vijf keuzes blijven aanwezig; de specifieke datum heet Specifieke voorkeursdatum. Enumwaarden en datumopslag zijn ongewijzigd.

## 8. Responsive presentatie

Het bestaande linker contextpaneel en de bestaande mobiele disclosure zijn hergebruikt. De grid verdeelt de beschikbare breedte na de tussenruimte in de verhouding 2:3 (40/60). De disclosure heeft correcte open/dicht-state, aria-expanded en aria-controls. Gesloten inhoud is verborgen. Geen nieuwe layoutcomponent. Echte browser-, breakpoint- en 200%-zoomvalidatie is conform opdracht niet uitgevoerd.

## 9. Tests en validatie

- Gerichte context-, formulier-, Simple Advice-contract- en Request-contracttests: **112/112 PASS**.
- Laatste opdracht: `npm test -- src/content/simple-advice-context.test.ts src/components/requests/simple-advice-form.test.tsx src/lib/requests/simple-advice-contract.test.ts src/lib/requests/request-contract.test.ts --no-file-parallelism --testTimeout=20000`.
- Een eerdere run liep vast bij de JSDOM-import; een latere run had drie vijfseconden-timeouts zonder falende assertions. De eindrun gebruikt een begrensd testbudget van twintig seconden en slaagt volledig. Geen productie-timeouts of testassertions afgezwakt.
- Bestaande Request-databasesuite, uitgebreid met vrije plaats en afgeleide titel: **PASS**. Inclusief A/B/UNKNOWN-publicatie, tenantisolatie, immutable snapshot, audit, parallelle idempotentie en rollback. Alleen een tijdelijke lokale database is gebruikt; deze is door de suite verwijderd.
- `npm run lint`: **PASS**.
- Gerichte ESLint op alle gewijzigde code- en testbestanden: **PASS**.
- `npm run typecheck`: **PASS**.
- `npm run build`: **PASS**, exitcode 0; compilatie, TypeScript en 127 statische pagina’s afgerond. DATABASE_URL was uitsluitend voor dit buildproces op een lokale niet-productieverbinding ingesteld.
- `git diff --check`: **PASS**.
- Handmatige secrets-patterncontrole op de gewijzigde bestanden: **PASS**, geen gevonden credentials, tokens, private keys of wachtwoordhashes. Geen externe scantool geïnstalleerd.

## 10. Baseline en omgevingsmeldingen

De eerder genoemde ADR024-typefouten treden in deze releasewerkmap niet op. Er zijn geen nieuwe typefouten in gewijzigde bestanden. De build meldt een reeds aanwezige werkmap-/tracingwaarschuwing en een ongeldige auth-URL-placeholder uit de bestaande lokale productie-env. `src/lib/auth.ts` en `next.config.ts` zijn aantoonbaar identiek aan de basiscommit. De build eindigt desondanks met exitcode 0. Deze omgevingsmeldingen zijn geen door deze refinement veroorzaakte codefouten; de lokale env en authconfiguratie zijn niet gewijzigd. Dit is geen browser- of deploymentacceptatie.

## 11. Gewijzigde bestanden

Alle paden hieronder zijn relatief aan de hierboven genoemde releasewerkmap:

1. `src/components/public/public-intake-context.tsx`
2. `src/components/requests/simple-advice-form.tsx`
3. `src/components/requests/simple-advice-form.test.tsx`
4. `src/content/simple-advice-context.ts` — nieuw
5. `src/content/simple-advice-context.test.ts` — nieuw
6. `src/lib/requests/simple-advice-contract.ts`
7. `src/lib/requests/simple-advice-contract.test.ts`
8. `src/lib/requests/simple-advice-service.ts`
9. `src/lib/requests/request-service.ts`
10. `scripts/test-request-database.ts`
11. `docs/simple-advice-request-flow.md`
12. `docs/simple-advice-context-refinement-delivery.md` — nieuw, dit rapport

De al bestaande `.gitignore`-wijziging is ongemoeid gelaten en hoort niet bij deze werkset. De door Next gegenereerde wijziging aan `next-env.d.ts` is teruggebracht naar de oorspronkelijke inhoud en regeleinden.

## 12. Blockers en productreview

Geen open blocker voor deze functionele refinement. De gebruiker kiest zelf; copy is beschrijvend, de startdatum is een voorkeur, alleen noodzakelijke locatiegegevens worden gevraagd en de bestaande publicatie-/tenantketen blijft in stand. Disclosure, teruggaan, statebehoud, validatiefocus en publicatie zijn functioneel getest. Handmatige browseracceptatie volgt afzonderlijk zoals gevraagd.

Geen commit. Geen push. Geen deployment. Geen productiedatabasewijziging. Geen nieuwe migratie.


## 13. Finale browseracceptatie en releaseaudit

SIMPLE_ADVICE_FINAL_BROWSER_ACCEPTED. Desktop 1440/1920, tablet 768/1024 en mobile 375/430 zijn gecontroleerd. De product owner bevestigde echte 200%-browserzoom als PASS. HVK, bedrijfsarts, ergonoom, onderwerp en UNKNOWN tonen uitsluitend beschrijvende context. Disclosure, labels, focus en foutmeldingen zijn bruikbaar; geen console- of hydrationerrors waargenomen.

De titelvraag ontbreekt, locatievarianten en startvoorkeur werken en de controlepagina is bereikbaar. Na menselijke login met het bestaande testaccount bleven beschrijving, vrije plaats, combinatie en datum behouden. De bestaande vestiging en een andere locatie zijn daarna browsermatig gecontroleerd. Tijdens browseracceptatie is geen opdracht gepubliceerd en geen code gewijzigd.

Releaseaudit: de twaalf eerder genoemde flowbestanden plus de volgens Definition of Done noodzakelijke CHANGELOG.md vormen de commitset. De bestaande .gitignore-wijziging blijft buiten de commit. Er zijn geen schema- of migratiewijzigingen.

Opnieuw uitgevoerd voor release: 116 tests in vijf bestanden PASS; Request-databasesuite PASS (tijdelijke lokale database, inclusief opruiming); lint PASS. Secrets-patterncontrole op de dertien geselecteerde bestanden PASS. Typecheck PASS; build PASS (exitcode 0, 127 statische pagina’s). Git diff --check PASS. Alleen de reeds bekende worktree-/tracingwaarschuwing; geen auth-URL-fout in deze releasebuild.
