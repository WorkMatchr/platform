# Historische Pro-verlengingen herstellen

Beide goedkeuringen zijn standaard gesloten. Gebruik het private uitvoeringsblad voor de originele betaal-ID’s. Open het beheerscherm /platformbeheer/financien/facturen uitsluitend in de goedgekeurde beheeromgeving.

1. Controleer direct vooraf in Mollie Live het betaal-ID, klant, subscription, mandaat, bedrag, betaalstatus, providerdata en eventuele refunds of chargebacks. Zoek ook op factuurperiode, debiteur, bankboeking en technische referentie in Jortt. Bij een eerder of elders geboekt document eerst aansluiten.
2. Begin met oktober. Stel na toestemming alleen PRO_RECOVERY_APPROVED_PAYMENT_ID in voor die ene betaling in het beheerproces. Voer het betaal-ID in bij Goedgekeurd Pro-herstel. Trek de vrijgave vervolgens in. De actie gebruikt GET voor de oorspronkelijke betaling.
3. Controleer één PAID-regel, één factuur van 4900 cent plus 1029 cent btw, de Pro-periode 4 oktober tot 4 november volgens het septemberanker en de events PRO_PAYMENT_VALIDATED, PRO_INVOICE_ISSUED en PRO_RECOVERY_JORTT_HELD. Er hoort nog geen FinancialJorttSync te zijn. De operator staat op het hold-event.
4. Controleer voor Jortt opnieuw op een bestaand document. Verifieer dat alle actieve verzendworkers en retryroutes de eenmalige poging respecteren. Zet na afzonderlijk akkoord uitsluitend het interne factuur-ID in PRO_RECOVERY_APPROVED_INVOICE_ID. De vrijgave op het beheerscherm maakt de unieke verzendpost direct beschikbaar voor de scheduler. Sluit de vrijgave en controleer document en betaalaflettering.
5. Start november pas na acceptatie van oktober en afzonderlijk akkoord. Gebruik dezelfde controles voor 4 november tot 4 december. Jortt vereist ook voor deze factuur een eigen vrijgave.

Stop bij een onverwachte beginsituatie, verschil in identiteit, periode, bedrag of boeking. Bij onduidelijke commitbevestiging eerst op betaal-ID, factuur en audit controleren. Bij een Jortt-time-out of crash na claim mag geen tweede automatische verzendpoging volgen. Zoek de technische referentie en het factuurnummer in Jortt en laat een eventuele bestaande boeking apart beoordelen. Reset de pogingenteller niet.

Gebruik de herstelversie uitsluitend met een compatibel schema, geldige platformbeheersessie en bevestigde afwezigheid van concurrerende oudere verwerkers voor deze betalingen. De vier bestaande Jortt-documenten en hun kasaflettering vallen buiten deze procedure.
