# Commerciële nachtuitvoering — 3 november 2026

Gerichte voortzetting van het bestaande vrijgavedossier, geen nieuwe algemene audit.
Basis en actuele productiecode: `aa7ad38171b50f9e92aae7c920ad63ffe2eac671` (PR #86).
Vercel bevestigt READY, target Production, branch main en alias `www.workmatchr.nl`.
Dit bewijst geen activering, actuele databasechecksums of provideracceptatie.

Werkbranch: `codex/contact-audit-retention`, bestaande Draft [PR #87](https://github.com/WorkMatchr/platform/pull/87).
Juridische [PR #64](https://github.com/WorkMatchr/platform/pull/64) blijft afzonderlijk,
Draft en inhoudelijk ongewijzigd op `70b4490accd35009b1b7457ce4a1b01a1a0f13f3`.
Geen merge, deployment, productiequery naar contactgegevens, migratie, purge, credential,
externe mail/betaling/alarm of featuregate-activering uitgevoerd.

## A — kritieke auditpurgecorrectie

De adversariële proef reproduceerde een echte fout in de eerdere PR87-kandidaat:
een extra TRIGGER-grant liet een eigen invoker-trigger tijdens de definer-purge een
actieve synthetische outboxrij verwijderen. De eerdere groene CI was onvoldoende.

Hersteld: extra schema-/tabel-/kolomprivileges weigeren, bestaande guardintegriteit
en extra triggers/cascades/rules controleren, DDL uitsluiten gedurende de purge.
16/16 PostgreSQL-groepen PASS, inclusief ongewijzigde actieve outbox, financiële
append-only bescherming, 15-minutenmanifest, atomaire batches, receiptfout ná DELETE,
zes gelijktijdige oproepen, ingetrokken rechten en echte reconciliatie-replay na purge.
Het volledige ontwerp en de grenzen staan in [het bestaande runbook](contact-audit-retention.md).

Migratie 94 is een nog niet gemergede, uitsluitend tijdelijk lokaal toegepaste kandidaat.
Alle historische migraties 1–93 blijven ongewijzigd. Geen checksum of registry handmatig
gerepareerd. Een onbekende reeds toegepaste kopie van 94 betekent STOP vóór uitvoering.
Rollback vóór eerste gebruik is transactioneel gerepeteerd met de oorspronkelijke
immutable guard. Na echte verwijdering is een code-rollback geen gegevensherstel.

### Migratieoverzicht en productiegrens

Exacte historische namen en bekende productiechecksums van de 85 toegepaste migraties:
[bestaand manifest](evidence/wp14/migration-checksums.json), uitsluitend entries met
`productionChecksum`. Dit manifest dateert van 25 oktober; het bestaande WP21-dossier
bevestigde de 85-baseline opnieuw op 31 oktober. Dit is hergebruikt bewijs, **geen nieuwe
read-only databasewaarneming van 3 november**. Vóór uitvoering is een nieuwe preflight vereist.

De acht bestaande ontbrekende migraties in de vastgelegde volgorde zijn:

1. `20260924150000_add_learning_vertical_slice`
2. `20260927210000_add_learning_final_exam`
3. `20260929100000_add_learning_certificates`
4. `20260930100000_add_learning_retention`
5. `20260930120000_correct_learning_retention_publication_policy`
6. `20261017100000_add_compliance_question_visibility`
7. `20261019100000_allow_annual_reminder_reconsent`
8. `20261026090000_restore_learning_exam_question_immutability`

Daarna pas de afzonderlijke, niet geautoriseerde negende kandidaat
`20261102120000_add_closed_contact_audit_retention` (totaal 94).
De eerste vijf bouwen het onderling afhankelijke LMS-schema; de laatste bestaande
correctie herstelt historische examenimmutability. F4 en LMS blijven uit.
Auditpurge vereist de bestaande outbox/reconciliatie en veilige finalisatie vóór purge.
Het oorspronkelijke acht-migratiepreflight weigert aantoonbaar de extra kandidaat.

Schone én upgrade-keten: 94/94 registraties/checksums, herhaald deploy ongewijzigd,
96 afgewezen mutatie-/privilegepogingen, 13 least-privilege controles, cleanup PASS.
Een eerste parallelle uitvoering werd uitsluitend bij de eindinventaris afgekeurd
door de gelijktijdige eigen browserfixture. Beide harnesses hebben hun eigen resources
verwijderd. De keten is daarna sequentieel volledig geslaagd; geen beveiligingsassertion
afgezwakt om de proef groen te maken.

Productiemigratie blijft NO-GO: actuele identiteit/checksums/pending-set, bruikbaar
herstelpunt, aangetoonde volledige schrijfpauze (inclusief webhooks, achtergrondwerk
en directe clients), integriteits-/monitoringplan en apart uitvoeringsakkoord ontbreken
als actuele uitvoeringsset. Voor 94 bovendien beleid, registerbewijs en afzonderlijke
runtime-/owner-/operatorrechten. Geen generiek `migrate deploy` op productie adviseren
alsof een lokaal groene keten die voorwaarden vervangt.

## B — register en retentie

Het private dossierontwerp is bijgewerkt: de gesloten reconciliatieservice bestaat
inmiddels; de operationele private dossierbackend is nog niet bewezen. De oude
sjablonen en 23/23 synthetische registerchecks zijn voorbereiding, geen beveiligde
centrale opslag. Geen nieuwe betaalde leverancier, lokale bestandsdatabase of tweede
contact-/notificatiesysteem ingevoerd.

Minimaal uitvoerbaar contract: individueel bevoegd beheer; willekeurige case-ID;
oorspronkelijk onzekerheidsmoment; 24/72/168-uurdeadlines; versiegebonden actor,
status, minimale motivering, bewijsreferentie/SHA256/tijd; compare-and-swap en native
versiehistorie; definitief serverbesluit apart van het voorstel; bewaartermijn standaard
ongeautoriseerd; één vergrendeld dossier met alle eigen revisies native verwijderen
en controleren vóór afzonderlijke auditpurge. Geen inhoud, afzender, IP of tokens.
Bij timeout eerst bestaand besluit read-only vaststellen, niet opnieuw verzenden.

**BLOCKED:** geen aangetoonde bestaande opslag met individuele toegang, onafhankelijke
integriteit, herstel en verwijdering van versies/back-ups. Het concrete contract is
privé vastgelegd; een lokaal wijzigbaar JSON/hashlog wordt niet operationeel verklaard.
Nieuwe externe monitoring/Raspberry Pi/NAS-inrichting blijft geparkeerd.

| Gegevens | Bestaande afspraak / techniek | Nog open |
| --- | --- | --- |
| Contactinhoud | Redactie bij SENT; resterende ciphertext vanaf 7 dagen, lease-/batchbescherming | Juridische/operationele acceptatie van die inhoudstermijn en kopieën |
| Contactmetadata | 30 dagen na bewezen finalisatie; FAILED zonder poging of met afwijzingsbewijs; actieve/onzekere gevallen beschermd | Fysieke uitvoering en harde maximumgarantie |
| Contacttellers | 24 uur; cleanup onafhankelijk van nieuwe aanvragen/contactformulier | Gate/uitvoering/uitval; geen harde maximumgarantie |
| Contactaudit en privéregister | Voorstel maximaal 30 dagen na dezelfde finalisatie | Termijn/grondslag nog NIET goedgekeurd; geen automatische purge |
| UNKNOWN | Triage 24u, escalatie 72u, expliciet besluit uiterlijk dag 7 | Zaakgebonden noodzaak en bewijsbesluit; geen automatische 48u/7d-verlenging |
| Mailbox | Vastgesteld één jaar vanaf ontvangst, inbox en archief gelijk, noodzakelijke uitzonderingen | Aantoonbare uitvoering, prullenbak-/back-upretentie |

Termijn verstreken betekent technisch eligible, niet al verwijderd. Gate uit, scheduler-
of DB-uitval, lease/rijlock/advisorylock, batchachterstand en afgebroken uitvoering
kunnen verwijderen uitstellen. Zelfs een normale periodieke run na de grens garandeert
geen harde maximumtermijn. Bestaande tests bewijzen signalering, veilig herstel en
geen dubbele verzending, **geen retentiegarantie**. Geen termijnen stilzwijgend verlengd.
Een later geautoriseerde uitvoering moet tijdige onafhankelijke alarmontvangst en
opvolging, capaciteit, termijnmarge en zaakgebonden escalatie aantonen; tot dan gesloten.

## C — cookies en juridische concepten

PR64 is vergeleken met de huidige login-, opslag-, logout- en betaalarchitectuur.
Geen bevestigde nieuwe tekstfout: de concepten vermelden korte sessie/24u-servergeldigheid,
expliciet rollend 7 dagen, expliciete Compliance-opslag 24 uur zonder refresh, legacykeuze,
verwijdering bij volgende actie/logout, tabbladsignalen en afzonderlijke opdracht-sessionStorage.
De financiële browsercode bevat geen aanvullende tracking; Mollie wordt server-side
aangeroepen en de gebruiker gaat naar de providercheckout. Dat is geen checkoutmeting.

Hergebruikt: anonieme HTTP-/browseropslag-/netwerkmeting van 2 november en de bestaande
rolsessietests. Voor die onderzochte inrichting geen algemene banner nodig bevonden;
geen vrijstelling voor onbekende toekomstige technieken. Nieuwe synthetische native
Better Auth-controles toetsen sessiecookie versus 7 dagen, serverduur, intrekking,
ongeldige/verlopen sessies, cross-originweigering, drie rollen en tenantgrenzen.

Aanvullende echte ingelogde browser-/netwerkmeting: NOT VERIFIED. De eigen server
gaf HTTP200 met de loginoptie; in-app navigatie liep op timeout, de alternatieve
Windows-helper kon kernel-assets niet initialiseren. Geen echt account, productiecookie
of externe checkout gebruikt. De tijdelijke database/accounts/runtimefile zijn opgeruimd.
HTTP200 en servicetests worden niet als browser-PASS aangemerkt. Eerdere PO-200%-acceptatie
blijft bestaand bewijs; geen nieuwe zoom- of volledige mobiele acceptatie geclaimd.

PR64 blijft Draft. Definitieve identiteit/postadres, toepasselijke grondslagen,
leveranciersrollen/DPA's/doorgiften, rechtenuitvoering, afzonderlijke audit-/registertermijnen
en provider-/mailboxkopieën blijven menselijke acceptatiepunten. PostgreSQL is software,
geen afzonderlijke leverancier; Mollies eigen betaalrol blijft onderscheiden. Geen
juridische concepttekst via de technische PR gepubliceerd.

## D — commerciële keten en browserscope

De bestaande geïntegreerde PostgreSQL-keten wordt met de nieuwe migratie kandidaat
herhaald: echte domeinservices met synthetische data, beperkte runtime-rol, fake Mollie-
gateway en mockmailtransport. Externe fetch is geblokkeerd. Omvat prijssnapshot,
providerstatuscontrole, zes betaalreplays met één krediet/ledger/factuur, mislukte mail
en herstel, annulering, onbevoegde replay, canonieke opdrachtvorming/handoff, matching,
credits/ontgrendeling, offerte/gunning en organisatie-isolatie. Geen echte transactie.

Resend: actuele code behoudt encryptie/AAD, vaste ontvanger/fingerprint, scoped outbox,
onzekere acceptatie zonder automatische resend en expliciete reconciliatie. De echte
Production-From en koppeling van Production-key aan een Resend-key blijven NOT VERIFIED;
metadata of een herkenbare Preview-keynaam is geen bewijs. Geen secretwaarde opgehaald.
Accountactivatie/reset/uitnodiging en factuurmail delen transport; één contactproef
vervangt hun afzonderlijke operationele acceptatie niet.

Mollie: providercheckout, externe webhookbezorging en echte betaling niet uitgevoerd.
Het bestaande koperonderzoek gaf een koper-/verkoperadministratieprobleem en afwijkende
effectieve prijs door bestaande rechten. Geen account of korting aangepast om de proef
te laten passen. Vóór de bedoelde EUR30,25/25-creditsproef: juiste bestaande bevoegde koper,
prijs/factuurgegevens, testmodus en expliciete provider-/factuurmailgevolgen vaststellen.

De eerder geslaagde WP17B/WP20/WP21-browserchecks worden niet opnieuw als nieuw resultaat
gepresenteerd. De nog ontbrekende echte ingelogde cookie-/checkoutmeting blijft open.
Geen bewezen nieuwe UI-regressie of wijziging aan financiële/marketplacebeslisregels.

## Geïntegreerde eindvalidatie

- Auditpurge: 16/16 PostgreSQL-groepen PASS.
- 94-keten: fresh + upgrade + repeat/checksums PASS; 96 negatieve controles en 13
  least-privilege controles; bestaande database-/rolinventarissen gelijk na cleanup.
- Gerichte regressies: 229/229 in 18 bestanden PASS (contact, auth, opslag, logout,
  financiële transactie, Mollie-gateway/webhook, monitor/reconciliatie-routes).
- Scheduler/monitor/oorspronkelijk productiepreflight: 41/41 PASS.
- Commerciële PostgreSQL-keten PASS: 17 matchingfixtures, zes betaalreplays met één
  aankoop/ledger/factuur, mailfoutherstel, annulering, onbevoegde replay, canonieke
  publicatie/ontgrendeling/offerte/gunning met beperkte runtime-rol. Nul providercalls.
- Native sessies PASS voor opdrachtgever, professional en platformbeheer: korte en
  onthouden sessie, refresh, intrekking, tenant/autorisatie, cross-originweigering,
  echte PostgreSQL-deletefout naar 503 zonder valse logout, gelijktijdige retry, nul
  resterende sessies. Sequentiële cleanup PASS; bestaande databases behouden.
- Volledige lint: 0 fouten, 4 bestaande navigatiewaarschuwingen. Standalone TypeScript
  PASS; de vroegere vier compliance-typefouten zijn in deze actuele basis niet aanwezig.
- Productiebuild PASS: 172 pagina's, 3 bestaande filesystemtracingwaarschuwingen.
- Diff-check en gerichte secrets-/metadatascan van de volledige PR-bestandenset PASS.
  Eén bestaande localhost-URL behoort aantoonbaar bij de synthetische CI-PostgreSQL-
  service; geen echte credential. De nieuwe commitgeschiedenis wordt vóór push apart gecontroleerd.
- Eerdere 27/27 contactgroepen op zowel schema94 als baseline85 en 8+8
  reconciliatie-/healthgroepen hergebruikt: die services zijn niet gewijzigd.

Geen nieuwe productieafhankelijkheid, package-/lockfilewijziging, provideractie of
aanpassing aan PR64. Alleen eigen tijdelijke resources; secrets en infrastructuur-
identificaties blijven buiten openbare rapportage. Next-dev gegenereerde wijzigingen
aan AGENTS.md/next-env.d.ts worden niet meegenomen.

## Scorecard

GO hieronder is uitsluitend technische reviewbaarheid waar expliciet vermeld;
de kolom Vrijgave betreft gebruik in productie.

| Onderdeel | Technisch | Productie | Vrijgave |
| --- | --- | --- | --- |
| PR87 / auditpurge | PASS gerichte securitytests; finale CI te bevestigen | Niet geïnstalleerd/geactiveerd | NO-GO uitvoering |
| Migratieketen94 | PASS lokaal | Niet uitgevoerd | NO-GO migratie |
| Contactmetadata | PASS selectie/idempotentie; harde maximumgarantie BLOCKED | Gate gesloten | NO-GO activering |
| Rate-limittellers | PASS cleanup/signalen; harde maximumgarantie BLOCKED | Gate gesloten | NO-GO activering |
| Privébesluitregister | BLOCKED native operationele opslag | Niet geactiveerd | NO-GO |
| Cookiebeleid | PASS onderzochte inrichting; extra ingelogde/checkoutmeting open | Verklaring concept | NO-GO juridische publicatie |
| Privacybeleid | BLOCKED menselijke inhoudelijke acceptatie | Concept | NO-GO |
| Resend | PASS mocks; runtimebinding/ontvangst BLOCKED | Verificatie open | NO-GO echte mail |
| Mollie | PASS mocks/services; provideracceptatie open | Acceptatie open | NO-GO echte betaling |
| Marketplace | PASS bestaande/gerichte domeinregressies | Provider-/privacyafhankelijkheden | NO-GO commerciële eindvrijgave |
| Browseracceptatie | BLOCKED aanvullende rol-/checkoutmeting | Bestaand bewijs begrensd | NO-GO nieuwe volledige claim |
| Commerciële livegang | — | Grenzen intact | NO-GO |

**Lokaal technisch reviewgereed.** Definitief PR87 MERGE READY uitsluitend als de
GitHub-checks op de nieuwe head SUCCESS zijn; het na-push-bewijs en de exacte SHA
worden in PR87 vastgelegd. PR64 heeft beide checks SUCCESS, maar blijft juridisch Draft.
Voor beide branches is Preview bewust uitgeschakeld; geen Preview READY geclaimd.

## Exacte aanvulling en besluiten

Deze nacht wijzigt op PR87 uitsluitend:

```text
prisma/migrations/20261102120000_add_closed_contact_audit_retention/migration.sql
scripts/test-contact-audit-retention-database.ts
docs/contact-audit-retention.md
docs/commercial-overnight-progress.md
docs/commercial-overnight-finalization.md
docs/README.md
```

Veilige volgorde: review securitycorrectie + finale CI → afzonderlijk mergebesluit;
een merge is geen migratie-/purgeautorisatie. Houd de oorspronkelijke acht-migratieset
en kandidaat94 afzonderlijk. PR64 alleen na menselijke inhoudelijke vrijgave.

Maximaal vijf gebundelde Product Owner-besluiten, zonder reeds besloten termijnen te heropenen:

1. Juridische conceptacceptatie: definitieve feiten/rechtsgronden/kopieën, afzonderlijke
   contactaudit-/registertermijn en procedure bij blijvend UNKNOWN; geen impliciete 48 uur.
2. Bestaande private registervoorziening en operationele opvolging aantoonbaar aanwijzen
   en accepteren; onafhankelijke bereikbaarheid/ontvangst en bevoegdheden bewijzen.
3. Exacte Resend Production-binding veilig bevestigen, daarna afzonderlijk één mailproef
   met ontvanger/ontvangstbewijs en gecontroleerde transportgevolgen autoriseren.
4. Administratief juiste koper en testmodus voor de Mollieproef vaststellen; daarna
   apart één echte betaalproef en bijbehorende factuur-/boekhoudgevolgen autoriseren.
5. Pas na actueel herstel-/schrijfpauzebewijs afzonderlijk migratie-, rechten- en
   activatiebesluit. Contact, reconciliatie, purge, F4 en LMS nu gesloten houden.

Exact hervatbericht: **Lees docs/commercial-overnight-progress.md en
docs/commercial-overnight-finalization.md in de bestaande PR87-worktree. Controleer
de actuele head/CI en voer uitsluitend de daar nog open technische controle uit.
Behoud alle productie- en juridische blokkades; herhaal geen geslaagde algemene tests.**
