# Contactverwerking — operationele afsluiting, kandidaat

Basis: main `e922312e87ae4581a0d003939daaf977a673ee7c` (PR #84).
Dit vult [contactretentie](contact-retention.md) gericht aan. Geen nieuwe provider,
migratie, verzendroute of wijziging aan afhandeling/deduplicatie. Geen productieactivering.

## Gerichte opvolging: afgescheiden autorisatie en finalisatie

De [gesloten technische kandidaat](contact-monitor-finalization.md) vervangt hieronder genoemde
CRON-auth voor contact-health door uitsluitend CONTACT_MONITOR_SECRET. De cronroutes zelf
blijven ongewijzigd. Zij voegt een apart geautoriseerde menselijke finalisatie met atomair
bestaand auditspoor toe. Deze wijzigingen zijn geen productieactivatie. De eerdere zeven extra
dagen blijven NIET goedgekeurd; het individuele 48-uursvoorstel staat uitsluitend ter beoordeling.

## Feitelijke nulmeting — 1 november 2026

De bestaande GitHub-workflow is actief, met kwartierplanning. De gecontroleerde laatste run
had daadwerkelijk een succesvolle `dispatch`-job én maintenance-stap; geen overgeslagen job.
De twee laatst waargenomen startmomenten lagen **6 uur 25 minuten 42 seconden** uiteen.
Dat bevestigt opnieuw dat groene runs geen bewijs zijn voor ononderbroken uitvoering.
Geen workflows getriggerd, productie-endpoints aangeroepen of providerinstellingen gelezen.

De bestaande dispatcher meldt fouten, backlog en `reviewRequired` tijdens een run. Hij kan
geen volledig ontbrekende eigen run detecteren. Bestaande documentatie bevat een handmatige
controle en 45/60-minutenvoorstel, geen bewezen onafhankelijke alarmontvanger. Retentie had
nog geen waarschuwing vóór de grens of ouderdomssignalering voor reconciliatie.

## Minimale aanvulling

- `GET /api/maintenance/contact-health`: uitsluitend bestaande maintenance-auth en Preview-
  isolatie; standaard dicht (`CONTACT_MONITOR_ENABLED` niet `true`). `no-store` ook bij fouten.
  Eén read-only aggregatequery op de bestaande outbox/tellers, geen claim, update of cleanup.
  Geen berichten, identiteiten, provider-ID's, adressen, ciphertext of sleutels in de response.
- `node ops/marketplace-notifications/monitor.mjs`: leest bestaande GitHub-run/jobmetadata via
  de geautoriseerde `gh`-sessie en uitsluitend de bovenstaande GET. Geen dispatch/POST, database-
  credential, providerrequest of workflowtrigger. Beide waarnemingen falen onafhankelijk.
- De operator kiest een absolute `CONTACT_MONITOR_STATE_FILE` **buiten Git en synchronisatie**,
  in een bestaande private beheermap met beperkte ACLs. De oudermap moet al bestaan. De bestaande
  `CRON_SECRET` komt alleen via de veilige procesomgeving; nooit in argumenten, uitvoer of bestand.
  Dit credential heeft bestaande bredere onderhoudsrechten: niet aan de achtervang verstrekken.
- State bevat alleen alarmcodes, niveaus en controletijd. Eén proces via exclusieve lock; atomaire
  vervanging voorkomt halfgeschreven state. Herhaling van dezelfde toestand genereert geen nieuwe
  melding. Opening, niveauwijziging en herstel wel; geen afzonderlijke dubbele scheduler- of
  reconciliatiealarmen voor dezelfde toestand. Een onbekende meting sluit oude alarmen niet.
- JSON-regels op stdout bevatten uitsluitend overgangen; exit 0 = gezond, 1 = open alarm(en),
  2 = monitor zelf onbeschikbaar. **Niet iedere exit 1 opnieuw als notificatie versturen.**
  De volledige actuele alarmset staat in het private statebestand. Ongeldige state/lockfout levert
  generiek `CONTACT_MONITOR_UNAVAILABLE`, zonder bronfout of secret. Bij crash tussen uitvoer en
  statecommit kan een overgang worden herhaald: ontvanger moet code/niveau idempotent verwerken.

### Geteste signalen

| Signaal | Trigger | Opvolging door platformbeheer |
| --- | --- | --- |
| Scheduler | >=30 min geen scheduled main-run, of >=45 min geen bewezen succesvolle maintenance-stap; kritisch bij >=60 min | Oorzaak en bestaande run/jobstatus beoordelen; geen blinde herstart |
| Contactmetadata | Binnen 1 uur van 30 dagen na definitieve afhandeling; kritisch op/na grens | Cleanup/gate/lease/backlog onderzoeken, geen ongeautoriseerde purge |
| Contacttellers | Binnen 1 uur van 24 uur; kritisch op/na grens | Dezelfde controle; signalering ook bij gesloten mail/retentie |
| Berichtinhoud | Ciphertext ouder dan 7 dagen, ook bij actieve lease | Bestaande inhoudsredactie/leasefout onderzoeken |
| Reconciliatie | Meteen bij onzekere/ongeldige toestand; niveau op 24 uur, 72 uur, dag 7 | Case openen, triage, escalatie, expliciet besluit |
| Onbekende waarneming | API/auth/database fout, ontbrekende of >5 min oude snapshot, ongeldige telling | Geen groene status of onterechte herstelsluiting; beheeractie |

Een groen GitHub-workflowresultaat zonder de uitgevoerde maintenance-stap telt niet. Handmatige
runs en andere branches zijn geen scheduled heartbeat. Maximaal 30 recente runs en vijf relevante
joblijsten worden gelezen; ontbrekend succesbewijs is kritiek, geen aanname van gezond bedrijf.
Eén uur voorwaarschuwing en 30-minuten-gatdetectie zijn technische detectiegrenzen, geen nieuwe
bewaartermijnen of gegarandeerde SLA. De bestaande 45/60-minutencontrole blijft herkenbaar.

Er bestaat geen betrouwbare `firstUncertainAt` of afgehandelde triageregistratie in het datamodel.
Daarom telt de monitor conservatief vanaf een geldige eerste providerpoging, anders aanmaak.
Hij zegt **termijn verstreken bij nog open case**, niet dat menselijke triage aantoonbaar ontbreekt.
Retries, leases en opnieuw bekijken verlengen de klok niet. Precieze casebesluiten worden privaat
geregistreerd; de monitor blijft open tot bewezen technische eindstatus. Geen schema toegevoegd.

## Reconciliatie — bevestigd proces

1. **Binnen 24 uur:** platformbeheer wijst één bevoegde behandelaar aan, legt eerste waarneming,
   conservatieve bronklok en triage vast. Verifieer uitsluitend read-only providerbewijs.
2. **Na 72 uur:** niet-afgeronde case escaleren naar de verantwoordelijke beslisser; noteer ontbrekend
   bewijs en concrete vervolgactie. Geen nieuwe mail, identity/key of automatische retry als proef.
3. **Uiterlijk dag 7:** expliciet, gemotiveerd besluit. Bewezen acceptatie kan naar SENT; bewezen
   geen aanbieding naar definitief mislukt; onzeker blijft geblokkeerd. Afwezigheid in een beperkt
   providerlogvenster bewijst geen mislukte verzending. Geen fictieve provider- of afhandeldatum.
4. Registreer ieder besluit in één afgeschermd, append-only beheerdossier; corrigeer door een nieuwe
   revisie, niet door overschrijven. Geen inhoud of credentials kopiëren. Onderstaande velden zijn
   het verplichte invulsjabloon; er zijn in deze opdracht geen echte besluiten/cases aangemaakt.

| Privaat besluitveld | Vastlegging |
| --- | --- |
| Case/revisie en vorige revisie | Unieke interne referentie en relatie, geen publieke outbox-ID |
| Behandelaar en bevoegdheid | Individuele interne beheerderreferentie, actuele toegewezen rol, eventuele tweede reviewer |
| Bronklok, waarneming, triage, escalatie | UTC-tijdstippen met bron; geen achteraf verzonnen tijden |
| Grondslag en bewijs | Noodzaak, beperkte bewijsreferentie/bron/tijdperiode, onzekerheden; geen mailinhoud |
| Besluit en eindstatus | SENT / bewezen niet aangeboden / ONZEKER_GEBLOKKEERD; onderscheid dossierbesluit van nog niet uitgevoerde DB-status |
| Actie en toestemming | Wie welke afzonderlijk geautoriseerde handeling uitvoert en verificatie daarvan |
| Eind-/reviewdatum | Concrete datum, eigenaar en minimale te behouden velden; geen automatisch verlengveld |

Er is bewust **geen muterend reconciliatie-endpoint of operator-SQL-bypass** toegevoegd. Een
dossierbesluit verandert de outbox niet. Een latere gecontroleerde eindstatuswijziging vereist
afzonderlijke autorisatie, actuele rolcontrole, verwachte status/lease, atomair auditbewijs en
vaste finalisatietijd. Tot dat uitvoeringspad geaccepteerd is, blijft automatische verwijdering
van onzekere gevallen geblokkeerd. De goedgekeurde 30 dagen beginnen uitsluitend na bewezen
definitieve afhandeling; niet bij triage of een verlengbesluit.

### Begrensde uitzondering — alleen ontbrekend duur-/grondslagbesluit open

De deadlines 24 uur / 72 uur / dag 7 zijn bevestigd en worden niet opnieuw ter goedkeuring gevraagd.
Een uitzonderingsduur voor onzekerheid is nog niet vastgesteld. Concreet voorstel: uiterlijk dag 7
een **eenmalige uitzondering van maximaal zeven extra dagen**, alleen met aantoonbare noodzaak,
verantwoordelijke beslisser, vaste einddatum en dagelijkse beoordeling. Geen automatische verlenging.
Uiterlijk die einddatum volgt een privacy-/bewijsbesluit over het kleinst mogelijke bewijspakket en
verantwoorde afronding. Als dat nog niet kan: directe formele escalatie als overschreden uitzondering,
geen stilzwijgende verlenging of ongeautoriseerde verwijdering. Ook de dossierretentie moet daarbij
expliciet worden vastgesteld. Dit voorstel is **geen goedgekeurde extra bewaartermijn**.

Bestaande zeven-dagen-inhoudsredactie blijft ongewijzigd; metadata/evidence niet onnodig kopiëren.
Bewijsbehoud rechtvaardigt niet automatisch alle inhoud of onbeperkte retentie. Zonder toereikende
grondslag kan dit onderdeel niet als operationeel afgerond worden aangemerkt.

## Verantwoordelijkheid en latere ingebruikname

Primair is **WorkMatchr-platformbeheer**. De door de PO voorgestelde achtervang is bekend; naam en
toegangsdetails horen in het private beheerdossier, niet deze openbare repository. Eerst instemming,
instructie en gecontroleerde oefening. Geen rechten verstrekt. Achtervang krijgt alleen geschoonde
alarmovergangen en de procedure; geen CRON-secret, database/provideraccount of financiële bevoegdheid.

Platformbeheer ontvangt alle opening/escalatie/herstelmeldingen én monitorstoringen. De ingestemde
achtervang ontvangt onbevestigde kritieke meldingen volgens het vast te leggen bereikbaarheidsrooster.
Dagelijkse controle van alle open cases blijft nodig, ook als deduplicatie geen nieuwe melding geeft.
Publieke GitHub-issues, CI-artifacts of een nieuwe uitgaande e-mail zijn geen privaat incidentregister.

Na afzonderlijke release-/configuratieautorisatie is de uitvoerbare operatoraanroep:

```powershell
# Alleen in de goedgekeurde operatoromgeving; variabelen veilig vooraf beschikbaar.
node ops/marketplace-notifications/monitor.mjs
```

Benodigd vóór activering: bestaand onafhankelijk, beheerd uitvoerpunt met bijvoorbeeld vijfminuten-
polling; `gh` read-only repository Actions-toegang; private stateopslag; veilig aangeleverde bestaande
maintenance-auth; uitsluitend de read-only monitorroute geopend. Geen contact-/mail-/retentiegate
hoeft hiervoor open. Koppel overgangen aan het bestaande private alarmkanaal en bewijs ontvangst,
bevestiging, afwezigheidsescalatie en herstel met synthetische signalen. Geen configuratie hier gewijzigd.

**Niet aangetoond:** beschikbaar onafhankelijk uitvoerpunt, alarmkanaal/ontvangst en monitorbewaking.
Een tweede GitHub scheduled job is geen onafhankelijke oplossing bij GitHub-uitval en is niet
toegevoegd. De monitor moet zelf op uitblijvende controles worden bewaakt; dat vereist het gekozen
uitvoerpunt/ontvanger. Het oude handmatige dagrooster bewijst geen 24/7-detectie. Een harde maximale
fysieke retentie blijft tijdens onbeperkte infrastructuuruitval technisch niet te garanderen.

Afzonderlijke toestemming blijft nodig voor merge/deployment, configuratie, productieherverwerking,
retentie/purge, reconciliatie-statuswrites, provideracties en toegangsverlening. Geen van die handelingen
is uitgevoerd. F4/LMS, juridische concepten en alle financiële beslisregels blijven ongewijzigd.

## Gerichte acceptatie

- 54/54 contact-/maintenance-/admission-/onzekere-providerregressies PASS.
- 24/24 node scheduler-/monitortests PASS: ontbrekend/vertraagd/overgeslagen, leeftijd, timeout/fout,
  gescheiden waarneming, herstel zonder onterechte casesluiting, deduplicatie en veilige output.
- 8/8 PostgreSQL-testgroepen PASS in eigen nieuwe synthetische database: read-only runtime,
  30d/24h en 24h/72h/7d-grenzen, leases, 100 dagen uitval, zes gelijktijdige observaties,
  foutinjectie en herstel. Volledige rijsnapshots ongewijzigd. Eigen database verwijderd in `finally`.
- Geen migratie uitgevoerd of echte mail verstuurd. Bestaande Docker/PostgreSQL-middelen behouden.
- Lint: 0 fouten, vier bestaande navigatiewaarschuwingen. Standalone TypeScript: PASS.
- Productiebuild: PASS, 171 statische pagina's; drie bestaande filesystemtracingwaarschuwingen
  in knowledge-source-manifest/logo-storage. Geen nieuwe buildfout.
- Diff-check en scan van alle twaalf taakbestanden op secrets/persoons-/infrastructuurmetadata:
  PASS; uitsluitend de ongewijzigde synthetische localhost-CI-fixture uitgezonderd.
- Geen publieke UI gewijzigd; geen nieuwe responsive/juridische acceptatie geclaimd.

| Onderdeel | Technisch getest | Operationeel ingericht | Daadwerkelijk geactiveerd |
| --- | --- | --- | --- |
| SCHEDULER MONITORING | PASS: run én succesvolle stap, gat/leeftijd/herstel | BLOCKED: onafhankelijk uitvoerpunt, ontvanger en zelfbewaking niet bewezen | NO |
| RETENTION ALERTS | PASS: voorwaarschuwing/grens, gates uit, geen writes | BLOCKED: monitoruitrol/ontvangst niet bewezen; harde maximumgarantie ontbreekt | NO |
| RECONCILIATION | PASS: signalen/deadlines; bestaande blokkade op retry intact | PARTIAL: procedure bevestigd, privaat dossier/uitvoerder en veilige statusafhandeling nog inrichten; uitzonderingsduur open | NO |
| RESPONSIBLE OWNER | WorkMatchr-platformbeheer bevestigd | PARTIAL: bereikbaarheid/ontvangst en instemming/instructie achtervang niet bewezen | Geen nieuwe rechten |
| PRODUCTION ACTIVATION | Bewust niet uitgevoerd | Afzonderlijke release- en configuratieautorisatie vereist | NO |

### Wijzigingsset

```text
.github/workflows/learning-publication-integrity.yml
docs/README.md
docs/contact-retention.md
docs/contact-operations.md
ops/marketplace-notifications/monitor.mjs
ops/marketplace-notifications/monitor.test.mjs
scripts/test-contact-health-database.ts
src/app/api/maintenance/contact-health/route.ts
src/app/api/maintenance/contact-health/route.test.ts
src/lib/contact/contact-health.ts
vercel.json
vitest.config.ts
```
