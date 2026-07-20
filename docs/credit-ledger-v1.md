# Creditledger v1

## Saldi

- beschikbaar: inzetbaar voor een nieuwe deelname;
- gereserveerd: gekoppeld aan een actieve deelname;
- besteed: definitief geconsumeerd bij geldige offerte-indiening.

De ledger bevat `ADMIN_GRANT`, `ADMIN_CORRECTION`, `RESERVATION`, `RESERVATION_RELEASE` en `CONSUMPTION`. Records zijn append-only. Idempotentiesleutels voorkomen dubbele mutaties. Databasechecks voorkomen negatieve saldi en gelijktijdige consumptie/vrijgave.

Alleen centraal platformbeheer kan met verplichte reden grants of positieve/negatieve correcties uitvoeren. Een negatieve correctie kan het beschikbare saldo nooit onder nul brengen. Iedere handeling heeft een unieke auditcorrelatie en een append-only ledgerregel. Providergebruikers lezen uitsluitend het eigen saldo. Credits kopen en restituties zijn niet geïmplementeerd.
