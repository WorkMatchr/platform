# Module 7D.2 — Interesse tonen

Status: technisch opgeleverd; handmatige product-owneracceptatie open

## Doel

M7D.2 maakt gepubliceerde, geanonimiseerde aanvragen zichtbaar voor alle professionele organisaties die op het publicatiemoment aantoonbaar passen. Deze organisaties kunnen vrijblijvend interesse registreren, intrekken en opnieuw activeren. Interesse is geen uitnodiging, offerteplaats, reservering of selectie.

## Reproduceerbare doelgroep

Bij publicatie leest WorkMatchr uitsluitend actuele, niet-geïnvalideerde Trusted Provider Projections. De providerorganisatie moet actief zijn en het providerprofiel moet `QUALIFIED`, `READY`, platformgekwalificeerd en `SELECTABLE` zijn zonder open blokkade.

De bestaande deterministische kandidaatregels toetsen capability, werkgebied en sectorfit. Primaire, aanvullende en mogelijke capabilitycodes worden afzonderlijk beoordeeld. Iedere passende organisatie wordt vastgelegd; er is geen scorepresentatie, ranglijst, top drie of kunstmatige aanvulling.

`RequestEligibleProvider` bewaart:

- aanvraag, providerorganisatie en providerprofiel;
- de exacte Trusted Provider Projection;
- projectiechecksum, bron- en schemaversie;
- regelsversie;
- deskundigheidslaag en capabilitycode waarop de match ontstond;
- vastleggingstijd.

Het record is immutable. Latere profiel-, kwalificatie- of projectiewijzigingen wijzigen een reeds gepubliceerde doelgroep niet stilzwijgend. Historische aanvragen zonder betrouwbare capabilitycodes blijven fail-closed.

## Interesseflow

Iedere actieve gebruiker van een eligible `PROVIDER`- of `BOTH`-organisatie mag de geanonimiseerde aanvraag lezen. Alleen organisatie-`OWNER` en organisatie-`ADMIN` mogen interesse beheren.

De acties zijn:

1. eerste registratie: `INTERESTED` plus `INTEREST_REGISTERED`;
2. intrekken: `WITHDRAWN` plus `INTEREST_WITHDRAWN`;
3. heractiveren: `INTERESTED` plus `INTEREST_REACTIVATED`.

Er bestaat maximaal één `RequestInterest` per aanvraag en organisatie. Een transactionele advisory lock, unieke constraint en samengestelde foreign key maken registratie idempotent, concurrencyveilig en uitsluitend mogelijk binnen de vastgelegde doelgroep. Events zijn append-only.

## Privacygrens

Providerpagina’s lezen uitsluitend de openbare Request-snapshot:

- nummer, titel en openbare samenvatting;
- regio en sector;
- planning;
- primaire, aanvullende en mogelijke deskundigheid;
- gematchte deskundigheid;
- publicatiedatum en eigen interessestatus.

Niet beschikbaar zijn opdrachtgevernaam, bedrijfsnaam, exact adres, contactgegevens, interne opmerkingen, Adviesdossier, dossierbron of andere niet-gepubliceerde informatie. Een niet-eligible organisatie ontvangt bij directe toegang een generieke not-founduitkomst.

Opdrachtgevers zien alleen:

- aantal geschikte organisaties;
- aantal actieve interesses;
- offerteplaatsen `0 / 3`;
- ontvangen offertes `0`.

Namen en profielen van geïnteresseerde organisaties blijven verborgen.

## Bewust buiten scope

M7D.2 activeert geen credits, prijzen, offerteplaatsen, offertes, bestanden, contactdeling, berichten, notificaties, e-mail, gunning, reviews, betaling, provider-ranking of automatische selectie van drie organisaties.

## Acceptatie

Automatische tests gebruiken de volledig fictieve M7X.1-dataset en controleren doelgroepselectie, immutable snapshots, primaire en aanvullende deskundigheid, niet-selecteerbare providers, privacy, OWNER/ADMIN/MEMBER, directe toegang, tenantisolatie, parallelle registratie, intrekken, heractiveren, annulering, tellers en append-only events.

Handmatig blijven desktop-, mobiel-, toetsenbord- en 200%-zoomcontrole van overzicht, detail, statusmeldingen en opdrachtgeverstellers open.
