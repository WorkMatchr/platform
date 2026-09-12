# Oplevering eenvoudige Advieswijzer

**SIMPLE_ADVICE_REQUEST_FLOW_ACCEPTED** — de product-owneracceptatie is afgerond. Zie het [definitieve acceptatierapport](simple-advice-final-acceptance.md). Onderstaande oplevernotities beschrijven de eerdere technische oplevering; de toen openstaande browsercontroles zijn inmiddels geslaagd.

## Functioneel resultaat

1. **Route A:** Ja opent de twintig bestaande expertise-identiteiten. Een keuze is verplicht en wordt zonder AI-validatie opgeslagen.
2. **Route B:** Nee opent vijftien onderwerpen, inclusief Anders met optionele toelichting en Ik weet het echt niet. Een exacte expertise is geen publicatievoorwaarde.
3. **Gedeelde intake:** één component voor titel, beschrijving, resultaat, locatie/combinatie en start/datum. Teruggaan behoudt invoer; routewisseling wist onverenigbare keuzes.
4. **Controle/publiceren:** review toont de eigen invoer. De bestaande opdrachtgeverautorisatie, publicatiebeperkingen en Request-keten gelden. Dossier, versie, Request en audit worden atomair en idempotent opgeslagen.
5. **Datamapping:** `AdviceDossierVersion.simpleRequestSnapshot` bewaart de gevalideerde typed invoer. Bestaande Request-velden bevatten titel, omschrijving, start, expertise indien gekozen en de leesbare locatie-/resultaatprojectie. Geen nieuwe opdrachtentiteit of automatische expertiseclaim.
6. **Schema:** één nullable JSONB-snapshot, dossierbron SIMPLE_ADVICE, drie aanvullende startwaarden en nullable Request-expertise. Migratie `20260912090000_simple_advice_request` is uitsluitend op tijdelijke testdatabases toegepast; bestaande gebruiksdata is niet gemigreerd.

## Verificatie

7. **Tests:** 293 verschillende tests zijn geslaagd over de regressierun en gerichte herhalingen. De laatste gerichte run na de Zod-typecorrectie slaagt met **61/61** contract- en formuliertests. Eerder overschreden twee interactieve tests de standaard 5 seconden; ze slagen met een begrensde 30 seconden. Een herhaling tijdens de lange sessieonderbreking liep vast in de JSDOM-startuphook en voerde geen tests uit; de daaropvolgende herhalingen slagen.

   Beide relevante echte databasesuites slagen: Request-publicatie en de bestaande core-/Assignment-integriteit. A/B/UNKNOWN, parallelle idempotentie, immutable snapshots, audit, tenant-/eigenaarisolatie, vreemde locatie en rollback zijn gecontroleerd. Tijdelijke databases zijn door de suites verwijderd.

   Browser: anonieme A/B-flow, invoer, review en loginpoort gecontroleerd op desktop en mobiel; geen horizontale overflow of browsererrors gevonden. De uiteindelijke productiebuild is lokaal geopend; Route A is met Tab, pijltjestoetsen en Enter van routekeuze via alle gedeelde velden tot review doorlopen, met zichtbare focus en correcte invoer. Browsererrorlog is leeg. Volledige ingelogde browserpublicatie en exacte 200%-zoom zijn nog niet geverifieerd. De in-app browser bood alleen viewportcontrole; zoomtoetsen werden geweigerd of veranderden de zoom niet. De 640 px-reflowcontrole geldt daarom niet als bewijs van echte 200%-zoom. Publicatie is afzonderlijk in component- en echte databaseservicetests gecontroleerd. De tijdelijke previewserver en testtab zijn na afloop gesloten.

8. **Lint/typecheck/build:** alle drie slagen op de uiteindelijke code (exit 0). Lint heeft nul fouten en twee waarschuwingen in bestaande benchmarkbestanden; de eigen formulierwaarschuwingen zijn opgelost. De volledige Next-build inclusief TypeScript en paginageneratie slaagt. De bestaande Knowledge-importtrace waarschuwt voor een te breed bestandspatroon. Geen onafhankelijke bestaande issues aangepast.

9. **Gewijzigde bestanden binnen deze opdracht:**

   - `src/app/advieswijzer/page.tsx`
   - `src/app/advieswijzer/simple-actions.ts`
   - `src/app/adviesdossiers/[dossierId]/page.tsx`
   - `src/app/advice-guide.test.tsx`
   - `src/components/requests/simple-advice-form.tsx`
   - `src/components/requests/simple-advice-form.test.tsx`
   - `src/components/requests/request-publication-form.tsx`
   - `src/lib/requests/simple-advice-contract.ts`
   - `src/lib/requests/simple-advice-contract.test.ts`
   - `src/lib/requests/simple-advice-service.ts`
   - `src/lib/requests/request-service.ts`
   - `src/lib/requests/request-contract.ts`
   - `src/lib/requests/request-contract.test.ts`
   - `src/lib/requests/request-eligibility-service.ts`
   - `src/lib/advice-dossiers/advice-dossier-service.ts`
   - `src/lib/advice-dossiers/advice-dossier-contract.ts`
   - `prisma/schema.prisma`
   - `prisma/migrations/20260912090000_simple_advice_request/migration.sql`
   - `scripts/test-request-database.ts`
   - `package.json`
   - `package-lock.json`
   - `CHANGELOG.md`
   - `docs/simple-advice-request-flow.md`
   - `docs/simple-advice-request-flow-delivery.md`
   - `docs/README.md`
   - `docs/database.md`
   - `docs/data-dictionary.md`
   - `docs/ERD.md`

   Alleen testafhankelijkheden toegevoegd: Testing Library, JSDOM en de bijbehorende types; geen productieafhankelijkheden. Gegenereerde Prisma-client en lokale `.tmp/simple-advice`-logs zijn verificatieartefacten.

10. **Git:** bestaande worktree `.codex-worktrees/ai-help-request-intake-v2`, branch `codex/ai-help-request-intake-v2`. `git status --short` telde vooraf 195 regels en bij oplevercontrole 215 (dit is inclusief bestaande wijzigingen en gegroepeerde niet-gevolgde directories). De 28 bestanden hierboven bakenen deze opdracht af. Eerdere wijzigingen zijn behouden. Geen staging, commit, push of deployment uitgevoerd.
11. **Resterende punten:** handmatige ingelogde browserpublicatie en daadwerkelijke 200%-zoomcontrole vóór volledige productacceptatie (Product Constitution PC-063/073–075). Geen aangetoonde functionele of technische blocker in de uitgevoerde controles. Onderwerp-only opdrachten krijgen bewust geen automatisch afgeleide expertise of nieuwe matchinglogica. De migratie moet bij een later, afzonderlijk geautoriseerd releasemoment worden toegepast.

## Controlebewijs

Lokale logs staan in `.tmp/simple-advice`: `regression-final.log`, `form-verified.log`, `form-delivery.log`, `form-delivery-verified.log`, `targeted-delivery.log`, `db-requests.log`, `db-core.log`, `lint-final.log`, `lint-form-delivery.log`, `lint-delivery.log`, `typecheck-delivery.log`, `build-delivery.log` en `static-checks.json`.

`npm run typecheck` slaagt na de Zod-typecorrectie. `git diff --check` slaagt en de patroongebaseerde secretscan van de 28 eigen bestanden vindt geen credentials, private keys of database-URL's met wachtwoord. Er is geen trailing whitespace in deze bestanden aangetroffen.

Geen V3/V4-werk, benchmark, AI- of providerexperiment. Geen commit, push of deployment.
