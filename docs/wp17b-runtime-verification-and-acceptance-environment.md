# WP17B — Runtime Verification & Acceptance Environment

Datum: 28 oktober 2026. Kandidaat op WP17 `eb575af64a718a2661f6bcb68ead124712acfb2d`;
gestapelde reviewvolgorde #70 → #71 → #72 → WP17B. Geen merge of commerciële vrijgave.

## Production: begrensde diagnose, identiteit nog onbewezen

Vooraf READY: `dpl_3RDDYiSY6dsk6hPhdyeLqyWKY1H8`, commit
`46962cff1724e87e5f33697173cbb9168d6f9da3`, project `platform`, team
`workmatchrs-projects`, operator `workmatchr` (OWNER).
De eerste configuratiepoging is door automatische autorisatiereview geweigerd;
er is geen alternatieve mutatieroute gebruikt. Daarna gaf de Product Owner expliciet
toestemming voor uitsluitend twee diagnoseflags, dezelfde commit, één read-only POST
en een sluitende uitrol.

- Venster: 20:03:11–20:18:11 UTC.
- Diagnose-uitrol `dpl_FASVbRn1vutTPXiLwR6yCPqzEkax`: READY, ongewijzigde SHA.
- Enige geauthenticeerde POST: 20:04:32 UTC, **401**. De bestaande lokaal beschikbare
  maintenance-credential wordt niet geaccepteerd. Geen tweede poging, secretwijziging
  of database-identiteitsclaim. De route weigert vóór databasegebruik.
- Beide flags teruggezet naar `false` respectievelijk verlopen.
- Sluitende uitrol `dpl_HPDDANHTLKB6tF613RZzs51dj2W8`: READY, dezelfde SHA.
- Daarna unauthenticated POST: **404**, diagnose gesloten.
- Productie-identiteit blijft **BLOCKED**. Volgende poging vereist aantoonbaar geldige
  bestaande maintenance-auth en een nieuw expliciet begrensd operatorvenster.

## Nieuwe, afzonderlijke acceptatieresources

Geen productiecopy, restore, bestaande branchwijziging of betaald plan.

| Onderdeel | Identiteit |
|---|---|
| Neon-project | `workmatchr-wp17b-acceptance` / `polished-truth-73185704` |
| Nieuwe rootbranch | `acceptance` / `br-steep-base-bamb189s` |
| Endpoint | `ep-dry-hat-bao6j8me` |
| Directe host | `ep-dry-hat-bao6j8me.c-8.eu-central-1.aws.neon.tech` |
| Database | `workmatchr_wp17b` |
| Migratierol | `wp17b_migrator` |
| Runtime-login | `workmatchr_preview_wp17b` |
| Regio / PostgreSQL | AWS Frankfurt / PostgreSQL 18 |
| Vercel-project | `workmatchr-wp17b-acceptance` / `prj_0n2VyrKaOKq5767iOyLxCLm9jBvw` |
| Vercel-scope | bestaand team; uitsluitend Preview; geen Git-koppeling |

Voor migratie: nul publieke tabellen, gebruikers en organisaties. De officiële
Prisma-runner heeft uitsluitend de 93 ongewijzigde migraties op deze nieuwe database
toegepast: 93 succesvol, 0 failed, 0 checksumverschillen. Geen registryreparatie.
Voor seed waren gebruikers, organisaties en beoordelingen nog nul.

Runtime heeft geen superuser/createdb/createrole/replication/bypassrls, memberships,
schema-/database-CREATE, tabelownership of registrywrites. Zeven werkelijke verboden
handelingen zijn geweigerd: registry-SELECT, CREATE TABLE/TEMP, TRUNCATE Session,
CREATE ROLE, triggers uitschakelen en session_replication_role wijzigen.

Bestaande idempotente seeds voor referentiedata, WL-001 en examen zijn uitgevoerd.
Vier synthetische `example.invalid`-accounts gebruiken Better Auth-hashing; nieuwe
credentials blijven uitsluitend in genegeerde lokale operatoropslag en de afgeschermde
Preview-configuratie. Geen productiecredential hergebruikt.

