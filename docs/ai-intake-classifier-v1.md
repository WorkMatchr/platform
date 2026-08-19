# AI Intake Classifier v1

- **Status:** technisch geïmplementeerd; handmatige product-owneracceptatie open
- **Grondslag:** [ADR-021 Addendum A](adr/ADR-021-van-dienstgestuurd-naar-hulpvraaggestuurd-platform.md#addendum-a--ai-intake-classifier)
- **Scope:** alleen de eerste vrije hulpvraag in de publieke intake

## Verantwoordelijkheid

De AI Intake Classifier doet uitsluitend een korte neutrale samenvatting en een corrigeerbaar onderwerpvoorstel. De classifier neemt geen besluit, maakt geen GuidanceOutcome en muteert geen lifecycledata.

De keten is:

```text
vrije hulpvraag
→ gevalideerd AI-onderwerpvoorstel
→ gebruiker bevestigt of corrigeert
→ deterministische Clarification Engine
→ deterministische Guidance Engine
```

Alleen het expliciet opgeslagen antwoord op `guidance_topic` wordt later een feit in de deterministische keten. Een geldige structured output wordt per fingerprint gecachet; de bron `AI_CONFIRMED`, `USER_CORRECTED` of `FALLBACK_SELECTION` wordt server-side in actuele antwoorddata en append-only revisies vastgelegd. Technische fallbacks zijn geen inhoudelijk resultaat: `CONFIGURATION_MISSING` wordt direct opnieuw geprobeerd zodra configuratie beschikbaar is; overige technische fallbacks worden hoogstens vijf minuten hergebruikt voordat één request de classificatie atomair opnieuw probeert.

## Providercontract

`AIClassifier` is provider-onafhankelijk en ontvangt alleen de eerste hulpvraag. Een implementatie retourneert uitsluitend:

- `summary`;
- `primarySubject`;
- `secondarySubjects`;
- `confidence`;
- `alternatives`.

OpenAI is de eerste implementatie. Zij gebruikt de Responses API met een strikt JSON Schema en `store: false`. Een andere provider kan later hetzelfde interface implementeren zonder Guidance, Clarification, Matching of Assignment te wijzigen.

Het OpenAI-schema gebruikt uitsluitend de ondersteunde Structured
Outputs-subset. De arrays zijn in het providerschema begrensd met `maxItems`;
uniciteit wordt bewust niet met het niet-ondersteunde `uniqueItems` afgedwongen.
De afzonderlijke server-side validator blijft dubbele waarden weigeren.

Toegestane onderwerpcodes zijn:

- `RIE`;
- `INCIDENT`;
- `HAZARDOUS_SUBSTANCES`;
- `OCCUPATIONAL_HEALTH`;
- `EMERGENCY_RESPONSE`;
- `UNKNOWN`.

Extra velden, onbekende codes, ongeldige JSON en dubbele codes worden server-side geweigerd.

## Confidence en gebruikersbevestiging

- `HIGH`: WorkMatchr toont “Wij denken dat uw vraag hierover gaat.” met het voorgestelde onderwerp en correctiemogelijkheden.
- `MEDIUM`: WorkMatchr toont “Bedoelt u één van deze onderwerpen?” met bekende opties.
- `LOW` of `UNKNOWN`: WorkMatchr toont de bestaande neutrale onderwerpvraag.

Geen confidence-niveau mag gebruikersbevestiging overslaan.

## Fail-safe

Zonder API-sleutel, bij een timeout, providerstoring of ongeldige output retourneert de veilige servicelaag geen classificatie. De gebruiker krijgt dan de bestaande deterministische onderwerpkeuze. De intake blijft bruikbaar en toont geen technische foutpagina.

De veilige servicelaag onderscheidt:

- `CONFIGURATION_MISSING`;
- `PROVIDER_TIMEOUT`;
- `PROVIDER_UNAVAILABLE`;
- `PROVIDER_REQUEST_REJECTED`;
- `OUTPUT_INVALID`;
- `UNKNOWN_ERROR`.

Deze categorieën bevatten geen providerfoutbody of gebruikersinvoer. Alleen
bij een afgewezen HTTP-request mag daarnaast de numerieke providerstatuscode
worden vastgelegd.

De standaardtimeout is vier seconden. De classifier wordt alleen aangeroepen voor een vrije hulpvraag waarvoor nog geen onderwerpantwoord is opgeslagen.

## Abuse- en kostenbegrenzing

Een cachemiss mag de provider uitsluitend bereiken nadat de persistente publieke-intakelimiter toestemming heeft gegeven. De limiter combineert een IP-, anonieme sessie- en globale begrenzing. Cachehits starten geen nieuwe kostencontrole en geen nieuwe providercall. Steeds wisselende invoer om de classificatiecache te omzeilen blijft daardoor begrensd op dezelfde gepseudonimiseerde IP- en sessiesleutels.

Voor AI-classificatie gelden voor de MVP de volgende bovengrenzen: per sessie 3 pogingen per 10 minuten en 8 per dag, per IP 6 per 10 minuten en 20 per dag, en globaal 30 per 10 minuten en 300 per dag. De algemene publieke-intakeacties hebben ruimere burst- en daggrenzen zodat normaal menselijk gebruik niet merkbaar wordt gehinderd. Invoer blijft vóór de provider begrensd tot 2.000 tekens.

De IP-sleutel gebruikt uitsluitend Vercels door het platform overschreven `x-forwarded-for`-header. In Production wordt een request buiten de aantoonbare Vercel-proxycontext geweigerd. Ruwe IP-adressen en sessietokens worden niet opgeslagen: een domeingescheiden HMAC met het server-side Better Auth-secret levert per environment een niet-omkeerbare sleutel. Production en Preview gebruiken daarnaast afzonderlijke databases en secrets en delen dus geen limiterstate.

Een onbetrouwbare IP-context, ontbrekend secret of niet-beschikbare limiter faalt gesloten: er volgt geen OpenAI-call. De gebruiker krijgt alleen een rustige generieke melding; interne grenzen, sleutels en oorzaken blijven server-side.

## Configuratie

Gebruik uitsluitend server-side omgevingsvariabelen:

```text
OPENAI_API_KEY=
OPENAI_AI_INTAKE_MODEL=gpt-5.6-sol
OPENAI_AI_INTAKE_TIMEOUT_MS=4000
```

`OPENAI_API_KEY` is optioneel voor functionele beschikbaarheid: zonder sleutel blijft de deterministische fallback actief. Zet nooit een sleutel in Git, documentatie, clientcode of logs.

## Logging en privacy

Per poging worden uitsluitend vastgelegd:

- latency;
- provider;
- model;
- confidence;
- of fallback is gebruikt.
- veilige fallbackreden;
- optionele numerieke providerstatuscode.

De volledige hulpvraag, samenvatting, persoonsgegevens, API-sleutel, raw providerresponse en foutbody worden niet gelogd. De classificatiecache bewaart niet de oorspronkelijke hulpvraag, maar de samenvatting kan gebruikersafgeleide informatie bevatten. Zij valt daarom onder toekomstig retentie- en anonimiseringbeleid.

## Bewuste niet-doelen

Deze component:

- produceert geen advies of juridische conclusie;
- verandert Guidance Engine en Clarification Engine niet;
- voert geen matching uit;
- leidt geen ProfessionalRequirement af;
- maakt geen Assignment of account aan;
- voegt geen downstream-, matching- of opdrachtmodel toe.

## M7A.1 Understanding Confirmation

Bij `HIGH` of `MEDIUM` confidence, een bekend hoofdonderwerp en een bruikbare
samenvatting toont WorkMatchr eerst de oorspronkelijke hulpvraag, de neutrale
samenvatting en het onderwerpvoorstel. `Ja, dat klopt` gebruikt hetzelfde
gecachete resultaat en schrijft `AI_CONFIRMED`; er volgt geen tweede
onderwerpvraag en geen nieuw providerrequest.

`Nee, ik bedoel iets anders` opent de bestaande handmatige onderwerpkeuze. De
keuze wordt als `USER_CORRECTED` vastgelegd. Bij `LOW`, `UNKNOWN`, een
onbruikbare samenvatting of een technische fallback verschijnt die veilige
keuze direct en krijgt het antwoord `FALLBACK_SELECTION`. De client kan deze
broncodes niet zelf toekennen. De additieve antwoordbronmigratie wijzigt geen
Guidance-, Clarification-, matching- of opdrachtmodel.
