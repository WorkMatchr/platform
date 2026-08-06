# Marketplace Rules, credits en betrouwbaarheid

## Status en scope

Deze fundering is technisch opgeleverd en wacht op handmatige Product Owner-acceptatie. Zij koppelt de bestaande M7D.3-deelnameplaats aan versieerbare bedrijfsregels en een append-only creditadministratie. De volledige nieuwe offerte- en gunningsflow is niet gebouwd.

## Marketplace Rules

Iedere nieuwe deelname leest precies één op het claimmoment geldige, gepubliceerde regelset. De deelname bewaart het regelset-ID en de toen geldende prijs; latere regelwijzigingen veranderen historische deelnames en transacties nooit.

De initiële regelset `2026.1` geldt vanaf 1 augustus 2026 en bevat:

- deelnameprijs en minimumprijs: 30 credits;
- maximaal drie deelnemers;
- teruggave bij intrekking: 75%, naar boven afgerond;
- toekomstige teruggave voor een geldige, niet-gegunde offerte: 5 credits;
- publicatieblokkade vanaf drie relevante intrekkingen in twaalf maanden.

Gepubliceerde regelsets zijn databasebreed immutable. Nieuwe waarden vereisen een nieuwe versie, ingangsdatum, reden en expliciete bevestiging.

## Claimen is betalen

Een provider-OWNER of -ADMIN kan alleen met actieve interesse, een actieve/selecteerbare organisatie en voldoende credits claimen. Slotclaim, maximumcontrole, saldoafschrijving, ledgerregel en claimevent staan in één serialiseerbare transactie. De verliezende vierde parallelle claim krijgt geen slot en betaalt niets.

## Creditledger

`CreditTransaction` is de autoritatieve append-only historie. Iedere nieuwe mutatie bewaart saldo vóór en na, type, reden, actor, idempotentiesleutel en waar relevant opdracht, deelnameplaats en regelset. Het actuele `CreditAccount`-saldo is een transactioneel bijgehouden projectie van deze historie.

Platformbeheer wijzigt nooit rechtstreeks een saldo. Handmatige compensatie, correctie, commerciële tegemoetkoming, sponsoring, promotie en bijdragebonus schrijven een nieuwe getypeerde ledgerregel. Een fout wordt hersteld met één tegenboeking die naar de oorspronkelijke transactie verwijst.

De 5-creditregel voor een geldige niet-gegunde offerte is versieerbaar vastgelegd, maar wordt pas uitgevoerd wanneer de nieuwe Request-offerte- en gunningsflow een geldige, niet-gegunde offerte betrouwbaar kan aantonen. De bestaande Assignment-marktplaats wordt niet als parallelle bron gebruikt.

## Intrekking en betrouwbaarheid

Een opdrachtgever kiest een reden en bevestigt de gevolgen. Na claims worden alle actieve plaatsen in dezelfde transactie vrijgegeven en ontvangt iedere deelnemer exact één terugbetaling volgens de historische regelset. Bij 30 credits en 75% is dit 23 credits; bij 40 credits is dit 30 credits.

Alleen `WITHDRAWN_AFTER_PARTICIPATION` telt mee voor de voortschrijdende twaalfmaandsgrens. De eerste twee relevante intrekkingen blokkeren niet. Vanaf de derde kan een nieuw Adviesdossier niet worden gepubliceerd totdat platformbeheer een dossiergebonden contactverzoek heeft beoordeeld. Signalen zijn intern en niet zichtbaar als score aan klanten of providers.

## Platformbeheerders

De bestaande platformorganisatie blijft de autorisatiebron:

- `OWNER` wordt zichtbaar gepresenteerd als **Platformeigenaar**;
- `ADMIN` als **Platformbeheerder**;
- `MEMBER` als read-only **Platformauditor**.

Alleen een platformeigenaar nodigt uit, wijzigt rollen, blokkeert of trekt toegang in. Een uitnodiging gebruikt de bestaande Better Auth-accountactivatie, verloopt, kan veilig opnieuw worden verzonden en wordt pas actief na acceptatie en e-mailbevestiging. De laatste actieve platformeigenaar en zelfblokkering zijn beschermd. Een toekomstige vierogenuitbreiding kan aan deze service worden toegevoegd zonder het rollenmodel te vervangen.

## Audit en notificaties

Claims, betalingen, refunds, handmatige mutaties, intrekkingen, contactbesluiten en platformbeheeracties schrijven append-only historie. In-appnotificaties en de bestaande outbox worden transactioneel aangemaakt; deze fundering introduceert geen nieuwe externe mailworker.

## Migratie en terugval

Migratie `20260801110000_add_marketplace_rules_credit_reliability` is additief. Bestaande claims houden nullable prijs- en regelsetvelden en worden niet achteraf fictief belast. Rollback gebeurt applicatief door nieuwe writepaden uit te schakelen; gepubliceerde regels en financiële historie worden niet destructief verwijderd.