## Bevestigde TLS-correctie

De echte Neon-verbinding rapporteert op de clientsocket `encrypted=true`,
`authorized=true`, `TLSv1.3`, met passende certificaathost. Tegelijk geeft
`pg_stat_ssl` `ssl=false`, `version=null`: dit betreft de backend-hop achter de
Neon-proxy. WP17 wees hierdoor een geldige clientverbinding af.

De Preview-pool controleert nu vóór iedere checkout de daadwerkelijke clientsocket,
TLS 1.2/1.3, certificaatvertrouwen en hostnaam. Geen URL- of SQL-vlag wordt als
vervanging voor transportbewijs aanvaard. Alle endpoint-/branch-/rol-/rechtenchecks
blijven behouden, zowel bij callback- als Promise-/transactiegebruik.
De bestaande diagnose gebruikt in Preview dezelfde runtimepool, READ ONLY SQL,
een statementtimeout en de geverifieerde socket. Geen tweede endpoint of ownerconnectie.
De bestaande Production-code is niet aangepast of naar deze kandidaat gedeployd;
ook daar blijft de oude backend-TLS-aanname een te onderzoeken beperking.

Bronnen: [Neon proxy-architectuur](https://github.com/neondatabase/neon/blob/main/proxy/README.md),
[Neon beveiliging](https://github.com/neondatabase/website/blob/main/content/docs/security/security-overview.md).

## Capaciteit en herstel

Voor creatie zes Neon-projecten en zes Vercel-projecten. Neon Free/free_v3 en
Vercel Hobby bevestigd; binnen bestaande projectquota. Nieuw Neon-compute begrensd
op 0,25 CU, API history 21.600 seconden. Geen overage-/upgrade-instelling gewijzigd.
[Free-quota](https://github.com/neondatabase/website/blob/main/content/faqs/free-plan-limits-and-quotas.md),
[Vercel-limieten](https://vercel.com/docs/limits).
Bij problemen: uitsluitend deze acceptatieomgeving stilzetten en de gepinde
migraties/seeds in een nieuwe lege acceptatiedatabase herhalen na scopecontrole.
Geen productieherstel of bewezen Neon-RTO geclaimd; synthetisch restorebewijs uit WP17
blijft gelden voor ongewijzigde migratiebytes.

## Validatie en open acceptatie

- Gerichte TLS-/isolatie-/diagnose-/targettests: **110 PASS**.
- Standalone TypeScript: PASS, nul fouten.
- Productiebuild: PASS; synthetische onbereikbare builddatabase, providers uit.
- Volledige repository-lint: PASS met uitsluitend genegeerde `.local-storage`-cache
  uitgesloten; bestaande waarschuwingen afzonderlijk in uitvoer. Sandbox-Vitest had
  eerst EPERM op tijdelijke cache; dezelfde tests buiten sandbox PASS.
- Exact-head CI op `b281ffd4ef34330dc2cf4c76ed9227c18b8b6203`: beide workflows,
  zowel push als PR, geslaagd. [PostgreSQL-log](https://github.com/WorkMatchr/platform/actions/runs/40761173016):
  93-migratie clean/upgrade/replay, 112 geweigerde mutaties, 13+13 rolchecks,
  synthetische restore 1738 ms, sessiefoutinjectie/tenantisolatie, F2/F4-concurrency,
  finance/matching/learning. 22 gerichte, 264 gesloten-gate/auth/maintenance en 864
  regressies geslaagd; 14 databasegebonden unitgevallen overgeslagen en afzonderlijk
  door PostgreSQL-harnassen gedekt. Geen gemeten Neon-herstel-RTO.
- F4 blijft uit wegens ontbrekende juridische claimvrijgave; WL-002 heeft geen runtime.
- Geen echte mails/betalingen, productiegegevens, migraties, ACLs of providerinstellingen gewijzigd.

## Afgeronde browseracceptatie en grenzen — 28/29 oktober

Lokale productiebuild op `127.0.0.1:3061`, gepind op uitsluitend de nieuwe
synthetische acceptatiebranch. De lokale diagnose gaf 200 met de beperkte rol,
TLSv1.3 en READ ONLY. Dit bewijst geen Vercel-runtimebinding.

| Uitgevoerd in de browser | Resultaat |
|---|---|
| Opdrachtgever inloggen; Bedrijfsarts + Casemanager verzuim; publiceren | PASS: één Request, Assignment, handoff, dossier en snapshot |
| Selectie starten, uitloggen, professional opnieuw inloggen | PASS: één invitation; preview vóór ontgrendelen zonder opdrachtgeveridentiteit |
| Ontgrendelen met synthetisch gefinancierde wallet | PASS: 100 → 70 credits, één deelname |
| Offerte indienen, professional uitloggen, opdrachtgever opnieuw inloggen, gunnen | PASS: één ingediende offerte en gunning, zichtbaar Gegund |
| WL-001 starten; eerste blok; herladen | PASS: voortgang 0 → 3%, blijft bewaard |
| Mobiel 390×844 en toetsenbordfocus | PASS: geen waargenomen horizontale overflow, zichtbare focus op Volgende |
| Eindtoets starten/inleveren en certificaat aanvragen | PASS op expliciete synthetische hoofdstuk-/antwoordfixture; 50/50 en één certificaat |

De financiering gebruikt bestaande financiële services met fake Mollie en fake
Resend: zes herhalingen geven één ledgerbijschrijving/factuur; foutmail verliest
geen betaalcommit; vertraagd pending maakt paid niet ongedaan; failed/canceled/
expired geven geen credits; onbevoegde herhaling geweigerd. Geen echte providercall.
De tien afgeronde hoofdstukken en toetsantwoorden zijn bewust fixturedata via
de bestaande test-/servicestructuur: **geen bewijs van volledige menselijke
cursusdoorloop, examennorm of inhoudelijke cursusacceptatie**.

Bewijs: [publicatie](evidence/wp17b/browser-publication.png),
[gunning](evidence/wp17b/browser-award.png),
[mobiele focus](evidence/wp17b/browser-lms-mobile-focus.png).
Read-only nacontrole 29 oktober: 1/1/1 Request/Assignment/handoff, één dossier/snapshot,
één invitation, saldo70, vier synthetische purchases, één enrollment, nul echte
gebruikers. Twee outboxrecords PENDING; niet dispatched of als afgeleverd geclaimd.

Vercel maakte de eerste expliciet als preview aangevraagde deployment van het
nieuwe project toch target=production. `dpl_G8LqP1DnRt2E9kR2MtrUPRfAvFRA` is vóór
READY geannuleerd. Geen platform-productiealias geraakt. Een buildguard weigert
nu ieder niet-previewtarget. Er is **geen bruikbare Vercel-acceptatiepreview**.
Geen nieuwe poging/deployment uitgevoerd. Beide diagnoseflags zijn gesloten.

De browsertool verdween tijdens het openen van de certificaat-PDF. De vervangende
Windows Computer Use-kernel faalt ook na reset vóór initialisatie met
`failed to write kernel assets` (OS error3). Daarom blijven browser-PDF/download,
beheerderlogin, tweede-organisatiecontrole, laatste logout en echte 200%-zoom open;
service-/CI-bewijs wordt daar niet als browserbewijs voor gebruikt. De lokale
server luisterde op 29 oktober niet meer; geen bereikbare URL beloofd.
Er resteerde bij nacontrole één uitsluitend synthetische sessie; geen claim van
volledige browsercleanup. De afzonderlijke acceptatieresources blijven herkenbaar
behouden voor vervolgacceptatie, zonder echte accounts of actieve providerkeys.

**WP17B: technische kandidaat getest; aanvullende browser-/Previewacceptatie
geblokkeerd. Production NO-GO.** Dit is geen toestemming voor een nieuwe diagnose,
deployment, echte mail/betaling of moduleactivering.
