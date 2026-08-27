# Assignment Extra Quote Slots v1 — Fase 1

## Productbesluit

Een Opdracht heeft standaard drie offerteplaatsen. De absolute bovengrens is vijf. Een vierde plaats kost € 25,00 exclusief 21% btw; een vijfde plaats brengt de totale uitbreiding op € 50,00 exclusief 21% btw. De opdrachtgever koopt beschikbare offerteplaatsen, niet een garantie dat professionals iedere plaats vullen. Een niet-gevulde plaats leidt niet automatisch tot restitutie.

## Datamodel en handhaving

`Assignment.maxSelections` bewaart de effectieve limiet per Opdracht. Het veld is verplicht, default naar `3` en heeft een databasecheck voor `3..5`. Bestaande opdrachten krijgen daardoor veilig drie plaatsen. Matching, beheerinterventies en de transactionele aankoop van een opdracht lezen deze effectieve limiet; de absolute limiet staat centraal in `assignment-quote-slots.ts`.

## Fase 1: fail-closed

De publicatie-interface toont 3, 4 en 5 plaatsen en de volledige prijsopbouw. Alleen drie plaatsen kunnen worden gepubliceerd. Een keuze voor vier of vijf stopt vóór conversie, publicatie, financiële registratie of Mollie-aanroep met de melding dat betaling binnenkort beschikbaar wordt. De publicatieservice controleert aanvullend dat een Opdracht zonder toekomstige betaalbevestiging niet met meer dan drie plaatsen opent.

Fase 2 kan een geslaagde, opdrachtgebonden aankoop gebruiken om `maxSelections` gecontroleerd naar vier of vijf te activeren. Deze fase introduceert geen betaalentiteit, bypass of dummy-betaalstatus.
