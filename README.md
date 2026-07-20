# WorkMatchr

WorkMatchr verzamelt uitsluitend gegevens die noodzakelijk zijn voor uitlegbare platformbesluiten. Het platform is geen HR-systeem, personeelsplanning of diploma-administratie. Aanbieders beslissen per uitnodiging of zij reageren; capaciteit en beschikbaarheid zijn daarom geen verplicht profiel- of selectiegegeven.

WorkMatchr wordt een volledig onafhankelijk platform dat organisaties koppelt aan passende arbo- en veiligheidsspecialisten. Per opdracht worden maximaal drie aanbieders objectief geselecteerd; betaalde voorkeursposities bestaan niet.

Module 1 tot en met Module 4B en Module 5C zijn afgerond. De providerfundering uit Module 6A is beschikbaar. Fase 3 Marketplace Transaction Platform v1 is technisch opgeleverd met product-owneracceptatie open: selectie, uitnodigingen, deelname, offertes, gunning, credits, dashboards, berichten en notificaties zijn gebouwd. Credits kopen, Mollie en andere betaalfunctionaliteit zijn niet geïmplementeerd.

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

Vul voor authenticatie lokaal minimaal `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` en `NEXT_PUBLIC_APP_URL` in. Zonder Resend-configuratie worden verificatie- en resetlinks uitsluitend buiten productie als development-only naar de serverterminal geschreven. Gebruik in productie altijd een sterk willekeurig geheim en een afzonderlijke WorkMatchr-Resendconfiguratie.

`ORGANIZATION_LOGO_STORAGE=local` is uitsluitend voor lokale ontwikkeling. Productie weigert logo-opslag veilig totdat een object-storageprovider is geïmplementeerd.

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
npm test
npm audit
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

Lees [docs/FOUNDING_PRINCIPLES.md](docs/FOUNDING_PRINCIPLES.md) voor het productmatige en architectonische kompas, [docs/README.md](docs/README.md) voor de documentatie-index, [Marketplace Transaction Platform v1](docs/marketplace-transaction-platform-v1.md) voor Fase 3, [ADR-013](docs/adr/ADR-013-een-organisatie-per-tenantaccount-platformrollen-en-gecontroleerde-accountverwijdering.md) voor de accountarchitectuur, [PROJECT_PRINCIPLES.md](PROJECT_PRINCIPLES.md) voor de projectprincipes en [AGENTS.md](AGENTS.md) voor de werkafspraken voor Codex.

## Status

De eerdere moduleacceptaties blijven ongewijzigd. Fase 3 Marketplace Transaction Platform v1 is technisch opgeleverd; integrale product-owneracceptatie en productiehardening staan open. De actuele status staat in [docs/05-voortgang.md](docs/05-voortgang.md).
