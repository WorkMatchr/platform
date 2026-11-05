# Offerteflow v1

## Statussen

`DRAFT → SUBMITTED → AWARDED | REJECTED`; daarnaast zijn `WITHDRAWN` en `EXPIRED` voorbereid.

Een provider ziet vóór aankoop uitsluitend een server-side allowlist met basisinformatie. Bij aankoop ontstaan deelname, definitieve afschrijving van 25 credits en volledige opdrachttoegang in dezelfde serialiseerbare transactie. Een conceptofferte gebruikt immutable versies met prijs, prijsuitleg, aanpak, planning, optionele voorwaarden en geldigheid. Servertijd bewaakt de deadline. Offerte-indiening kost na aankoop geen extra credits. Bestaande historische deelnames met een reservering behouden hun legacy-afhandeling en worden niet gemigreerd.

Providers zien uitsluitend hun eigen offerte, versies, deelname, creditmutaties en kanaal. De opdrachtgever ziet ingediende offertes voor de eigen opdracht. Veilige bijlagen zijn nog niet beschikbaar.

## WP18: conceptbewerking, geldigheid en gunning

Een heropend concept vult alle zes opgeslagen inhoudsvelden in, inclusief prijsuitleg,
voorwaarden en geldigheid. Deze gegevens zijn zichtbaar voor de bevoegde professional
en, na indiening, de bevoegde opdrachtgever. Er worden geen historische versies herschreven.

Concepten zijn alleen bewerkbaar door een bevoegde providerbeheerder, bij actieve deelname,
voor de reactiedeadline en zolang de opdracht AWAITING_RESPONSES of IN_SELECTION is.
De service dwingt dit transactioneel af; een verborgen knop is geen autorisatie.
Na indiening blijft de oorspronkelijke immutable versie leidend.

Een offerte met een verstreken validUntil kan niet worden gegund, ook niet precies op
het vervaltijdstip. De opgeslagen timestamp en de bestaande datumconversie blijven
ongewijzigd; er wordt geen nieuwe einde-van-de-dagregel geïntroduceerd. Historische
idempotente gunningen blijven terugleesbaar. De weergave toont de geldigheid.

Alleen daadwerkelijk gegunde of afgewezen ingediende offertes krijgen de bijbehorende
in-app gunnings-/afwijzingsmelding. Een niet-ingediend of ingetrokken concept krijgt geen
onjuiste melding dat zijn offerte niet gekozen is. WITHDRAWN en EXPIRED blijven
bestaande voorbereide statussen; WP18 introduceert geen nieuwe intrekkingsworkflow.

Testbewijs en vrijgavegrenzen: [WP18](wp18-commercial-completion.md).
