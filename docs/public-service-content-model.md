# Publiek dienstenmodel

Een dienst beschrijft mogelijke professionele ondersteuning, niet een gegarandeerd product of wettelijke uitkomst. Verplichte velden behandelen positionering, probleem, passende en niet-passende situaties, doelgroep, traject, mogelijke opbrengsten, deskundigheid, organisatieverantwoordelijkheid en wettelijke context.

`ServiceDetailPage` toont deze onderdelen in een vaste semantische volgorde. De FAQ staat vóór de wettelijke context; daarna volgen de prominente opdrachtstart-CTA, Algemene vakinformatie, eventuele gerelateerde informatie en Bronnen en onderbouwing. Er staan geen prijzen, vaste doorlooptijden, beschikbaarheidsclaims of garanties in.

De publieke catalogus bevat twintig routes voor de canonieke deskundigheden uit de bestaande Advieswijzerreferentie, naast twee dienstgerichte pagina’s voor RI&E en PMO. De dienstenpagina groepeert deze apart. De canonieke namen, identifiers en routes staan bij elkaar in `src/content/canonical-expertise-services.ts`; deze mapping wijzigt de referentietaxonomie niet.

## A02 — uniforme opdrachtstart en eindacceptatie

Het dienstenoverzicht en alle 22 detailpagina’s gebruiken **Start uw opdracht** naar `/opdracht-starten`. Deze generieke link vult geen deskundigheid of onderwerp vooraf in: de bestaande keuze bij opdrachtstart blijft leidend.

`PublicContentPathways` accepteert een optioneel `linkLabel`. Alleen `/diensten` stelt dit in op `Start uw opdracht`. Het bestaande standaardlabel blijft behouden voor de overzichten kenniscentrum, sectoren en wettelijke verplichtingen; informatiegerichte acties zoals `Bekijk E-learning` veranderen niet. De detailpagina’s gebruiken al de gedeelde prominente CTA met het juiste standaardlabel.

`src/app/diensten/acceptance.test.tsx` bewaakt alle 22 unieke catalogusbestemmingen, de afzonderlijke RI&E-route, metadata/canonicals/sitemap, één H1 en opdrachtstart-CTA per detailpagina, unieke FAQ’s en bestaande bronkoppelingen. De bestaande canonieke mappingtest blijft de ongewijzigde twintig deskundigheidskeuzes bewaken. `public-content-pathways.test.tsx` bewaakt beide weergavevarianten en de ongewijzigde labels buiten diensten.

Voor productacceptatie blijven de lokale browsercontrole op desktop/mobiel, toetsenbordfocus, echte 200%-zoom en de keuze deskundigheid/onderwerp nodig. Technische controles gelden niet als Product Owner-acceptatie. Een productiecontrole volgt pas na een afzonderlijk goedgekeurde release.

De gerelateerde links binnen `overview:services` en `service:*` gebruiken de bestaande `brand-primary-hover`-kleur, omdat `brand-primary` op `surface-subtle` slechts 4,48:1 tekstcontrast heeft. Andere contenttypen behouden hun bestaande linkkleuren. Er verandert geen layout of navigatiestructuur.
