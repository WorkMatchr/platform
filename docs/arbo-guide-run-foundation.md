# Arbo-wijzer runfundament

## Doel

`ArboGuideRun` is het gedeelde, tenantgebonden fundament voor afgeronde Compliance-, BHV-, RI&E- en Risicowijzers. Alleen de Compliance-wijzer gebruikt het fundament nu. De andere typen reserveren uitsluitend een stabiele technische categorie; er zijn geen nieuwe wijzers of beslisregels toegevoegd.

## Lifecycle en rapportnummer

Een run ontstaat als `IN_PROGRESS` en kan binnen dezelfde seriële transactie eenmaal naar `COMPLETED`. Alleen dan worden resultaatregels, een historische rapportsnapshot en een rapportnummer vastgelegd. Het nummer wordt per wijzertype en UTC-jaar onder een transactionele PostgreSQL advisory lock uitgegeven: `CW-2026-000001`, `BHV-2026-000001`, `RIE-2026-000001` of `RSK-2026-000001`. Routes en autorisatie gebruiken altijd het interne UUID.

Een organisatiegebonden idempotentiesleutel maakt dubbelklikken en identieke replay veilig. De inhoudsfingerprint omvat wijzertype, `guideVersion`, `reportVersion`, genormaliseerde antwoorden en rapportsnapshot. Dezelfde sleutel met afwijkende inhoud faalt gesloten.

## Historische reproduceerbaarheid

De immutable rapportsnapshot bevat de afgeronde beoordeling, begrijpelijke statuslabels, toelichting, aanbevolen vervolgstap, gebruikte bronsnapshots, broncontroledatums en rapportmetadata. Een historische PDF wordt uitsluitend uit deze snapshot opgebouwd; actuele beslisregels of bronmetadata worden niet opnieuw uitgevoerd.

- Verhoog `guideVersion` wanneer vragen, antwoordnormalisatie of beoordelingslogica inhoudelijk verandert.
- Verhoog `reportVersion` wanneer de betekenis of structuur van de opgeslagen rapportage wijzigt.
- Een alleen visuele PDF-aanpassing zonder betekenisverandering vereist geen nieuwe guide-versie.

## Privacy, tenant en trends

De Compliance-route accepteert alleen de vaste genormaliseerde antwoordvelden en geen vrije tekst. Medische gegevens, werknemersnamen en ongevalsgegevens horen niet in een run. Lijst, detail en PDF bepalen de organisatie server-side uit de actieve membership; een UUID van een andere tenant levert geen toegang.

`ArboGuideRunResult` bewaart per onderwerp een stabiele `subjectCode` en genormaliseerde status. Daarmee zijn later geaggregeerde trends per wijzertype, guide-versie, tijdvak en onderwerp mogelijk zonder rapporttekst te analyseren of individuele organisaties te tonen. Er is nog geen dashboard of benchmarkfunctie.

## Rollout en risico

Migratie `20260820100000_add_arbo_guide_runs` is uitsluitend additief: drie enums, een teller, runs en resultaatregels. Er is geen backfill of mutatie van bestaande data. Foreign keys gebruiken `ON DELETE RESTRICT`; database-triggers blokkeren UPDATE/DELETE van historische runs/resultaten en een deferred trigger weigert een afgeronde run zonder resultaat.

Bij een mislukte migratie blijft de bestaande publieke Compliance-wijzer bruikbaar met de anonieme basis-PDF. Ingelogde opslag wordt pas door de nieuwe applicatiecode geactiveerd nadat de migratie is toegepast.
