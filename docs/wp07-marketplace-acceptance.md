# WP7 — Marketplaceacceptatie

23 oktober 2026. Basis `a49b59507139ef7121634705da19f781b17845f0`, branch `codex/wp07-marketplace-acceptance`. WP6 is vastgelegd in Draft PR #55; die presentatiecorrectie is niet dubbel overgenomen.

## Nulmeting en architectuur

De canonieke keten is AdviceDossier → Request → interne Assignment. Externe opdrachtlinks gebruiken Request.id. Matching gebruikt de bestaande Trusted Provider Projection, expliciete primary/additional, eligibility en regio/uitvoering; UNKNOWN krijgt geen gegokte expertise. MarketplaceMatchRun/Candidate, ProviderInvitation, ProviderParticipation, Quote/QuoteVersion, AwardDecision, MarketplaceMessageChannel/Message, CreditAccount/Transaction/Reservation en de notification/outboxmodellen blijven de bestaande domeinen.

Routes: `/opdrachten`, opdrachtselectie/offertes, `/uitnodigingen`, `/offertes/nieuw`, `/offertes/[quoteId]`, `/berichten/[channelId]`, `/credits` en platformbeheer. Mutaties lopen via `app/marktplaats/actions.ts` en de marketplace-services. De maintenance-route verwerkt bestaande achtergrondtaken; zij is niet aangeroepen. Geen externe mail of betaling.

Actuele bron van prijzen: gepubliceerde geldige MarketplaceRuleSet → `resolveAssignmentPrice` → immutable uitnodigingssnapshot → `readInvitationPrice`. Historische uitnodigingen behouden hun opgeslagen bedrag. De bedragen 25/30 in oude ADR-/moduleteksten zijn geen bewijs van een actuele productieprijs. Sommige oudere teksten beschrijven de Request- en Assignmentflows nog als afzonderlijk; ADR-024 en de actuele handoff zijn leidend. Geen prijs of productafspraak aangepast.

Opdracht: OPEN → MATCHING/AWAITING_RESPONSES → IN_SELECTION → AWARDED, met de bestaande intrekkings-/sluitvoorwaarden. Offerte: DRAFT → SUBMITTED → AWARDED/REJECTED; WITHDRAWN/EXPIRED in het model zijn geen bewijs dat alle bijbehorende gebruikersacties gebouwd zijn. Moderne aankoop schrijft eenmaal af; legacy reservation-backed deelname behoudt haar historische verwerking. Bijlagen zijn in de gecontroleerde offerte-/berichtflow niet ondersteund.

## Bevestigde fout en herstel

Vier nieuwe tests faalden vóór correctie: award-, decline-, message- en platformintervention-services gaven een resultaat op basis van een bekende idempotentiesleutel terug vóór actuele autorisatie. Dit is een servicegrensdefect: kennis van een sleutel mag geen bevoegdheid verlenen. Geen productie-exploit of daadwerkelijk lek vastgesteld.

Herstel: bestaande autorisatie vóór replay; daarnaast binding aan oorspronkelijke actor, tenant, object en soort handeling. Berichten controleren ook inhoud; interventies run en geselecteerde kandidaten; gunning accepteert de canonieke Request-identiteit via de bestaande identityhelper. Geen wijziging van matchercriteria, prijs, rollen, statusmodel of schema. Gewone geautoriseerde retries blijven idempotent.

Gerelateerde financiële replaypaden in `credit-service.ts` en `marketplace-credit-admin-service.ts` hebben hetzelfde inspectiepunt; behandeling wordt afzonderlijk in WP8 vastgelegd, niet stilzwijgend groen verklaard. Aanvullend bevestigd en hersteld: vier offerte-/selectiereadmodellen misten de actieve organisatiestatus; berichtkanalen missen die grens niet langer. De uitnodigingspagina bood een koopactie zolang INVITED gold, ook na de deadline of sluiting. Het serverreadmodel levert nu canPurchase volgens de bestaande deadline- en opdrachtstatusgrenzen; de pagina gebruikt dit veld. Geen nieuwe koopregel. Nieuwe querytests dekken voor/op/na de deadline en gesloten/gegunde/geannuleerde opdrachten. PostgreSQL bewijst weigering van geschorste organisaties bij offertes en berichten.

## Uitgevoerde tests

