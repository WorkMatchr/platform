# Werkinstructies voor Codex — WorkMatchr

- Communiceer altijd in het Nederlands met de gebruiker.
- Lees vóór wijzigingen de relevante documentatie via [docs/README.md](docs/README.md).
- Volg de bestaande architectuur en naamgeving.
- Maak kleine, controleerbare wijzigingen.
- Verwijder geen bestaande functionaliteit zonder dit vooraf duidelijk te melden.
- Commit nooit secrets, persoonsgegevens of lokale omgevingswaarden.
- Voeg geen productieafhankelijkheden toe zonder aantoonbare noodzaak.
- Voer na codewijzigingen minimaal `npm run lint` en `npm run build` uit.
- Rapporteer testresultaten en alle gewijzigde bestanden.
- Werk documentatie bij wanneer een besluit of functionaliteit verandert.
- Schrijf zichtbare gebruikersinterface standaard in het Nederlands.
- Gebruik technisch gangbaar Engels voor code, variabelen, functies, componenten, databasevelden en bestandsnamen.
- Lees voor databasewijzigingen ook `docs/database.md`, `docs/data-dictionary.md`, `docs/ERD.md` en ADR-002.
- Maak schemawijzigingen uitsluitend via controleerbare Prisma-migraties; wijzig een reeds toegepaste migratie niet achteraf.
- Seed uitsluitend idempotente referentiedata en nooit secrets, persoonsgegevens of productiegegevens.
- Behandel `npm run db:reset` als destructief en gebruik dit alleen expliciet op een lokale ontwikkeldatabase.
- Lees voor authenticatiewijzigingen ook `docs/authentication.md`, `docs/security.md` en ADR-003.
- Gebruik Better Auth als enige bron voor wachtwoordhashing, cookies, tokens en sessie-authenticatie; bouw hiervoor geen parallelle logica.
- Controleer platformrol en actuele accountstatus server-side dicht bij beschermd gegevensgebruik.
- Voeg nooit authsecrets, Resend-keys, wachtwoorden, sessietokens of verificatie-/resettokens toe aan Git of documentatie.
- Gebruik voor authflowtests uitsluitend tijdelijke `example.invalid`-accounts en verwijder alle gekoppelde records na afloop.
- Lees voor organisatiewijzigingen ook `docs/organizations.md`, `docs/authorization.md`, `docs/file-storage.md` en ADR-004.
- Valideer organisatie- en membershipstatus en organisatierol server-side; vertrouw nooit uitsluitend op een organizationId uit cookie, query of formulier.
- Gebruik voor uploadtests uitsluitend tijdelijke generieke bestanden buiten Git en verwijder testrecords en opslagbestanden na afloop.
- Lees voor intake- of vraagsetwijzigingen ook `docs/module-5-ontwerp.md`, `docs/module-5a-implementatieplan.md`, `docs/module-5a-vraagset-v1.md` en ADR-005.
- Wijzig gepubliceerde of gepensioneerde vraagsetversies nooit in-place; maak voor inhoudelijke wijzigingen een nieuwe versie.
- Schrijf actuele intakeantwoorden en append-only antwoordrevisies later atomair en valideer vraagset, optie, locatie en tenant server-side.

Relevante documentatie:

- [Productvisie](docs/01-productvisie.md)
- [Architectuur](docs/02-architectuur.md)
- [Roadmap](docs/03-roadmap.md)
- [Besluitenregister](docs/04-besluitenregister.md)
- [Voortgang](docs/05-voortgang.md)
- [Projectprincipes](PROJECT_PRINCIPLES.md)
- [Design system](docs/design-system.md)
- [UI-componenten](docs/ui-components.md)
- [UX-principes](docs/UX_PRINCIPLES.md)
- [Schrijfstijl](docs/VOICE_AND_TONE.md)
- [Definition of Done](docs/definition-of-done.md)
- [Bekende risico’s](docs/known-risks.md)
- [Technical debt](docs/technical-debt.md)
- [ADR-005 intakeversies en antwoordhistorie](docs/adr/ADR-005-versieerbare-intake-en-antwoordhistorie.md)
