# Besluitenregister

## 12 juli 2026

| ID | Besluit | Toelichting |
| --- | --- | --- |
| B-001 | De project- en merknaam is `WorkMatchr`. | De schrijfwijze is overal exact en consequent. |
| B-002 | Per opdracht worden maximaal drie aanbieders geselecteerd. | De selectie blijft overzichtelijk en inhoudelijk relevant. |
| B-003 | WorkMatchr is volledig onafhankelijk. | Betaalde voorkeursposities zijn uitgesloten. |
| B-004 | Credits worden gekocht en uitgegeven per 10 of een veelvoud van 10. | Prijzen en technische uitwerking volgen later. |
| B-005 | De beheerder kan handmatig ingrijpen. | Geautomatiseerde processen nemen de eindregie niet over. |
| B-006 | De gebruikersinterface gebruikt de aanspreekvorm `U` en `Uw`. | Code en technisch gebruikelijke namen blijven Engels. |
| B-007 | Lichtblauw is de primaire huisstijlkleur. | De huidige token is tijdelijk en wordt later vervangen door de exacte logokleur. |
| B-008 | WorkMatchr ontwikkelt zich tot digitale arbo-adviseur. | Het platform helpt eerst de vraag te begrijpen en matcht daarna. |
| B-009 | Versie 1 gebruikt dynamische vraagbomen. | De functionele en technische uitwerking volgt in een latere module. |
| B-010 | AI-intake volgt in latere versies. | AI wordt niet binnen Module 2A gebouwd. |
| B-011 | Publieke website en applicatie vormen visueel en technisch één consistent systeem. | Gedeelde design-tokens en componenten zijn de basis. |
| B-012 | Module 1 gebruikt Next.js App Router, TypeScript en Tailwind CSS. | Dit vormt de schaalbare basis van de webapplicatie. |
| B-013 | Database, authenticatie en betalingen volgen later. | Keuzes worden pas gemaakt wanneer de betreffende module start. |
| B-014 | De publieke homepage begint bij de situatie van de organisatie. | De gebruiker hoeft vooraf niet te weten welke specialist nodig is. |
| B-015 | Eén invoer ondersteunt concrete specialistvragen en open hulpvragen. | De invoer blijft demonstratief totdat een latere module de intake bouwt. |
| B-016 | De publieke visuele richting is overwegend licht. | Wit en lichtblauw domineren; donkerblauw blijft beperkt tot tekst en kleine accenten. |
| B-017 | De homepage gebruikt een originele lokale procesvisual. | Externe stockbeelden en generieke veiligheidsclichés zijn uitgesloten. |
| B-018 | WorkMatchr gebruikt lokaal poort 3001. | Poort 3000 hoort bij een ander project en wordt niet als WorkMatchr-testadres gerapporteerd. |
| B-019 | PostgreSQL 17 is de relationele database en Prisma ORM 7 de datalaag. | Dit biedt transacties, constraints, getypeerde toegang en versiebeheerbare migraties. |
| B-020 | Alle kernentiteiten gebruiken UUID's en UTC-tijdstempels met tijdzone. | Identiteiten blijven omgeving-onafhankelijk en tijdregistratie eenduidig. |
| B-021 | Gebruikers, organisaties en lidmaatschappen zijn afzonderlijke entiteiten. | Een gebruiker kan bij meerdere organisaties horen en organisaties kunnen opdrachtgever, aanbieder of beide zijn. |
| B-022 | Historische bedrijfsgegevens worden niet automatisch cascade-verwijderd. | Deactivatie, archivering en restrictieve relaties beschermen audit- en transactiesporen. |
| B-023 | Aanbiederselecties slaan bron, status, score en score-uitleg op. | Automatische en handmatige selecties blijven later controleerbaar. |
| B-024 | Maximaal drie actieve aanbieders wordt later transactioneel afgedwongen. | Deze regel raakt meerdere rijen en kan niet betrouwbaar met alleen een statische databaseconstraint worden geborgd. |
| B-025 | Credits gebruiken een rekening plus onveranderlijk transactielogboek. | Saldo en mutatie worden later atomair bijgewerkt; kopen en besteden gebeurt per 10 of een veelvoud daarvan. |
| B-026 | Externe verwijzing en zelf afgehandelde opdrachten staan in een afzonderlijke resolutie. | Een normale aanbiederselectie verwijst daardoor altijd naar een echte aanbieder. |
| B-027 | De lokale PostgreSQL-omgeving draait via Docker Compose. | Ontwikkelaars gebruiken dezelfde reproduceerbare databasebasis. |
| B-028 | Seed-data bevat uitsluitend niet-persoonlijke referentiedata. | De seed is idempotent en veilig herhaalbaar. |
| B-029 | Authenticatie, dynamische intake, matching, betalingen en creditslogica vallen buiten Module 3. | Het datamodel bereidt deze modules voor zonder onafgemaakte functionaliteit te activeren. |
| B-030 | De productiedatabaseprovider is nog niet gekozen. | Hosting, back-ups, hersteldoelen, monitoring en datalocatie worden vóór livegang afzonderlijk beoordeeld. |

Zie [ADR-001](adr/ADR-001-design-system-en-huisstijl.md) voor de onderbouwing van het design system.
Zie [ADR-002](adr/ADR-002-postgresql-prisma-en-datamodel.md) voor de database- en datamodelkeuzes.
