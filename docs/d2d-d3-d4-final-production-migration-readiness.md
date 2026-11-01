# D2D/D3/D4 — publieke technische herstelvoorbereiding

Versie: 30 oktober 2026. Dit is de geschoonde reviewversie. Ruwe infrastructuurinventaris, productie-identiteiten, rol-/toegangsdetails, deploymentgegevens, operationele tellingen en uitvoeringsbewijs zijn bewust uitgesloten. Het volledige dossier is hash-gecontroleerd bewaard in private lokale opslag buiten Git en synchronisatiemappen.

## Besluit

**NO-GO voor productiemigratie.** Dit pakket implementeert lokale operationele bouwstenen, synthetische tests en een uitvoeringsprocedure. Het wijzigt geen applicatie-, authenticatie-, financiële of compliancebeslisregels, migraties of afhankelijkheden. Echte export, restore, productieschrijfpauze, privilegewijzigingen en migraties zijn niet uitgevoerd. F4 en LMS blijven uitgeschakeld.

## Inbegrepen bouwstenen

| Onderdeel | Gedrag |
|---|---|
| Versleuteld archief | pg_dump-stream naar GnuPG; integriteit vóór restore; geen plaintextbestand; begrensde buffers en cleanup |
| Operatorstage | Standaard offline; twee afzonderlijk gereviewde private documenten; exacte doelbinding; maximaal vijftien minuten; geen credentialfallback |
| Preflight | Read-only SQL en offline checksumvergelijking; publieke tests gebruiken een synthetische registry |
| Loginfence | Offline SQL-compiler voor close/verify/open; exacte writerlijst; geen eigen lockout, providerrolwijziging of impliciete sessiekill |
| Retentie | Default plan; alleen exacte run na toestemming, verlopen retentie en zonder hold; weigert links, onbekende bestanden en actieve back-uplocks |
| Host-/sleutelcontrole | Read-only inventaris en synthetische DPAPI-/GPG-proeven; geen nieuwe echte sleutel of hostinstelling |

Zie [D2B](d2b-postgresql-backup-recovery-decision.md) en [D2C/D3](d2c-d3-production-backup-and-migration-preflight.md). Ruwe outputs van hostinventaris, preflight en scripts mogen nooit als openbare CI-artifacts of PR-bijlagen worden gebruikt.

## Opslag, sleutelbeheer en herstelomgeving

Voor echte gegevens is expliciete acceptatie nodig van een locatie buiten Git/synchronisatie, beperkte ACL's, host- en swapversleuteling, patchstatus, endpointbeveiliging, firewall, remote toegang, beheerders en back-upsoftware. Het publieke dossier doet geen uitspraak over specifieke aanwezige hostinstellingen.

De dumpclient krijgt alleen de publieke sleutel. De private sleutel en ontgrendeling blijven gescheiden van archieven. Een goedgekeurd onafhankelijk medium of kluis, benoemde sleutelhouder en achtervang moeten herstel na hostverlies aantoonbaar mogelijk maken. DPAPI alleen is daarvoor onvoldoende. Geen echte sleutel is in deze opdracht aangemaakt.

Herstelproeven gebruiken een eigen gepinde PostgreSQL 18-container, network none, nul hostpoorten en tmpfs. Geen applicatie, workers, providercredentials of productieverbindingen. Lokale RAM/tmpfs kan worden geswapt; daarom blijft hostacceptatie vereist. Een lokale testcontainer is geen productieherstelbestemming.

Voorstel: proefkopie na bewijsregistratie verwijderen, uiterlijk binnen het afzonderlijk goedgekeurde venster. Het migratiecheckpoint houdt een bewaartermijn die onderhoud en incidentafhandeling dekt. Een actieve hold verhindert verwijdering. Bij cleanupfout geen PASS en geen nieuwe kopie; eigenaar/achtervang inschakelen. Geen automatische verwijdertaak geïnstalleerd.

## Rollen en writerstop

Back-upoperator: alleen noodzakelijke CONNECT/USAGE/SELECT op huidige objecten. Migrator, runtime, fencebeheerder en herstelowner zijn afzonderlijke verantwoordelijkheden. De fencebeheerder mag niet in de writerlijst zitten; de provider moet de route ondersteunen. Een lokale PostgreSQL-test bewijst geen mogelijkheden van een beheerde productieprovider.

Inventariseer accounts/sessies, organisaties, intake/handoff, marketplace/offertes, credits/ledger, betalingen/webhooks, facturen, contact/rate limiting, outbox, cronjobs, Compliance, LMS, platformbeheer, directe clients en oude/Preview-deployments. Onbekende credentialhouders of writers zijn een stopcriterium.

