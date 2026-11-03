# Gesloten contactbesluitregister

Reviewkandidaat, 3 november 2026. Geen operationele of juridische vrijgave.
Basis: main `abfb6d6672680a9651a2b2ff9e76f1049875be74` inclusief PR #87.

## Afgebakende implementatie

Migratie `20261103100000_add_closed_contact_decision_register` (95) voegt binnen
de bestaande PostgreSQL-database het afgeschermde schema `contact_decision_register`
toe. Geen nieuw platform, webendpoint, applicatieauthenticatie, provider of scheduler.
Er worden **geen** operators, grants, dossiers, bewaartermijngoedkeuringen of
productieconfiguraties aangemaakt. De applicatie gebruikt dit schema nog niet.
Migraties 1–94 blijven ongewijzigd. De oorspronkelijke acht-migratiepreflight blijft
tot 93 begrensd: 94 en 95 vereisen elk een afzonderlijk gereviewd uitvoeringsplan.

Een individuele beperkte PostgreSQL-LOGIN is de behandelaar. `session_user` is
leidend, nooit een aangeleverde gebruikersnaam of zelf ingestelde databasevariabele.
Superuser, eigenaar, rolleden, CREATE-/schrijf-/TRIGGER-/REFERENCES-rechten worden
geweigerd. De operator kan geen eigen purgegoedkeuring maken. Alle functies zijn
standaard voor PUBLIC ingetrokken. Rollen/credentials worden hier niet geprovisioneerd.
Dit is expliciete operatorautorisatie zoals de gesloten auditroute van PR #87;
Better Auth en organisatie-/platformautorisatie van de applicatie veranderen niet.

Alleen een mislukt CONTACT_MESSAGE/EMAIL-record met een echte providerpoging, zonder
actieve lease en zonder bestaande reconciliatie komt in aanmerking. Het register
bevat uitsluitend case-/event-/outbox-ID, native operator-OID, vaste tijdstippen,
actie-/motiveringscodes en ondoorzichtige bewijs-/besluitreferenties en hashes.
Geen naam, adres, IP, berichttekst, vrije motivering, providersecret of bijlage.
Ook deze beperkte gegevens zijn niet vanzelf anoniem. Bewijsinhoud en de veilige
koppeling tussen operator en bevoegde persoon blijven onder apart toegangsbeheer.

De geschiedenis is append-only. Een nieuwe opdracht vereist de verwachte revisie
en een uniek event-ID; identieke herhaling is idempotent, conflicten worden geweigerd.
Een tweede operator kan een dossier niet lezen of wijzigen. Er is nog geen
overdrachtsfunctie: bij personeelswissel eerst een afzonderlijk gereviewde overdracht,
geen gedeelde LOGIN of automatisch administratorrecht voor een achtervang.

## Uitvoeringscontract — uitsluitend na aparte vrijgave

1. DBA controleert doelidentiteit, TLS, herstelbaarheid, migratie 95 en least privilege.
   Wijs een vertrouwde NOLOGIN-functie-eigenaar aan met alleen noodzakelijke rechten;
   runtime mag geen owner-/DDL-bypass hebben. Controleer default ACLs; de migratie
   weigert onverwacht overgeërfde grants. Geen `SET ROLE` als operatoridentiteit.
2. Wijs één bevoegde behandelaar met persoonlijke beperkte LOGIN aan; geen credential
   in argumenten/logs/Git. Gebruik bestaande beveiligde operatorverbinding met
   TLS-verificatie en gebonden parameters. Alleen `USAGE` op het private schema en
   `EXECUTE` op `append(uuid,uuid,integer,uuid,jsonb)` en `read_case(uuid)` toestaan;
   geen tabelrechten, helperfunctiegrants of lidmaatschap. Purge blijft afzonderlijk.
3. `SELECT contact_decision_register.append($1,$2,$3,$4,$5)` ontvangt case-ID,
   event-ID, verwachte revisie (0 bij OPEN), outbox-ID en het volgende strikt JSON:

   | Actie | Verplichte motivering | Extra velden |
   |---|---|---|
   | OPEN | DELIVERY_UNCERTAIN | Geen |
   | TRIAGE | PROVIDER_REVIEW | Geen |
   | ESCALATE / UNKNOWN | DEADLINE_EXCEEDED / MISSING_EVIDENCE | Geen |
   | PROPOSE_ACCEPTED | PROVIDER_ACCEPTANCE_PROVEN | evidenceId, evidenceSha256, evidenceObservedAt, decisionId |
   | PROPOSE_NOT_ACCEPTED | PROVIDER_REJECTION_PROVEN | Dezelfde vier velden |
   | FINALIZE | MATCHED_RECONCILIATION | Geen |

   Referenties zijn UUIDs, hash SHA256, bewijsdatum niet in de toekomst en niet vóór
   de providerpoging. Geen willekeurige vrije tekst. Bewijs zorgvuldig read-only
   bij de provider beoordelen; nooit automatisch opnieuw versturen bij onzekerheid.
4. `SELECT contact_decision_register.read_case($1)` geeft alleen het eigen dossier,
   geschiedenis en vaste deadlines: triage 24 uur, escalatie 72 uur, besluit 168 uur vanaf de
   eerste providerpoging. Heropenen/bewerken verschuift deze deadlines niet.
   Verlopen deadlines blijven zichtbaar; dit register verzendt zelf geen alarmen.
