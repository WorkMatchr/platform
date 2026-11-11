# Marketplace CORE-02

Basis `b7420456e682ee30dbe39b6a03dd4be2c8bc192c`. De proeven gebruiken PostgreSQL 18, synthetische organisaties en fake providers.

| Scenario | Databasebewijs en vrijgavegrens |
| --- | --- |
| Dubbele indiening | Replay levert dezelfde offerte op. De deelnamebetaling valt bij ontgrendeling. |
| Laatste plaats | Vier organisaties voor drie plaatsen. Na twee aankopen wint precies één van de twee gelijktijdige aanvragen. De winnaar betaalt 25 credits. De verliezer behoudt het saldo en krijgt bij herhaling FULL. |
| Providerreplay | Een chargeback ontbrak in de fingerprint van creditpakketten. Bedrag en valuta worden gecontroleerd en de waarneming krijgt een uniek financieel event voor reconciliatie. Een vertraagde open/pending-status kan een mislukte, verlopen of geannuleerde poging niet heropenen. |
| Gunning | Twee bevoegde beheerders kiezen gelijktijdig verschillende offertes. Eén AwardDecision, één gegunde en één afgewezen ingediende offerte. |
| Contactgegevens | Een vrijgegeven reservering gaf nog toegang tot fullAssignment. De controle vereist actuele deelname, betaling of geldige reservering en actuele inhoudelijke toelating. Een verkeerde tenant krijgt geen detail. |
| Verlies toelating | Schorsing verhindert indienen en lezen. Intrekken van het relevante specialisme verhindert bewerken, indienen, gunnen en inzage in de betaalde uitnodiging. |
| Annulering tijdens dispatch | Na de eerste controle kon de opdracht worden ingetrokken. De worker leest na het verkrijgen van het opdrachtslot de dispatchvoorwaarden opnieuw. De geannuleerde opdracht resulteert in nul provideroproepen. |
| Dubbele of onderbroken worker | Een verlaten lease wordt hervat in de betaalde opdrachtketen. Concurrerende workers leveren één verzending op. Menselijke alarmontvangst vereist apart operationeel bewijs. |
| Gunning en inzage | PostgreSQL weigert wijzigen en verwijderen van het definitieve besluit. Bij de leescontrole kan de sluitingstijd van een definitieve gunning worden herkend aan het besluit. Andere wijzigingen in de matchcriteria blijven de bestaande digestcontrole doorlopen. |
| Oude routes | Afgesloten ingangen op deze kandidaat geven LEGACY_ROUTE_CLOSED. Effectieve schrijfrechten van eerdere productiedeployments zijn niet bewezen ingetrokken. Productievrijgave geblokkeerd. |

De logische ketens zijn op servicelaag en database getoetst. De proef omvat geen integrale HTTP-acceptatie van historische deployments of documentdownloads. Reconciliatie van terugboekingen vereist een bevoegd financieel besluit. Een chargebackwaarneming start geen automatische terugbetaling of walletcorrectie.

Gerichte databasesuites: `marketplace-concurrency`, `assignment-notifications`, `marketplace`, `finance` en `finance-p1` via de bestaande `test:db:`-scripts.
