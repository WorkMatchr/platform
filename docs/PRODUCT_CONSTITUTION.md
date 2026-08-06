# WorkMatchr Product Constitution

## Status en werking

- **Status:** bindend product- en UX-kader
- **Eigenaar:** Product Owner
- **Toepassing:** alle nieuwe functies en iedere wijziging aan UX, copy, formulieren, fouten, statussen, navigatie, publieke content en gebruikersflows
- **Afwijking:** uitsluitend via de procedure in [Afwijkingen](#24-afwijkingen)

Deze constitutie beschrijft hoe WorkMatchr zich als product gedraagt en aanvoelt. Zij werkt de richting uit van [De Grondwet van WorkMatchr](DE_GRONDWET_VAN_WORKMATCHR.md) en de [Founding Principles](FOUNDING_PRINCIPLES.md). De Grondwet blijft het hoogste richtinggevende document. ADR's bepalen architectuur; deze constitutie is binnen die grenzen leidend voor product- en UX-keuzes. [Voice & Tone](VOICE_AND_TONE.md), ontwerpdocumenten en modules mogen details toevoegen, maar spreken deze constitutie niet tegen.

Normatieve termen:

- **MUST:** bindend. Afwijking vereist expliciete Product Owner-goedkeuring en documentatie.
- **SHOULD:** sterke voorkeur. Afwijking vereist een aantoonbaar betere gebruikers- of domeinoplossing.
- **MAY:** toegestane optie, afhankelijk van context.

## Inhoud

1. [Productbelofte en kwaliteitsvraag](#1-productbelofte-en-kwaliteitsvraag)
2. [Productidentiteit](#2-productidentiteit)
3. [Terminologie](#3-terminologie)
4. [Statuspresentatie](#4-statuspresentatie)
5. [Schrijfstijl](#5-schrijfstijl)
6. [Formulieren en vraagverheldering](#6-formulieren-en-vraagverheldering)
7. [Verwachtingsmanagement](#7-verwachtingsmanagement)
8. [Navigatie en acties](#8-navigatie-en-acties)
9. [Concepten en interne statussen](#9-concepten-en-interne-statussen)
10. [Foutmeldingen](#10-foutmeldingen)
11. [Privacy en dataminimalisatie](#11-privacy-en-dataminimalisatie)
12. [Vakinhoudelijke geloofwaardigheid](#12-vakinhoudelijke-geloofwaardigheid)
13. [Rollen en autorisatie](#13-rollen-en-autorisatie)
14. [Publicatie en historie](#14-publicatie-en-historie)
15. [Verwijderen en beëindigen](#15-verwijderen-en-beëindigen)
16. [Toegankelijkheid](#16-toegankelijkheid)
17. [Visuele consistentie](#17-visuele-consistentie)
18. [Metadata en vindbaarheid](#18-metadata-en-vindbaarheid)
19. [Juridische en veiligheidsclaims](#19-juridische-en-veiligheidsclaims)
20. [Productreview](#20-productreview)
21. [Product Definition of Done](#21-product-definition-of-done)
22. [Toekomstige productlinter](#22-toekomstige-productlinter)
23. [Bronnen en documenthiërarchie](#23-bronnen-en-documenthiërarchie)
24. [Afwijkingen](#24-afwijkingen)
25. [Bekende conflicten en open besluiten](#25-bekende-conflicten-en-open-besluiten)

## 1. Productbelofte en kwaliteitsvraag

> **WorkMatchr helpt organisaties hun hulpvraag om te zetten in een duidelijke opdracht en brengt hen op een betrouwbare, begrijpelijke en zorgvuldige manier in contact met passende professionals.**

Bij iedere functie geldt de kwaliteitsvraag:

> **Verhoogt dit het vertrouwen, de duidelijkheid en de klanttevredenheid, zonder onnodige complexiteit of verwachtingen te creëren?**

- **MUST — PC-001:** iedere functie helpt de gebruiker aantoonbaar verder en legt interne systeemcomplexiteit niet bij de gebruiker neer.
- **MUST — PC-002:** een technisch correcte functie is niet voldoende wanneer zij onnatuurlijk aanvoelt, verschillende termen gebruikt, verkeerde verwachtingen wekt of onnodige informatie vraagt.
- **SHOULD — PC-003:** kies de eenvoudigste flow die veilig, begrijpelijk en volledig is.

## 2. Productidentiteit

### 2.1 WorkMatchr begeleidt

- **MUST — PC-004:** de gebruiker beschrijft zijn situatie; WorkMatchr interpreteert, stelt waar nodig één gerichte verduidelijkingsvraag, toont alleen relevante vervolgvragen en laat een voorstel corrigeren.
- **MUST — PC-005:** laat de gebruiker niet onnodig classificeren, analyseren, vaktermen kiezen of uit een volledige taxonomie selecteren.
- **SHOULD — PC-006:** leg in gewone taal uit waarom een verduidelijking of categorievoorstel nodig is.

**Niet:** “Kies uit alle categorieën.”  
**Wel:** “We hebben nog één korte vraag om uw hulpvraag beter te begrijpen.”

### 2.2 WorkMatchr vervangt de professional niet

- **MUST — PC-007:** WorkMatchr mag structureren, classificeren, matching ondersteunen en informatie voor een offerte verzamelen.
- **MUST — PC-008:** WorkMatchr bepaalt niet zelfstandig de definitieve aanpak, uitvoeringsduur, prijs, wettelijke conclusie, specialistische maatregelen, haalbaarheid of planning.

### 2.3 Vertrouwen vóór conversie

- **MUST — PC-009:** verhoog conversie nooit met overdreven urgentie, gesuggereerde beschikbaarheid, gegarandeerde matching, onrealistische snelheid of ongefundeerde juridische of veiligheidszekerheid.
- **SHOULD — PC-010:** benoem grenzen en onzekerheden op het moment dat zij relevant zijn, zonder de gebruiker met technische disclaimers te belasten.

## 3. Terminologie

### 3.1 Hoofdterm

- **MUST — PC-011:** het commerciële klantobject heet **Opdracht**.
- **MUST — PC-012:** gebruik `intake`, `conceptopdracht`, `request` en `aanvraag` niet als klantnaam wanneer daarmee hetzelfde object wordt bedoeld.
- **MAY — PC-013:** gebruik *hulpvraag* als natuurlijk woord, bijvoorbeeld: “Beschrijf uw hulpvraag in uw eigen woorden.”
- **MAY — PC-014:** behoud technische identifiers, routes en datamodellen wanneer hernoemen geen klantwaarde heeft.

### 3.2 Personen en organisaties

| Betekenis | Standaardterm |
| --- | --- |
| Persoon met vakkennis | Professional |
| Organisatie die uitvoert | Dienstverlener |
| Organisatie die een opdracht plaatst | Opdrachtgever, uitsluitend binnen opdrachtcontext |
| Algemene bedrijfscontext | Organisatie |
| Wettelijk benoemde vakrol | Deskundige |
| Organisatierol `MEMBER` | Medewerker |
| Platformteam | Platformbeheer |

- **MUST — PC-015:** gebruik deze actortermen consistent in navigatie, copy, meldingen en statussen.
- **SHOULD — PC-016:** gebruik *specialist*, *aanbieder*, *provider* of *lid* alleen wanneer de betekenis aantoonbaar afwijkt van de standaardterm.

## 4. Statuspresentatie

- **MUST — PC-017:** toon nooit ruwe enums, Engelse statuscodes of een `.toLowerCase()`-resultaat als statuslabel.
- **MUST — PC-018:** gebruik centrale, exhaustieve presentatiemappings en toon een onbekende waarde als **Status niet beschikbaar**.
- **MUST — PC-019:** maak bij beëindiging onderscheid tussen **Ingetrokken door opdrachtgever**, **Geannuleerd door platform of systeem** en, wanneer de actor onbekend is, het neutrale **Beëindigd**.

| Interne status | Klanttekst |
| --- | --- |
| `DRAFT`, `IN_PROGRESS` | Nog invullen |
| `READY_FOR_REVIEW` | Klaar om te publiceren |
| `SUBMITTED` | Publicatie wordt verwerkt |
| `OPEN` | Gepubliceerd |
| `MATCHING` | Professionals worden geselecteerd |
| `AWAITING_RESPONSES` | Wacht op reacties |
| `IN_SELECTION` | Offertes vergelijken |
| `AWARDED` | Gegund |
| `CLOSED` | Afgerond |
| `ARCHIVED` | Gearchiveerd |
| onbekend | Status niet beschikbaar |

## 5. Schrijfstijl

- **MUST — PC-020:** spreek de gebruiker aan met **u** en **uw**; gebruik een hoofdletter alleen aan het begin van een zin of bewust in een titel zoals **Uw opdrachten**.
- **MUST — PC-021:** gebruik geen ontwikkelaarstaal in primaire interfaces, waaronder `candidate`, `immutable`, `checksum`, `metadata`, `readiness`, `fail-closed`, `enum`, `snapshot`, `transactioneel` en `Decision Report`.
- **MUST — PC-022:** toon noodzakelijke technische informatie alleen aan bevoegde auditrollen en herkenbaar als secundair technisch detail.
- **SHOULD — PC-023:** schrijf kort, actief en concreet, met één boodschap per zin en zonder ambtelijke taal.
- **SHOULD — PC-024:** labels beschrijven de handeling of informatie, niet het interne proces.

**Niet:** “Candidate metadata is immutable.”  
**Wel:** “De bestandsgegevens van deze ingediende versie staan vast.”

## 6. Formulieren en vraagverheldering

- **MUST — PC-025:** vraag uitsluitend informatie die op dat moment nodig is voor classificatie, een eerste offerte, autorisatie, veiligheid of wettelijke verwerking.
- **MUST — PC-026:** stel geen vraag wanneer het antwoord al betrouwbaar blijkt uit de oorspronkelijke omschrijving, een eerder antwoord, het organisatieprofiel, de bevestigde classificatie of een conditionele keuze.
- **MUST — PC-027:** vraag de opdrachtgever niet om een norm, professionele risicocategorie, inzetraming, juridische conclusie of vereiste deskundige te bepalen.
- **MUST — PC-028:** clientweergave, servervalidatie, voortgang en volledigheid gebruiken dezelfde zichtbaarheid en dezelfde bevestigde categorie.
- **MUST — PC-029:** een verborgen veld is niet verplicht, telt niet mee en kan de flow niet blokkeren.
- **SHOULD — PC-030:** toon één vraag of een kleine logisch samenhangende groep per stap.

Vraag niet vroegtijdig om exacte adressen, medische gegevens, namen van kwetsbare medewerkers, professionele ureninschattingen of uitvoeringsdetails die pas na contact met een professional nodig zijn.

## 7. Verwachtingsmanagement

- **MUST — PC-031:** presenteer een gewenste datum als voorkeur of externe deadline; beloof geen planning die de professional bepaalt.
- **MUST — PC-032:** vraag de opdrachtgever niet zelf de omvang, duur of benodigde inzet te ramen wanneer de professional dit moet bepalen.
- **MUST — PC-033:** maak onderscheid tussen platformcredits, platformkosten, indicaties, offerteprijzen en definitieve prijzen.
- **MUST — PC-034:** claim nooit gegarandeerd drie professionals wanneer beschikbaarheid dit niet waarborgt.

Feitelijke matchingcopy:

> WorkMatchr selecteert maximaal drie passende professionals, wanneer voldoende geschikte professionals beschikbaar zijn.

Planningcopy:

> De definitieve planning en uitvoerbaarheid spreekt u later met de professional af.

## 8. Navigatie en acties

- **MUST — PC-035:** een CTA beschrijft de werkelijke eerstvolgende handeling.
- **MUST — PC-036:** laat een gebruiker één betekenisvolle actie één keer bevestigen; extra bevestiging is alleen gerechtvaardigd bij verwijderen, publiceren, intrekken, financiële verplichtingen, onomkeerbaarheid of hoog risico.
- **SHOULD — PC-037:** toon per scherm één duidelijke primaire actie; maak secundaire en destructieve acties visueel passend ondergeschikt.

Voorkeurstermen zijn **Start uw opdracht**, **Opdracht hervatten**, **Opdracht controleren**, **Opdracht publiceren**, **Opdracht bekijken** en **Opdracht verwijderen**. Gebruik niet “Plaats direct een opdracht” wanneer eerst registratie en invullen volgen.

## 9. Concepten en interne statussen

- **MUST — PC-038:** technische conceptopslag mag bestaan, maar vormt geen aparte klantfase wanneer de gecontroleerde opdracht direct kan worden gepubliceerd.
- **MUST — PC-039:** beschrijf automatisch bewaren als “Uw antwoorden zijn opgeslagen”, niet als lifecycle- of databasestatus.

Voorkeursflow:

```text
Opdracht invullen
→ Opdracht controleren
→ Opdracht publiceren
→ Gepubliceerde opdracht
```

## 10. Foutmeldingen

- **MUST — PC-040:** iedere blokkade vertelt wat niet is gelukt, wat de oorzaak of ontbrekende informatie is, wat het gevolg is en wat de gebruiker kan doen.
- **MUST — PC-041:** toon een bekende concrete oorzaak in gewone taal met een directe herstelactie of bewerklink.
- **MUST — PC-042:** toon bij een interne fout geen codes of details, maar meld dat gegevens zijn bewaard en hoe de gebruiker verder kan.
- **MUST — PC-043:** behoud na validatiefouten alle invoer en keuzes, focus het eerste foutveld en koppel de fout zichtbaar en programmatisch aan het veld.

Veilige interne foutcopy:

> Deze actie is door een technische fout niet gelukt. Uw gegevens zijn bewaard. Probeer het opnieuw of neem contact op met WorkMatchr.

## 11. Privacy en dataminimalisatie

- **MUST — PC-044:** verzamel niet meer gegevens dan nodig voor het actuele, expliciete doel.
- **MUST — PC-045:** vraag een exact adres alleen wanneer dit nodig is voor matching, uitvoering, wettelijke verwerking of beveiliging; anders volstaan plaats en regio.
- **MUST — PC-046:** claim uitsluitend identiteit, diploma, certificaat of vakbekwaamheid als geverifieerd wanneer WorkMatchr dit daadwerkelijk heeft gecontroleerd.
- **SHOULD — PC-047:** toon bij relevante vrije tekstvelden de hint: “Noem geen namen, medische gegevens of andere gevoelige persoonsgegevens.”

## 12. Vakinhoudelijke geloofwaardigheid

- **MUST — PC-048:** iedere classificatie is inhoudelijk verdedigbaar en herleidbaar naar bevestigde informatie of een gecontroleerde regel.
- **MUST — PC-049:** gebruik RI&E niet als universele restcategorie; kies een specifiekere passende categorie of benoem onzekerheid.
- **MUST — PC-050:** presenteer hitte en brandwonden niet automatisch als BHV en voorkom vergelijkbare oppervlakkige trefwoordclassificaties.
- **SHOULD — PC-051:** leg begrijpelijk uit waarom een categorie wordt voorgesteld en laat de gebruiker bij lage of middelmatige zekerheid corrigeren.

Voorbeelden: schoonmaakmiddelen kunnen onder gevaarlijke stoffen vallen; fysieke belasting onder ergonomie; messen en snijmachines onder machineveiligheid of arbeidsmiddelen; brandveiligheid en ontruiming onder BHV.

## 13. Rollen en autorisatie

- **MUST — PC-052:** toon alleen acties die relevant zijn voor de rol en context van de gebruiker; autorisatie blijft daarnaast server-side verplicht.
- **MUST — PC-053:** leg een bevoegdheidsblokkade uit zonder interne rolcode en bied waar mogelijk een passende vervolgstap.
- **MUST — PC-054:** platformbeheer toont geen publieke, opdrachtgever- of verkoop-CTA's die niet bij de beheercontext horen.
- **MUST — PC-055:** een testmodus is development-only, expliciet zichtbaar, auditbaar en veilig terug te draaien.

## 14. Publicatie en historie

- **MUST — PC-056:** publiceren is één expliciete handeling nadat de gebruiker de opdracht heeft gecontroleerd.
- **MUST — PC-057:** gepubliceerde inhoud wordt vastgezet in een revisie of snapshot; latere wijzigingen aan organisatie, locaties, taxonomie, vragen of profielen wijzigen de historie niet.
- **MUST — PC-058:** herhaald verzenden of dubbelklikken veroorzaakt geen dubbele opdrachten, snapshots, financiële mutaties of notificaties.

## 15. Verwijderen en beëindigen

- **MAY — PC-059:** een nooit-gepubliceerde opdracht mag via gecontroleerde soft-delete of archivering worden verwijderd.
- **MUST — PC-060:** een gepubliceerde opdracht wordt niet via dezelfde verwijderactie gewist, maar ingetrokken of geannuleerd met audittrail.
- **MUST — PC-061:** een destructieve actie toont gevolgen, vraagt expliciete bevestiging, gebruikt een consistente term en wordt server-side op rol, status en herhaling gecontroleerd.

## 16. Toegankelijkheid

- **MUST — PC-062:** nieuwe en gewijzigde interfaces ondersteunen toetsenbord, zichtbare focus, programmatische labels, foutassociatie, logische kopniveaus en voldoende tapdoelen.
- **MUST — PC-063:** de interface blijft bruikbaar rond 390 px en bij 200% zoom, zonder horizontale pagina-overflow.
- **MUST — PC-064:** kleur is nooit de enige informatiedrager.
- **MUST — PC-065:** merklinks hebben een begrijpelijke toegankelijke naam, bijvoorbeeld “WorkMatchr, naar de homepage”.

## 17. Visuele consistentie

- **SHOULD — PC-066:** gebruik bestaande tokens, formulieren, buttonvarianten, kaarten, statusbadges, waarschuwingen, spacing en typografie.
- **SHOULD — PC-067:** maak geen nieuwe stijlvariant wanneer een bestaande variant dezelfde betekenis heeft en laat niet-interactieve elementen niet als knop ogen.

## 18. Metadata en vindbaarheid

- **MUST — PC-068:** iedere relevante route heeft een herkenbare titel en passende beschrijving zonder interne termen en met de merknaam **WorkMatchr**.

Voorbeelden: **Uw opdrachten | WorkMatchr**, **Inloggen | WorkMatchr**, **Opdracht starten | WorkMatchr** en **Opdracht controleren | WorkMatchr**.

## 19. Juridische en veiligheidsclaims

- **MUST — PC-069:** publieke inhoud noemt geschikte bronnen en, waar relevant, een controledatum.
- **MUST — PC-070:** maak onderscheid tussen algemene informatie en professioneel advies en presenteer geen persoonlijke juridische of medische zekerheid.
- **MUST — PC-071:** presenteer onvoltooide juridische pagina's niet als definitief en vermijd absolute garanties.

## 20. Productreview

Iedere relevante werkset wordt vóór acceptatie gecontroleerd op:

| Thema | Vragen |
| --- | --- |
| Consistentie | Gebruiken termen, statussen, CTA's en actoren overal dezelfde betekenis? |
| Verwachtingen | Ontstaat geen impliciete belofte over planning, omvang, prijs of matching? |
| Cognitieve belasting | Kan WorkMatchr dit afleiden, is de vraag dubbel en is de informatie nu nodig? |
| Frictie | Kan een stap, knop, bevestiging of vroeg veld weg? |
| Vertrouwen | Begrijpt de gebruiker wat gebeurt, waarom en wat de volgende stap is? |
| Privacy | Worden alleen noodzakelijke en passend zichtbare gegevens gevraagd? |
| Vakinhoud | Kloppen categorie, risico-indeling en veiligheidsuitleg? |
| Toegankelijkheid | Werken mobiel, toetsenbord, focus, labels, fouten en 200% zoom? |

- **MUST — PC-072:** het eindrapport van een relevante werkset bevat de uitkomst van deze productreview of benoemt expliciet welke handmatige controles openstaan.

## 21. Product Definition of Done

- **MUST — PC-073:** een functie is niet productmatig gereed op basis van alleen werkende code, groene tests en een geslaagde build.
- **MUST — PC-074:** vóór productacceptatie is de kernflow handmatig doorlopen en zijn copy, terminologie, statussen, herstelgedrag, verwachtingen en dataminimalisatie beoordeeld.
- **MUST — PC-075:** autorisatie en tenantisolatie zijn getest, mobiel en toetsenbord zijn gecontroleerd en historische data blijft compatibel.
- **MUST — PC-076:** een functie die een bindende regel van deze constitutie schendt, is niet gereed zonder goedgekeurde afwijking.

Deze productcriteria gelden naast de technische [Definition of Done](definition-of-done.md).

## 22. Toekomstige productlinter

Een toekomstige, rapporterende productlinter kan zichtbare klantcopy controleren op:

- interne termen zoals `intake`, `conceptopdracht`, `Decision Report`, `candidate`, `candidateVersion`, `checksum`, `immutable`, `readiness`, `productie-fail-closed`, `metadata`, `matching`, `request` en `provider`;
- `.toLowerCase()` als statuspresentatie;
- `U` en `Uw` midden in vermoedelijke lopende zinnen;
- Engelse of ruwe statuswaarden;
- ontbrekende centrale mappings;
- generieke foutmeldingen zonder herstelactie;
- verouderde of feitelijk onjuiste CTA's.

- **SHOULD — PC-077:** versie 1 rapporteert alleen en wijzigt niets automatisch.
- **MUST — PC-078:** de linter onderscheidt klantcopy, technische code, tests, documentatie en geautoriseerde auditdetails.
- **MUST — PC-079:** uitzonderingen gebruiken een expliciete, beargumenteerde allowlist met eigenaar en reden.
- **SHOULD — PC-080:** voeg de linter pas aan CI toe nadat de foutmarge op de actuele repository is beoordeeld.

Aanbevolen ontwerp:

1. scan alleen bekende UI- en contentbestanden;
2. rapporteer bestand, regel, regel-ID en suggestie;
3. gebruik regels per categorie: terminologie, status, aanspreekvorm, foutcopy en CTA;
4. laat configuratie onderscheid maken tussen gewone gebruikerscopy en technische auditcopy;
5. publiceer eerst een nulmeting en bepaal daarna welke regels CI mogen blokkeren.

Deze constitutie implementeert de linter niet.

## 23. Bronnen en documenthiërarchie

De Product Constitution is gebaseerd op:

- [De Grondwet van WorkMatchr](DE_GRONDWET_VAN_WORKMATCHR.md);
- [Founding Principles](FOUNDING_PRINCIPLES.md);
- [Voice & Tone](VOICE_AND_TONE.md);
- [UX-principes](UX_PRINCIPLES.md);
- [Definition of Done](definition-of-done.md);
- [ADR-021](adr/ADR-021-van-dienstgestuurd-naar-hulpvraaggestuurd-platform.md);
- de actuele opdracht-, guidance-, provider- en marketplaceontwerpen;
- centrale presentatielabels en regressietests;
- de Product & Quality Audit.

Bij conflict geldt:

1. De Grondwet en expliciete Product Owner-besluiten;
2. de Founding Principles;
3. deze Product Constitution voor product- en UX-gedrag, en geaccepteerde ADR's voor architectuur en governance binnen die productgrenzen;
4. Voice & Tone, UX-richtlijnen, modules en componentdocumentatie voor uitwerking.

De Product Constitution en ADR's hebben ieder een eigen beslisdomein. Geen van beide mag een conflict buiten dat domein stilzwijgend oplossen.

Een conflict wordt niet stil opgelost. Het wordt geregistreerd en aan de Product Owner voorgelegd.

## 24. Afwijkingen

- **MUST — PC-081:** een bewuste afwijking vermeldt de geschonden regel, scope, reden, verwacht klantvoordeel, risico's, eigenaar en geldigheidsduur.
- **MUST — PC-082:** vraag vóór implementatie expliciete Product Owner-goedkeuring en leg waar nodig een ADR of besluitenregisteritem vast.
- **MUST — PC-083:** Codex en menselijke ontwikkelaars negeren een MUST-regel nooit stilzwijgend.
- **SHOULD — PC-084:** tijdelijke afwijkingen hebben een concreet herstelpad en einddatum.

## 25. Contextbehoud vanuit kennis

- **MUST — PC-085:** wanneer een gebruiker vanuit een kennispagina een vervolgstap kiest, behoudt WorkMatchr de relevante kenniscontext. De Advieswijzer, opdrachtflow en toekomstige matching gebruiken deze context uitsluitend als ondersteunend uitgangspunt, zonder een categorie of uitkomst onherroepelijk te forceren; de gebruiker kan de richting altijd corrigeren.

De technische uitwerking, prioriteit en dekkingsmatrix staan in [Contextuele kennisroutes](knowledge-context-routing.md).

## 26. Bekende conflicten en open besluiten

1. **Aanvraag versus Opdracht:** Module 7D introduceert `Request` en gebruikt op enkele klantpagina's **Aanvraag** als afzonderlijke publieke term. Deze constitutie schrijft **Opdracht** voor wanneer hetzelfde commerciële object wordt bedoeld. Er is een Product Owner-besluit nodig over de vraag of de M7D-aanvraag een werkelijk afzonderlijk klantconcept is of een technische/publicatievorm van de opdracht. De bestaande Request/Assignment-architectuur wordt door dit document niet gemigreerd.
2. **Beëindigingsactor:** niet alle bestaande records leggen vast of de opdrachtgever, het platform of een systeemproces beëindigde. Tot die provenance beschikbaar is, blijft **Beëindigd** de veilige neutrale klantterm.
3. **Productlinter:** regels, scopes, allowlistformaat en CI-blokkeringsniveau zijn nog niet vastgesteld. Eerst volgt een rapporterende nulmeting.
4. **Handmatige productacceptatie:** automatisering kan mobiel, toetsenbord, begrijpelijkheid en verwachting niet volledig bewijzen. Product Owner-acceptatie blijft onderdeel van gereedheid.
