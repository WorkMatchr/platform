# WorkMatchr test-log

## 2026-08-21 — Accountgebonden Arbo-wijzers

- Publieke overzichts- en uitlegpagina's blijven zonder account bereikbaar; de vragenflow rendert uitsluitend na server-side vastgestelde sessie en actieve tenantmembership.
- Login gebruikt uitsluitend een door `getSafeReturnUrl` gevalideerde lokale `returnTo`; onbekende of externe bestemmingen vallen terug op `/wijzers`.
- Compliance- en BHV-runs worden pas zichtbaar nadat de atomische organisatiegebonden afronding is geslaagd. Een mislukte afronding levert geen resultaat, PDF of orphan run op.
- PDF-downloads gebruiken uitsluitend immutable historische snapshots van een tenantgeautoriseerde run; de anonieme raw-answer-PDF-fallback is verwijderd.
- `Mijn Arbo-wijzers`, detailweergave en PDF blijven server-side op gebruiker, actieve membership, organisatie en run-tenant gecontroleerd.
- De bestaande genormaliseerde onderwerp-, status- en scenariocodes blijven beschikbaar als privacyvriendelijke grondslag voor latere geaggregeerde trendanalyse; er is geen analyticsdashboard of extra vrije tekst toegevoegd.
- Geen Prisma-schemawijziging of migratie: de bestaande `ArboGuideRun`-foundation wordt hergebruikt.

## 2026-08-21 — BHV-wijzer v1

- Gerichte beslis-, scenario-, normalisatie-, bron-, rapport- en PDF-tests: groen.
- Contextcatalogus- en bestaande Compliance-regressies: groen.
- Typecheck en gerichte lint: groen.
- Productiebuild: groen na achterwaarts compatibele uitbreiding van het rapport-snapshotcontract.
- Geen Prisma-schemawijziging of migratie; `ArboGuideRun` en BHV-rapportnummering worden hergebruikt.

Dit log bevat afgeronde functionaliteit waarvoor nog een afzonderlijke volledige inhoudelijke en functionele eindcontrole door de product owner is gepland.

| Onderdeel | Status | Te controleren |
| --- | --- | --- |
| Compliance-wijzer v1 | Eindcontrole gepland | Vijfstappenflow, negen beoordelingsonderwerpen, resultaatteksten, centrale bronnenlijst, BASIC PDF, stapscroll/focus, mobiele weergave en contextuele Advieswijzer-doorstroom. |
| Historische Compliance-run | Eindcontrole gepland | Een afgeronde ingelogde scan maakt één immutable run met genormaliseerde antwoorden en historische rapportsnapshot. |
| Arbo-wijzer rapportnummer | Eindcontrole gepland | Uniek jaarvolgnummer, zichtbaarheid in account/detail/PDF en veilige replay bij dubbelklik. |
| Historische PDF-hergeneratie | Eindcontrole gepland | Download gebruikt uitsluitend de opgeslagen snapshot en verandert niet door latere beslis- of brontekst. |
| Mijn Arbo-wijzers | Eindcontrole gepland | Lege toestand, lijst, detail, meerdere runs/versies en rapportdownload binnen de actieve organisatie. |
| Arbo-wijzer tenantisolatie | Eindcontrole gepland | Andere organisatie, niet-ingelogde gebruiker en cross-tenant UUID krijgen geen historie of PDF. |
| Arbo-wijzer statuskleuren | Eindcontrole gepland | Groen Op orde, oranje Actie nodig, amber Controleren en grijs Niet van toepassing, steeds met tekstlabel. |
| Compliance-resultaatvolgorde | Eindcontrole gepland | Resultaten, bewaren/downloaden, blauwe adviseur-CTA en daarna Geraadpleegde bronnen op desktop en mobiel. |
