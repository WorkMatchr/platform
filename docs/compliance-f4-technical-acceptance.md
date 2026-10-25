# Werkpakket 2 — F4 technische en functionele acceptatie

## Nulmeting vóór wijzigingen — 23 oktober 2026

PR #49 is OPEN/Draft op `240eaf860c0689eb991aa7370fe2ac5f3b5877b2`.
Branch `codex/compliance-f4-expanded-guide`; worktree bij aanvang schoon.
Actuele main `a49b59507139ef7121634705da19f781b17845f0`; merge-base
`5d41fa8784851b943dd42cde5747be79d14ef9da`. F4 heeft zes eigen commits
en mist één main-merge (F3 #47). Een tweepuntsdiff toont daardoor oude F3-code;
de werkelijke PR-diff vanaf merge-base verwijdert die F3-bestanden niet.
Geen branchmerge of overname van F3/A07 uitgevoerd.

- Geïmplementeerd: 21 behouden vraagdefinities, 25 CW2-vragen en twee aparte
  contextvelden; tien onderwerpen, 141 regels en negen juridische holds.
- Eén dependency-resolver voor zichtbaarheid, antwoordfiltering en voortgang;
  onbekende voorwaarden blijven zichtbaar. Verborgen antwoorden blijven in
  geheugen maar tellen niet als bewijs.
- Vijfstatus-engine, immutable snapshots en bestaande ArboGuideRun-service;
  vast framework NL_ARBO_GUIDE/2.1, geen nieuwste-versie-fallback.
- Auth/tenantcontrole, 16 KiB payloadgrens, serverbeoordeling, idempotencylock
  en afzonderlijke featuregate zijn aanwezig.
- Resultatenweergave toont maximaal tien onderwerpen, bewijs, ontbrekende
  informatie, vervolgstappen en bronnen. Geen betaalde scan.
- Niet geïmplementeerd: bewaren/hervatten van onafgeronde F4-invoer buiten
  het huidige componentgeheugen; UI meldt dit expliciet. F3-opslag is geen
  impliciete F4-opslag en wordt hier niet gekopieerd.
- Volledige ingelogde browserflow blijft geblokkeerd door niet vrijgegeven
  Knowledge-bronnen/framework en de uitgeschakelde gate. Geen gate geactiveerd.
- A07 #40 blijft OPEN/Draft op `70374ed71f195feef3feca1549c48c5a9ad567fd`.
  F3 #47 is inmiddels gemerged; F3-UX #52 blijft afzonderlijk Draft.

## Actuele verificatie

De bestaande lokale PostgreSQL-harness is opnieuw uitgevoerd met uitsluitend
procesgebonden lokale Compose-credentials. Zij weigert niet-lokale hosts,
maakt een unieke eigen database en verwijdert die in `finally`.

- 86/86 migraties en checksums, nul failed/onverwacht; tweede deploy ongewijzigd.
- Read-only publicatie-CLI: exit 2, NO_GO, FRAMEWORK_NOT_REGISTERED,
  141 ontbrekende regels; geen registratie of wijziging van migratiegeschiedenis.
- F1/F2/F4 route→service→PostgreSQL, zes gelijktijdige identieke aanvragen
  leveren per variant precies één nieuwe beoordeling (F4: tien resultaatregels).
- Rollen, tenantisolatie, inactieve membership, immutable zichtbaarheid,
  bronwijziging en historische snapshots PASS.
- Alleen de sessiecontext is in deze harness vervangen; dit is geen echte
  browserloginproef. Synthetische bronbindingen zijn geen juridische goedkeuring.
- Bestaande pg-deprecation over gelijktijdige client.query blijft zichtbaar;
  geen fout in de uitgevoerde transacties en geen capaciteitswijziging.

Dit rapport wordt aangevuld na de overige technische controles. Nog geen
technisch of inhoudelijk vrijgaveadvies op basis van deze nulmeting alleen.

## Bevestigd herstelpunt vóór codewijziging

De F4-client bewaart voor retry dezelfde idempotency key en completedAt. De route
weigert completedAt ouder dan vijf minuten echter vóór de idempotente service.
Daardoor blijft een retry na vijf minuten mislukken, ook wanneer de eerste
aanvraag wel is opgeslagen maar de browser de response niet kreeg. Antwoorden
blijven behouden, maar de getoonde retry-instructie biedt dan geen herstel.

Veilig herstel: behoud de vijfminutengrens voor nieuwe completions, maar toets
die binnen de bestaande serializable transactie, ná actuele autorisatie en
exacte immutable replay, onder dezelfde idempotencylock. Alleen een expliciete
verlopen-afwijzing zonder opgeslagen run mag de client toestaan een nieuwe
inzending te starten. Een netwerkfout of ambigu resultaat behoudt dezelfde key.
Geen versoepeling van bron-, versie-, tenant- of snapshotcontrole.

Het herstel is uitgevoerd in client, route en bestaande runservice. De optie
`maxCompletionAgeMs` is alleen een serverparameter, geen geaccepteerd payloadveld
en geen onderdeel van de historische fingerprint. Zonder optie blijft het
bestaande F1/F2-servicegedrag gelijk. Een verlopen nieuwe aanvraag krijgt een
expliciete 409; pas daarna vernieuwt de client zijn inzending. De PostgreSQL-
herhaling bewijst late replay naar hetzelfde run-ID, geen nieuwe run bij expiry,
en ongewijzigde snapshots. Netwerkfouten behouden dezelfde key en payload.

## Alle veertig controlepunten

PASS hieronder geldt voor het genoemde bewijsniveau, niet voor juridische
goedkeuring of productieacceptatie. BLOCKED/NOT TESTED worden niet als PASS geteld.

| Check | Status | Bewijs / beperking |
|---|---|---|
| F4-01 volledigheid | PASS | 21 behouden teksten, 25 CW2-vragen, twee contextvelden; unieke codes getest. |
| F4-02 begrijpelijkheid | PASS | Nederlandse labels, expliciete zelfverklaring/onzekerheid; definitieve MKB-gebruikersacceptatie blijft PO. |
| F4-03 antwoorden | PASS | Radio-exclusiviteit; domein weigert onbekende codes/opties; UNKNOWN is geen positief bewijs. |
| F4-04 zichtbaarheid | PASS | RIE=NO: 48→44 velden; UNKNOWN: 48. Browser en resolverregressies. |
| F4-05 volgorde | PASS | Alle tien onderwerpstappen doorlopen; afhankelijkheden binnen gedeelde resolver. |
| F4-06 voortgang | PASS | 48/48 onbekende antwoorden telt als beantwoord, niet als voldaan; teruggaan behoudt state. Geen duurzame hervatting. |
| F4-07 antwoorden wijzigen | PASS | RIE NO→UNKNOWN maakt vervolgvelden zichtbaar; verborgen antwoorden uitgesloten van bewijs. |
| F4-08 grenzen | PASS | Tests voor nul/klein/onbekend/vrijwilligers/tegenstrijdige omvang; geen algemene vrijstelling. |
| F4-09 vijf statussen | PASS | IN_ORDER, ATTENTION_REQUIRED, ACTION_REQUIRED, NOT_ASSESSED, NOT_APPLICABLE; F2-roundtrip. |
| F4-10 statusberekening | BLOCKED | Technische engine getest; 141 juridische gevolgtrekkingen nog niet menselijk vrijgegeven. |
| F4-11 onbekend | PASS | Onbekend/ontbrekend nooit automatisch groen/NVT; bekende tekortkoming blijft zichtbaar. |
| F4-12 uitzonderingen | BLOCKED | Technische holds blijven; daadwerkelijke juridische juistheid van uitsluitingen vereist werkpakket 3. |
| F4-13 afhankelijkheden | PASS | Werkgeversscope/omvang/zichtbaarheid getest; geen sector→vrijstelling. |
| F4-14 determinisme | PASS | Gelijke serverdefinitie/antwoorden leveren dezelfde snapshots/checksums; replay/concurrency getest. |
| F4-15 versiebeheer | PASS | Vaste 2.1-ID/checksum; DRAFT/RETIRED/drift geweigerd voor nieuwe beoordeling. |
| F4-16 onzekerheid | PASS | Negen holds contractueel behouden; Knowledge-policy/dry-run fail-closed. |
| F4-17 dashboard | PASS | Snapshotreader en report-componenttests; tien onderwerpen met status/samenvatting. Geen nieuwe ingelogde browserresultaatproef. |
| F4-18 toelichting | PASS | Verklaring, ontbrekende vragen, bewijs, vervolgactie en bronrevisies uit versiecontract. |
| F4-19 prioritering | PASS | Bestaande statusprioriteit bewaakt; vaste onderwerpvolgorde, geen nieuwe urgentiescore. |
| F4-20 handelingsperspectief | BLOCKED | UI toont bestaande vervolgstappen; juridische bruikbaarheid en holds blijven menselijke review. |
| F4-21 overzicht | PASS | Tien kaarten; smalle presentatie geen overflow; geen nieuwe inklapfunctie toegevoegd. Resultaatbrowser niet opnieuw gemeten. |
| F4-22 limieten | PASS | Precies tien F4-resultaten; details/bronnen blijven in immutable snapshot. |
| F4-23 herberekening | PASS | Antwoordwijziging reset clienttransactie; server berekent opnieuw; oude run blijft immutable. |
| F4-24 historie | PASS | Echte PostgreSQL read/replay/historische snapshotchecks; geen herberekening van bestaande rapporten. |
| F4-25 afbakening | PASS | Zelfverklaringen, geen certificaat/volledige juridische toets; geen betaalde scan. |
| F4-26 migraties | PASS | 86/86 lokaal, checksums, herhaling, cleanup; productie niet geïnspecteerd/gewijzigd in deze ronde. |
| F4-27 opslag | PASS | Echte route/service create/read/roundtrip; update afgeronde beoordeling terecht geweigerd. |
| F4-28 tenant | PASS | Cross-tenant geweigerd in service en routeharness. |
| F4-29 rollen | PASS | OWNER/ADMIN/MEMBER, ontbrekende context en inactieve membership getest. |
| F4-30 concurrency | PASS | Zes gelijktijdige identieke aanvragen: één run/tien regels; late retry hersteld. |
| F4-31 integriteit | PASS | Strict payload, serverberekening, framework/bronchecksums, vervalste snapshots geweigerd. |
| F4-32 privacy | PASS | Geen vrije persoonsgegevensvelden, geen automatische lokale opslag; generieke fouten; synthetische tests. |
| F4-33 herstel | PASS | Pending/dubbelklik/foutfocus/antwoordbehoud; ambigu netwerkresultaat behoudt key; expliciete expiry is veilig retrybaar. |
| F4-34 responsive | PASS | Presentatieharness desktop 1280, tablet 768, mobiel 390; geen horizontale overflow. |
| F4-35 toegankelijkheid | PASS | fieldset/legend/labels, radio's, Tab vanaf stapkop, zichtbare focus, errorfocus. Geen afzonderlijke schermlezerhardwaretest. |
| F4-36 echte 200% | NOT TESTED | PO heeft standaard goedgekeurd; 640 px reflow gemeten, geen nieuwe echte browserzoom geclaimd. |
| F4-37 unit/integratie | PASS | Gerichte regressies en tijdelijke PostgreSQL-suite; exacte totalen hieronder. |
| F4-38 volledige E2E | BLOCKED | Gate blijft uit; echte vrijgegeven bronbindingen/framework ontbreken. Presentatieharness + route/database zijn afzonderlijk bewijs. |
| F4-39 kwaliteitschecks | BLOCKED | Build/lint/testresultaten hieronder; standalone TS heeft vier bestaande baselinefouten. |
| F4-40 F2/F3-regressie | BLOCKED | F1/F2-tests groen; actuele F3-main-merge nog niet geïntegreerd in deze oudere F4-branch. Geen terugdraaiing in PR-diff. |

## Browserbewijs en cleanup

23 oktober: tijdelijke development-presentatieharness op 127.0.0.1:3051,
met bestaande synthetische testdefinitie en onbereikbare databaseplaceholder.
De featuregate bleef false. Dit was geen publicatie of bypass van de echte route.

- Alle tien onderwerpen doorlopen met 48 UNKNOWN-antwoorden; vorige/volgende
  en RIE-zichtbaarheid gecontroleerd. Geselecteerde radio blijft bij teruggaan.
- Stapkop krijgt focus; Tab bereikt eerste radio. Mobiel: documentbreedte 375
  bij viewport 390; tablet 753 bij 768; desktop 1265 bij 1280; reflow 625 bij 640.
- Bewust afronden tegen uitgeschakelde route geeft een fout, behoudt antwoorden,
  beëindigt pending en focust de foutmelding; knop opnieuw bruikbaar.
- Geen consolewaarschuwingen/hydratatiefouten in deze controletab.
- Harness/server/logs vóór productiebuild verwijderd; geen testpagina in commitset.
  Beide F4-testdatabases en de eerdere F3-testdatabase aantoonbaar afwezig na cleanup.

## Resterende afhankelijkheden en advies

**TECHNICAL NO-GO voor volledige F4-eindacceptatie.** Het retrydefect is gericht
hersteld en technisch bewezen; dit geeft geen toestemming de gate te openen.
Concrete open punten: echte accountgebonden browser→opslag→historieacceptatie
met een geautoriseerd framework, integratie met huidige F3-main, juridische
bronacceptatie en de bekende vier standalone TypeScript-baselinefouten.

De onafhankelijke juridische voorbereiding (werkpakket 3) kan veilig doorgaan
op dit vastgelegde resultaat; zij verandert geen gate, claims of productiegegevens.
Geen extra frameworkregistratie, bronpublicatie, migration apply op productie,
merge of deployment uitgevoerd.

## Testresultaten en exacte wijzigingsset

- Nulmeting: 301/301 tests, 15 suites. Eerste sandboxrun had EPERM op
  Vitest-cache-rename en voerde geen tests uit; herhaling buiten die beperking PASS.
- Na herstel: 14/14 gerichte tests in drie suites; vervolgens 303/303 in
  de volledige geselecteerde 15 suites (52,58 seconden). Geen assertions versoepeld.
- PostgreSQL-harness vóór én na herstel PASS, inclusief daadwerkelijke route/service,
  checksums, zes gelijktijdige requests en de nieuwe late-replay/expirychecks.
- Volledige lint na herstel PASS. Diff-check en secrets-patrooncontrole PASS.
- Standalone TypeScript vóór herstel: uitsluitend vier bekende readonly-arrayfouten
  in `src/lib/compliance/rule-engine.test.ts`, regels 13, 14, 23, 24.
- Eerste build na browserharness strandde op een achtergebleven gegenereerde
  `.next/dev/types`-verwijzing. Alleen die devcache verwijderd; geen productworkaround.
  Definitieve productiebuild PASS: 165 routes, geen tijdelijke testpagina.
  De build vervangt de afzonderlijke TypeScript-check niet.
- Definitieve standalone TypeScript na cacheherstel: exact dezelfde vier TS2345
  readonly-arraybaselinefouten in `rule-engine.test.ts` op 13, 14, 23 en 24.
  Geen nieuwe TypeScriptfout uit deze wijzigingsset of tijdelijke testbestanden.

Uitsluitend gewijzigd in deze technische review:

1. `docs/compliance-f4-technical-acceptance.md`
2. `scripts/fixtures/compliance-f4-database.ts`
3. `src/app/wijzers/compliance/v2/runs/route.test.ts`
4. `src/app/wijzers/compliance/v2/runs/route.ts`
5. `src/components/public/compliance-expanded-guide.test.tsx`
6. `src/components/public/compliance-expanded-guide.tsx`
7. `src/lib/arbo-guides/arbo-guide-run-service.ts`

Geen wijziging aan vragen, holds, normatieve statuslogica, bronnen, database-
schema, migraties, packages of F3/A07-bestanden. Tijdelijke harness en gegenereerde
next-env-padwijziging worden uitgesloten van de commitset.
