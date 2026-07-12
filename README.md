# WorkMatchr

WorkMatchr wordt een volledig onafhankelijk platform dat organisaties koppelt aan passende arbo- en veiligheidsspecialisten. Per opdracht worden maximaal drie aanbieders objectief geselecteerd; betaalde voorkeursposities bestaan niet.

Module 1, **Module 2A: design system en huisstijl**, **Module 2B: publieke homepage** en **Module 3: database en datamodel** zijn afgerond. Module 4: authenticatie en rollen is de volgende module. Authenticatie, betalingen, matching en andere bedrijfsfunctionaliteit worden pas in de daarvoor bestemde modules toegevoegd.

## Vereisten

- Node.js 24 LTS
- npm 11 of nieuwer
- Docker Desktop of een compatibele Docker Compose-omgeving

## Installeren

```bash
npm install
Copy-Item .env.example .env
docker compose up -d
npm run db:deploy
npm run db:seed
```

## Lokaal starten

```bash
npm run dev
```

Open daarna [http://localhost:3001](http://localhost:3001). Start WorkMatchr expliciet op deze poort met `npm run dev -- --port 3001`; poort 3000 wordt gebruikt door een ander project.

## Kwaliteitscontroles

```bash
npm run lint
npm run typecheck
npm run build
```

## Databasecommando's

```bash
npm run db:format
npm run db:validate
npm run db:generate
npm run db:migrate
npm run db:deploy
npm run db:seed
npm run db:studio
```

`npm run db:reset` verwijdert alle gegevens uit de ingestelde database en is uitsluitend bedoeld voor een expliciet gekozen lokale ontwikkelomgeving. Controleer vóór ieder migratie- of resetcommando altijd `DATABASE_URL`.

## Projectstructuur

```text
src/
  app/                 # App Router, metadata en globale stijlen
  components/
    layout/            # Herbruikbare layoutcomponenten
    ui/                # Herbruikbare interfacecomponenten
  lib/                 # Gedeelde technische hulpfuncties (wanneer nodig)
  types/               # Gedeelde TypeScript-typen (wanneer nodig)
docs/                  # Product-, architectuur- en voortgangsdocumentatie
prisma/                # Datamodel, migraties en idempotente seed
docker-compose.yml     # Lokale PostgreSQL 17-omgeving
```

Lees [docs/README.md](docs/README.md) voor de documentatie-index, [PROJECT_PRINCIPLES.md](PROJECT_PRINCIPLES.md) voor de projectprincipes en [AGENTS.md](AGENTS.md) voor de werkafspraken voor Codex.

## Status

Module 2A, Module 2B en Module 3 zijn handmatig goedgekeurd en afgerond. Module 4 is de volgende module en is nog niet gestart. De actuele status staat in [docs/05-voortgang.md](docs/05-voortgang.md).
