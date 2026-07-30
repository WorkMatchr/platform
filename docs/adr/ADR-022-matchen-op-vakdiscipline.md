# ADR-022 — Matchen op vakdiscipline in plaats van generieke RI&E-deskundigheid

## Status

Geaccepteerd — 30 juli 2026.

## Context

Een RI&E is een dienst, onderzoeksvorm of mogelijke oplevering. Het is
geen zelfstandig, aantoonbaar beroepsprofiel. De eerdere aanbeveling
“RI&E-deskundige” verbond een inhoudelijke hulpvraag daardoor te vroeg
aan een dienst en bood onvoldoende houvast voor kwalificatie en
geschiktheidsfiltering.

De bestaande Guidance-keten kent al relevante onderwerpen, dominante
contexten, risicodomeinen, adviesprioriteiten en immutable
`ProfessionalRequirement`-snapshots. Providerkwalificatie publiceert
gecontroleerde diensten en specialismen in een
`TrustedProviderProjection`.

## Besluit

WorkMatchr classificeert professionele ondersteuning op een concrete
vakdiscipline. De vaste route is:

```text
Hulpvraag
→ inhoudelijk risicodomein
→ dominante context
→ vakdiscipline
→ prioriteit
→ dienst
→ geschikte providerorganisaties
```

De dienst bepaalt niet automatisch de discipline. De classificatie is
deterministisch, versieerbaar en uitlegbaar. Vrije profieltekst,
marketingtekst en een AI-samenvatting kunnen geen vakdiscipline of
eligibility bepalen.

De centrale codes zijn:

- `MIDDELBAAR_VEILIGHEIDSKUNDIGE`;
- `HOGER_VEILIGHEIDSKUNDIGE`;
- `ARBEIDSHYGIENIST`;
- `ERGONOOM`;
- `ARBEIDSDESKUNDIGE`;
- `BEDRIJFSARTS`;
- `ARBEIDS_EN_ORGANISATIEDESKUNDIGE`;
- `BRANDVEILIGHEIDSDESKUNDIGE`;
- `MACHINEVEILIGHEIDSDESKUNDIGE`;
- `ASBESTDESKUNDIGE`;
- `MILIEUDESKUNDIGE`;
- `BHV_ADVISEUR`.

Elke code heeft één centraal Nederlands label en één of meer centrale,
gecontroleerde specialismecodes. De presentatie en de
Request-eligibilitysnapshot lezen dezezelfde mapping.

## Regels en prioriteiten

Een specifieke uitkomst heeft precies één `PRIMARY` discipline. Een
discipline komt niet tegelijk in meerdere prioriteitsgroepen voor.
Expliciete regels mogen maximaal twee `ADDITIONAL` en twee `POSSIBLE`
disciplines toevoegen. Bij onvoldoende betrouwbare context blijft de
uitkomst fail-closed zonder verzonnen specialist.

De eerste ruleset bevat onder meer:

- ergonomie en fysieke belasting: Ergonoom primair;
- blootstelling aan gevaarlijke stoffen: Arbeidshygiënist primair;
- grootschalige stoffenopslag en PGS: HVK primair;
- machineveiligheid en CE: Machineveiligheidsdeskundige primair;
- brandveiligheid: Brandveiligheidsdeskundige primair;
- PSA, werkdruk en ongewenst gedrag: A&O-deskundige primair;
- inzetbaarheid en re-integratie: Arbeidsdeskundige primair;
- afgebakende operationele veiligheid: MVK primair;
- complexe of multidisciplinaire veiligheid: HVK primair.

MVK past bij afgebakende operationele vragen, inspecties en praktische
implementatie. HVK krijgt voorrang bij complexe of multidisciplinaire
risico’s, majeure wijzigingen, procesveiligheid, PGS en grote
organisatorische of infrastructurele impact.

## Providerkwalificatie en filtering

Een discipline is alleen bruikbaar voor geschiktheidsfiltering wanneer
de actuele, geldige `TrustedProviderProjection` het bijbehorende
gecontroleerde specialisme bevat. Een brede dienst zoals
`SAFETY_ADVICE` is geen vervanging voor `ergonoom` of een andere
concrete discipline.

De SPECIALISM-taxonomie krijgt daarom een gepubliceerde versie 2.
Versie 1 wordt gepensioneerd, niet verwijderd. Bestaande
capabilityrevisies en projecties blijven naar hun oorspronkelijke
taxonomieversie verwijzen.

## Historie en backward compatibility

Bestaande `AdviceDossierVersion`-records en gepubliceerde `Request`-
records worden niet herschreven. Nieuwe adviezen gebruiken ruleset
`professional-advice-rules/1.2.0`; alleen nieuw opgeslagen dossiers en
nieuw gepubliceerde aanvragen krijgen de nieuwe disciplinesnapshot.

Een reload, PDF-download of detailweergave herberekent geen
vakdiscipline: deze functies lezen uitsluitend de immutable snapshot.

## Consequenties

- aanbevelingen zijn herkenbaarder en beter kwalificeerbaar;
- eligibility wordt strenger en kan minder aanbieders opleveren;
- providerorganisaties moeten hun concrete specialismen gecontroleerd
  vastleggen;
- historische en nieuwe labels kunnen naast elkaar bestaan;
- een RI&E blijft als dienst en inhoudelijk begrip bestaan;
- er wordt geen extra AI-call, ranking of automatische selectie
  geïntroduceerd.