5. Een voorstel is geen definitieve afhandeling. De bestaande afzonderlijk
   geautoriseerde reconciliatie moet eerst aantoonbaar zijn uitgevoerd. FINALIZE
   controleert exacte auditpolicy, uitkomst, actorrol, besluit-/bewijsreferenties,
   hash, bewijsdatum, auditdatum en definitieve outboxstatus/processedAt. Het register
   verandert de outbox niet, stuurt niets en kent geen fictieve eindstatus toe.
   Finaliseer voordat de beperkte contactaudit wordt verwijderd; anders weigert het
   register terecht wegens ontbrekend bewijs. Controle op menselijke bevoegdheid,
   echte bewijsinhoud en belangen blijft een operationele verantwoordelijkheid.

## Verwijdering en terugdraaien

Voorstel, **niet goedgekeurd**: maximaal 30 dagen na definitieve afhandeling voor de
herleidbare registercase en contactaudit, inclusief revisies en exports. Doel:
korte controle-/herstelperiode na het besluit, daarna gegevensminimalisatie.
[AVG artikel 5(1)(e)](https://eur-lex.europa.eu/eli/reg/2016/679/oj) schrijft hiervoor geen algemene vaste termijn voor; juridische acceptatie
moet noodzaak en grondslag per doel vastleggen. Een concrete rechtsvordering kan
zaakgebonden bewijsbehoud vragen, nooit een algemene financiële zevenjaarstermijn
voor ieder contactlog. Geen automatische48 uur- of andere verlenging.

De technisch gesloten `purge(uuid)` vereist een **apart** DBA-manifest: persoonlijk
operator-OID, beleidsreferentie, 1–100 unieke case-ID/revisieparen, maximaal 15 minuten
geldig, expliciet geen legal hold en controle van andere kopieën. Geen voorgemaakte
goedkeuring. De operator heeft uitsluitend tijdelijk EXECUTE op deze functie nodig.
Alle cases moeten definitief, minstens 720 uur oud en outboxvrij zijn. Dit is een
veiligheidsminimum, geen geïmplementeerde garantie van een maximumtermijn. Zonder
goedgekeurd beleid, planning en kopie-/back-upafhandeling blijft deze route gesloten.

Eén transactie verwijdert alle casehistorie, verbruikt het manifest en bewaart alleen
run-/beleidsreferentie, tijd en aantallen. Geen verwijderde persoon-/case-/outbox-ID
in de receipt. Geen nieuwe MarketplaceAuditEvent of onbeperkte tombstone.
Receiptretentie en externe bewijskopieën blijven afzonderlijk vast te stellen.
Onbekende/actieve/jonge dossiers, ontbrekende bevoegdheid of een fout rollen de hele
batch terug. Herhaling van een geslaagde run retourneert alleen het bestaande aantal.
Normale UPDATE/DELETE blijft verboden; geen trigger wordt uitgeschakeld.

Integriteitscontrole weigert vreemde triggers, rules, inkomende foreign keys,
gewijzigde guarddefinitie en risicogrants. Advisory-/tabellocks sluiten gelijktijdige
operatorbewerkingen en DDL-races; de applicatie behoudt normale DML-lockcompatibiliteit.
Native DB-owner/superuser blijft de expliciete vertrouwensgrens, geen onmogelijke
beveiligingsclaim tegen een bevoegde DBA.

Bij fout: rollback, oorzaak oplossen, dezelfde opdracht/revisie opnieuw beoordelen.
Bij beëindiging: EXECUTE/USAGE intrekken en operatorverbinding sluiten; geen historische
gegevens terugschrijven of schema met dossiers verwijderen. Een echte restore vereist
apart akkoord en een plan dat verwijderde dossiers niet opnieuw actief maakt.

## Uitval en operationele grens

Dagelijks bevoegde controle; triage 24 uur/escalatie 72 uur/besluit op dag 7. Bij dag7 zonder bewijs:
meld BLOCKED en vraag een gemotiveerd zaakbesluit met beperkt bereik en eind-/reviewdatum.
Geen fictief SENT, autoherverzending, automatische verlenging of stilzwijgend bewaren.
Het bestaande platformbeheer blijft primair verantwoordelijk; een voorgestelde
achtervang krijgt pas na instemming/instructie en apart toegangsbesluit bevoegdheid.

De bestaande30 dagen/24 uur voor metadata/tellers veranderen niet. Database-/scheduleruitval,
uitgeschakelde purge, onopgeloste leases, ontoegankelijke kopieën en ontbrekende
alarmopvolging verhinderen een harde fysieke maximumgarantie. Hervatting verwerkt
achterstand, maar maakt een overschrijding niet ongedaan. **Operationeel BLOCKED**
tot uitvoering/ontvangst/opvolging en retentiebeleid aantoonbaar zijn ingericht.
Geen nieuwe monitoringinfrastructuur of betaalde dienst toegevoegd.

## Gerichte verificatie

`npx tsx scripts/test-contact-decision-register-database.ts` gebruikt alleen loopback,
eigen unieke lege database en twee tijdelijke beperkte native LOGINs. Externe fetch
wordt geweigerd; volledige opruiming en behoud bestaande databases worden gecontroleerd.
Zes groepen omvatten gesloten defaults/ACLs, scope, cross-operatorisolatie, revisies en
concurrency, bewijs/finaliteit, exacte720 uurgrens, onbekend/actief, verlopen manifest,
batchrollback, foutinjectie na DELETE, replay, schadelijke trigger/cascade/DDL en revoke.
De volledige ketentest controleert95 migraties, checksums en herhaling; bestaande
financiële/compliance-/mailregressies blijven leidend. Geen productierechten gewijzigd.
