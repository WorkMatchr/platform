# Deterministische testdataset dienstverleners

## Doel en grens

Deze opt-in dataset ondersteunt ontwikkeling, demonstraties en acceptatietests van providerkwalificatie, taxonomiefilters, werkgebiedfilters en Trusted Provider Projections. De dataset bevat exact vijftig volledig fictieve professionele organisaties en twintig fictieve opdrachtgevers. Professionals werken namens een organisatie; de dataset presenteert dus niet vijftig losse personen. Matching en de Decision Engine worden hiermee niet geïmplementeerd.

De gewone `npm run db:seed` blijft uitsluitend referentiedata laden. De providerdataset wordt nooit automatisch geladen en weigert uitvoering wanneer `NODE_ENV=production` of PostgreSQL niet lokaal draait.

## Veilig gegevensmodel

- iedere organisatiecode en zichtbare testnaam begint met `TEST-WM-`;
- organisaties hebben geloofwaardige fictieve namen, zoals `TEST-WM-Delta Veiligheidsadvies`, `TEST-WM-ArboKompas` en `TEST-WM-BrandVeilig Adviesgroep`;
- alle e-mailadressen eindigen op `example.invalid`;
- personen heten herkenbaar `TEST-WM-Professional ...`;
- adressen gebruiken `Testlaan`, een syntactisch geldige postcode en een bestaande Nederlandse plaatsnaam;
- KvK-referenties hebben een herkenbare `TEST-WM-`-markering en telefoonnummers gebruiken de fictieve reeks `+31 20 000`;
- bewijsrecords bevatten alleen metadata en een fictieve storage key; er worden geen bestanden geschreven;
- logo-placeholders zijn initialen in de profielmetadata; de seed schrijft bewust geen lokale logobestanden;
- live revisions blijven `SELF_DECLARED`; gecontroleerde varianten krijgen afzonderlijke immutable verificatiereviews;
- kwalificatiebesluiten gebruiken een fictieve beoordelaar en een andere fictieve goedkeurder;
- deprecated capaciteitsmodellen krijgen geen nieuwe data.

## Aparte lokale database

De loader gebruikt standaard de gereserveerde sibling-database `workmatchr_test_providers`. Hierdoor worden bestaande lokale ontwikkel- of testgegevens niet gewijzigd. Een reeds bestaande database met dezelfde naam en niet-datasetgegevens wordt niet overschreven.

Laden en daarna inhoudelijk controleren:

```bash
npm run seed:test-providers
npm run seed:test-providers:verify
```

Een tweede laadactie is idempotent: een complete dataset wordt gecontroleerd en ongewijzigd gelaten. Een onderbroken, uitsluitend herkenbare `TEST-WM-`-dataset wordt in deze gereserveerde database opnieuw opgebouwd.

Verwijderen:

```bash
npm run seed:test-providers:remove
```

Verwijderen dropt uitsluitend `workmatchr_test_providers`. Dit is nodig omdat providerhistorie en projecties terecht immutable zijn. De normale database uit `DATABASE_URL` wordt niet verwijderd of aangepast.

Om de applicatie handmatig tegen deze dataset te draaien, moet voor dat proces een lokale `DATABASE_URL` worden gebruikt die naar `workmatchr_test_providers` wijst. Neem geen lokale credentials op in Git of documentatie.

## Verdeling professionele organisaties

De primaire beroepsverdeling is exact:

- 10 organisaties met MVK als primair profiel;
- 8 met HVK;
- 6 met bedrijfsartsen;
- 5 met arbeidshygiënisten;
- 4 met arbeidsdeskundigen;
- 3 met ergonomen;
- 6 met BHV-specialisten;
- 3 met machineveiligheid;
- 2 met asbestadvies;
- 3 overige veiligheidsadviesbureaus.

Organisaties bieden realistische combinaties van de bestaande centrale servicetaxonomie. Profielmetadata benoemt herkenbare aandachtsgebieden zoals RI&E, BHV, machineveiligheid, PGS, gevaarlijke stoffen, ATEX, incidentonderzoek, audit, PMO en PSA. Ervaring varieert tussen 3, 8, 15 en 25 jaar.

