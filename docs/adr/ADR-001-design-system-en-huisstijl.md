# ADR-001 — Design system en huisstijl

- **Status:** geaccepteerd voor Module 2A
- **Datum:** 12 juli 2026

## Context

WorkMatchr heeft een consistente, toegankelijke basis nodig voor de publieke website en toekomstige dashboards, formulieren en beheeromgeving. De definitieve huisstijl en exacte logokleur zijn nog niet beschikbaar.

## Besluit

WorkMatchr gebruikt één centraal design system op basis van semantische CSS-tokens in Tailwind CSS. Lichtblauw is de primaire merkrichting, donkerblauw draagt tekst en contrast, en groen blijft functioneel voor succes en onafhankelijkheid.

## Gekozen richting

- semantische tokens in `globals.css`;
- kleine herbruikbare React-componenten zonder externe UI-library;
- systeemfonts zonder externe fontafhankelijkheid;
- WCAG 2.2 AA als ondergrens;
- één visueel en technisch systeem voor website en applicatie;
- rustige vormgeving zonder overmatige schaduwen, animaties of kleurverlopen.

## Alternatieven

- Een externe componentlibrary: afgewezen vanwege onnodige afhankelijkheid en minder grip op identiteit.
- Losse Tailwind-kleuren per component: afgewezen vanwege inconsistentie en onderhoudslast.
- Wachten op het definitieve logo: afgewezen omdat toekomstige modules nu al een consistente basis nodig hebben.

## Gevolgen

- Nieuwe interfaces moeten de tokens en componenten hergebruiken.
- Afwijkingen vragen een gemotiveerd ontwerpbesluit.
- De tijdelijke merkkleur moet later centraal worden vervangen en opnieuw op contrast worden getest.

## Tijdelijke primaire kleur

`#1479a6` is tijdelijk gekozen als toegankelijke lichtblauwe design-token. Dit is geen definitieve merkkleur.

## Relatie met Feenstra Safety Consulting

Het lichtblauw creëert een subtiele visuele relatie met Feenstra Safety Consulting. WorkMatchr blijft inhoudelijk en visueel een zelfstandig merk en systeem; elementen worden niet één-op-één overgenomen.