- Nulmeting: 49/49 tests, 11 bestanden.
- Reproductie vóór fix: vier autorisatie-replaytests FAIL doordat de private fixture werd teruggegeven.
- Na fix: 207/207 tests, 24 bestanden; inclusief veertien nieuwe replaytests, requests/handoffcontracten en opdrachtacties.
- PostgreSQL `test:db:marketplace`: PASS, 20 s; schema-/databaseconstraints.
- PostgreSQL `test:db:marketplace-concurrency`: PASS, 23 s; na de fix uitgebreid en opnieuw PASS, 19 s; na de readmodelcorrecties nogmaals PASS, 26 s.
- PostgreSQL `test:db:request-interests`: PASS, 47 s; acht eligible organisaties, immutable eligibility, intrekken/heractiveren, privacy, concurrency en tenantisolatie.
- PostgreSQL `test:db:request-offer-slots`: PASS, 45 s; drie plaatsen, vierde weigering, atomair betalen, historische refundregel, parallelle claims en append-only events.
- Iedere harness maakt een eigen tijdelijke lokale database, past de bestaande migraties toe en verwijdert haar. Database-OIDs en rollen vóór/na exact gelijk. Alleen synthetische `example.invalid`-gebruikers; geen providercredentials beschikbaar.

De commerciële servicesimulatie bewijst: preview zonder volledige omschrijving → één aankoop/afschrijving → twee offerteconcepten/indieningen → één gunning en afwijzing van de andere offerte → juiste statussen/audit/kanalen. Dubbele uitnodigingsacceptatie leverde twee succesvolle antwoorden op maar één deelname/betaling. De overige races leverden één winnaar en een afgewezen concurrent op. Onvoldoende saldo maakt geen deelname of kanaal; vierde koper betaalt niets. Balans, reserveringen en laatste ledgerregel sluiten aan.

Nieuwe echte PostgreSQL-regressies: berichtretry geeft hetzelfde record; vreemde provider krijgt ACCESS_DENIED; gunningretry hetzelfde resultaat; vreemde tenant, andere offerte en geschorste membership geweigerd. Geen dubbele boodschap, gunning, audit of betaling.

Aanvullend is de echte lokale browserketen uitgevoerd met twee synthetische accounts: professionallogin → gratis preview → aankoop voor de opgeslagen fictieve 25 credits → offerteconcept → indiening → logout → opdrachtgeverlogin → offertevergelijking → gunning met motivatie → logout. Eindtelling: één deelname, één afschrijving, één gegunde offerte, één AwardDecision en nul sessies. De preview bevatte geen volledige opdrachtomschrijving; definitieve indiening en gunning werden zichtbaar bevestigd. Dit is een legacy Assignment-fixture met vooraf ingerichte match/uitnodiging; automatische matching en canonieke Request-publicatie zijn afzonderlijk getest. Geen productiebetaling of volledige externe checkout geclaimd.

De tijdelijke browserdatabase met 85 migraties is verwijderd, evenals beide synthetische logins en de lokale credentialbestanden; server 3055 is gestopt. Het fixtureproces was bij opruimen al beëindigd, daarom is uitsluitend de exact vastgelegde tijdelijke databasenaam gecontroleerd verwijderd. Overige database-OIDs en rollen waren tijdens deze cleanup ongewijzigd. De vier databaseharnesses verifiëren daarnaast hun eigen volledige voor/na-inventaris. Nieuwe mobiele/keyboard-/200%-PASS wordt niet geclaimd; 200% blijft het reeds geaccepteerde PO-ontwerpcriterium.

Volledige lint en productiebuild PASS. Standalone TypeScript: uitsluitend vier bestaande TS2345-readonly-arrayfouten in compliance/rule-engine.test.ts (13, 14, 23, 24). Diff-check en secrets-patrooncontrole van de commitset PASS. Geen lokale fixtures of geheimen in de commitset.

## Vijftig controlepunten

PASS geldt uitsluitend binnen de genoemde code-/testgrens.

