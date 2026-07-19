# Guided Intake Engine v1 — Module P1.6

**Status:** technisch opgeleverd; product-owneracceptatie open.

## Doel

De Advieswijzer helpt een publieke bezoeker een arbo- of veiligheidsvraag te verduidelijken zonder vooraf een dienst of specialist te hoeven kiezen. Versie 1 ondersteunt één volledig werkende startflow: **Ik heb personeel in dienst**.

De engine geeft eerst inhoudelijk advies en toont pas daarna een mogelijke verwijzing naar dienstverlening. Het resultaat is algemene vraagverheldering en geen individueel juridisch of medisch oordeel.

## Architectuur

De implementatie scheidt zes verantwoordelijkheden:

1. **Vragen** — vaste, getypeerde vraagdefinities en antwoordopties;
2. **Antwoorden** — tijdelijke clientstate zonder opslag of sessiebehoud;
3. **Feiten** — herleidbare afleiding met bronvraag;
4. **Flow** — volgorde, voortgang en validatie;
5. **Beslisregels** — centraal geprioriteerde, deterministische regels;
6. **Aanbevelingen** — advies, onderbouwing, acties, kennislinks en pas daarna dienstverleningslinks.

Inhoudelijke beslisregels staan niet verspreid in React-componenten. De clientcomponent bevat uitsluitend interactie-, presentatie- en focuslogica.

## Flow en beslismomenten

De eerste flow bevat exact vijf beslismomenten:

1. Welke situatie wilt u verhelderen? — `HAS_EMPLOYEES`;
2. Hoeveel mensen werken er gewoonlijk voor uw organisatie? — globale omvang;
3. Wat is de huidige status van uw RI&E? — actueel, mogelijk verouderd, ontbreekt of onbekend;
4. Waar wilt u nu vooral duidelijkheid over? — beslisdoel;
5. Wanneer wilt u dit geregeld hebben? — oriëntatie, zo snel mogelijk of voor een specifieke datum.

Bij **Voor een specifieke datum** verschijnt één conditioneel datumveld. Dit levert een precisering van het termijnantwoord en telt niet als zesde beslismoment.

Iedere vraag heeft één vastgelegd beslisdoel en levert minimaal één herleidbaar feit op. Titels, fact keys en vraag-ID’s zijn uniek om dubbele vragen te voorkomen.

## Adviesregels

De regels worden in vaste volgorde geëvalueerd:

1. geen RI&E — begin met een passende RI&E en plan van aanpak;
2. status onbekend — controleer eerst wat aanwezig en actueel is;
3. mogelijk verouderd of expliciet actualisatiedoel — toets de RI&E aan de huidige werksituatie;
4. actuele RI&E — gebruik de RI&E als basis voor de gekozen vervolgstap.

Organisatieomvang en gewenste termijn voegen context toe, maar leiden niet tot een definitieve juridische conclusie. Het resultaat toont achtereenvolgens:

1. eerste advies;
2. redenen;
3. concrete eerste acties;
4. afgeleide feiten;
5. relevante kennis en wettelijke context;
6. mogelijke dienstverlening.

## Niet-beschikbare startsituaties

Andere homepage-situaties worden niet als werkende flow gepresenteerd. De Advieswijzer noemt ze uitsluitend als **volgt later**, zonder link, knop of verborgen resultaatpad.

## Toegankelijkheid en privacy

- één vraag per scherm en een zichtbare voortgang van maximaal vijf;
- native radioknoppen en datuminput;
- foutmelding bij het betreffende beslismoment;
- focus op de vraagkop na navigatie en op het eerste foutveld bij validatiefouten;
- teruggaan behoudt de lokale invoer;
- geen account, cookie, local storage, database of sessieopslag;
- opnieuw beginnen wist alle tijdelijke antwoorden.

## Scopegrens

P1.6 bevat geen AI, Prisma, database, matching, offerteflow, accountopslag, sessiebehoud of server-side mutatie. De bestaande beveiligde organisatie-intake onder `/hulpvragen` blijft een afzonderlijke applicatieflow.

P1.7 is niet gestart en kan later de relationele interne link- en SEO-laag uitwerken.
