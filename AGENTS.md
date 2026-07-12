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
