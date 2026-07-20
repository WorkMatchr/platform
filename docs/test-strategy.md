# Teststrategie WorkMatchr

## Marketplace Transaction Platform v1

De marktlaag gebruikt vier testniveaus:

1. unit tests voor matchingregels, ranking, statussen en creditberekeningen;
2. servicetests voor autorisatie, tenantisolatie, idempotentie, rollback en veilige fouten;
3. database-integratietests op een tijdelijke lokale database voor migraties, constraints, immutable historie en unieke zakelijke uitkomsten;
4. browseracceptatie per rol en viewport voor navigatie, formulieren, focus, mobiele layout en gegevensisolatie.

`npm test` bevat de pure en servicetests. `npm run test:db` maakt tijdelijke databases, voert alle migraties uit en verwijdert die databases na afloop. `test:db:marketplace` controleert minimaal niet-negatieve credits, exclusieve reserveringsstatus, immutable offerte/ledger, één gunning, idempotente notificatie en unieke auditcorrelatie.

Voor product-owneracceptatie blijven volledige browserflows nodig voor opdrachtgever, provider-OWNER, provider-MEMBER, reviewer, approver, auditor en platformbeheer op 320, 375, 768, 1024 en 1440 pixels.
