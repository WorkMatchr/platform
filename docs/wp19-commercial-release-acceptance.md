# WP19 — integrale commerciële acceptatie en releasevoorbereiding

Peildatum: 31 oktober 2026. **Voorbereidingsdossier, geen productie- of juridische vrijgave.**
Basis: actuele main `3ccd76cbae94c63d779983accbed81e3636a881e` en de afzonderlijke
[Draft PR #77](https://github.com/WorkMatchr/platform/pull/77), head
`7257a87cac8a8d978d471847a7c441e177e5942d`.

## 1. Nulmeting en bewijsgrenzen

GitHub en een verse fetch bevestigen dat main sinds de voorganger niet is gewijzigd.
PR #77 is OPEN/Draft, niet gemerged en mergeable; zijn beide PR-workflows zijn SUCCESS:
[PostgreSQL/regressies](https://github.com/WorkMatchr/platform/actions/runs/41187555062)
en [lint/build](https://github.com/WorkMatchr/platform/actions/runs/41187555111).
Dit bewijst geen productie-installatie of providerbezorging. Vercel-autodeployment
van die branch staat bewust uit; geen Preview READY-claim.

| Onderdeel | Werkelijke plaats/status | Herbruikbaar bewijs en resterende grens |
|---|---|---|
| A06 formulier, versleutelde duurzame contactopslag, contactconsumer | Alleen #77; ontbreekt op main | 531 regressies, 16 PostgreSQL-groepen en browserbewijs in de voorganger; WP19 vult timeout en echte HTTP→SDK-integratie aan |
| Oud contactformulier #39 | Nog OPEN/Draft | Direct-sendvariant niet naast #77 mergen; oude migratie-/retentieconclusies uit de PR-body zijn achterhaald |
| Betaling, credits, ledger, factuur, marketplace | Op main; productcode bytegelijk aan #77/WP19 | Synthetische financiële/concurrency-/tenanttests; echte provideracceptatie ontbreekt |
| Sessies, F3-opslag en opdrachtstart | Op main | A07-technische opvolger en actuele F3 behouden; geen terugport van oudere implementatie |
| Juridische concepten #64 | OPEN/Draft; head `74c6b2077ebdf1d75b55e6dd004b66545c632c47`, basis `46962cff1724e87e5f33697173cbb9168d6f9da3`; mergeable=false | Niet overnemen in deze PR; actuele conflictresolutie en inhoudelijke review afzonderlijk nodig |
| A07 #40 | OPEN/Draft als auditspoor | Niet gewijzigd, gesloten of gemerged |
| Productieschema | Bestaand dossier: 85 succesvol, acht pending | Geen nieuwe productiequery in WP19; actuele preflight blijft verplicht vóór elke later geautoriseerde uitvoering |

Bronnen: [voorganger](commercial-launch-finalization.md), [WP13](wp13-integral-acceptance.md),
[WP14](wp14-production-readiness.md), [WP15](wp15-integrated-commercial-release-readiness.md),
[WP16](wp16-production-readiness-and-acceptance.md), [WP17](wp17-production-infrastructure-readiness.md),
[WP17B](wp17b-runtime-verification-and-acceptance-environment.md),
[A/B/C](final-release-closure-abc.md) en [geschoonde herstelprocedure](d2d-d3-d4-final-production-migration-readiness.md).
Latere D1-P2 PASS vervangt de oude D1-blokkade; de echte herstelproef en volledige productieschrijfpauze blijven onbewezen.
Oude operationele identiteiten/tellingen worden niet opnieuw gepubliceerd.

Deze WP19-branch is bovenop #77 gestapeld, met actuele main als ancestor. De reviewdiff
tegen #77 bevat uitsluitend de hieronder beschreven correctie, tests en documentatie.
Geen nieuwe migratie, dependency, financieel besluit of tweede notificatiesysteem.

## 2. WP19-A — privacy- en cookiematrix

Statuskolommen zijn onafhankelijk: technische onderbouwing is geen juridische goedkeuring.
De conceptbestanden van #64 zijn daadwerkelijk gelezen en vergeleken met huidige code;
geen juridische tekst of identiteit is hier definitief gemaakt.

| Verwerking/uitspraak | Technisch bewijs | PO-beleid / juridische status | Nog te bevestigen of te beoordelen |
|---|---|---|---|
| Identiteit en correspondentie | Centrale `legalIdentityDraft` blijft TO_BE_CONFIRMED; los van facturatiesnapshots | Voorlopig opgegeven, geen finale juridische acceptatie | Definitieve identiteit/postadres Zwolle; geen historische facturen herschrijven |
| Privacycontact en mailboxroute | PO bevestigde contact@workmatchr.nl → Vimexx-forwarder → ontvangende Vimexx-mailbox | Route en publiek privacyadres bevestigd; geen onafhankelijke mailboxaudit | Forwarderlogs/kopieën, mailboxrechten/MFA, spam/quarantaine, prullenbak en back-ups |
| Algemene ontvangen e-mail | Handmatige verwijdering staat beschreven; geen automatische mailboxintegratie | **PO vastgesteld:** maximaal één jaar vanaf ontvangst; gerechtvaardigde lopende zaak kan langer; inbox=archief | Eigenaar voert jaarlijkse controle uit en registreert datum, aantallen/uitzonderingscategorie, zonder berichtinhoud of persoonsgegevens; uitvoering nog aantonen |
| Nieuw contactformulier | #77: validatie, HMAC-limiters, AES-256-GCM-payload, outbox en Resend; standaard uit | **Nog niet opgenomen in #64**; formulier niet activeren | Verwerkingstabel aanvullen met tijdelijke databasekopie, doel, grondslag, beperkte toegang, sleutelbeheer en verwijdering |
| Contacttransportretentie | Na provideracceptatie directe ciphertextredactie; anders eerste ingeschakelde workercontrole na zeven dagen, actieve lease uitgezonderd | Zeven dagen is technisch voorstel, geen vastgestelde wettelijke termijn | PO/reviewer accepteert duur en cleanup-SLA; disabled/ongeldige consumer ruimt niet op; sleutels beschikbaar houden voor open queue |
| Contactmetadata/limietcounters | Alleen keyed HMACs, IDs/status/tijden; verlopen counters bij volgende inzending; replay-tombstones blijven | Niet anoniem en geen algemene bewaartermijn vastgesteld | Metadata-, log-, provider- en back-upretentie; opruimprocedure mag deduplicatie niet onveilig maken |
| Account/sessie/organisatie | Better Auth, serverstatus en membership; standaard sessiecookie/maximaal 24 uur, expliciet zeven dagen rollend | Technisch ontwerp PO-goedgekeurd; rechtsgrond per gebruiker nog concept | Overeenkomst voor contractpartij versus zakelijke medewerker; belangenafweging, accountretentie en rechtenprocedure |
| Opdrachten/offertes/profielen | Canonieke snapshots, audit, previewallowlist, serverautorisatie en tenanttests | Geen nieuwe juridische vrijgave | Rol van organisaties/professionals, grondslagen, bewaartermijnen en bijzondere gegevens in vrije tekst/bewijsstukken |
| Betalingen/administratie | Mollie server-side verificatie; ledger/factuursnapshots; Jortt-serverkoppeling | Mollie zelfstandige verantwoordelijkheid voor eigen betaal-/wettelijke doelen is in concept onderscheiden | Contracten, daadwerkelijke doorgifte/retentie; fiscale beoordeling en classificatie administratie; geen algemene termijn voor alle platformdata afleiden |
| Uitgaande e-mail | Resend server-side; geen directe Resend-browsercall; voorkeuren voor opdrachtmail behouden | Leverancier genoemd, geen bewezen contract-/doorgiftevrijgave | DPA/rollen, regio/subverwerkers, log- en berichtretentie; SENT is provideracceptatie, niet inboxbewijs |
| Hosting/database | Vercel/Neon server-side; PostgreSQL is technologie, geen extra leverancier | Leveranciers genoemd; afspraken niet als bewezen afgesloten presenteren | Daadwerkelijke contracten/regio/doorgifte, beheerrechten en herstelverwerking |
| Compliance-concept | Expliciet bewaren, absolute 24 uur, herstel na mount, legacykeuze, logout-/tabbladwissen | Opslagontwerp goedgekeurd; algemene privacyverklaring concept | Geen account-ID in gratis intake; geen automatische serverdossierverwijdering beloven |
| Beheer/beveiliging | Audit, foutcodes, HIBP hashprefixcontrole server-side | Noodzakelijkheid/grondslag/retentie nog review | Rechtenprocedure, verantwoordelijkheden en bewaartermijnen per logsoort |
| F4/LMS | Gates blijven uit; historische resultaten onaangeroerd | Juridische/contentacceptatie NIET gegeven | Afzonderlijke bronnen-, cursus-/examen- en retentieacceptatie vóór fase 2/3 |

### Cookie- en opslagconsistentie

| Techniek | Gedrag in huidige broncode / bestaand synthetisch bewijs | Acceptatiegrens |
|---|---|---|
| Better Auth session_token + dont_remember | HttpOnly; Secure op HTTPS-productie; standaard browsersessie/maximaal 24 uur; expliciet zeven dagen | Geen nieuwe inventaris van echte productieaccounts; oude persistente sessies niet massaal ingetrokken |
| platform-admin-view | Gevraagde v01/v02-keuze, sessiecookie onder /platformbeheer | Alleen relevante beheerroute; geen trackingdoel |
| `workmatchr-simple-advice:v1:*`, loginmarker | sessionStorage per gebruiker/concept; anonieme overdracht; wissen na publicatie | Geen eigen TTL; logout wist dit niet expliciet. Scope/retentie op gedeeld apparaat moet juridisch worden beoordeeld; niet verwarren met Compliance-opslag |
| `workmatchr:compliance-free-intake:v2` | Expliciete bewaaractie,24 uur vanaf die actie, niet door openen verlengd; actieve input blijft in geheugen | Expiry bij relevante browseractie; geen continue achtergrondverwijdering claimen |
| v1-concept + clear-signaal/BroadcastChannel | Expliciete hervat-/verwijderkeuze; geen fictieve datum; wissen tussen tabs | Historische key is geen bewijs dat nieuw verkeer die nog plaatst |
| `wm_public_intake` | Oude code bevat90dagen-cookie op oud intakepad | Actuele plaatsing niet bewezen, niet als actieve nieuwe flow presenteren |
| Analytics/tracking/extern embed | Geen nieuwe integratie; broncontrole vindt geen analytics/trackingloader in de actuele publieke flow | Accountgebonden productie-/Mollie-checkoutnetwerk kan niet uit broncode worden afgeleid |

Geen ononderbouwde banner toegevoegd. Functionele noodzakelijke opslag kan vrijgesteld
zijn; dat is geen generieke vrijstelling voor alle opslag. Zie [AP](https://autoriteitpersoonsgegevens.nl/nl/onderwerpen/internet-telefoon-tv-en-post/cookies)
en [Rijksoverheid](https://www.rijksoverheid.nl/themas/economie/telecommunicatie/veilig-gebruik-internet/vraag-en-antwoord/telecommunicatie/mag-een-website-ongevraagd-cookies-plaatsen).
Voorafgaande blokkering en gelijkwaardige keuze blijven vereist als niet-vrijgestelde
technieken worden vastgesteld. Juridische eindacceptatie blijft menselijk.
De huidige main bevat nog placeholderprivacy-/cookiepagina's; dat is geen commerciële privacyvrijgave.

## 3. WP19-B — contact en Resend

### Aangetoonde correctie

De contactworker wachtte onbeperkt op `send(email)`. De geïnstalleerde SDK legt geen
eigen deadline op; de maintenance-route heeft maxDuration=60. Twee nieuwe fake-timertests
falen op #77 en slagen na de gerichte correctie: maximaal **acht seconden wachttijd**
per contactpoging. De routebatch van vijf heeft daarmee maximaal 40 seconden
providerwachttijd, exclusief databasewerk. Dit is geen garantie bij DB-/assignmentconsumerproblemen.

Een timeout is **onbekende uitkomst**, geen bewijs dat Resend niets heeft ontvangen.
Hetzelfde record gaat naar PENDING met generieke code en bestaande backoff. Late
provideracceptatie kan deze status niet alsnog overschrijven. De onderliggende SDK-call
wordt hiermee niet ingetrokken; dezelfde bevroren payload/idempotentiesleutel en de
bestaande reconciliatiegrens van 23 uur voorkomen een blinde nieuwe mail.
De [Resend-idempotentieperiode van 24 uur](https://resend.com/docs/dashboard/emails/idempotency-keys)
blijft leidend. Bij later herstel eerst providerstatus reconciliëren, nooit een nieuwe key bedenken.
Normale assignment-/factuurworkers en de gedeelde Resend-adapter blijven ongewijzigd.

### Synthetisch bewijs

De bestaande PostgreSQL-harness is uitgebreid met de **echte POST-handler → validatie →
versleutelde PostgreSQL-outbox → echte Resend-SDK met uitsluitend lokale fetchstub →
SENT/redactie**. Replay geeft één record, één provider-ID en attemptCount=1.
Een tweede proef accepteert bij de fakeprovider, verliest de response, meet 8.018 ms
tot retry, laat de response alsnog komen en herhaalt met dezelfde key: twee pogingen,
één provideracceptatie. Geen extern netwerkverzoek.

18 PostgreSQL-testgroepen: quota, 45 gelijktijdige aanvragen, spam/ongeldige invoer,
atomiciteit bij insertfout, leases/concurrentie, due-catchup, maximaal vijf pogingen,
stop na 23 uur, recipient/key/payloadgrenzen,redactie na zeven dagen en gesloten gate.
Bezette admissionlock: 45×429, 0×503, p95 56,7 ms. Vrije lock: 1×202, 44×429, 0×503.
Deze conservatieve toelating is geen capaciteit van 45 geaccepteerde berichten.

Er is geen publiek uitleesendpoint voor contactinhoud. Responses bevatten geen body,
adres, ciphertext of providersecret. Alleen de worker met serverkey kan ontsleutelen;
database-/secretbeheerderstoegang blijft afzonderlijk te begrenzen. Geen logging van
berichtinhoud; token/lease/fingerprint en generieke foutcodes zijn geen volledige anonimisering.

### Exact voorstel: één echte mail, nog NIET toegestaan

1. Na technische review, privacy/retentie- en sleutelakkoord: één expliciet geïsoleerde acceptatieruntime/DB met uitsluitend synthetische data, gates gecontroleerd aan, geen andere due mail, geen automatische scheduler tijdens de proef. Geen onbewezen Preview-productiebinding.
2. Bestaande geverifieerde afzender onder **workmatchr.nl** gebruiken; exacte AUTH_EMAIL_FROM en domeinstatus door bevoegde beheerder vóór uitvoering vastleggen. Niet als reeds geverifieerd presenteren.
3. Voorgestelde enige ontvanger: **contact@workmatchr.nl**, via de PO-bevestigde Vimexx-forwarder. De eigenaar bevestigt bevoegdheid en ontvangstcontrole vóór toestemming. Eén recipient, geen CC/BCC, geen andere professionals.
4. Eén GENERAL-bericht: naam `WorkMatchr acceptatie`, afzender `wp19@example.invalid`, bericht `WP19: uitsluitend een synthetische controle van de contactbezorging. Geen klantgegevens.` Onderwerp uit productie-template: `Algemene vraag | WorkMatchr`.
5. Eén formulierinzending, één event/key, één gecontroleerde bestaande maintenance-aanroep met lege overige queue. Geen tweede testevent. Bij timeout/onduidelijkheid consumer stoppen; alleen read-only providercontrole tot uitkomst vaststaat. Geen automatische tweede proefmail.
6. Bewijs: SDK/provider-ID geaccepteerd; outboxstatus SENT/attemptCount; feitelijke ontvangst in de bevoegde mailbox inclusief spam/forwarding en exact één bericht. Provideraccepted alleen is onvoldoende; bounce/delay is geen PASS.
7. Voorstel testretentie: synthetische mailboxkopie handmatig verwijderen na bewijs, uiterlijk 24 uur na afronding; tijdelijke DB dezelfde dag verwijderen. Eerst die cleanup autoriseren. Alleen status/tijden/aantal zonder persoonsgegevens bewaren; providerlogs/prullenbak/backups volgen nog te verifiëren providerretentie.

Nog open: echte afzenderverificatie, afzonderlijk zendakkoord, bewijs van inboxbezorging,
mailboxtoegang/retentie, consumer/schedulerverantwoordelijkheid. Geen sleutel of echte mail aangemaakt.

## 4. WP19-C — Mollie, credits en facturatie

Productcode is ongewijzigd. De bestaande tests bewijzen onafhankelijke provider-fetch,
ID/bedrag/valuta/tenantcontrole, idempotente purchase/ledger/factuur, onbevoegde replayweigering,
failed/canceled/expired zonder credits en late pending zonder paid terug te draaien.
Een browserredirect geeft geen zelfstandig recht op credits. Webhookbody is geen
bewijs van betaling; een fout krijgt geen valse HTTP 200. Onbekende providerstatus wordt
door het adaptercontract geweigerd; vijf nieuwe tests omvatten ook `authorized`
(geen reeds geïncasseerde betaling). Geen statusassertions versoepeld.

Hergebruikt: finance/credits/marketplace/concurrency/tenant-PG-tests van exact dezelfde
domeinbytes. De gecombineerde synthetische commerciële PostgreSQL-keten wordt ook
in WP19 opnieuw uitgevoerd. Fakeprovider is geen Mollie-sandbox- of liveacceptatie.

### Afzonderlijk provideracceptatievoorstel

- **Eerst echte Mollie-API in testmodus:** CREDITS_25 heeft volgens bestaande source of truth in testmodus EUR 1,21 inclusief btw; geen echt geld. Geïsoleerde DB/hosted checkout/webhook met testkey, geen livecredentials of Jortt-/mailtransport. Test paid/canceled/failed, herhaald/vertraagd webhooksignaal, één ledger/factuur en cross-tenantweigering. [Mollie beschrijft](https://docs.mollie.com/reference/testing) de gescheiden testresources en werkelijke webhookaanroep. Publieke bereikbaarheid van zo'n geïsoleerde callback eerst aantonen.
- **Daarna afzonderlijk akkoord voor precies één livebetaling:** bestaande kleinste standaardbundel CREDITS_25, niet-Pro, geen kortingscode: EUR 25,00 + EUR 5,25 btw = **EUR 30,25**, 25 credits. Geen testprijs in livemode. Bevoegde koper/organisatie en correcte factuurgegevens vooraf aanwijzen; geen fictieve juridische factuuridentiteit.
- Voorgestelde methode iDEAL, indien beschikbaar. Openbare [Mollie-prijs](https://www.mollie.com/nl/pricing) op controledatum EUR 0,32 per geslaagde iDEAL/Wero-transactie; daadwerkelijke accountafspraak vooraf controleren. Geen kosten-/prijsinstelling wijzigen en geen gegarandeerde terugbetaling beloven.
- Eén checkout/payment; geen abonnement, refund, extra order of externe factuurmail. Vooraf exact vastleggen hoe ongeautoriseerde factuurmail/Jortt-finalisatie wordt voorkomen binnen bestaande gates. Als geen aantoonbaar veilige afscherming beschikbaar is: **STOP**, geen productiekeys naar een tijdelijke omgeving kopiëren.
- Na betaling providerstatus read-only vergelijken, één bijschrijving van 25 credits, ledgerdelta, btw/factuur en reconcilieerbaar provider-ID. Controleer eventuele browserredirect vóór webhook zonder extra credits. Financiële records niet wissen als testcleanup; wettelijke/fiscale behandeling laten vaststellen. Onzekere provideruitkomst eerst reconciliëren, geen tweede betaling.

De liveproef is nog niet uitvoeringsgereed: aangewezen koper, accounttarief,
mail/Jortt-afscherming, juridische/fiscale akkoord en expliciete transactieautorisatie ontbreken.
De financecron is geen volledige inhaalvoorziening voor alle gemiste betaalwebhooks.

## 5. WP19-D — browser en integrale keten

Ongewijzigde browsercomponenten/routes zijn vergeleken met #77/main. Daarom wordt
de acceptatie van 31 oktober op #77 hergebruikt, niet als opnieuw uitgevoerd gepresenteerd:

| Schakel/rol | Werkelijk bewijs | Grens |
|---|---|---|
| Bezoeker/registratie/verificatie | Echte synthetische HTTP-authhandlers, lokale mailstub | Geen echte verificatiemail |
| Organisatie, opdrachtstart, publiceren/selectie | Browserformulier, Bedrijfsarts + Casemanager verzuim; 1 dossier/Request/handoff/Assignment, 2 invitations | Geen echte opdracht |
| Matching/credits/unlock/offerte/gunning | Zelfde records via bestaande services/fakebetaling; replay/tenantisolatie; browser bevestigde Gegund | De aanvullende betaal-/gunningsketen was deels servicegestuurd |
| Opdrachtgever/professional/admin | Echte lokale login/logout; eigen context; professional kon klantofferte niet lezen; preview zonder klantidentiteit; beheer zag foutfixtures | Geen productieaccounts |
| Volledige klikflow | WP17B browserpublicatie→selectie→professionalunlock/offerte→klantgunning; exacte domeinlogica onveranderd | Wallet synthetisch gefinancierd, geen providercheckout |
| Responsive/keyboard | #77: 1280 px desktop / 390×844 px mobiel, geen overflow, zichtbare focus, receiptstatusfocus | Geen nieuwe numerieke contrast-/zoomclaim |
| 200% | Eerdere expliciete PO-acceptatie behouden; geen UI-wijziging in WP19 | Geen nieuwe echte 200%-meting; PO kan functionele eindacceptatie doen |

Aanvullend daadwerkelijk uitgevoerd in WP19: lokale productiebuild op een eigen
gemigreerde tijdelijke database, beperkte runtime, geen externe providerverbinding.
Leeg formulier → veldfouten en focus naar Naam; synthetisch formulier → keyboard Enter
→ direct disabled/pending → ontvangstbevestiging met statusfocus en geen tweede submit.
Database: één versleuteld PENDING-record; ongeauthenticeerd onderhoud HTTP 401; geauthenticeerd
lokaal onderhoud HTTP 200 → één mock-SENT, attemptCount=1, ciphertext verwijderd, geen andere
templates verwerkt. Desktop 1265 px content en mobiel 375 px content bij 390 px viewport:
scrollWidth gelijk aan clientWidth, zichtbare solide toetsenbordfocus, geen consolefouten.
Privacylink opent aantoonbaar de huidige placeholder, niet het juridische concept.

De browserinterface biedt hier geen bruikbare cookie-/storage- of complete netwerkexport:
de read-only DOMscope geeft `document.cookie` niet vrij. Daarom **geen nieuwe volledige
cookie-/HttpOnly-/HAR-inventarisatie geclaimd**. De matrix gebruikt broncode plus het
reeds beschreven synthetische sessie-/opslagbewijs; productie-/checkoutverificatie blijft open.
Er zijn in deze aanvullende anonieme controle geen sessies gemaakt.
Browser-, HTTP-, service-, database- en providerbewijs worden niet onderling gelijkgesteld.

## 6. WP19-E — één operationeel draaiboek

Voorgestelde uitvoerder: benoemde platformbeheerder; PO is escalatie-/vrijgavehouder.
Financieel verantwoordelijke en bereikbare vervanger moeten vóór opening expliciet
worden toegewezen. Dit document verzint geen reeds werkende piketdienst.

| Signaal / detectie | Ernst | Eerste actie/verantwoordelijke | Escalatie, stopcriterium en reconciliatie |
|---|---|---|---|
| Contact niet afgeleverd; FAILED of retry ouder dan 45 minuten | P2, P1 bij structurele uitval | Platformbeheer: schedulerjob, due/attempt/code/provider-ID bekijken zonder payload | PO bij ontbrekende key/provideruitkomst; intake sluiten bij oplopende backlog; geen nieuw event, reconcileer dezelfde key |
| Verlopen PROCESSING-lease >10 minuten of ciphertext >7 dagen | P1 privacy/operationeel | Beheer: actieve worker/key/gates controleren, private metadata vastleggen | Onbekende actieve send eerst oplossen; geen blinde resend/purge; bevestig herstel/redactie en aantallen |
| Resend 429/5xx/time-out/bounce | P2; P1 bij massale fout | Beheer: bestaande begrensde retry/Backoff en providerstatus | Na 23 uur handmatige reconciliatie; SENT niet met inbox verwarren; geen tweede mail op nieuwe key |
| Mollie-webhook 5xx of paid zonder aansluiting | P1 financieel | Financieel beheer: providerfetch en interne payment-/purchase-/eventstatus | Onbekende providerstatus of bedrag/tenantverschil STOP; bestaande idempotente herverwerking alleen geautoriseerd; geen handmatige creditcompensatie |
| Wallet/ledger/factuurverschil | P1 integriteit | Financieel beheer: transactie-ID, ledgerdelta, beschikbare/gereserveerde credits en snapshot vergelijken | Betrokken commerciële mutaties stoppen; oorzaak/tenantscope vastleggen; geen reset of saldo-overschrijving |
| Opdrachtpublicatie zonder Request/handoff/Assignment | P1 bij gegevensverlies, anders P2 | Platformbeheer: canonicalhandoff/audit en bestaande idempotentiesleutel | Geen tweede publicatie ter compensatie; oorspronkelijke keten reconciliëren; ontbrekende expertise blokkeert matching, niet publicatie |
| Vastgelopen gunning/offerte | P2 | Beheer met opdrachtgevercontext: statusversie, bevoegdheden en concurrencyfout | Geen willekeurige status-SQL; herhaal alleen bestaande geautoriseerde actie, één gunning/snapshot behouden |
| Applicatie/DB 5xx, auth-/tenantfout | P1 beveiliging bij toegang, anders P2 | Beheer: bestaande Vercel-logs met generieke code/correlationID, geen invoer | Verkeerde tenant/toegang onmiddellijk STOP; afzonderlijk incident-/herstelbesluit; geen database-reset |

Bestaande detectie: cockpit FAILED-outboxtellingen, financiële gebeurtenissen/beheerpagina,
GitHub-dispatchfailure en Vercel-logs. Dagelijkse controle plus direct na een failed job;
voor opening een operator en diens bestaande meldingen testen. **Geen automatische
end-to-end-P1-alerting of mailbox-bounceverwerking bewezen.** Wachtrijleeftijd en
ledgerafwijkingen vragen de beschreven handmatige read-only controle. Gebruik de
payloadvrije SQL uit de voorganger. Een groene CI is geen operationele monitoring.

Incidentregistratie: UTC, module/event-ID, generieke foutcode, scope/aantal, verantwoordelijke,
herstelactie, postcheck en vrijgever; geen secrets/berichtinhoud. Bij provideronzekerheid
geen financiële of mailbijwerking totdat het oorspronkelijke resultaat is vastgesteld.

## 7. WP19-F — schema-afhankelijkheden en laatste preflight

Geen schema-/migratiebestand gewijzigd; repositoryketen van 93 migraties gelijk aan main. Contact
gebruikt bestaande `RateLimit`, `NotificationOutbox` en lease-/fingerprintkolommen uit
de authenticatie-, marketplace- en assignment-notificationsmigraties. Deze horen bij
de eerder geverifieerde 85 migraties; contact voegt geen afhankelijkheid van de acht pending
migraties toe. Dit is een dependencyanalyse, geen nieuwe livecompatibiliteitstest.

Exacte pendingvolgorde uit het bestaande dossier:

1. `20260924150000_add_learning_vertical_slice`
2. `20260927210000_add_learning_final_exam`
3. `20260929100000_add_learning_certificates`
4. `20260930100000_add_learning_retention`
5. `20260930120000_correct_learning_retention_publication_policy`
6. `20261017100000_add_compliance_question_visibility`
7. `20261019100000_allow_annual_reminder_reconsent`
8. `20261026090000_restore_learning_exam_question_immutability`

De laatste correctie herstelt de examenvraagbescherming na de volledige keten; geen
tussentijdse F4/LMS-opening. D1-P2 en synthetische restore zijn PASS op hun vastgelegde
scope. Geen nieuwe hostaudit of herhaling van geslaagde encryptieproeven nodig.

Vóór een later migratieakkoord: pin release/migratiebytes; read-only juiste runtimebinding,
85 historische checksums/geen unfinished/geen extra pending; snapshot-/financiële
integriteit; alle writers inclusief GET/Server Actions, sessies, pools, financiële
webhooks, schedulers, directe clients en oude deployments in volledige schrijfpauze;
geen onbesliste providercall/lease/transactie. **Direct vóór uitvoering actueel bruikbaar
herstelpunt**, bewezen echte restorebestemming/toegang/capaciteit, operator/vervanger,
RPO/RTO en cleanup. Geen oude snapshot als actueel checkpoint presenteren.

Na afzonderlijk akkoord alleen officiële runner en bundel van exact acht migraties; postflight 93/93,
checksums, guards, snapshots/ledger/handoff en gates; gecontroleerde externe reconciliatie
vóór hervatting. STOP bij afwijkende identiteit/checksum, onbekende writer, open transactie,
hersteltekort of onzekere provideruitkomst. Geen reset, resolve, automatische rollback of
ongeautoriseerde copy. Productiemigratie blijft NO-GO. Publieke content kan onafhankelijk
worden beoordeeld; commerciële livevrijgave blijft haar eigen gates houden.

## 8. WP19-G — gefaseerde lancering en besluiten

| Fase | Voorwaarden | Behoud van gesloten onderdelen |
|---|---|---|
| 1 Commerciële kern | Technische review #77 + WP19, account/tenant-/journeybewijs, echte provideracceptatie, juridisch privacy/cookieakkoord, toegewezen beheer en afzonderlijk releasebesluit | Contact pas aan na key/retentie/scheduler/bezorgtest; betalingen pas na financiële acceptatie. F4/LMS uit |
| 2 Compliance F4 | Noodzakelijk schema na eigen migratieakkoord, menselijke bronclaim-/regelreview, negen holds expliciet beoordeeld, versie/checksums/publicatiedry-run | Geen frameworkpublicatie of gatewijziging uit een technische PASS afleiden |
| 3 LMS | Schema/immutability plus cursus-/toets-/certificaat-/privacyacceptatie, beperkte pilot en eigen releasebesluit | Geen bestaande runtimecode als toestemming tot publicatie zien |

Concrete nog benodigde PO-besluiten:

1. Technische review en mergevolgorde: eerst #77, daarna WP19; bij squash de opvolger veilig herbouwen op de nieuwe main zonder dubbele code. #39 niet daarnaast mergen. Geen automatische merge.
2. #64: actuele conflictresolutie, nieuwe contactverwerking/retentie opnemen, definitieve identiteit/adres, grondslagen/belangen, leveranciers-/doorgifteafspraken, rechten- en verwijderprocedures; menselijke inhoudelijke goedkeuring. #40 behouden.
3. Transport-/metadataretentie, onafhankelijke serverkey, aangewezen beheerder/vervanger en aantoonbare incidentopvolging; mailboxuitvoering verifiëren.
4. Afzonderlijk zendakkoord voor exact het ene contactbericht uit §3; daarna inboxbewijs. Geen oude toestemming voor een andere mailtest hergebruiken.
5. Afzonderlijke Mollie-testmodusacceptatie en vervolgens eventueel één EUR 30,25-livebetaling onder §4, met koper/factuur/mail/Jortt/kostenafbakening; geen refundmandaat inbegrepen.
6. Gecombineerd herstelproef-/schrijfpauzebesluit volgens het private herstelplan, daarna **apart** besluit over exact acht migraties met vers herstelpunt. Geen productiegeschikte herstelomgeving veronderstellen.
7. Na bewijs van bovenstaande gates: gecontroleerd release-/configuratiebesluit fase 1. F4- en LMS-besluiten blijven apart.

## 9. Validatie en wijzigingsset

Nieuwe controles: 539/539 Vitest (76 bestanden), 18/18 contact-PG-groepen, inclusief
93 migraties op eigen lege lokale DB en daadwerkelijke HTTP/SDK-keten. De time-outtests
waren vóór herstel 2 FAIL/1 PASS en daarna 3 PASS. Mollie matrix voor onbekende statussen: 5 PASS.
Alle providerverzoeken zijn gemockt; er zijn geen productiecredentials gebruikt.
Ongewijzigd finance/credits/auth/tenant-/browserbewijs uit #77 wordt expliciet hergebruikt.
Aanvullend 12/12 schedulercontracttests PASS. De beperkte-runtime-PG-suite opnieuw PASS:
17 matchingfixtures, fakecheckout/payment, zes replays/één purchase-ledger-factuur,
creditaankoop → canonieke publicatie/handoff → PRIMARY/ADDITIONAL → fakeSENT →
één unlock → offerte/gunning/replay; snapshot onveranderd en andere tenant geweigerd.

- Volledige lint: nul fouten, vier bestaande Next.js-navigatiewaarschuwingen in authformulieren.
- Standalone TypeScript: PASS, nul fouten; oude vier readonly-arrayfouten niet aanwezig.
- Productiebuild: PASS; bestaande dynamische-bestandstracingwaarschuwingen, geen nieuwe workaround.
- Diff-check en secret-/infrastructuurmetadatareview: PASS; geen volledige securitycertificering.
- Cleanup: eigen server/container/databases en tijdelijke secret-/operatorscripts verwijderd;
  nul sessies vóór cleanup, drie bestaande containers en 27 volumes intact. Alleen onschuldige
  lokale testlogs en screenshotbewijs behouden buiten de publieke commitset.
- Vercel-autodeployment van deze Draft-branch uit; geen Preview-/productiedeployment gestart.
  De actuele CI-uitkomst hoort bij de daadwerkelijke PR-head en wordt op de PR vastgelegd.

Exacte wijzigingsset ten opzichte van #77:

- `docs/README.md`
- `docs/wp19-commercial-release-acceptance.md`
- `scripts/test-contact-outbox-database.ts`
- `src/lib/contact/contact-email-worker.ts`
- `src/lib/contact/contact-email-worker.test.ts`
- `src/lib/finance/mollie-gateway.test.ts`
- `vercel.json`

Geen juridische pagina, financiële productcode, authenticatie, Prisma, package/lockfile
of bestaande worktree gewijzigd. Geen productieactie, externe mail/betaling, merge of activatie.

## Eindadvies

Technische voorbereiding is geen commerciële vrijgave. Alle onderstaande release-gates
blijven gesloten totdat hun specifieke ontbrekende bewijs/besluit hierboven is geleverd.

- COMMERCIAL CORE: **NO-GO**
- RESEND ACCEPTANCE: **NO-GO**
- MOLLIE ACCEPTANCE: **NO-GO**
- PRIVACY ACCEPTANCE: **NO-GO**
- DATABASE MIGRATION READY: **NO-GO**
- F4 RELEASE: **NO-GO**
- LMS RELEASE: **NO-GO**
- OVERALL COMMERCIAL RELEASE: **NO-GO**
