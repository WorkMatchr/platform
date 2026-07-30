# Module 7D.1 — Aanvraag publiceren

Status: technisch opgeleverd; handmatige product-owneracceptatie open

## Doel en domeingrens

M7D.1 zet een afgerond privé WorkMatchr Adviesdossier om in één afzonderlijke, beperkte aanvraag. Het Adviesdossier blijft de reproduceerbare bron van de hulpvraag en het advies. `Request` bevat uitsluitend de informatie die voor publicatie nodig is.

De publicatiesnapshot bevat:

- een uniek nummer in het formaat `WM-R-YYYY-NNNNNN`;
- tenant, organisatie en bron-Adviesdossier;
- status, titel en aanpasbare openbare samenvatting;
- regio, sector en gewenste start;
- optionele opmerkingen;
- primaire, aanvullende en mogelijke deskundigheid uit de actuele immutable dossierversie;
- aanmaak- en publicatietijd.

Contactpersoon, e-mailadres en telefoon worden op de controlepagina vanuit de actuele beveiligde organisatiecontext getoond, maar niet in de publicatiesnapshot gekopieerd. Het volledige Adviesdossier wordt niet gedeeld.

## Flow

Een dossier met status `COMPLETED` toont de actie **Aanvraag voorbereiden**. `/aanvragen/nieuw?dossierId=...` controleert server-side dat de actuele gebruiker exact de dossiereigenaar is en nog steeds één actieve membership bij dezelfde actieve `CLIENT`- of `BOTH`-organisatie heeft.

De eigenaar controleert:

1. aanbevolen deskundigheid;
2. bedrijfs- en contactgegevens;
3. de bevestigde situatiesamenvatting, die bewerkbaar is voor publicatie;
4. planning: zo spoedig mogelijk, binnen één maand of in overleg;
5. optionele extra opmerkingen.

Publicatie maakt het request direct met status `PUBLISHED` en vult `publishedAt`. Daarna toont de succesroute nummer, status en publicatiedatum. `/aanvragen` toont uitsluitend aanvragen van de actuele gebruiker binnen diens tenant.

## Integriteit en historie

De publicatieservice gebruikt één serializable transactie. Het Adviesdossier wordt vergrendeld, autorisatie wordt binnen de transactie opnieuw vastgesteld en alle relationele reads op de transactionele client verlopen sequentieel. Een adviserende jaarlock beschermt de nummeruitgifte. De unieke dossierrelatie maakt herhaalde en parallelle publicatie idempotent.

Een database-trigger beschermt de inhoud van een gepubliceerd request tegen wijziging. `RequestEvent` registreert de publicatie append-only. De statussen `DRAFT`, `READY_TO_PUBLISH`, `PUBLISHED` en `CANCELLED` zijn vastgelegd, maar M7D.1 biedt alleen de directe publicatieactie.

## Bewust buiten scope

M7D.1 bouwt geen:

- matching of providerselectie;
- zichtbaarheid of uitnodiging voor professionals;
- reacties of offertes;
- credits, reserveringen of betalingen;
- notificaties of e-mail;
- gunning of opdrachtvorming.

## Acceptatie

Automatische tests dekken validatie, statusmatrix, routebeveiliging, eigenaarautorisatie, tenantisolatie, nummeruniciteit, parallelle idempotentie, eigen lijsten, immutable publicatie-inhoud en append-only audit. Handmatig blijven desktop-, mobiel- en toetsenbordcontrole van formulier, succesroute en overzicht open.