De combinatie van ingressstop, schedulerstop, loginfence en drain is noodzakelijk. Een visuele onderhoudspagina of alleen POST blokkeren dekt geen GET-writes, Server Actions, workers of directe clients. De SQL-compiler weigert onverwachte rolstatus, membershipbypass en eigen lockout. Verify weigert bestaande writerverbindingen, onbekende clients en prepared transactions. Geen automatische backendkill of timeout-unlock. Open herstelt de oorspronkelijke LOGIN-status.

De synthetische HTTP-adapters bewijzen dat verschillende paden/methoden dezelfde gesloten databasecredential niet omzeilen. Zij zijn geen claim dat echte platformingress of providerpooling is getest. De volledige productieblokkade blijft een afzonderlijke acceptatievoorwaarde.

## Financiële veiligheid

De bestaande webhookroute bevestigt pas succes na geslaagde verwerking. DBfouten geven geen 200. De bestaande service valideert providerstatus, bedrag, valuta en tenant, met transacties, locks en idempotente boeking/factuuridentiteiten. Een vertraagde status mag een definitief resultaat niet terugdraaien.

Providerretries zijn geen complete herstelstrategie. Controleer tijdens het venster het geldende providercontract en reconcileer alle relevante gebeurtenissen vanaf T0, inclusief recurring payments. De bestaande financecron is geen volledige inhaalvoorziening voor gemiste betaalwebhooks. Herverwerking kan credits, facturen en mails activeren: benoem vooraf operator en toestemming. Onbesliste providerrequests, leases of betalingen zijn STOP; geen blinde resend.

## Migratiebundel en uitvoeringsprocedure

De comparator bevat de acht gereviewde migratienamen en controleert de volledige repositoryketen. Exacte filehashes zijn afleidbaar uit de vastgelegde commit; vergelijking met de actuele registry gebeurt lokaal read-only. Gepubliceerde/gepensioneerde examenvragen moeten na de volledige keten beschermd blijven. Geen tussenstand activeren; geen historische registry wijzigen.

1. Benoem operator, achtervang, onderhoudsvenster, doelidentiteit, exacte bundel/checksums en productiegeschikte herstelbestemming.
2. Bewijs opslag-, sleutel- en toegangsacceptatie. Controleer providerstatus en alle writer-/credentialhouders; bevries deployments en beheeracties.
3. Stop nieuwe ingress, schedulers en handmatige workers. Bevestig geen niet-verwerkte webhook met succes.
4. Genereer close-SQL met het goedgekeurde private writerplan; laat lopende transacties afronden. Geen automatische sessiekill.
5. Verify: geen writer-/onbekende clientverbinding, prepared transaction, actieve lease of onbesliste providercall. Controleer direct én pooled toegang. Leg T0 vast.
6. Herhaal identiteit, registry/checksums en integriteit read-only. Bij afwijking stoppen.
7. Maak uitsluitend na G1 één versleutelde back-up met beperkte broncredential en TLS verify-full. Geen ownerfallback of onversleutelde tussenkopie.
8. Herstel uitsluitend na G2 op de geaccepteerde lege geïsoleerde target. Vergelijk schema, constraints, indexes, triggers, functies, owners/ACL's, registry/checksums en historische/financiële aggregaten.
9. Alleen na succesvolle echte herstelacceptatie en G4: officiële Prisma-runner op de exact gereviewde bundel. Geen reset, resolve, seed of andere pending migraties.
10. Controleer registry, checksums, immutable guards, snapshots, wallet/ledger, handoffs en notificatiestatussen. F4/LMS blijven uit.
11. Bij PASS gecontroleerd providerreconciliëren met afzonderlijke bevoegdheid, daarna logins, ingress en schedulers herstellen. Monitor fouten en retries.
12. Bij fout writers gesloten houden; read-only diagnose. Alleen een vooraf goedgekeurde G5-route mag herstel of cutover uitvoeren. Bron en checkpoints behouden.

STOP bij identiteit-/checksumafwijking, onbekende writer, open pool/tx/lease, timeout/lockwait, ontbrekende sleutel/operator/target, corruptie, onvoldoende capaciteit of onbesliste provideruitkomst. Geen automatische retry, capaciteitstoename, forced unlock of registryreparatie.

