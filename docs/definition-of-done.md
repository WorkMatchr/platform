# Definition of Done

> Deze technische Definition of Done geldt naast de productmatige gereedheidscriteria uit de bindende [WorkMatchr Product Constitution](PRODUCT_CONSTITUTION.md). Een werkende en geteste functie is pas volledig gereed wanneer ook de product- en UX-toets is geslaagd.

Een module is pas afgerond wanneer minimaal:

- de afgesproken scope is gerealiseerd;
- `npm run lint` slaagt;
- `npm run typecheck` slaagt;
- `npm run build` slaagt;
- relevante documentatie is bijgewerkt;
- `CHANGELOG.md` is bijgewerkt;
- het besluitenregister of een ADR is bijgewerkt indien nodig;
- bekende risico’s en technical debt zijn beoordeeld;
- desktop en mobiel zijn getest;
- toegankelijkheid handmatig is gecontroleerd;
- de product owner de module heeft goedgekeurd;
- wijzigingen zijn gecommit en gepusht.

Voor een databasemodule geldt aanvullend dat de schema-validatie en clientgeneratie slagen, migraties op een lege database werken, de seed herhaalbaar is en constraints en indexen aantoonbaar zijn gecontroleerd.

Voor een authenticatiemodule geldt aanvullend dat registratie, verificatie, login, logout, wachtwoordherstel, sessie-intrekking en server-side routebeveiliging zijn getest; accountenumeratie en open redirects worden voorkomen; secrets blijven buiten Git; tijdelijke testaccounts worden verwijderd; en `npm test` en `npm audit` slagen.

Voor een organisatiemodule geldt aanvullend dat tenantautorisatie server-side is getest; organisatie en creator-membership atomair ontstaan; OWNER/ADMIN/MEMBER-regels aantoonbaar werken; actieve organisatiekeuze geen clientstate vertrouwt; bestandsinhoud en opslagkeys worden gevalideerd; productieopslag veilig faalt zonder provider; en alle tijdelijke organisaties, accounts en bestanden zijn verwijderd.

Voor een intake- en opdrachtvormingsmodule geldt aanvullend dat expliciete indiening geen GET-side effect heeft; alleen actieve `OWNER` en `ADMIN` mogen indienen en muteren; `MEMBER`-leesrecht aantoonbaar begrensd is; tenantisolatie geldt voor lijst, detail, succesroute en mutaties; de laatst bekende versie alleen voor service-side concurrency wordt gebruikt; idempotentie, concurrency en rollback zijn getest; inhouds- en statushistorie append-only blijven; technische statussen niet in de UI lekken; en tijdelijke intake-, opdracht- en accountgegevens zijn verwijderd.

Voor een contextuele kennisroute geldt aanvullend dat de server alleen een bekende actieve context-ID accepteert; vrije gebruikersinvoer apart blijft; een afwijkende hervatbare sessie een expliciete keuze geeft; de voorgestelde richting corrigeerbaar is; en context die publicatie beïnvloedt in de immutable opdrachtrevisie wordt bevroren.

Module 2A en Module 2B zijn handmatig goedgekeurd door de product owner. De product owner heeft expliciet opdracht gegeven de modules vóór commit en push als afgerond te registreren. Commit en push blijven afzonderlijke overdrachtsacties en worden niet zelfstandig door Codex uitgevoerd.