| Code | Status | Bewijs of beperking |
|---|---|---|
| MKT-01 | PASS | Routes, services en modellen geïnventariseerd. |
| MKT-02 | PASS | ADR-024, externe Request-identiteit; WP6 ketenbewijs. |
| MKT-03 | PASS | Bestaande statusovergangen geïnventariseerd; geen nieuwe flow afgeleid uit enum. |
| MKT-04 | PASS | Unit/UI-contract en vier echte databaseharnesses. |
| MKT-05 | NOT TESTED | Zelfde mainbasis als WP4/WP6; geen nieuwe productie-runtimevergelijking. |
| MKT-06 | PASS | WP6 publicatie, Request-contract en handoffregressies. |
| MKT-07 | PASS | OPEN-publicatie, gecontroleerde matchingstatussen. |
| MKT-08 | PASS | Preview allowlist, immutable snapshot; startdetailcorrectie apart in #55. |
| MKT-09 | PASS | WP6 publicatieconcurrentie; WP7 aankoop/claimraces. |
| MKT-10 | PASS | Bestaande intrekking, idempotente refunds en statusguards in DB-suite. |
| MKT-11 | PASS | Preview-readmodel zonder aankoop; volledige inhoud ontbreekt vóór aankoop. |
| MKT-12 | PASS | Gestructureerde allowlist, prijs en deadline; ruwe titel bewust niet gebruikt. |
| MKT-13 | PASS | Privacyfixtures met contact-/adres/projectgegevens komen niet in preview/mail. |
| MKT-14 | PASS | Gedeelde AssignmentPreview, snapshot/prijsmismatch faalt gesloten. |
| MKT-15 | PASS | canPurchase bewaakt deadline en bestaande opdrachtstatus; pagina gebruikt deze serveruitkomst. Browserheracceptatie blijft open. |
| MKT-16 | PASS | Primary matchingtests. |
| MKT-17 | PASS | Alleen expliciete additional matching. |
| MKT-18 | PASS | Primary precedentie bij passende primaire expertise. |
| MKT-19 | PASS | Request/handoff UNKNOWN blokkeert automatische matching. |
| MKT-20 | PASS | Matching-rules suite: uitsluitingen, scope en ranking; geen vakinhoudelijke certificering. |
| MKT-21 | PASS | Actuele provider/membership/status, invitation en transactieslot. |
| MKT-22 | PASS | Centrale rule resolver en immutable prijssnapshot. |
| MKT-23 | PASS | Synthetische creditsintegratie; financiële volledigheid WP8. |
| MKT-24 | PASS | Twee acceptaties, één deelname en afschrijving. |
| MKT-25 | PASS | Onvoldoende saldo/vierde koper/rollback en serviceguards; geen netwerkstoring in browser geïnjecteerd. |
| MKT-26 | PASS | Request-interesse en bestaande deelname in DB. |
| MKT-27 | PASS | Bestaande contractvalidatie; bijlagen niet ondersteund. |
| MKT-28 | PASS | Concurrente interesse/claim/indiening. |
| MKT-29 | PASS | Servertijd/deadlineguards; visuele beperking MKT-15. |
| MKT-30 | PASS | Bestaand intrekken/heractiveren interesse; geen nieuwe offertemutatie gebouwd. |
| MKT-31 | PASS | Concept en submit via echte services. |
| MKT-32 | PASS | Immutable offerteversies en eigen provider-/clientqueries. |
| MKT-33 | PASS | DRAFT/SUBMITTED/AWARDED/REJECTED in DB bewezen. |
| MKT-34 | PASS | Synthetisch bericht, eigen retry en vreemde providerweigering. |
| MKT-35 | PASS | Replaybinding, actieve-organisatieguards en geschorste-organisatiegevallen in PostgreSQL. Geen uitputtende browseraanvalstest. |
| MKT-36 | PASS | Tenantpredicate en daadwerkelijk ingelogde opdrachtgever in browser. |
| MKT-37 | PASS | Vergelijkingspagina met één ingediende offerte browsermatig gecontroleerd; meerdere offertes aanvullend in DB-suite. |
| MKT-38 | PASS | Servicegunning met geldige offerte en motivatie. |
| MKT-39 | PASS | Dubbele gunning en nieuwe replayautorisatie in PostgreSQL. |
| MKT-40 | PASS | Eén AwardDecision/Resolution, winnaar en afgewezen offerte; veilige notificatiegrens. |
| MKT-41 | BLOCKED | Vier replayservices hersteld; financiële paden volgen WP8, overige readgrenzen open. |
| MKT-42 | PASS | Tenanttests Request/interesse/slots en nieuwe replaygevallen. |
| MKT-43 | PASS | Eigen providerparticipatie/quotequery en berichtkanaal; niet iedere route browsermatig aangevallen. |
| MKT-44 | BLOCKED | Allowlist en replaytests PASS; geen volledige API-/loggingpenetratietest. |
| MKT-45 | PASS | Serializable races, unieke constraints, rollback, ledger en audit. |
| MKT-46 | PASS | Echte lokale publicatie in WP6; hier requestregressies. |
| MKT-47 | PASS | Matching/previewservices, privacyfixtures en ingelogde previewbrowsercontrole. |
| MKT-48 | PASS | Lokale legacy browserketen aankoop → concept → indiening → opdrachtgever → gunning; precies één afschrijving. |
| MKT-49 | PASS | Negatieve unit-/DB-scenario's, geen echte financiële transacties. |
| MKT-50 | PASS | Gemeten races en geautoriseerde retries; geen productieherstel uitgevoerd. |

## Besluit

TECHNICAL NO-GO en SECURITY NO-GO voor volledige eindacceptatie: open controles hierboven, vier bekende standalone-TypeScript-baselinefouten en bestaande dependency-advisories uit WP5. FUNCTIONAL REVIEW READY voor de aangetoonde services/fix; COMMERCIAL SIMULATION READY voor de beschreven lokale browser-/serviceketen. Geen productie- of algemene commerciële acceptatie. PRODUCTION RELEASE NOT READY.

WP8 kan onafhankelijk de financiële services en gesimuleerde reconciliatie onderzoeken. WP9 onderzoekt de outbox/transportgrens. Geen echte betalingen, mail, productiegegevens, migraties, merge of deployment. Juridische/commerciële productbesluiten en PO-eindacceptatie blijven afzonderlijk.
