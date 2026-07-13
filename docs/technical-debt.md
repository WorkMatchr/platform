# Technical debt

| ID | Prioriteit | Reden | Geplande oplossing | Doelmodule |
| --- | --- | --- | --- | --- |
| TD-001 | Hoog | Het definitieve WorkMatchr-logo ontbreekt. | Definitief logo ontwerpen, valideren en als toegankelijke asset toevoegen. | Na ontvangst definitief logo |
| TD-002 | Hoog | De exacte primaire kleur uit het FSC-logo ontbreekt. | `brand-primary` vervangen door de definitieve logokleur en contrast opnieuw toetsen. | Na ontvangst definitieve kleur |
| TD-003 | Middel | Tijdelijke ankerlinks bestaan nog. | Vervangen door definitieve routes zodra de betreffende pagina’s worden gebouwd. | Latere publieke module |
| TD-004 | Middel | Juridische pagina’s zijn nog niet gebouwd. | Privacy en algemene voorwaarden inhoudelijk en technisch opleveren. | Nog te bepalen |
| TD-005 | Hoog | De intake op de homepage is demonstratief en niet functioneel. | Dynamische intake later als afzonderlijke, gevalideerde module bouwen. | Latere intakemodule |
| TD-006 | Hoog | De productieprovider, back-upstrategie en monitoring voor PostgreSQL zijn nog niet gekozen. | Selecteer de productieomgeving en leg hersteldoelen, back-ups en monitoring vast. | Productievoorbereiding |
| TD-007 | Hoog | Authenticatie en autorisatie zijn nog niet gekoppeld aan `User` en lidmaatschappen. | Implementeer veilige authenticatie en rolcontrole. | Module 4 |
| TD-008 | Middel | De intake- en specialismenstructuur is nog statisch. | Ontwerp versieerbare dynamische vraagbomen zonder Module 3 te vervuilen. | Latere intakemodule |
| TD-009 | Hoog | Maximaal drie actieve aanbiederselecties is nog niet transactioneel afgedwongen. | Voeg een transactionele selectieservice met locking en tests toe. | Matchingmodule |
| TD-010 | Hoog | Creditsaldo, transactielogboek en veelvouden van 10 hebben nog geen servicelaag. | Implementeer één atomaire creditsservice met locking en invarianttests. | Creditsmodule |
| TD-011 | Middel | Eén primaire organisatielocatie wordt nog niet over meerdere rijen afgedwongen. | Borg dit transactioneel in de toekomstige organisatieservice. | Organisatiemodule |
| TD-012 | Middel | JSON-velden hebben nog geen runtime schemavalidatie. | Voeg versieerbare schema's en validatie aan de servicegrenzen toe. | Bij eerste gebruik JSON-velden |
| TD-013 | Middel | Bewaartermijnen en AVG-verwijder-/anonimiseringsbeleid zijn nog niet vastgesteld. | Stel beleid vast en vertaal dit naar archivering en anonimisering. | Juridische/productievoorbereiding |
| TD-014 | Hoog | Definitieve WorkMatchr-e-mailafzender en domeinauthenticatie ontbreken. | Resend-domein, SPF, DKIM en DMARC configureren en testen. | Productievoorbereiding |
| TD-015 | Hoog | Productieproxy, trusted origins en client-IP-bron zijn nog niet vastgesteld. | Per deployment vastleggen en rate-limiting end-to-end testen. | Productievoorbereiding |
| TD-016 | Hoog | Juridische privacyverklaring en algemene voorwaarden zijn placeholders. | Juridisch definitieve pagina’s opleveren vóór livegang. | Juridische module |
| TD-017 | Middel | Organisatie-onboarding en memberships ontbreken. | Uitwerken zonder vooruit te lopen op autorisatie. | Module 4B |
| TD-018 | Middel | Uitnodigingen voor organisatieleden ontbreken. | Veilige uitnodigingsflow ontwerpen. | Module 4B |
| TD-019 | Middel | Platformbeheerinterface ontbreekt. | Afzonderlijke beheerfunctionaliteit met audit bouwen. | Latere beheermodule |
| TD-020 | Laag | MFA en passkeys zijn nog niet beoordeeld. | Risicogestuurd beoordelen voor een latere versie. | Latere securitymodule |
| TD-021 | Laag | Social login valt buiten versie 1. | Alleen heroverwegen bij aantoonbare gebruikersbehoefte. | Latere versie |
| TD-022 | Laag | Gebruikers hebben nog geen sessiebeheerpagina. | Actieve sessies en handmatige intrekking later beoordelen. | Latere accountmodule |
| TD-023 | Hoog | Authbewaartermijnen en privacyverwijdering zijn nog niet definitief. | Retentie en anonimisering juridisch en technisch vastleggen. | Productievoorbereiding |
