# Public Intake Guidance-handoff

## Status

- **Grondslag:** [ADR-021 — Van dienstgestuurd naar hulpvraaggestuurd platform](adr/ADR-021-van-dienstgestuurd-naar-hulpvraaggestuurd-platform.md)
- **Fase:** implementatiefase F en presentatie-uitbreiding G
- **Persistence:** ongewijzigd
- **Nieuwe opdracht, account of matching:** niet aanwezig

## Doel

De bestaande Public Intake gebruikt voor ondersteunde situaties voortaan deze afgeleide keten:

```text
PublicIntakeDraftView
→ GuidanceContract
→ ClarificationResult
→ indien compleet: GuidanceOutcome
```

De handoff staat in:

```text
src/lib/public-intake/public-intake-guidance-handoff.ts
```

## Aansluitpunt

De handoff wordt uitgevoerd in het bestaande `loadPublicView`. Daardoor wordt dezelfde afgeleide draftcontext opgebouwd na:

- het aanmaken van een draft;
- het opslaan of herzien van een antwoord;
- het hervatten van een conceptsessie;
- het laden van een bestaande conceptsessie;
- een bestaande expliciete faseovergang.

De handoff schrijft zelf niets. Er zijn geen nieuwe tabellen, kolommen, migraties, events, cookies of sessies. De uitkomst wordt als immutable read-model aan de bestaande `PublicIntakeDraftView` toegevoegd en bij iedere load reproduceerbaar opnieuw opgebouwd.

## Deterministische contractopbouw

Het Guidance Contract gebruikt uitsluitend bestaande draftgegevens:

- draft-ID en draftversie;
- flowversie;
- gekozen ingang of originele vrije invoer;
- starttijd;
- actuele opgeslagen antwoorden en disposities.

De drie bestaande herkenbare RI&E-ingangen worden exact naar situatiecode
`RIE` vertaald. Een vrije hulpvraag begint als `UNCLASSIFIED`; de tekst wordt
niet geïnterpreteerd. Niet-ondersteunde herkenbare ingangen blijven
`UNSUPPORTED`.

Beantwoorde velden worden directe `ContextFact`-waarden. `UNKNOWN` en `SKIPPED` blijven expliciete `Uncertainty`-waarden. Er worden geen feiten uit tekst, sector, planning of andere antwoorden afgeleid.

## Clarification

Voor een RI&E-draft controleert Clarification Engine v1 eerst het expliciete feit `HAS_EMPLOYEES`.

Ontbreekt dit feit, dan toont de bestaande workspace uitsluitend:

> Heeft u personeel?

De vraag gebruikt het bestaande vraagformulier, opslagpad, antwoordmodel en focusgedrag. Een bevestigd antwoord `ja` én `nee` maakt het feit compleet. `Dat weet ik niet` blijft zichtbaar als onzekerheid en leidt opnieuw tot dezelfde ene vraag.

Voor `UNCLASSIFIED` stelt Clarification precies één neutrale vraag:

> Waar gaat uw vraag vooral over?

De gevalideerde keuze kan de situatie expliciet wijzigen naar `RIE`,
`INCIDENT` of `HAZARDOUS_SUBSTANCES`. Alleen daarna wordt de bijbehorende
Clarification-ruleset actief. Gezondheid of belasting van medewerkers en iets
anders blijven `UNSUPPORTED`. De workspace gebruikt geen legacy
RI&E-fallback meer; er wordt geen onderwerp uit vrije tekst afgeleid.

Implementatiefase H kan vóór deze neutrale vraag optioneel een strikt
gevalideerd [AI-onderwerpvoorstel](ai-intake-classifier-v1.md) tonen. Dit
voorstel verandert de `Situation.code` niet en wordt niet opgeslagen. Alleen
de bestaande, expliciete `guidance_topic`-keuze van de gebruiker activeert een
Clarification-ruleset. Bij ontbrekende configuratie, timeout, providerstoring
of ongeldige output blijft de neutrale vraag ongewijzigd beschikbaar.

## Guidance

Guidance Engine v2 wordt uitsluitend aangeroepen wanneer:

```text
clarification.isComplete === true
```

De resulterende `GuidanceOutcome` blijft onderdeel van de afgeleide draftcontext. Er ontstaat geen `Intake`, `Assignment`, account, selectie, uitnodiging of match.

## Resultaatweergave

Implementatiefase G toont een aanwezige `GuidanceOutcome` uitsluitend wanneer
de Clarification Engine de hulpvraag als compleet heeft beoordeeld. De
bestaande Public Intake-workspace vertaalt de uitkomst naar begrijpelijke
Nederlandse presentatietekst:

- dit begrijpen wij van uw situatie;
- relevante onderwerpen;
- informatie die verder kan helpen;
- mogelijke vervolgrichtingen;
- de status van mogelijke professionele ondersteuning;
- bekende onzekerheden.

Interne onderwerp- en kennisbehoeftecoden worden via een gesloten
presentatiemapping vertaald. Onbekende codes krijgen een neutraal label en
worden nooit rechtstreeks getoond. Schema-, engine- en rulesetversies,
provenance en andere technische metadata blijven buiten de gebruikersinterface.

De presentatie leidt geen nieuwe feiten af en wijzigt de `GuidanceOutcome`
niet. Bij een incomplete verduidelijking blijft uitsluitend de eerstvolgende
vraag zichtbaar. Een unsupported situatie blijft fail-closed op het bestaande
veilige pad. Er zijn geen CTA's voor registratie,
opdrachtvorming, matching, professionals, credits of offertes toegevoegd.

## Behouden invarianten

Ongewijzigd blijven:

- padgebonden HttpOnly-sessiecookie;
- tokenhashing en sessietoegang;
- draftversies en optimistische concurrency;
- actuele antwoorden en append-only antwoordrevisies;
- `DRAFT_CREATED`, `DRAFT_RESUMED`, antwoord- en fase-events;
- expliciete abandonment;
- resume- en expiryregels;
- bestaande Public Intake-statusmachine;
- bestaande database-integriteit en tenantgrenzen.

## M7A.1 — begripsbevestiging vóór verduidelijking

Een vrije hulpvraag met een bruikbare gecachete classificatie toont eerst een
begripsbevestiging. Bevestigen schrijft het voorgestelde onderwerp als
`AI_CONFIRMED`; corrigeren opent pas daarna de bestaande onderwerpkeuze en
schrijft de handmatige keuze als `USER_CORRECTED`. Zonder bruikbare
samenvatting of betrouwbaar onderwerp blijft de bestaande veilige keuze
beschikbaar en wordt de bron `FALLBACK_SELECTION`.

Pas het expliciet opgeslagen `guidance_topic`-antwoord wijzigt de afgeleide
`Situation.code`. Daardoor start de bestaande Clarification Engine direct na
bevestiging of correctie, zonder een tweede onderwerpvraag. De rulesets, het
maximum van vijf unieke vragen en alle completionstatussen blijven
ongewijzigd.
