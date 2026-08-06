# Creditledger v1

## Doel en afbakening

De creditwallet is het financiële fundament voor professionele organisaties. Er is maximaal één `CreditAccount` per organisatie. Een wallet mag alleen bestaan voor een actieve `PROVIDER`- of legacy `BOTH`-organisatie met minimaal één actief account van type `PROFESSIONAL`. Bedrijfsaccounts en platformorganisaties hebben geen wallet.

Deze versie verwerkt nog geen betaling. Mollie, prijzen, pakketten, abonnementen, facturen, btw en boekhoudkoppelingen vallen buiten scope. De bestaande marketplace kan eigen getypeerde ledgerregels schrijven; de nieuwe algemene walletservice is nog niet aan een nieuwe opdrachtflow gekoppeld.

## Bron van waarheid

`CreditTransaction` is het autoritatieve append-only grootboek. Iedere nieuwe regel bevat minimaal:

- een mutatietype en niet-nulbedrag;
- `totalDelta` en `reservedDelta`;
- een actor, reden, tijdstip en unieke idempotentiesleutel;
- waar van toepassing een zakelijke referentie en begrensde auditmetadata.

De zichtbare saldi worden uitsluitend uit alle ledgerregels afgeleid:

- **totaal saldo** = som van `totalDelta`;
- **gereserveerd saldo** = som van `reservedDelta`;
- **beschikbaar saldo** = totaal saldo minus gereserveerd saldo.

De bestaande kolommen op `CreditAccount` blijven tijdelijk bestaan als databasebeheerde compatibiliteitsprojectie. Een trigger vernieuwt ze na iedere ledgerinsert. Rechtstreekse saldomutaties worden door PostgreSQL geweigerd.

## Mutaties

Het algemene contract ondersteunt:

| Contracttype | Bestaand ledgertype | Effect |
| --- | --- | --- |
| Aankoop | `PURCHASE` | totaal omhoog |
| Reservering | `RESERVATION` | gereserveerd omhoog |
| Vrijgave | `RESERVATION_RELEASE` | gereserveerd omlaag |
| Definitieve afschrijving | `CONSUMPTION` | totaal en gereserveerd omlaag |
| Terugbetaling | `REFUND` | totaal omhoog |
| Bonus | `CONTRIBUTION_BONUS` | totaal omhoog |
| Administratieve correctie | `ADMIN_CORRECTION` | totaal gecontroleerd omhoog of omlaag |

Historische marketplace-ledgertypen blijven uitleesbaar. Correcties vervangen nooit een eerdere regel; zij voegen een nieuwe, herleidbare tegenmutatie toe.

## Integriteit en autorisatie

- Elke mutatie draait in een serialiseerbare transactie.
- Een advisory lock op idempotentiesleutel voorkomt dubbele verwerking.
- Een walletlock serialiseert gelijktijdige mutaties per organisatie.
- Databasevalidatie weigert een negatief totaal, negatief gereserveerd saldo of negatief beschikbaar saldo.
- Een identieke idempotente herhaling hergebruikt het bestaande resultaat; een afwijkende payload met dezelfde sleutel wordt geweigerd.
- Professionals lezen uitsluitend de wallet van hun eigen actieve organisatie.
- Reserveren, vrijgeven en afschrijven vereist een bevoegde `OWNER` of `ADMIN` van die professionele organisatie.
- Aankoopregistratie, terugbetaling, bonus en correctie vereisen bestaand bevoegd platformbeheer. Er is bewust geen nieuwe beheerinterface toegevoegd.

Iedere algemene mutatie schrijft naast de ledgerregel een append-only `MarketplaceAuditEvent` met actor, rol, organisatie, reden, correlatiesleutel en saldoresultaat.

## Migratie en compatibiliteit

Migraties `20260805110000_add_professional_credit_wallet_ledger`, `20260805111000_protect_credit_wallet_projections` en `20260805112000_derive_credit_wallet_spent_projection` zijn additief:

- bestaande ledgerregels krijgen deterministische delta's;
- een ontbrekend historisch beginsaldo wordt als nieuwe openingsregel vastgelegd;
- bestaande ledgerregels en zakelijke data worden niet verwijderd of herschreven;
- incompatibele bestaande wallets laten de migratie fail-closed stoppen;
- de bestaande beschikbaar-, reserverings- en besteedprojecties worden voortaan alleen uit het ledger vernieuwd.

De terugdraairoute is herstel vanaf backup plus het terugzetten van de applicatieversie. Ledgerregels mogen niet worden verwijderd om een functionele rollback te simuleren.
