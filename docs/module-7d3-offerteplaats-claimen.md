# Module 7D.3 — Offerteplaats claimen

Status: technisch opgeleverd; handmatige product-owneracceptatie open

## Doel

M7D.3 laat een actieve, geïnteresseerde professionele organisatie één exclusieve offerteplaats claimen. De opdrachtgever kiest geen organisatie: de volgorde van succesvolle, transactionele claims bepaalt slot 1, 2 en 3. Deze module geeft uitsluitend het recht om in een volgende module een offerte op te stellen.

## Domein en integriteit

`RequestOfferSlot` bewaart de actuele claim per aanvraag en providerorganisatie:

- de gebonden actieve `RequestInterest`;
- slotnummer 1, 2 of 3;
- status `CLAIMED` of `RELEASED`;
- claim-, optionele verval- en vrijgavetijd;
- de oorspronkelijke actor.

Er bestaat maximaal één slotrecord per aanvraag/organisatie en per interesse. Een gedeeltelijke unieke PostgreSQL-index op actieve `(requestId, slotNumber)`-combinaties en de check op slotnummers 1–3 begrenzen het aantal actieve plaatsen ook buiten de applicatieservice tot drie.

`RequestOfferSlotEvent` legt iedere claim of latere vrijgave append-only vast met actor, tenant, slotnummer, statustransitie en idempotentiesleutel. M7D.3 activeert nog geen vrijgave- of vervalinterface.

## Claimtransactie

Alleen een actieve OWNER of ADMIN van een actieve `PROVIDER`- of `BOTH`-organisatie kan claimen. De provider moet nog actueel `SELECTABLE` zijn, tot de oorspronkelijke immutable doelgroep behoren en een actieve interesse hebben. Het Request moet `PUBLISHED` zijn.

De service vergrendelt de Request-rij met `FOR UPDATE`. Wachtende transacties lezen daarna onder `ReadCommitted` de nieuwste actieve slotstand en kiezen het laagste vrije nummer. De vierde claim krijgt `FULL`. Databaseconstraints vormen een tweede verdedigingslaag. Een herhaalde claim van dezelfde organisatie retourneert hetzelfde slot zonder extra event.

Een actieve claim verhindert het intrekken van interesse zolang nog geen gecontroleerde vrijgaveflow bestaat.

## Privacygrens

Voor claim ziet de professionele organisatie uitsluitend de geanonimiseerde Request-projectie uit M7D.2. Na een succesvolle claim krijgt zij aanvullend:

- bedrijfsnaam;
- contactpersoon;
- telefoon;
- e-mailadres;
- vestigingsplaats;
- de extra publiceerbare opmerkingen van het Request.

De service leest hiervoor uitsluitend de minimaal noodzakelijke actuele organisatie- en eigenaarvelden. De inhoud, historie, bronnen en PDF van het Adviesdossier blijven afgeschermd. De opdrachtgever ziet alleen geaggregeerde aantallen en `x / 3` bezette offerteplaatsen, zonder providernamen.

## Bewust buiten scope

M7D.3 bouwt geen offerteformulier, prijs, bijlage, chat, berichten, contractvorming, credits, reservering, betaling, ranking, top drie, uitnodiging, automatische selectie, vrijgave- of vervalworkflow. Het interne creditbeleid staat expliciet uitgeschakeld op nul credits.

## Acceptatie

Automatische tests controleren slot 1–3, de transactionele vierde weigering, vier parallelle claims, dubbele claims, actuele selecteerbaarheid, OWNER/ADMIN/MEMBER, actieve interesse, gesloten aanvragen, tenantisolatie, voorwaardelijke contactvrijgave, opdrachtgeverstellers, immutable events en de afwezigheid van offertes, credits en berichten.

Handmatig blijven desktop-, mobiel-, toetsenbord- en 200%-zoomcontrole van claimknop, volmelding, successtatus, contactkaart en opdrachtgeversteller open.