RPO 0 is uitsluitend een doel onder volledige writerstop plus externe reconciliatie. Een consistente dump alleen is onvoldoende. Synthetische runtimes geven geen productie-RTO-garantie; meet detectie, sleuteltoegang, targetprovisioning, restore, verificatie, cutover en hervatting afzonderlijk. Geen nieuwe betaalde dienst gestart. Compute/egress, onafhankelijke sleutelopslag en herstelhosting kunnen afzonderlijke kosten/goedkeuring vereisen.

## Validatie en publicatiegrens

Het oorspronkelijke lokale pakket behaalde 45 Node-tests, 60 financiële/notificatie-unittests en 3 webhooktests; synthetische PostgreSQL-/encryptie-/fenceproeven en financiële database-integratie waren PASS. De migratiebestanden zijn ongewijzigd; bestaand keten-/examenbewijs wordt hergebruikt. Dit is geen nieuwe productiecontrole.

De publieke variant vervangt productiefixtures door synthetische data en hardcoded doelidentiteiten door afzonderlijk gereviewde private configuratie. Hertest van de geschoonde variant:

- 68/68 Node-tests PASS: synthetische registry, doelbinding, ontbrekende/verlopen autorisatie, readonly preflight, fence en retentie.
- 63/63 financiële/notificatie/webhookregressies PASS; uitsluitend gemockte providers.
- Synthetische PostgreSQL-schrijfpauze PASS, inclusief bestaande transactie, idle pool, geweigerde nieuwe login, zes duplicaatwebhooks, privileges en cleanup.
- Synthetische versleutelde restore met geïmporteerde sleutel PASS; verkeerde sleutel/corruptie geweigerd; eigen resources opgeruimd.
- Volledige lint PASS: nul fouten, vier bestaande navigatiewaarschuwingen.
- Standalone TypeScript PASS; normale Turbopack-productiebuild PASS.
- Metadata-, secrets-, diff- en volledige nieuwe commitgeschiedeniscontrole vóór push verplicht; gedetailleerd lokaal bewijs blijft buiten de PR.

De Node-suites zijn expliciet aan bestaande CI gekoppeld en worden niet als Vitest-suites uitgevoerd. De eerste verse-worktreepoging miste gegenereerde Prisma-code; de eerste build kon gekoppelde dependencies buiten de worktree niet gebruiken. Beide lokale inrichtingsproblemen zijn opgelost met eigen dependencies en officiële Prisma-clientgeneratie. Geen app-/package-/lockfilewijziging. De echte operatorstage blijft niet uitgevoerd; afzonderlijke productieacceptatie blijft nodig.

De eerdere Turbopack CSS-subprocesfout werd in het lokale pakket niet opnieuw gezien. De specifieke oorzaak is niet bewezen; er zijn geen app-, CSS- of dependencywijzigingen aangebracht om de build te laten slagen.

De publieke branch begint bij origin/main en neemt uitsluitend nieuwe geschoonde bestanden op. De eerdere private commits worden niet gecherry-pickt of gemerged. Controleer vóór push alle nieuwe commitblobs, berichten, diffs en PR-tekst. Ruwe JSON-bewijzen worden niet toegevoegd. De branchspecifieke Vercel-instelling voorkomt automatische deployments van deze voorbereidingsbranch.

## Afzonderlijke besluiten

| Besluit | Vereiste scope |
|---|---|
| G1 | Echte export: geaccepteerde host/opslag, minimale operator, onafhankelijke sleutel, retentie/cleanup en kosten |
| G2 | Echte restoreproef: één expliciete geïsoleerde target, veilige verwerking, integriteitsbewijs en cleanup |
| G3 | Productieschrijfpauze: alle ingress/writers, ondersteunde beheerroute, drain en herstel-/reconciliatieprocedure |
| G4 | Exacte migratiebundel: geslaagde G1/G2, getest G3, actueel herstelpunt en onderhoudsvenster |
| G5 | Noodherstel/cutover: benoemde productiegeschikte bestemming, RPO/RTO-besluit, bevoegdheden en postflight |

Geen van deze besluiten wordt door deze Draft PR vervangen.

## Eindstatus

WRITE PAUSE IMPLEMENTED betreft uitsluitend de synthetisch geteste operationele SQL-bouwsteen.

- BACKUP STORAGE READY: NO
- BACKUP KEY MANAGEMENT READY: NO
- RESTORE ENVIRONMENT READY: NO
- WRITE PAUSE IMPLEMENTED: YES
- WRITE PAUSE TESTED: PASS
- PRODUCTION RESTORE TESTED: NOT TESTED
- MIGRATION CHAIN: PASS
- PRODUCTION MIGRATION READY: NO-GO
- PRODUCTION MIGRATION EXECUTED: NO
