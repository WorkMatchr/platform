# Kwartierdispatch voor Marketplace

## Contract

De productiecron roept de onderhoudsroute via GET aan om 00, 15, 30 en 45 minuten UTC. De 300 seconden functieduur en het budget van 120 seconden voor het starten van nieuwe batches begrenzen de verwerking. De volgende geplande aanroep neemt resterende verzendklare records en verlopen leases mee. De bestaande worker controleert de actuele toelating en gebruikt dezelfde idempotentiesleutel bij een onzekere verzending. Contactonderhoud behoudt de bestaande gate en retentiecontrole.

Een unieke sleutel per UTC-kwartier in MarketplaceAuditEvent voorkomt dubbele verwerking van dezelfde tick. De bestaande outboxleases met SKIP LOCKED beveiligen overlappende workers op recordniveau. Een harde functie-time-out kan RUNNING achterlaten. De Raspberry blijft de laatste voltooide run meten.

GET /api/maintenance/marketplace/status leest in één consistente database-transactie de laatste succesvolle voltooiing en diens vier uitnodigingstellers, de recentste runstatus, nu verzendklare PENDING-uitnodigingen en afzonderlijk de verlopen PROCESSING-leases. Een nog nooit voltooide run heeft geen tijdstip of tellers. Dit endpoint accepteert uitsluitend MARKETPLACE_MONITOR_SECRET (onafhankelijk gegenereerde 32 bytes, kleine hexletters). De Pi krijgt deze uitsluitend als systemd-credential status-read. Status is privé en ongecachet. De bestaande meldingstoestand en verzendidentiteit blijven bruikbaar.

## Omschakeling na akkoord

1. Controleer project, Pro-abonnement, cronquotum, canonieke domeinroute zonder redirect, runtime INSERT/SELECT op de audit en SELECT op de outbox. Controleer de klok op de Pi. Controleer dat alle onderhouds- en leestokens verschillend zijn. De aparte Marketplace-monitorcredential geeft uitsluitend leesinzage.
2. Bereid de kandidaat met MARKETPLACE_DISPATCH_PLANNER=github voor. In deze stand verwerkt alleen de bestaande geautoriseerde POST. De nieuw geregistreerde Vercel-GET is inactief. Bij off of onbekende waarde zijn beide planners gesloten. Zet de Raspberry-bestanden klaar zonder zijn draaiende timer te vervangen.
3. Zet na akkoord de GitHub-variabele MARKETPLACE_NOTIFICATIONS_ENABLED uit. Blokkeer handmatige triggers en oude directe deploymentroutes naar Marketplace-onderhoud. Controleer wachtrij, actieve en reeds gestarte dispatchjobs, function invocations en nog lopende leases. Wacht op beëindiging. Stop bij onbekende schrijver. Houd de financiële cron en diens secret in stand.
4. Activeer de kandidaat met MARKETPLACE_DISPATCH_PLANNER=vercel. Controleer dat POST op iedere bereikbare versie is afgeschermd. Laat uitsluitend de normale productiecron starten. Registreer voor twee opeenvolgende kwartieren de succesvolle tijdstippen, tellers, verzendklare records en verlopen leases. Onderzoek retry, failed of resterende achterstand vóór sluiting.
5. Vervang op de Pi onder afzonderlijke autorisatie alleen monitor-pi.mjs en workmatchr-monitor.service. Lever status-read via een root-only bestand in /etc/workmatchr-monitor. Behoud timer, alarmstatus, Resend-credential, afzender en journald. Herlaad systemd en controleer na vijf minuten dat de Pi dezelfde tellers rapporteert. Bevestig eventuele herstelmail.
6. Bij rollback eerst Vercel-dispatch afsluiten en alle actieve invocations en leases controleren. Herstel daarna de GitHub-compatibele versie en de eerdere Pi-statusbron, vervolgens de GitHub-planner. Houd het incident open totdat een werkelijk geplande run en verwerking van eventuele achterstand zijn aangetoond.

Pro ondersteunt planning per minuut. Elke aanroep telt als functiegebruik. Een kwartierplanning levert 96 geplande aanroepen per dag op. [Vercel Cron-limieten](https://vercel.com/docs/schedules/cron-jobs/usage-and-pricing)