Sinds M7B.2 gebruikt iedere capabilityprojectie daarnaast het concrete
specialisme van de primaire beroepscategorie. De drie ergonomie-
organisaties publiceren dus `specialismCode: ergonoom` wanneer zij
gekwalificeerd, ready en selecteerbaar zijn. Daardoor kunnen zij
fail-closed eligible worden voor een nieuwe aanvraag met Ergonoom als
primaire discipline; een generieke veiligheidsdienst is daarvoor niet
voldoende.

De huidige domeinarchitectuur kent geen klantreview-, tarief- of actieve beschikbaarheidsentiteit. Fictieve beoordelingen, reviewaantallen, indicatieve uurtarieven en demo-beschikbaarheid staan daarom uitsluitend als herkenbare presentatiegegevens in de profielomschrijving. Ze schrijven niet naar deprecated capaciteitsmodellen en beïnvloeden readiness, selecteerbaarheid of Trusted Provider Projections niet.

De vijftig professionele organisaties omvatten bewust:

- volledig gekwalificeerde en selecteerbare dienstverleners;
- geblokkeerde dienstverleners;
- inhoudelijk passende maar niet geverifieerde dienstverleners;
- regionale en landelijke verschillen;
- dienstverleners die voor een specifiek scenario de verkeerde dienst leveren;
- onvoldoende gekwalificeerde dossiers;
- ontbrekende verzekeringsgegevens;
- uitsluitend zelfverklaarde dossiers;
- multi-purpose dienstverleners.

Iedere dienstverlener heeft één tot vijf fictieve professionals. Kwalificaties gebruiken uitsluitend de gepubliceerde centrale taxonomie. Waar inhoudelijk passend is één kwalificatie aan meerdere capabilities gekoppeld.

Alle twaalf provincies komen voor. Werkgebieden variëren tussen één provincie, meerdere provincies, landelijk en op afstand.

## Fictieve opdrachtgevers

De twintig opdrachtgevers zijn verdeeld over bouw, industrie, transport en logistiek, zorg, gemeenten, onderwijs, MKB, detailhandel, landbouw en horeca. Twee algemene bouw- en infrabedrijven vertegenwoordigen de defensie-gerelateerde aannemerscontext; het zijn nadrukkelijk geen militaire organisaties. Iedere opdrachtgever heeft één eigen fictief testaccount en één actieve organisatie, zonder providerprofiel.

De seed maakt geen opdrachten, uitnodigingen, deelnames, offertes, credits of betalingen aan. De database-integriteitstest controleert deze grens expliciet.

## Tien vaste filterscenario’s

`scripts/test-provider-dataset.ts` bevat tien vaste scenario’s voor RI&E, veiligheidsadvies, audits, implementatieondersteuning en training in verschillende regio’s en op afstand. Elk scenario bevat een gevraagde dienst, regio, vereiste kwalificatie en een deterministische verwachte providerlijst. Uitsluiting wordt verklaard met eenvoudige redenen zoals `NOT_SELECTABLE`, `PROVIDER_BLOCKED`, `WRONG_SERVICE` of `OUTSIDE_WORK_AREA`.

Dit zijn conjunctieve testorakels voor bestaande data en filters. Ze berekenen geen score, rangorde of top drie en activeren geen matching, uitnodiging, credits of betaling.

## Integriteitstest

`npm run test:db` draait naast de bestaande database-integriteitstest ook een geïsoleerde providerproef. Die proef:

1. controleert dat productie-uitvoering wordt geweigerd;
2. maakt een unieke tijdelijke sibling-database;
3. migreert en seedt referentiedata;
4. laadt de providerdataset tweemaal;
5. controleert 50 professionele organisaties, 20 opdrachtgevers, relaties, spreiding, de tien scenario’s en de afwezigheid van marketplace-transacties;
6. verwijdert de tijdelijke database altijd.
