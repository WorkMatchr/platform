# Technical debt

| ID | Prioriteit | Reden | Geplande oplossing | Doelmodule |
| --- | --- | --- | --- | --- |
| TD-001 | Hoog | Het definitieve WorkMatchr-logo ontbreekt. | Definitief logo ontwerpen, valideren en als toegankelijke asset toevoegen. | Na ontvangst definitief logo |
| TD-002 | Hoog | De exacte primaire kleur uit het FSC-logo ontbreekt. | `brand-primary` vervangen door de definitieve logokleur en contrast opnieuw toetsen. | Na ontvangst definitieve kleur |
| TD-003 | Middel | Tijdelijke ankerlinks bestaan nog. | Vervangen door definitieve routes zodra de betreffende pagina’s worden gebouwd. | Latere publieke module |
| TD-004 | Middel | Privacy en algemene voorwaarden bevatten nog geen juridisch definitieve inhoud. | Juridische inhoud laten vaststellen en de bestaande pagina’s definitief opleveren. | Juridische module |
| TD-005 | Laag | De voorbeeldtekst op de homepage wordt niet vooraf ingevuld in de beveiligde intake. | Pas na een afzonderlijke privacy- en authenticatiekeuze bepalen of veilige overdracht wenselijk is. | Latere UX-verfijning |
| TD-006 | Hoog | De productieprovider, back-upstrategie en monitoring voor PostgreSQL zijn nog niet gekozen. | Selecteer de productieomgeving en leg hersteldoelen, back-ups en monitoring vast. | Productievoorbereiding |
| TD-007 | Hoog | Een platformbeheerinterface voor organisatie-ingrijpen ontbreekt. | Bouw afzonderlijke, auditeerbare beheeracties. | Latere beheermodule |
| TD-008 | Middel | De versieerbare intakefundering en conceptservice bestaan, maar vraagsetpublicatiebeheer en toekomstige vertakkingen ontbreken nog. | Bouw gecontroleerd publicatiebeheer; voeg vertakkingen pas na afzonderlijk ontwerp toe. | Latere vraagboommodule |
| TD-009 | Hoog | Maximaal drie actieve aanbiederselecties is nog niet transactioneel afgedwongen. | Voeg een transactionele selectieservice met locking en tests toe. | Matchingmodule |
| TD-010 | Hoog | Creditsaldo, transactielogboek en veelvouden van 10 hebben nog geen servicelaag. | Implementeer één atomaire creditsservice met locking en invarianttests. | Creditsmodule |
| TD-011 | Middel | Eén primaire organisatielocatie wordt transactioneel maar nog niet met een databasebrede partiële constraint bewaakt. | Beoordeel een PostgreSQL-partiële unieke index naast de servicelaag. | Databasehardening |
| TD-012 | Middel | JSON-velden hebben nog geen runtime schemavalidatie. | Voeg vóór het eerste functionele gebruik versieerbare schema's en validatie aan de servicegrenzen toe. | Module 5 |
| TD-013 | Middel | Bewaartermijnen en AVG-verwijder-/anonimiseringsbeleid zijn nog niet vastgesteld. | Stel beleid vast en vertaal dit naar archivering en anonimisering. | Juridische/productievoorbereiding |
| TD-014 | Hoog | Definitieve WorkMatchr-e-mailafzender en domeinauthenticatie ontbreken. | Resend-domein, SPF, DKIM en DMARC configureren en testen. | Productievoorbereiding |
| TD-015 | Hoog | Productieproxy, trusted origins en client-IP-bron zijn nog niet vastgesteld. | Per deployment vastleggen en rate-limiting end-to-end testen. | Productievoorbereiding |
| TD-016 | Hoog | Juridische privacyverklaring en algemene voorwaarden zijn placeholders. | Juridisch definitieve pagina’s opleveren vóór livegang. | Juridische module |
| TD-017 | Middel | Collega-uitnodigingen en membershipbeheer ontbreken. | Veilige uitnodigings- en rollenbeheerflow ontwerpen. | Latere membershipmodule |
| TD-018 | Middel | Volledige aanbieder-onboarding ontbreekt. | Specialismen, certificaten en profielvoltooiing afzonderlijk bouwen. | Latere providermodule |
| TD-019 | Middel | Platformbeheerinterface ontbreekt. | Afzonderlijke beheerfunctionaliteit met audit bouwen. | Latere beheermodule |
| TD-020 | Laag | MFA en passkeys zijn nog niet beoordeeld. | Risicogestuurd beoordelen voor een latere versie. | Latere securitymodule |
| TD-021 | Laag | Social login valt buiten versie 1. | Alleen heroverwegen bij aantoonbare gebruikersbehoefte. | Latere versie |
| TD-022 | Laag | Gebruikers hebben nog geen sessiebeheerpagina. | Actieve sessies en handmatige intrekking later beoordelen. | Latere accountmodule |
| TD-023 | Hoog | Authbewaartermijnen en privacyverwijdering zijn nog niet definitief. | Retentie en anonimisering juridisch en technisch vastleggen. | Productievoorbereiding |
| TD-024 | Hoog | Providergoedkeuring en beheeracties ontbreken. | Review-, goedkeurings- en schorsingsflow met audit bouwen. | Latere beheermodule |
| TD-025 | Hoog | Definitieve productieobject-storageprovider ontbreekt. | Vendor, datalocatie, authenticatie en delivery kiezen en implementeren. | Productievoorbereiding |
| TD-026 | Hoog | Back-ups en lifecyclebeleid voor organisatielogo’s ontbreken. | Retentie, versiebeheer, orphan-cleanup en hersteldoelen vastleggen. | Productievoorbereiding |
| TD-027 | Hoog | Organisatieprofielwijzigingen worden nog niet geaudit. | Append-only auditregistratie aan centrale services koppelen. | Latere auditmodule |
| TD-028 | Middel | Organisatiearchivering en herstelproces ontbreken. | Statusovergangen, gevolgen en beheerherstel ontwerpen. | Latere beheermodule |
| TD-029 | Hoog | AVG-bewaartermijnen voor organisatiegegevens ontbreken. | Juridisch beleid vertalen naar archivering en anonimisering. | Juridische/productievoorbereiding |
| TD-030 | Middel | Export en verwijdering van organisatiegegevens ontbreken. | Veilige export- en verwijderworkflow ontwerpen. | Latere privacy-module |
| TD-031 | Laag | Tijdelijke developmentlogging voor de logo-uploadketen is nog aanwezig. | Verwijder de tijdelijke diagnosevelden of vervang ze door het toekomstige centrale observabilitybeleid. | Eerstvolgende onderhoudsmoment |
| TD-032 | Middel | Definitieve, juridisch bruikbare opdrachtnummering ontbreekt. | Nummeringsregels, tenantbereik, onveranderlijkheid en migratiebeleid productmatig vaststellen. | Latere opdrachtmodule |
| TD-033 | Laag | Inhoudsrevisies worden technisch bewaard maar hebben nog geen afzonderlijke vergelijkingsweergave. | Privacybewuste revisievergelijking ontwerpen wanneer gebruikers die nodig hebben. | Latere opdrachtmodule |
| TD-035 | Middel | De geaccepteerde publicatiefundering en opdrachtgeverinterface bestaan; matching, aanbiedersreacties en credits ontbreken bewust. | Ontwerp de overige domeinen afzonderlijk zonder de afgeronde publicatieflow uit te breiden. | Module 6 en latere modules |
| TD-036 | Middel | Notificaties en auditlogweergave ontbreken. | Privacybewuste notificatie- en auditpresentatie ontwerpen. | Latere modules |
| TD-037 | Hoog | AVG-bewaartermijnen voor intake-, antwoord-, opdracht- en revisiehistorie ontbreken. | Juridisch beleid vaststellen en vertalen naar gecontroleerde retentie en anonimisering. | Productievoorbereiding |
| TD-038 | Laag | De publicatielabels zijn geaccepteerd, maar labels voor toekomstige matchingstatussen blijven onontworpen. | Ontwerp en valideer matchinglabels in de matchingmodule. | Matchingmodule |
| TD-040 | Middel | Correctie en herpublicatie van een ingetrokken opdracht zijn bewust niet ontworpen. | Alleen bij aantoonbare productbehoefte meerdere publicatie-episodes en downstreamherstel ontwerpen. | Latere opdrachtmodule |
