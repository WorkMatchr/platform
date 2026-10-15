# A07 fase 1 — verwerkingen, privacy en cookies (concept)

Issue #35. Onderzoeksdatum: 14 oktober 2026. Basis: `origin/main` `d3bce31248cf496f4c0563e210addbcb8d2e721c` (A03–A05 aanwezig, A06 PR #39 nog niet gemerged). Dit is voorbereiding, geen afgeronde integrale A07-acceptatie en geen toestemming voor juridische publicatie.

## Bewijsniveaus en grenzen

- **Code bevestigd (C):** verwerking is aantoonbaar geïmplementeerd op deze baseline. Dit bewijst niet dat elke koppeling in productie aanstaat of dat een bewaarbeleid operationeel wordt uitgevoerd.
- **Waargenomen (W):** hieronder expliciet afgebakende browser-/HTTP-controle. Geen ingelogde sessie, betaalflow, e-mailverzending, databasequery of providerinstelling is gewijzigd.
- **Product Owner bevestigd (P):** door de eigenaar opgegeven configuratie; geen onafhankelijke technische controle van instellingen of mailboxinhoud.
- **Leverancier gedocumenteerd (L):** publieke providerhandleiding, geen bewijs dat de functie op het WorkMatchr-pakket beschikbaar of ingesteld is.
- **Voorstel/open (O):** rechtsgrond, belangenafweging, contractrol, termijn of eigenaarbesluit moet worden bevestigd. Een schemakolom of leveranciersmarketing is geen bewijs van uitvoering of afgesloten overeenkomst.

De vorige A06-bevindingen worden als afhankelijkheid benoemd, niet als op main geïmplementeerde functionaliteit. Het contactformulier wordt door deze PR niet toegevoegd of aangezet. Geen database/migratie/package/lockfile/financiële wijziging.

## Identiteit en centraal beheer

De Product Owner heeft voorlopig opgegeven: Feenstra Safety Consulting, handelend onder de naam WorkMatchr, KvK 57788863, huidig correspondentieadres Kennemerland 71, 9405 LC Assen. Het officiële privacycontact contact@workmatchr.nl is inmiddels expliciet door de Product Owner bevestigd (P). **De bedrijfsgegevens blijven te bevestigen. Verplicht vóór livegang: vaststellen van het nieuwe postadres in Zwolle, vervanging van het huidige adres en expliciete PO-validatie.** Er is geen fictief Zwolle-adres ingevuld.

De beide conceptpagina's gebruiken `src/config/legal-identity.ts`. Dit is uitsluitend een bron voor actuele juridische conceptinformatie. De verkopersconfiguratie `src/lib/finance/financial-contract.ts`, facturen en historische snapshots worden niet aangepast of gekoppeld aan een veranderlijk conceptadres. Bij latere livegang afzonderlijk beoordelen welke actuele bedrijfsinstellingen moeten wijzigen; historische documenten niet herschrijven.

## Verwerkingsoverzicht

Onderstaande grondslagen zijn **vermoedelijke grondslagen**, geen vastgesteld register. Overeenkomst (AVG 6 lid 1 b) alleen voor zover de betrokkene zelf contractspartij is of op eigen verzoek precontractuele stappen neemt. Voor werknemers/contactpersonen is niet automatisch dezelfde grondslag geldig. Gerechtvaardigd belang (6 lid 1 f) vereist doel, noodzakelijkheid, belangenafweging en bezwaarprocedure. Wettelijke plicht (6 lid 1 c) moet worden gekoppeld aan de concrete verplichting. Geen algemene toestemming construeren uit gebruik van de website.

**Rolafbakening:** voor eigen accounts, platformexploitatie, beveiliging en administratie is WorkMatchr voorlopig als verantwoordelijke behandeld. Voor door organisaties beheerde dossiers en personeelsgegevens moet PO/juridisch adviseur per dienst vaststellen of WorkMatchr verwerker, verantwoordelijke of mede-verantwoordelijke is. Opdrachtgever en professional kunnen zelfstandig verantwoordelijk zijn voor eigen aangeleverde gegevens; geen blanket-verwerkersclaim. Onderstaande ontvangers betreffen code en expliciet gemarkeerde PO-bevestigingen, niet een gecontroleerde lijst afgesloten overeenkomsten.

| Verwerking / betrokkenen | Gegevens en doel (C) | Vermoedelijke grondslag / rol (O) | Ontvangers en doorgifte | Bewaren: aangetoond / nog vaststellen | Beveiliging en bewijs |
|---|---|---|---|---|---|
| Publieke bezoekers | HTTP-verzoeken, IP/browser en eventuele hostinglogs voor aflevering/beveiliging; geen analyticsintegratie in code gevonden | 6f veilige beschikbare website; WorkMatchr eigen verantwoordelijkheid | Vercel/hosting; internationale toegang en logregio open | Hostinglog- en back-upretentie onbekend; niet gelijkstellen aan cookielevensduur | TLS op productie waargenomen; `src/app/layout.tsx`, `src/app/globals.css`, `next.config.ts`; geen externe script/iframe-integratie gevonden |
| Contactpersonen | E-mail, naam, bericht/bijlagen via bestaande mailto-contactroutes; A06: toekomstige velden naam/e-mail/onderwerp/bericht en abuse-controls | 6f correspondentie of 6b concrete aanvraag; 6c alleen bij specifieke rechtenverzoeken; WorkMatchr eigen verantwoordelijkheid | P: contact@workmatchr.nl via Vimexx-forwarder naar info@workmatchr.nl bij Vimexx. A06 gebruikt Resend voor uitgaande applicatiemail. Technische mailboxcontrole, contract/regio en doorgifte open | Definitief PO-beleid 15 oktober: ontvangen algemene mail max. één jaar na ontvangst, inbox én archief; noodzakelijke uitzondering bij lopende zaak, klacht, geschil of andere behandeling met gerechtvaardigde reden. Eigenaar verantwoordelijk voor handmatige controle/verwijdering en herbeoordeling na afronding. Exacte Vimexx-trash/backupretentie en uitvoering nog niet geverifieerd | Huidige `src/app/contact/page.tsx`; A06-documentatie in PR #39. Geen mails getest |
| Registratie/authenticatie | Naam/e-mail, wachtwoordhash, verificatie/reset, sessietoken, IP/user-agent, status; veilige toegang/herstel | 6b eigen contract; anders 6f toegang/beveiliging; WorkMatchr eigen verantwoordelijkheid | Database/Neon, Vercel, Resend; HIBP-servercontrole (hashprefix); doorgifte zie leveranciersmatrix | Sessiegeldigheid 7 dagen, update na 1 dag; verificatie/reset 1 uur. Geen bewijs dat verlopen DB-records direct verdwijnen. Accountverwijder/purgebeleid open | `src/lib/auth.ts`, `auth-policy.ts`, Prisma `User/Account/Session/Verification/RateLimit`; Better Auth hashing; productie Secure/HttpOnly/SameSite=Lax; actieve-statuscontroles |
| Organisaties/memberships | Zakelijke naam/adres/contact, leden, rollen en uitnodigingen; tenantbeheer/toegang | 6b/6f; rol bij door werkgever aangeleverde gegevens bevestigen | Eigen organisatie en bevoegde beheerders; hosting/database; eventuele logo-opslag | Geen generiek operationeel vernietigingsschema aangetoond; termijn na uitdiensttreding/einde contract plus uitzonderingen vaststellen | `src/lib/organizations/organization-authorization.ts`, `src/lib/account-architecture/*`, `docs/organizations.md`; actuele membership/accountstatus server-side; blokkering ≠ verwijdering |
| Opdrachtgevers/opdrachten/offertes | Vrije tekst, deskundigheid, locatie, planning, snapshots, auditactor, reacties/offertes; publicatie, matching en samenwerking | 6b/6f; rol organisatie/professional per dienst nog vaststellen | Passende professionals krijgen afgeschermde preview; vrijgegeven detailinformatie volgens deelname/toegangsregels; bevoegde beheerders | Publicatie-snapshot/audit append-only; geen algemene purge aangetoond. Noodzaak en bewaartermijn inclusief geschilbewaring apart besluiten | `src/lib/requests/simple-advice-service.ts`, `request-assignment-handoff*`, `src/lib/marketplace/assignment-preview*`; canonieke keten en tenantchecks blijven ongewijzigd |
| Dienstverleners/professionals | Displaynaam, contactmail, expertise, regio/capaciteit, kwalificatie- en bewijsdocumenten, verzekering/reviews; geschiktheid/presentatie | 6b/6f; selectie-impact en artikel 22/DPIA-beoordeling open; bewijsdocumenten kunnen overtollige of bijzondere gegevens bevatten | Bevoegde organisatie/beheer; presentatie/preview volgens toegang; opslagprovider waar ingeschakeld | Termijn geldigheidsbewijzen, afwijzingen, verouderde revisies en dossiers open | Prisma `ProviderProfile`, `ProviderProfessionalPrivateData` (displayName/contactEmail), `ProviderEvidence*`, `ProviderQualification*`; `src/lib/providers/provider-authorization.ts`; geen medische-dossierfunctie aannemen |
| Berichten/notificaties | Gespreksinhoud, afzender/ontvanger, tijd, gelezenstatus, voorkeuren; opdrachtcommunicatie en maildelivery | 6b/6f; geen marketingtoestemming afleiden uit functionele e-mailvoorkeur | Kanaaldeelnemers; Resend ontvangt template/ontvanger; Vercel/Neon; externe mailbox | DB-berichten/outbox geen generieke purge aangetoond. Resend leveranciersclaim 30 dagen op genoemde plannen ≠ WorkMatchr bewaarbeleid | `src/lib/marketplace/notification-service.ts`, `assignment-notification.ts`, Prisma `MarketplaceMessage/Notification/NotificationOutbox`; kanaalautorisatie en idempotente outbox; mailtracking-dashboardinstellingen onbekend |
| Credits/abonnementen/betalingen/boekhouding | Saldo/ledger, aankoop, betaalreferenties, factuuradres/naam/btw, abonnement/mandaatreferenties; uitvoering/administratie | 6b en 6c fiscale plicht; WorkMatchr eigen administratie. Mollie zelfstandig verantwoordelijke voor eigen betaaldienst/wettelijke doelen, Jortt beoogd verwerker administratie | Mollie, Jortt, Resend voor factuurmail, hosting/database. Exacte contracten/subverwerkers/regio's open | Fiscale basisgegevens in beginsel 7 jaar; startpunt/uitzonderingen bepalen met boekhouder. Alleen `FinancialMaintenanceRun` opruiming na 90 dagen codebevestigd, geen algemene factuurverwijdering | `src/lib/finance/mollie-gateway.ts`, `financial-purchase-service.ts`, `subscription-service.ts`, `jortt-api-gateway.ts`, `financial-maintenance-service.ts`; gehoste Mollie-checkout, geen betaalactie uitgevoerd |
| Compliance Scan / Arbo-wijzer | Gratis intake: antwoorden/stepIndex lokaal, geen serverresultaat. Ingelogde wijzer: organisatie, uitvoerder, answersSnapshot/reportSnapshot/versie/tijd; hervatten/resultaten | 6b/6f; rol voor personeelsgegevens en impact van beoordeling open | Gratis concept alleen browser; ingelogde resultaten Vercel/Neon en organisatiebevoegden | localStorage geen TTL, verwijderen bij afronden/herstart; opgeslagen scans/revisies geen vastgesteld purgebeleid | `src/components/public/compliance-free-intake.tsx`, `src/app/wijzers/compliance/runs/route.ts`, `src/lib/arbo-guides/arbo-guide-run-service.ts`; server-side autorisatie en idempotentie; geen juridische-certificeringsclaim |
| E-learning | Op deze main: openbare cursus-/roadmappagina's; geen enrollment, voortgangsregistratie of certificaatbackend aangetroffen | Alleen webbezoek zoals eerste rij; toekomstige leergegevens nog geen actieve verwerking verklaren | Hosting; overige verwerking eerst opnieuw inventariseren bij implementatie | Geen leerresultatentermijn verzinnen | `docs/public-learning-roadmap.md`, `src/app/e-learning`, afwezigheid leerresultaatmodellen in huidige Prisma-schema; andere dirty worktrees niet als bewijs gebruikt |
| Beheer/beveiliging | Actor/org/actie/tijd/redenen, sessie-/limitergegevens, audit- en operationele logs; ondersteuning/misbruikbestrijding/verantwoording | 6f; 6c alleen specifieke plicht; WorkMatchr eigen verantwoordelijkheid | Bevoegde platformbeheerders, hosting/database. Externe logdrains onbekend | Audit/RateLimit/backup algemene bewaartermijnen en uitvoering nog open; lifecyclekolommen bewijzen geen werkende anonymisatie | `AdminActionLog`, `MarketplaceAuditEvent`, `KnowledgeAuditEvent`; `src/lib/platform-admin/platform-admin-authorization.ts`, `src/lib/account-architecture/account-lifecycle-service.ts`; geen claim dat platform-MFA verplicht geïmplementeerd is |

## Leveranciers en internationale doorgifte

| Partij | Technisch/extern bevestigd | Nog te bevestigen vóór definitieve verklaring |
|---|---|---|
| Vercel / Blob | Hostingarchitectuur en private Blob-adapter in `src/lib/knowledge/knowledge-source-upload-storage.ts`; publieke DPA bevat doorgiftekaders | Projectregio, logdrains/analyticsinstellingen, log/backupretentie, feitelijk gebruikte stores, contractversie/subverwerkers; EU-hosting sluit toegang van buiten EER niet uit |
| Neon | PostgreSQL is databasetechnologie, geen afzonderlijke leverancier. Prisma PostgreSQL; eerdere productiecontext noemt Neon. Geen productieverbinding of records voor A07 geopend | Actuele contractentiteit/plan, regio, branch/backups, toegangslanden en toepasselijke DPA, inclusief eventuele Databricks-overgang; niet afleiden uit oude documentatie |
| Better Auth / HIBP | Better Auth is lokale library. Plugin verstuurt eerste 5 SHA-1-tekens naar `api.pwnedpasswords.com/range/…`, met padding, zonder volledige hash/wachtwoord/e-mail | Noodzakelijkheid/belangenafweging, providerrol en internationale netwerkinfrastructuur; niet als verzending van wachtwoorden beschrijven |
| Resend | `src/lib/email.ts` transport; leverancier beschrijft VS-opslag, SCC-kader, 30 dagen e-mail/logs voor Free/Pro/Scale en 7 dagen backups | Werkelijk plan, domeintracking, contract/DPA en subverwerkers bewijs ophalen. EU-verzendregio ≠ uitsluitend EER-opslag. Geen productiemail verzonden |
| Vimexx / ontvangende mailbox | P: automatische forwarder contact@workmatchr.nl → info@workmatchr.nl, ontvangende mailbox bij Vimexx. L: providerhandleidingen hieronder. Geen geauthenticeerde technische controle | PO/IT: pakket, contract/DPA, regio/subverwerkers/doorgifte, eventuele forwarderkopieën/logs, mailbox-/archief-/trash-/backupinstellingen, MFA en gemachtigden aantonen |
| Mollie | Gateway/checkout + eigen privacyverklaring; zelfstandig verantwoordelijke voor beschreven eigen betaaldienstdoelen | Contractspecifieke rolafbakening, betaalmethodes, retentie en internationale partijen; browsercookies na checkout niet getest |
| Jortt | Server-API naar api.jortt.nl/v3; publieke verwerkersovereenkomst beschikbaar | Van toepassing zijnde overeenkomst/account, subverwerkers en verwijder-/backupprocedure; geen financiële mutaties uitgevoerd |
| OpenAI (legacy) | `src/lib/public-intake/public-intake-ai-classification.ts` en Responses-adapter bestaan; activering afhankelijk van configuratie. Huidige `simple-advice-service.ts` bevat geen AI-classifiercall | Bereikbaarheid oude serveractions en feitelijk runtimegebruik/logs read-only vaststellen vóór stellige claim “geen AI” of opname als actieve ontvanger; geen tests met externe API of persoonsgegevens |
| GitHub scheduled maintenance | `.github/workflows/marketplace-notifications.yml` triggert beveiligde serverroute; geen direct Resend-transport of DB-secret vereist | Alleen operationele metadata bedoeld; huidige runoutputs/retentie niet voor A07 doorgelicht. Geen Actions-trigger uitgevoerd |

Een openbaar DPA-document bewijst geen afgesloten of passend ingevuld WorkMatchr-contract. Per doorgifte zijn bestemming, rol, rechtsinstrument en eventuele aanvullende maatregelen nodig; waar vereist transfer-impactassessment. Geen bewering van juridische certificering.

## Cookie- en opslaginventarisatie

De volledige bezoekerslijst met naam, techniek, aanbieder, doel, categorie, termijn, toestemming en bewijsniveau staat centraal in `src/content/public-legal.ts` en wordt op `/cookies` weergegeven. Geen waarden/tokens opgeslagen in dit rapport.

- `__Secure-better-auth.session_token`: productie Secure, HttpOnly, SameSite=Lax, path `/`; 7 dagen en vernieuwing na 1 dag. Lokale ontwikkelprefix kan ontbreken. Browsercookielevensduur is geen databaseverwijdertermijn.
- `__Secure-better-auth.dont_remember`: alleen bibliotheekpad rememberMe=false, sessieduur. Geen dergelijke keuze in huidig formulier. Niet als waargenomen actief presenteren.
- `session_data` / `account_data`: bibliotheek kent deze namen, maar `cookieCache` staat in WorkMatchr niet aan; niet opnemen als actief geplaatste cookies.
- `platform-admin-view`: sessiecookie, HttpOnly/SameSite=Lax/Secure in productie, pad `/platformbeheer`; alleen beheervariantkeuze.
- `workmatchr-simple-advice:v1:…`: sessionStorage met conceptvelden/vrije tekst/locatie/keuzes/stap/technische IDs, verwijderd na publicatie; anoniem concept wordt bij hervatting na login overgenomen/verwijderd. Geen eigen TTL; tabbladherstel kan bewaren.
- `workmatchr-simple-advice-login`: sessionStorage marker voor die hervatting, verwijderd na overname.
- `workmatchr:compliance-free-intake:v1`: localStorage answers/stepIndex, schrijft ook bij openen; geen TTL. Verwijdering bij resultaat/herstart, opnieuw invullen schrijft opnieuw. **Minimale opslagduur/noodzakelijkheid vóór definitieve vrijstelling beoordelen.**
- `wm_public_intake`: legacy HttpOnly/SameSite=Lax/Secure cookie met 90 dagen/pad `/advieswijzer`. Codeaanwezigheid bewijst geen nieuwe plaatsing in actuele `/opdracht-starten`-flow.
- Geen analytics/trackingpackage, script of embedded video gevonden in de onderzochte publieke code. Third-party betaalpagina's en dashboard-geactiveerde tracking zijn hiermee niet uitgesloten.

**Besluit nu:** geen automatische cookieconsentbanner toegevoegd. Noodzakelijke sessieauthenticatie/opdrachtcontinuïteit vormt een plausibele vrijstelling, maar de standaard persistente login zonder aparte keuze niet (zie herbeoordeling 15 oktober); de onbeperkte Compliance-conceptopslag is nog geen definitief bevestigde vrijstelling. PO/privacyadviseur moet bewaarbeperking of aantoonbare noodzaak besluiten. Niet-vrijgestelde technieken mogen niet actief worden zonder voorafgaande geldige toestemming. Als die worden aangetoond: blokkeer netwerk/opslag vooraf, gelijkwaardige Accepteren/Weigeren, geen voorafselectie, keuze per doel en permanent eenvoudige intrekking. Dit is een ontwerpvoorwaarde, geen geïmplementeerde CMP. A07-fase 1 maakt geen storage- of consentlogica anders.

## Browser- en netwerkbewijs / beperkingen

- Productie `/privacy` read-only geopend: bestaande placeholder daadwerkelijk zichtbaar; anonieme navigatie bood Inloggen. DOM-scriptbronnen waren uitsluitend eigen origin `www.workmatchr.nl`, 0 iframes op die pagina. Dit bewijst niet dat alle XHR/beacons of serverrequests ontbreken.
- Losse anonieme HTTP GET op `/privacy`, `/cookies`, `/inloggen`: alle drie 200, server Vercel, geen Set-Cookie-header in deze responses. Dit is geen volledige browsernetwerkcapture en sluit client-side opslag of latere cookies niet uit.
- Productie `/inloggen` read-only geopend, niet ingezonden. Geen bestaande ingelogde sessie beschikbaar; er is geen account aangemaakt of database gewijzigd.
- De beschikbare browser-API toont DOM/console maar geen volledige netwerkcapture, HttpOnly-cookiejar of opslaginspectie. Daarom worden cookieplaatsing/waarden na login, betaalprovider-cookies en een volledige netwerk-/storagecapture expliciet **niet** als getest aangemerkt. Geen browserbeveiliging omzeild.
- Vóór definitieve publicatie: PO/IT opent DevTools in een schoon browserprofiel; registreert uitsluitend namen/domeinen/path/SameSite/Secure/HttpOnly/duur (geen waarden), externe requestdomeinen en storagekeys voor homepage, opdrachtstart, gratis Compliance-intake; herhaalt dit na echte login en logout. Geen echte betaling nodig: providercheckout afzonderlijk in toegestane testomgeving controleren. Onderscheid browserdata van server-side requests en dashboardinstellingen.

## Beslislijst vóór juridische livegang

1. **PO:** bevestig verantwoordelijke/KvK; het privacycontact is PO-bevestigd; stel nieuw postadres Zwolle vast en vervang adres via centrale juridische configuratie. Tot dan blijven de bedrijfsgegevens concept.
2. **PO + privacyadviseur:** rolverdeling per platformdienst, concrete grondslagen en gerechtvaardigd-belangafweging; artikel 9/22 en DPIA-noodzaak bij kwalificatie/matching/scans onderzoeken. Geen medische-dossierclaim.
3. **PO + IT:** bewaarmatrix met doel/startpunt/termijn/uitzondering/verwijdermechanisme voor account, organisaties, opdrachten/snapshots, offertes/berichten, bewijsdocumenten, scans, audit/logs en backups; testen dat verwijdering ook downstream werkt.
4. **Eigenaar WorkMatchr:** vastgesteld e-mailbeleid uitvoeren/aantonen voor inbox en archief, inclusief jaarlijkse controle en noodzakelijke uitzonderingen; exacte Vimexx-prullenbak/backupretentie en toegang/MFA verifiëren. Geen instellingen of berichten gewijzigd in deze opdracht.
5. **PO + leveranciersbeheer:** contract/DPA/rol, subverwerkers, regio's/doorgiftewaarborgen en actuele retentie van Vercel/Neon/Resend/Mollie/Jortt/Vimexx vastleggen. Geen onbewezen “alles blijft in EU”.
6. **IT + privacyadviseur:** browser/netwerk vóór/na login en dashboards verifiëren; cookie/storagevrijstellingen inclusief localStorage-TTL beoordelen. Eventuele consentvoorziening apart laten implementeren vóór activering van niet-vrijgestelde techniek.
7. **PO + support:** rechtenprocedure met identiteitscontrole, één-maandreactie, verzoekregister met beperkte retentie, klacht-/datalekprocedure en bereikbaarheid contactadres operationaliseren.
8. **Releasebeheerder:** A06 blijft uit; pas na eigen acceptatie/integratie in main opnieuw verwerkingsregister en contact-/mailflow controleren. Fase 1 sluit issue #35 niet af en is geen juridische publicatiegoedkeuring.

## Primaire bronnen (geraadpleegd 14 oktober 2026)

- [AVG, officiële EUR-Lex-verwijzing](https://eur-lex.europa.eu/eli/reg/2016/679/oj): artikelen 5, 6, 9, 12–22, 28, 32, 35 en 44 e.v. De directe geautomatiseerde tekst-/PDF-opvraag kreeg een robotcontrole; exacte wettekst vóór formele vaststelling door jurist controleren. Uitleg hieronder is mede gecontroleerd aan AP-bronnen.
- [AP: recht op informatie](https://autoriteitpersoonsgegevens.nl/nl/zelf-doen/privacyrechten/recht-op-informatie) en [privacyrechten in de praktijk](https://autoriteitpersoonsgegevens.nl/themas/basis-avg/privacyrechten-avg/voor-organisaties-privacyrechten-in-de-praktijk): informatieplicht en afhandeling rechten.
- [AP: AVG algemeen](https://autoriteitpersoonsgegevens.nl/themas/basis-avg/avg-algemeen): rol verantwoordelijke; contractuele rol niet uit alleen hostingnaam afleiden.
- [Rijksoverheid: cookies](https://www.rijksoverheid.nl/documenten/vraag-en-antwoord/telecommunicatie/mag-een-website-ongevraagd-cookies-plaatsen), [AP: heldere cookiebanners](https://autoriteitpersoonsgegevens.nl/themas/internet-slimme-apparaten/cookies/heldere-cookiebanners), [AP: onjuiste banners aangepast](https://www.autoriteitpersoonsgegevens.nl/actueel/foute-cookiebanners-aangepast-na-ingrijpen-ap). Telecomwet 11.7a is relevant; directe wetten.overheid.nl-opvraag niet toegankelijk. Geen blanket-vrijstelling voor alle analytics/localStorage.
- [Rijksoverheid: fiscale bewaartermijn](https://www.rijksoverheid.nl/themas/werk/inkomstenbelasting/vraag-en-antwoord/inkomstenbelasting/hoe-lang-moet-ik-mijn-financiele-administratie-bewaren).
- [HIBP range API](https://haveibeenpwned.com/API/v3#PwnedPasswords), tevens geïnstalleerde Better Auth 1.6.23-plugin en cookiecode gelezen.
- [Resend security/retentie](https://resend.com/security), [Vercel DPA](https://vercel.com/legal/dpa), [Neon security](https://neon.com/security), [Neon platformvoorwaarden](https://neon.com/platform-terms), [Mollie privacy](https://www.mollie.com/legal/privacy), [Mollie rolafbakening](https://help.mollie.com/hc/en-gb/articles/14826542080786-What-is-the-Data-Processing-Agreement), [Jortt verwerkersovereenkomst](https://www.jortt.nl/over-ons/verwerkersovereenkomst/).

Leveranciersbronnen beschrijven algemene voorwaarden/mogelijkheden, niet bewezen WorkMatchr-instellingen. Sommige AP-pagina's waren via geïndexeerde primaire zoekresultaten beschikbaar maar blokkeerden directe opvraag (403); dat is geen bewezen gebroken bezoekerslink. Definitieve juridische vaststelling blijft open.

## Technische validatie

Nulmeting: na lokale Prisma-clientgeneratie (zonder databaseverbinding) 16/16 publieke route-/contacttests PASS. Eerste run miste uitsluitend gegenereerde client, verholpen door bestaande `prisma generate`. Definitieve resultaten volgen hieronder; geen mails of databasewrites nodig voor deze contentwijziging.

### Definitieve resultaten op A07-branch

- Gerichte tests: **22/22 PASS**, vier suites (`public-legal-pages`, `public-placeholder-routes`, `public-information-architecture`, `contact/page`). Cookies is uit de oude placeholdertest gehaald en wordt nu inhoudelijk als concept getest.
- Volledige `npm run lint`: **PASS**. Gerichte lint op definitieve taakcode eveneens uitgevoerd.
- Standalone `npm run typecheck`: **BASELINE_FAILURE**, precies vier TS2345-fouten in `src/lib/compliance/rule-engine.test.ts` op 13, 14, 23, 24 (readonly tuple versus mutable array). Test en regelengine identiek aan `origin/main`; geen fout in A07-bestanden. Niet gerepareerd.
- `npm run build`: **PASS**, bestaande niet-blokkerende tracingwaarschuwing bij `next.config.ts` via kennisbron-uploadketen. Automatisch gegenereerde `next-env.d.ts`-wijziging hersteld; geen buildartefact in commitset.
- `git diff --check`: **PASS**. Secrets-patterncontrole op de acht taakbestanden: **0 treffers** voor private keys/providercredentials/connection strings/secretassignments; geen volledige gitleaks-audit geclaimd.
- Lokale productiebuild op `http://127.0.0.1:3046`: beide conceptpagina's zichtbaar, wederzijdse links en footerlink met toetsenbord geactiveerd; focusring zichtbaar (2,4px). Eén h1 per pagina, h2/h3-structuur en gelabelde secties/definitielijsten. Geen consolewaarschuwingen/-fouten in gecontroleerd venster.
- Desktop 1366×900, mobiel 390×844 en tablet 768×1024 gecontroleerd. Documentbreedtes 1351/375/753px respectievelijk, geen horizontale overflow; lange opslagkeys breken binnen kaarten. Geen gegevens ingezonden. Lokale server gebruikt onbereikbare synthetische DB-configuratie en geen Resend-credential.
- Berekend contrast bestaande tokens: body 6,14:1 op wit, 5,65:1 op lichtblauw; koppen 14,89:1 op wit. Geen nieuw kleurenstelsel. Geen screenreader-audiotest of echte 200%-browserzoom geclaimd; handmatige eindacceptatie blijft open.
- Metadata: eigen title/description/canonical/Open Graph; `noindex, follow` behouden; beide routes blijven buiten de indexeerbare sitemap. Footer onveranderd. `noindex` is geen toegangsbeveiliging: de teksten zijn herkenbare concepten, geen vertrouwelijke stukken.
- Product Constitution: begrijpelijke Nederlandse informatie, geen juridische keurmerkclaim, dataminimalisatie expliciet; geen formulieren, acties, backend, prijzen of navigatie gewijzigd. React-review: statische servercomponenten, stabiele lijstkeys, geen nieuwe clientstate/providercalls.

### Exacte wijzigingsset

1. `docs/README.md` — indexlink.
2. `docs/a07-privacy-cookies.md` — dit verwerkingsoverzicht, bronnen, inventarisatie, beslislijst en bewijs.
3. `src/config/legal-identity.ts` — gecentraliseerde voorlopige juridische gegevens, expliciete Zwolle-releasevoorwaarde; geen facturatie-afhankelijkheid.
4. `src/content/public-legal.ts` — conceptverwerkingen en storage-inventaris.
5. `src/app/privacy/page.tsx` — conceptverklaring.
6. `src/app/cookies/page.tsx` — conceptverklaring.
7. `src/app/public-legal-pages.test.tsx` — gerichte concept/metadata/toegankelijkheidsstructuurtests.
8. `src/app/public-placeholder-routes.test.tsx` — vervallen cookieplaceholderverwachting verwijderen.

**Opleverstatus:** geschikt als onderzoeks-/concept-Draft PR; **niet vrijgegeven voor definitieve juridische publicatie**. Verplichte eigenaarbesluiten en runtime-/contractverificaties staan hierboven. Geen merge of deployment uitgevoerd.


### Aanpassing leverancierssectie op verzoek van de Product Owner

Op 14 oktober 2026 is de sectie hernoemd naar **Met wie delen wij persoonsgegevens?** en vervangen door de aangeleverde noodzakelijkheid-/leverancierscopy. De verwerkingstabel ondersteunt Vercel (hosting), Neon (databaseopslag), Resend (e-mail), Mollie (betalingen) en Jortt (boekhouding); niet iedere partij ontvangt dezelfde gegevens. PostgreSQL is technologie en wordt niet als leverancier gepresenteerd. Mollies zelfstandige rol voor eigen betaal-/wettelijke doeleinden blijft expliciet, evenals HIBP, de toen nog open mailboxprovider en internationale doorgifte. De latere PO-bevestiging van Vimexx hieronder vervangt uitsluitend die provideronzekerheid.

De bestaande inventarisatie en relevante beveiligings-/opslag-/Jortt-documentatie leveren geen gecontroleerd bewijs dat alle vereiste WorkMatchr-verwerkersafspraken bestaan en passend zijn. Publieke leveranciers-DPA’s zijn daarvoor onvoldoende. De zin over afspraken is daarom een **vereiste vóór definitieve publicatie**, met verificatie en invulling van ontbrekende afspraken, geen claim dat overeenkomsten reeds zijn gesloten. Geen bedrijfsgegevens, facturatie, database, runtimeconfiguratie of conceptstatus gewijzigd.

Validatie van deze aanvulling: **23/23 gerichte tests PASS**, volledige lint PASS, productiebuild PASS, diff-check PASS en secrets-patterncontrole 0 treffers. De bestaande niet-blokkerende NFT-tracingwaarschuwing blijft; geen nieuwe buildfout. Standalone TypeScript is voor deze copy-aanvulling niet opnieuw uitgevoerd; de eerdere vier baselinefouten blijven afzonderlijk hierboven gedocumenteerd.

## Vimexx-mailbox — PO-bevestiging en verificatie (14 oktober 2026)

### Bevestigde route en grenzen

**P:** officieel privacycontact `contact@workmatchr.nl` → automatische **Vimexx-forwarder** → `info@workmatchr.nl`, ontvangende mailbox eveneens **Vimexx**. Dit is de expliciete bevestiging van de Product Owner, geen onafhankelijk technisch geverifieerde instelling. Resend verzorgt de uitgaande applicatiemails en is een andere schakel dan de ontvangende mailbox. Rechtstreeks mailen naar het contactadres gebruikt niet noodzakelijk Resend.

Centrale juridische configuratie: `legalIdentityDraft.privacyEmail` en `privacyMailbox` in `src/config/legal-identity.ts`; PO-bewijs en ontbrekende technische verificatie zijn afzonderlijk benoemd. Dit configureert geen mailtransport of forwarding. De cookieverklaring gebruikt hetzelfde bevestigde privacycontact; overige cookie-inhoud blijft ongewijzigd. De voorlopige bedrijfsgegevens, het verplichte Zwolle-postadres en de conceptstatus blijven behouden.

**W: geen nieuwe geauthenticeerde mailboxinstellingen geverifieerd.** Geen mailbox geopend, mailinhoud opgevraagd, instelling gewijzigd of bericht verstuurd/verwijderd. Geen claim dat de forwarder alle berichten blijvend opslaat, noch dat hij geen kopieën/logs bewaart. Pakket, bestaande toegangsrechten, providercontracten en bewaartermijnen zijn nog niet bewezen.

### Provideronderzoek en concrete controlelijst

Alle onderstaande providerbronnen zijn op 14 oktober 2026 geraadpleegd. Functies zijn mogelijkheden (L), geen WorkMatchr-configuratiebewijs. PO/mailboxbeheerder kan de open punten read-only controleren; bij ontbrekende informatie een vraag aan Vimexx-support voor het eigen pakket. Deel uitsluitend een geschoonde instellingssamenvatting: geen wachtwoorden, tokens, herstelcodes, mailboxinhoud of persoonsgegevens.

| Onderdeel | Wat Vimexx documenteert (L) | Nog te verifiëren voor WorkMatchr / uitvoerder |
|---|---|---|
| Toegangsbeheer | Klantenpaneel kent intrekbare toegang voor een andere Vimexx-gebruiker, met ontwikkelaars- of administratieve rechten [V1]. Dit bewijst geen afzonderlijke mailboxdelegatie | PO: benoem bevoegde mailboxbeheerders en controleer beheer-, webmail-, IMAP/POP/SMTP-, apparaat- en hersteltoegang. Stel vast of persoonlijke, beperkte mailboxrechten mogelijk zijn; portaaltoegang is niet hetzelfde als mailboxtoegang. Geen gedeeld-wachtwoordmodel als bewezen veilige delegatie presenteren |
| Tweestapsverificatie | Aparte handleidingen beschrijven 2FA voor klantenpaneel [V2], DirectAdmin [V3] en Roundcube-webmail [V4]. Mailclients hebben afzonderlijke IMAP/POP/SMTP-instellingen [V5] | PO/IT: bewijs per toegangspad dat MFA aanstaat; controleer herstelrechten. Vraag Vimexx welke client-/app-wachtwoordmogelijkheden of beperkingen gelden. Webmail-MFA bewijst niet dat alle protocollen beschermd zijn. Toegang die niet passend beveiligd kan worden blijft een acceptatiepunt |
| Inbox en archief | Roundcube ondersteunt mappen, speciale mappen en filters [V6] | Mailboxbeheerder: inventariseer inbox, archief, verzonden mail, bijlagen en lokale exports/kopieën. Leg ontvangstdatum, behandelingsstatus en beoordelings-/verwijderdatum vast; filters bewijzen geen noodzakelijkheidstoets of uitgevoerde handmatige verwijdering |
| Automatische verwijdering / prullenbak | De geraadpleegde handleidingen leveren geen harde garantie voor een instelbare maximumtermijn van 30 dagen voor dit pakket | Mailboxbeheerder + Vimexx: bevestig server- én clientgedrag, expunge/definitief wissen, mogelijke uitzonderingen en handmatig alternatief. Geen automatische deletefunctie of gegarandeerde 30-dagenregeling geclaimd |
| Back-upretentie / herstel | Downloadhandleiding noemt pakketafhankelijke dagelijkse backups, minimaal 30 dagen, herstel/download per onderdeel inclusief e-mail [V7]. Herstelhandleiding noemt pakketafhankelijk tot 60 dagen en keuze van e-mail bij herstel [V8] | PO + Vimexx: identificeer pakket; vraag concrete frequentie, maximale uitfasering, locatie/toegangslanden, scope mailbox/forwarder/logs, herstelrechten en verwijderbaarheid. De verschillende algemene termijnen zijn geen vastgesteld WorkMatchr-retentiebeleid. Geen backup downloaden of herstellen voor deze inventarisatie |
| Forwarding / logs | DirectAdmin kan een alias naar een ontvangstadres doorsturen; meerdere ontvangers zijn mogelijk [V9] | PO/mailboxbeheerder: route read-only bevestigen, extra ontvangers/forwarders/catch-all/lokale kopie uitsluiten of inventariseren. Vimexx moet inhoud, toegang, bewaartermijn en locatie van transport-/spam-/forwardinglogs bevestigen; geen concrete logretentie gevonden in deze handleiding |
| Spam / quarantaine | SpamAssassin en spamfilters kunnen mail naar spambox sturen; SpamRelay kan SpamAssassin-instellingen omzeilen [V10] | Mailboxbeheerder: welk filter is werkelijk actief, waar komen geweigerde/verdachte berichten terecht, bestaat een aparte quarantaine, welke rechten/termijnen gelden? Geen quarantaine als aanwezig veronderstellen. Borg dat privacyvragen in spam tijdig worden herkend |

Bronnen:

- [V1 — Toegang voor derden](https://www.vimexx.nl/help/een-ander-vimexx-account-toegang-gegeven-tot-jouw-account).
- [V2 — 2FA klantenpaneel, sectie two-factor-authenticatie](https://www.vimexx.nl/help/hoe-beveilig-je-je-wordpress-website).
- [V3 — DirectAdmin en Two-Step Authentication](https://www.vimexx.nl/help/directadmin-inloggen).
- [V4 — 2FA Roundcube-webmail](https://www.vimexx.nl/help/hoe-schakel-ik-two-factor-authentication-2fa-in-op-mijn-webmail).
- [V5 — IMAP/POP3/SMTP-instellingen](https://www.vimexx.nl/help/email-instellingen-imap-pop3-smtp).
- [V6 — Roundcube-mappen en filters](https://www.vimexx.nl/help/hoe-stel-ik-roundcube-functies-in-zoals-filters-en-agenda).
- [V7 — Backups downloaden](https://www.vimexx.nl/help/hoe-download-ik-een-backup).
- [V8 — Backups herstellen](https://www.vimexx.nl/help/backup-tot-60-dagen-terug-plaatsen).
- [V9 — Automatische forwarding](https://www.vimexx.com/help/e-mails-automatisch-doorsturen-naar-ander-e-mailadres).
- [V10 — Spamfiltering](https://www.vimexx.eu/help/hoe-filter-ik-spam).

### Bewaarbeleid — definitief vastgesteld door Product Owner op 15 oktober 2026

| Categorie | Vastgesteld beleid / criterium | Nog te verifiëren |
|---|---|---|
| Algemene ontvangen e-mailberichten | Maximaal één jaar na datum van ontvangst; inbox en archief gelijk. Langere bewaring uitsluitend bij lopende zaak, klacht, geschil of andere noodzakelijke behandeling met gerechtvaardigde reden. Na afronding opnieuw beoordelen; niet meer nodige berichten verwijderen | Beleid definitief PO-bevestigd; uitvoering nog aantonen. Eigenaar WorkMatchr verantwoordelijk voor handmatige controle en verwijdering. Verplaatsen/afronden start geen nieuwe jaartermijn |
| Prullenbak | Technische verwijdering afhankelijk van providerinstellingen en bewaartermijnen | Exacte Vimexx-retentie en definitief wissen nog verifiëren; het eerdere voorstel van 30 dagen is geen vastgesteld beleid of garantie |
| Klachten, geschillen en andere noodzakelijke behandeling | Onder de expliciete uitzondering zolang daarvoor een gerechtvaardigde reden bestaat; na afronding opnieuw beoordelen | Noodzaak per uitzondering onderbouwen en periodiek toetsen. Geen generieke extra termijn of onbeperkte bewaring. Specifieke wettelijke verplichtingen afzonderlijk identificeren |
| Backups, exports en transportlogs | Alleen conform aantoonbaar vastgesteld Vimexx-beleid en beleid voor eigen kopieën | Maximale termijn en uitfasering vaststellen; backupwissen is niet bewezen door mailboxwissen. Resend-logs/backups afzonderlijk in leveranciersmatrix beoordelen |
| Toegang | Uitsluitend geautoriseerde WorkMatchr-beheerders, passende MFA en minimale rechten | Actuele uitvoering aantonen per toegangspad, inclusief clients/herstel |

Het vastgestelde beleid betreft ontvangen algemene e-mailberichten. Niet alle mail in `info@workmatchr.nl` valt automatisch in deze categorie; facturen of andere wettelijke dossiers kunnen een andere onderbouwde termijn hebben. De termijn van één jaar na ontvangst geldt behoudens de expliciet genoemde noodzakelijke uitzonderingen; hij is geen reden om onnodige gegevens zo lang te bewaren. Een concrete bewaarexceptie vereist doel, grondslag, eind-/herbeoordelingsdatum en beperkte toegang.

### Procedure: handmatige uitvoering en jaarlijkse controle

**Beleid vastgesteld; uitvoering nog niet aangetoond.** Verantwoordelijke: **de eigenaar van WorkMatchr**. Deze opdracht legt alleen de procedure vast; er worden geen mailboxinstellingen of berichten gewijzigd.

1. **Tijdige handmatige controle en verwijdering:** de eigenaar gebruikt ontvangstdatum en behandelingsstatus om algemene berichten uiterlijk bij de éénjaargrens te beoordelen en niet meer noodzakelijke berichten te verwijderen. Controleer zowel inbox als archief. Een jaarlijkse totaalcontrole alleen kan berichten bijna twee jaar laten staan; zij vervangt daarom niet tijdige handmatige uitvoering bij het bereiken van de termijn. Geen automatische verwijdertaak of kalenderautomatisering toegevoegd.
2. **Noodzakelijke uitzonderingen:** alleen langer bewaren bij een lopende zaak, klacht, geschil of andere noodzakelijke behandeling met gerechtvaardigde reden. Beoordeel na afronding opnieuw en verwijder wat niet meer nodig is; geen nieuwe standaardjaarperiode. Beoordeel uitzonderingen tussentijds wanneer de aanleiding vervalt en in ieder geval bij de jaarlijkse controle. Bewaarnodige correspondentie blijft in de bestaande afgeschermde mailbox; kopieer geen inhoud naar een auditrapport.
3. **Jaarlijkse totaalcontrole door eigenaar:** minimaal eenmaal per jaar, uiterlijk twaalf maanden na de vorige controle. Controleer inbox én archief, de naleving van de ontvangsttermijn, noodzakelijke uitzonderingen en de uitvoering van verwijdering. Stel de datum van de eerste controle nog vast; registreer geen fictieve uitgevoerde controle. Controleer daarbij relevante antwoordkopieën/bijlagen en lokale exports, rekening houdend met eventueel ander onderbouwd beleid voor bijvoorbeeld facturen.
4. **Registratie zonder persoonsgegevens:** leg uitsluitend controledatum, beleidsversie, gecontroleerde opslagcategorieën, geaggregeerde aantallen verwijderd/behouden en noodzakelijke uitzonderingscategorieën vast (lopende zaak, klacht, geschil, andere noodzakelijke behandeling). Noteer bij uitzonderingen een algemene noodzakelijkheidscategorie en volgende beoordelingsdatum, zonder casusomschrijving of herleidbare kenmerken. Leg volgende controledatum en eventuele actiepunten vast. Geen namen, e-mailadressen, onderwerpen, inhoud, bericht-/dossier-ID's, screenshots of namen van uitvoerders in deze registratie; verantwoordelijke rol is eigenaar. Maak de registratie beperkt toegankelijk; gebruik geen categorieomschrijving die alsnog een persoon herkenbaar maakt.
5. **Prullenbak en backups:** technische verwijdering en uitfasering zijn afhankelijk van Vimexx. De eigenaar laat pakket, exacte retentie, expunge, herstelrechten en eventuele clientkopieën verifiëren. Mailboxverwijdering bewijst geen definitieve backupverwijdering. Bij later herstel opnieuw beoordelen of eerder verwijderde gegevens terugkomen voordat ze regulier worden gebruikt. Geen backup downloaden of herstellen voor deze opdracht. De eerdere 30-dagentermijn is vervallen als beleidsvoorstel in de actuele procedure; geen nieuwe providertermijn verzinnen.
6. **Beveiliging en overige open punten:** verifieer toegang/MFA per toegangspad en spam-/quarantainegedrag. Zorg dat echte privacyvragen tijdig worden herkend; de jaarlijkse bewaartoets vervangt de reguliere behandeling van contact- of privacyverzoeken niet. Stel benodigde provider-/rechtenprocedures afzonderlijk vast.

Registratiesjabloon (leeg, geen bewijs van uitvoering):

| Controledatum | Beleidsversie | Opslagcategorieën | Aantallen verwijderd/behouden | Noodzakelijke uitzonderingscategorieën | Volgende beoordeling uitzonderingen | Volgende jaarlijkse controle | Algemene actiepunten |
|---|---|---|---|---|---|---|---|
| Nog vast te leggen | E-mailbeleid 15-10-2026 | Inbox / archief | Niet geregistreerd | Niet geregistreerd | Nog vast te leggen | Nog vast te leggen | Technische retentie verifiëren |

### Samenhang A06 — uitsluitend read-only

Beoordeeld op PR #39, commit `afd46590901cb31b1aa154c4ca28744a4e622764`; geen wijziging aan A06-branch of runtimeconfiguratie.

- `src/app/api/contact/route.ts`: accepteert alleen als `CONTACT_FORM_ENABLED === 'true'` en bestaande mailconfiguratie beschikbaar is. `src/app/contact/page.tsx` gebruikt dezelfde expliciete flag. Ontbrekend/anders blijft **uit**; build- en runtimeflag moeten bij latere release overeenkomen.
- `src/lib/contact/contact-service.ts`: ontvanger standaard `contact@workmatchr.nl`; `CONTACT_EMAIL_TO` wordt uitsluitend server-side aangeleverd en gevalideerd. De client kan geen ander ontvangstadres kiezen. `sendAuthEmail` gebruikt de bestaande Resend-laag. Alleen `RESEND/ACCEPTED` geeft succes; dit bewijst geen inboxdelivery.
- Beoogde volledige route: formulier → server-side validatie/limiter → Resend → contact@workmatchr.nl → Vimexx-forwarder → info@workmatchr.nl. De PO-bevestiging past bij de bestaande default; geen A06-codecorrectie nodig. Een afwijkende ingestelde `CONTACT_EMAIL_TO` vóór vrijgave controleren, niet stilzwijgend overschrijven.
- A06 toont een privacytoelichting met `/privacy`-link. De A07-conceptverklaring benoemt ontvangers, conceptgrondslag, rechten en het vastgestelde algemene e-mailbewaarbeleid (uitvoering nog te verifiëren). Conceptstatus is **geen** juridische vrijgave voor inschakeling.
- A06 bewaart geen berichtinhoud structureel in de platformdatabase; wel pseudonieme HMAC-limiettellers met opportunistische opschoning bij volgende verzoeken. Ook die serverdata en Resend-bewaring vallen buiten alleen het Vimexx-mailboxbeleid en vragen afzonderlijke retentieacceptatie.
- Eerdere A06-read-only metadata vermeldde ontbrekende `CONTACT_FORM_ENABLED`/`CONTACT_EMAIL_TO` in productie en aanwezige providerconfiguratie; dit is historisch bewijs, geen actuele hercontrole van waarden of delivery. Deze opdracht wijzigt geen omgevingsvariabelen en houdt het formulier standaard uit.

### Open vóór juridische publicatie / A06-inschakeling

- [ ] PO bevestigt voorlopige bedrijfsgegevens en nieuw correspondentieadres in Zwolle; contact@workmatchr.nl is al bevestigd.
- [x] PO heeft het algemene e-mailbewaarbeleid definitief vastgesteld, inclusief noodzakelijke uitzonderingen voor lopende zaken/klachten/geschillen en handmatige verantwoordelijkheid van de eigenaar.
- [ ] PO/privacyadviseur stelt overige grondslagen, rolverdeling en eventueel specifieke wettelijke bewaarplichten vast; volledige juridische eindacceptatie blijft open.
- [ ] Mailboxbeheerder levert read-only configuratiebewijs voor route, extra kopieën, bevoegdheden, MFA per toegangspad, mappen, trash en spam/quarantaine; provider vult beperkingen aan.
- [ ] PO/leveranciersbeheer verifieert toepasselijke Vimexx- en overige verwerkersafspraken, regio's/subverwerkers/doorgifte en contractueel geldende log-/backupretentie. Publieke providerdocumentatie is geen bewijs van gesloten afspraken.
- [ ] Eigenaar plant eerste jaarlijkse controle, voert het vastgestelde beleid tijdig uit en registreert controledatum/uitzonderingen zonder persoonsgegevens. Uitvoering en technische uitfasering aantonen; geen mailboxhandeling door Codex in deze opdracht.
- [ ] A06-eigenaar controleert vóór inschakeling expliciete featureflag, build/runtimeconsistentie, `CONTACT_EMAIL_TO`, Resend-afzender/domein en actuele limiteracceptatie. Pas na apart akkoord één gecontroleerde bezorgtest inclusief forwarder en spam, zonder claim dat Resend-acceptatie aflevering bewijst.

Geen mailbox- of providerinstellingen gewijzigd; geen berichten ingezien/verwijderd; geen echte mail, databasewijziging, merge of deployment.

### Validatie Vimexx-aanvulling

- **24/24 gerichte regressietests PASS** (vier suites: `public-legal-pages`, `public-placeholder-routes`, `public-information-architecture`, `contact/page`). Nieuwe dekking onderscheidt bevestigd contact/forwarder/mailbox van open technische verificatie; retentie blijft voorstel, concept/noindex blijft behouden.
- **Volledige lint PASS**.
- **Standalone TypeScript: BASELINE_FAILURE**, precies de vier bekende TS2345 readonly-arrayfouten in `src/lib/compliance/rule-engine.test.ts` op regels 13, 14, 23, 24. Test en engine identiek aan origin/main; geen A07-fout. Geen unrelated reparatie.
- **Productiebuild PASS** met uitsluitend de bestaande niet-blokkerende NFT-tracingwaarschuwing rond `next.config.ts` en de kennisbron-uploadketen. Build gebruikte synthetische lokale configuratie zonder werkende database/mailprovider. De gegenereerde `next-env.d.ts`-wijziging is teruggebracht; geen buildartefact in commitset.
- **Diff-check PASS; secrets-patterncontrole: 0 treffers** in de zes gewijzigde taakbestanden. Geen volledige externe secretsaudit geclaimd.
- Scope: uitsluitend `docs/a07-privacy-cookies.md`, `src/config/legal-identity.ts`, `src/content/public-legal.ts`, `src/app/privacy/page.tsx`, `src/app/cookies/page.tsx`, `src/app/public-legal-pages.test.tsx`. Geen A06-, bedrijfs-/facturatie-, database- of providerconfiguratiewijzigingen.
- Statische servercomponenten, bestaande opmaak/linkfocus/headingstructuur behouden; geen nieuwe clientstate of externe calls. Renderregressies getest, eerdere browseracceptatie niet als nieuwe volledige browsercontrole gepresenteerd. Juridische eindacceptatie, echte zoom/screenreader en provider-/mailboxcontrole blijven open.

### Beleidsaanpassing contactberichten — 15 oktober 2026

De aangeleverde PO-tekst is letterlijk opgenomen onder **Hoe lang bewaren wij contactberichten?** en vervangt het eerdere uitgangspunt van twaalf maanden na afhandeling. Het startpunt is **ontvangst**: in beginsel maximaal één jaar, noodzakelijke verlenging bij een onafgeronde zaak, beoordeling na afronding, beperkte uitzonderingen wegens wettelijke plicht of andere gerechtvaardigde noodzaak en periodieke herbeoordeling. Verwijdering is **handmatig**; er is geen automatische verwijdertaak geïmplementeerd of uitgevoerd.

Verwerkingstabel, bewaarmatrix en voorgestelde uitvoeringsprocedure zijn hierop afgestemd. De wekelijkse/maandelijkse controlecadans blijft een uitvoeringsvoorstel, geen bewezen operationele procedure. De aanvullende prullenbak-, privacy-/klacht- en backupafspraken blijven open. Conceptstatus, juridische eindacceptatie, Zwolle-adrescontrole en A06 standaard uit blijven behouden. Geen mailboxinstellingen of berichten gewijzigd.

Validatie van deze beleidsaanpassing: **25/25 gerichte tests PASS**, volledige lint PASS, productiebuild PASS (bestaande niet-blokkerende tracingwaarschuwing), diff-check PASS en secrets-patterncontrole op de drie taakbestanden zonder treffers. Standalone TypeScript opnieuw uitgevoerd: uitsluitend de vier bekende TS2345-baselinefouten in `src/lib/compliance/rule-engine.test.ts` op 13/14/23/24; test en engine ongewijzigd ten opzichte van origin/main. Geen A07-typefout. De gegenereerde Next-typesverwijzing is teruggebracht; geen buildartefacten meegenomen.

### Definitieve vaststelling e-mailbewaarbeleid — 15 oktober 2026

De Product Owner heeft het algemene e-mailbewaarbeleid definitief bevestigd. De eerdere formulering met “in beginsel” is vervangen door de aangeleverde tekst; klachten/geschillen, eigenaarverantwoordelijkheid en inbox én archief zijn nu expliciet. De vijf beleidsalinea's staan letterlijk in de conceptprivacyverklaring. De bovenstaande actuele bewaarmatrix/procedure vervangt de eerdere voorstellen; historische onderzoeks-/validatienotities blijven herkenbaar eerdere bevindingen, geen huidig beleid.

Nieuw is de jaarlijkse totaalcontrole met registratie van controledatum en noodzakelijke uitzonderingscategorieën zonder persoonsgegevens. Deze jaarlijkse controle mag de éénjaargrens niet verlengen: tijdige handmatige verwijdering en beoordeling na afronding blijven leidend. Exacte Vimexx-prullenbak- en backupretentie blijven open. Vastgesteld beleid is geen bewijs van uitvoering en geen vrijgave van de volledige conceptprivacyverklaring. A06 blijft standaard uit; geen wijziging aan bestaande gegevens of mailboxinstellingen.

Validatie definitieve beleidsvastlegging: **25/25 gerichte tests PASS**, **volledige lint PASS** en **productiebuild PASS**. De eerste lintpoging viel samen met Prisma-generatie door de build en meldde ENOENT op een tijdelijk vervangen gegenereerd bestand; na de build is volledige lint opnieuw uitgevoerd en geslaagd. Geen codefix of baselinewijziging hiervoor. De bestaande niet-blokkerende NFT-tracingwaarschuwing blijft. Diff-check PASS, secrets-patterncontrole op drie taakbestanden: 0 treffers. Standalone TypeScript niet opnieuw gedraaid in deze beperkte copy-opdracht; eerdere vier compliance-baselinefouten blijven afzonderlijk gedocumenteerd. Build heeft zijn eigen typecontrole doorlopen. Alleen `docs/a07-privacy-cookies.md`, `src/app/privacy/page.tsx` en `src/app/public-legal-pages.test.tsx` gewijzigd; gegenereerde Next-typesverwijzing teruggebracht. Geen historische bedrijfs-/mailboxgegevens gewijzigd.


## Aanvullende cookie-/browseropslagaudit — 15 oktober 2026

Onderzocht: A07-branch `codex/a07-privacy-cookies`, uitgangscommit `05d138898fe28c4c74371380b364f4635c93cb85`, bestaande Draft PR #40 / issue #35. Dit is een onderzoeksaanvulling, geen vrijgave van toestemming, juridische tekst of productie. De onderstaande actuele beoordeling vervangt de eerdere onvoorwaardelijke vrijstellingsformulering bij de sessiecookie.

### Feitelijk uitgevoerde metingen

| Route | Anonieme HTTP GET lokaal / productie | Lokale browser: scriptbestanden / iframes | Externe script-, stylesheet-, img- of iframe-URL in DOM |
|---|---|---|---|
| `/` | 200 / 200 | 9 / 0 | Geen |
| `/diensten` | 200 / 200 | 9 / 0 | Geen |
| `/wettelijke-verplichtingen` | 200 / 200 | 9 / 0 | Geen |
| `/sectoren` | 200 / 200 | 9 / 0 | Geen |
| `/kenniscentrum` | 200 / 200 | 9 / 0 | Geen |
| `/opdracht-starten` | 200 / 200 | 12 / 0 | Geen |
| `/wijzers/compliance/scan` | 200 / 200 | 10 / 0 | Geen |
| `/privacy` | 200 / 200 | 9 / 0 | Geen |
| `/cookies` | 200 / 200 | 9 / 0 | Geen |

- Lokale origin: `http://127.0.0.1:3046`; productie: `https://www.workmatchr.nl`. In geen van de **18 anonieme documentresponses** werd een Set-Cookie-header aangetroffen. Alleen GET, geen inzending, login of mutatie op productie. Geen cookie-/tokenwaarden bewaard. Dit sluit cookies in subrequests of JavaScript-opslag nadrukkelijk niet uit.
- Lokale browser gebruikte de bestaande A07-acceptatieserver (oudere build van dezelfde branch; de nieuwe documentatiecopy is daarmee niet gevalideerd). Eigen resources: `/_next/static/chunks/*.js`, CSS en `/_next/image` voor het eigen logo. Het aantal scripts is een momentopname, geen regressiecontract. Dit is een DOM-resource-inventaris, **geen volledige netwerkcapture** van XHR/fetch, redirects of beacons.
- Gratis Compliance: uitsluitend fictieve keuzes werknemers Ja, 1–25 en thuiswerk; stap 2 bereikt. Na herladen verscheen eerst servermarkup van stap 1, daarna werd stap 2 hervat; teruggaan toonde de drie keuzes nog geselecteerd. **Console: React-hydratatiefout 418 waargenomen bij hervatten.** De code leest browserstate in de `useState`-initializer, terwijl SSR lege state gebruikt; dit is een concrete verklaring die nog in een afzonderlijke reparatie moet worden bevestigd. Geen opslag-/hydratiecode gewijzigd. Hervatgedrag is waargenomen, daadwerkelijke localStorage-inhoud/TTL is alleen uit code vastgesteld.
- Opdrachtstart: anoniem Nee → Ik weet het echt niet → stap 2; dezelfde stap na herladen zichtbaar. Geen tekst met persoonsgegevens ingevoerd, geen opdracht gepubliceerd. Het tabblad bevat uitsluitend deze synthetische lokale keuzes; geen browseropslag van anderen gewist.
- De beschikbare browser-API biedt DOM/console, maar geen cookiejar, localStorage/sessionStorage-inspectie of netwerklog. HttpOnly-cookies zijn ook niet via DOM te bewijzen. Geen toolingbeperking omzeild. Geen HAR met tokens, aanvraagbody's, cookieheaders of persoonsgegevens gemaakt.

### Opslag: volledigheid en lifecycle

De zeven expliciete opslagitems blijven centraal in `src/content/public-legal.ts`, met naam/aanbieder/doel/duur/categorie/toestemming/bewijs. `session_data`, `account_data` en OAuth-cookies zijn conditionele Better Auth-bibliotheekmogelijkheden; cookiecache/accountcache en OAuth zijn hier niet als actieve flow geconfigureerd. Verlopen-cookieheaders bij logout betekenen niet dat deze cookies vooraf actief waren. Geen eigen organisatiecookie: tenantcontext wordt server-side uit membership afgeleid.

| Onderdeel | Technische noodzaak en toestemming | Logout / grens |
|---|---|---|
| Better Auth `session_token` | Nodig voor geauthenticeerde requests. WorkMatchr forceert echter `rememberMe: true` bij login en accountactivatie; 7 dagen maxAge, updateAge 1 dag. Die persistentie is niet gelijk aan een vrijgestelde browsersessie. Expliciete keuze voor blijven ingelogd vereist, of een afzonderlijk aantoonbaar andere juridische onderbouwing | Better Auth POST sign-out verwijdert de DB-sessie en laat authcookies verlopen. Bibliotheek vangt een DB-deletefout af; succesvolle intrekking en foutpad moeten nog op test-DB worden gemeten. Geen gegarandeerde DB-verwijdering uit alleen clientredirect afleiden |
| `dont_remember` | Noodzakelijke sessiemarker bij rememberMe=false; huidige UI biedt dat niet | Bibliotheek laat marker bij logout verlopen; geen plaatsing waargenomen |
| `platform-admin-view` | Gevraagde functionele v01/v02-voorkeur; sessiecookie, path `/platformbeheer`, HttpOnly/SameSite=Lax/Secure in productie | Logout verwijdert deze voorkeur niet expliciet; geen authbewijs of bevoegdheid |
| Opdrachtconcept sessionStorage | Hervatten meerstapsformulier; functioneel doel, geen tracking. Opslag bevat ook vrije tekst, locatiekeuzes, submissionId en revisie. Per gebruiker/concept gescheiden key | Verwijderd na succesvolle publicatie; anoniem concept en loginmarker verwijderd na overname. Niet expliciet gewist bij logout. Accountkeys beperken verkeerd hervatten maar beschermen niet tegen scripts op dezelfde origin of een gebruiker met toegang tot browseropslag |
| Loginmarker sessionStorage | Functionele overdracht na expliciete loginactie | Verwijderd bij overname; blijft bij afgebroken flow tot tabbladsessie eindigt (browserherstel kan verlengen) |
| Compliance localStorage | Alleen profielantwoorden en stap; geen accountkey, timestamp, TTL of trackingdoel. Schrijft al bij mount, ook leeg. Onbegrensde opslag is niet bewezen strikt noodzakelijk | Verwijderd bij resultaat/herstart, daarna kan leeg concept opnieuw ontstaan. Logout wist niets; dezelfde origin deelt de gegevens tussen tabbladen/accounts. Geen serverdatabase-opslag door dit gratis component |
| Legacy `wm_public_intake` | Oud intakepad met 90 dagen; geen nieuwe plaatsing op actuele opdrachtstart bewezen | `/advieswijzer` redirect naar `/opdracht-starten`; actions/config bestaan nog. Geen logoutopruiming gevonden; oude browsercookies kunnen tot vervaldatum blijven bestaan |

Code: `src/lib/auth.ts`, `src/components/auth/login-form.tsx`, `activate-account-form.tsx`, `logout-button.tsx`, `src/components/requests/simple-advice-form.tsx`, `src/components/public/compliance-free-intake.tsx`, `src/lib/public-intake/public-intake-config.ts`, `src/app/advieswijzer/route.ts`, `src/app/platformbeheer/v01/route.ts`, `v02/route.ts`; Better Auth 1.6.23 `dist/cookies/index.mjs` en `dist/api/routes/sign-out.mjs`. Zoekactie in `src` en package.json vond geen aanvullende localStorage/sessionStorage-, IndexedDB-, service-worker-, analytics- of sendBeacon-integratie. Dit bewijst geen afwezigheid van door hosting geïnjecteerde technieken.

### Externe diensten en verzoeken

| Dienst | Aangetoonde integratie / browsergrens | Meetstatus |
|---|---|---|
| Vercel | Hosting van dezelfde publieke origin; eigen Next-assets. Geen Vercel Analytics/Speed Insights in code gevonden | Anonieme productie-documentresponses gecontroleerd; projectinstellingen, bot-/challengecookies en volledige runtimecapture niet gecontroleerd |
| Neon/PostgreSQL | Prisma/PG serververbinding; geen browserdatabaseclient | Codebewijs. Geen Neon-query of databasecredential gebruikt in deze audit |
| Resend | Server-side `src/lib/email.ts`, `new Resend(...).emails.send`; geen browserscript | Geen mail verstuurd. Mailopen-/clicktracking van ontvangen mails en providerinstellingen vallen buiten deze websitecapture en blijven open |
| Vimexx | Bevestigde ontvangende mailbox/forwarder, geen webscript in WorkMatchr | Geen mailbox bezocht; mailroute wijzigt geen cookieoordeel over de website |
| Mollie | Server-only API-client in `src/lib/finance/mollie-gateway.ts`; browser kan later naar externe checkout | Geen checkout/betaling gestart. Cookies op die externe origin niet gemeten, geen vrijstelling namens Mollie vastgesteld |
| Jortt | Server-only gateway: `api.jortt.nl` en `app.jortt.nl` OAuth-tokenendpoint | Geen Jortt-browserintegratie gevonden; geen financiële actie of OAuth-flow uitgevoerd |
| Have I Been Pwned | Server-side wachtwoordcontrole via Better Auth-plugin | Geen wachtwoordaanvraag uitgevoerd; geen browsercookie afgeleid uit server-API |
| Officiële bronwebsites | Gewone externe links, geen iframe of automatisch script | Geen toestemming nodig alleen wegens het tonen van een gewone link; na aanklikken geldt aparte websitecontext |

Er is **geen volledige lijst daadwerkelijk uitgaande browsernetwerkverzoeken** beschikbaar. Bovenstaande tabel onderscheidt waargenomen documentresponses/DOM van codepaden; server-side integraties zijn niet ten onrechte als cookies aangemerkt.

### Beoordeling en concreet advies

Noodzakelijke functionele opslag kan zijn vrijgesteld; het etiket functioneel of de afwezigheid van advertenties is daarvoor onvoldoende. Doel, expliciet gevraagde functie en passende duur zijn leidend. WP194 onderscheidt browsersessie-authenticatie van persistent blijven ingelogd en noemt een geïnformeerde onthoudkeuze voor dat laatste. Dit geldt ook voor vergelijkbare opslagtechnieken. Bron: [WP29 Opinion 04/2012, §2.3/3.1/3.2](https://ec.europa.eu/justice/article-29/documentation/opinion-recommendation/files/2012/wp194_en.pdf), volledige PDF gelezen op 15 oktober 2026. [Rijksoverheid, cookietoestemming](https://www.rijksoverheid.nl/themas/overheid-en-democratie/privacy-en-persoonsgegevens/vraag-en-antwoord/telecommunicatie/mag-een-website-ongevraagd-cookies-plaatsen) bevestigt het onderscheid tussen noodzakelijke functionaliteit en tracking. De AP-pagina over heldere banners was via zoekindex toegankelijk maar directe fetch gaf 403; wetten.overheid.nl was niet uitleesbaar. Juridische eindcontrole blijft vereist.

**Advies: nu geen algemene cookiebanner toevoegen, maar evenmin verklaren dat alle huidige opslag vrijgesteld is.** Er is geen aangetoonde marketing-/trackingintegratie die zo'n algemene banner rechtvaardigt. Twee afgebakende besluiten zijn nodig:

1. **Login:** voorstel voor een afzonderlijke vervolgopdracht: sessiegebonden login als standaard, plus een expliciete niet-voorgeselecteerde onthoudkeuze met doel/duur. Controleer tegelijk accountactivatie en logout. Dit is een gerichte toestemmingskeuze, geen reden voor een banner op alle publieke pagina's. Geen authenticatielogica gewijzigd in A07.
2. **Compliance:** onbegrensd bewaren is niet noodzakelijk onderbouwd. Voorkeur: tabbladsessie met expliciete hervatfunctie en minimale antwoorden. Als herstel na sluiten echt nodig is: bepaal met PO een korte, onderbouwde termijn en informeer de gebruiker; stel geen willekeurige wettelijke 24-uursnorm. Voeg daarna pas automatische expiry-controle vóór lezen/hervatten toe, timestampcontrole, opruiming bij verlopen/resultaat/herstart en beleid voor gedeelde apparaten/logout. Beoordeel ook schrijven vóór eerste invoer. Een TTL is wenselijk voor dataminimalisatie, maar bewijst op zichzelf geen toestemmingsvrijstelling. Als persistent bewaren geen strikt noodzakelijke gevraagde functie is, vereist het vooraf een vrije, specifieke keuze met gelijkwaardig weigeren/intrekken en blokkering van opslag vóór akkoord.

Geen banner, TTL, authinstelling of storagegedrag geïmplementeerd. De publieke concepttekst maakt de beperkingen zichtbaar; zij certificeert geen juridische compliance.

### Read-only lokale acceptatie-inventarisatie na PO-instructie

- **Feitelijke URL:** `http://127.0.0.1:3046`. Alleen publieke A07-server, geen werkende database; uitdrukkelijk geen bewijs voor ingelogde acceptatie. Geen andere listener gevonden in poortbereik 3000–3050.
- Docker CLI kan de Docker Desktop Linux-engine niet bereiken (named pipe ontbreekt). Geen lokale listener op 5432, 5433, 5434, 55432 of 55433. Dit bewijst onbereikbaarheid op deze controlepunten, niet dat historische databases of accounts verdwenen zijn. Geen Docker-service gestart en geen DB-query uitgevoerd.
- Gecontroleerd: A07-worktree, bestaande `platform-admin-v02`-worktree, oorspronkelijke WorkMatchr-configuratiereferenties; uitsluitend host/poort/databasenaam en testflag uit env geïnventariseerd. Originele checkout verwijst naar lokale database `workmatchr` op localhost:5432, en heeft een testwisselaarflag in `.env.development.local`. Dat is geen bewezen afzonderlijke acceptatiedatabase en is niet gebruikt of veranderd. A07 en de onderzochte Platformbeheer-worktree hadden geen eigen `.env*`-databaseconfiguratie. Geen niet-lokale URL of credential gerapporteerd/gebruikt.
- `docs/test-provider-dataset.md` en `scripts/seed-test-providers.ts` beschrijven aparte lokale `workmatchr_test_providers` met fictieve opdrachtgever-/dienstverleneraccounts. `docs/simple-advice-final-acceptance.md` bevat historisch testaccountbewijs. **Huidig bestaan, status, memberships en platformbeheerder niet bevestigd** wegens ontbrekende databaseverbinding; geen historische inventaris als actuele loginmogelijkheid gepresenteerd.
- Testwisselaar (`src/lib/test-impersonation/*`) bestaat: alleen buiten production en met expliciete flag, bestaande bevoegde actieve platformbeheerder met actieve WorkMatchr-platformmembership, doelen ACTIVE/geverifieerd onder `example.invalid`. Hij gebruikt dezelfde Better Auth-sessie en verandert de effectieve gebruiker. Daarmee kan men rolgebonden pagina's testen, maar niet drie onafhankelijke login-/logoutlevenscycli bewijzen. Actuele runtimebeschikbaarheid niet bevestigd. Een `next start`-productiebuild schakelt de wisselaar beleidsmatig uit.

| Rol | Nu werkelijk ingelogd getest | Blokkade |
|---|---|---|
| Opdrachtgever | Nee — OPEN | Geen bevestigde bereikbare geïsoleerde DB/testaccount |
| Dienstverlener | Nee — OPEN | Idem |
| Platformbeheer | Nee — OPEN | Idem; geen bestaande bevoegde testsessie |

**Minimale inrichting, uitsluitend voorstel voor apart akkoord:** eerst Docker laten starten; daarna bestaande afzonderlijke testdatabase en alleen synthetische accountmetadata read-only verifiëren. Indien geschikt: A07-server procesgebonden aan die database, op vrije loopbackpoort (3047 voorgesteld, nog niet gestart), zonder mail-/betaalcredentials en met A06 uit. Voor de wisselaar developmentmodus plus expliciete flag; voor realistische Secure-cookiecontrole daarnaast een toegestane lokale HTTPS-testopstelling. Indien geen passende database/accounts bestaan: eerst afzonderlijk akkoord voor een nieuwe geïsoleerde database, actuele migraties en bestaande Better Auth/testseedmechanismen; geen handmatige sessies, wachtwoordwijzigingen of productieaccounts. Geen database/account aangemaakt of aangepast in deze opdracht.

### Open meetprotocol vóór afronding

PO/IT registreert in een schoon testbrowserprofiel alleen cookienaam/domein/path/flags/maxAge, storagekey/type/duur en netwerkorigin/type/status. Geen waarden, payloads, IDs of ruwe HAR in Git. Herhaal publieke routes en per rol: login → eigen dashboard → synthetisch concept → logout → beschermd verzoek opnieuw → opnieuw inloggen. Verifieer cookieverval én serversessie-intrekking; observeer apart conceptopslag na logout, tabs sluiten/heropenen en browserherstel. Meet de gratis Compliance-route vóór invoer, na invoer, reload, resultaat en herstart. Databasefout bij logout alleen in geïsoleerde testomgeving. Vercel-runtime-injecties en eventuele externe checkout alleen read-only/toegestane testflow. Alle drie rolcontroles blijven **OPEN** totdat daadwerkelijk uitgevoerd.

Juridische eindacceptatie, persistent-loginbesluit, Compliance-bewaarbesluit, hydratatiebevinding en volledige browser/netwerkmeting blijven open. E-mailbeleid van 15 oktober blijft definitief vastgesteld; Vimexx-trash/backup, uitvoering, bedrijfsgegevens/nieuw Zwolle-adres en overige A07-verwerkingsgrondslagen blijven hun eigen acceptatiepunten. Geen accounts, provider-/mailboxinstellingen, productiegegevens of A06-branch gewijzigd; geen mail, betaling, merge of deployment.

### Validatie van deze opslagaudit

- Actuele GitHub main read-only bevestigd als `d3bce31248cf496f4c0563e210addbcb8d2e721c`; onderzochte auth-, conceptopslag- en testwisselaarbestanden hebben geen diff met die main. Geen sync/rebase of productfix uitgevoerd.
- **69/69 gerichte tests PASS** in zeven suites: public-legal-pages, public-placeholder-routes, public-information-architecture, contact/page, simple-advice-form, auth-policy en header-logout. Nieuwe regressie controleert dat de conceptverklaring persistent-loginvrijstelling niet onvoorwaardelijk claimt en opslag na logout vermeldt. Bestaande formulier-/autorisatietests zijn geen vervanging voor echte drie-rollenlogin.
- **Volledige lint PASS; productiebuild PASS**, inclusief de buildtypecontrole. Alleen bekende niet-blokkerende NFT-tracingwaarschuwing via `next.config.ts`/kennisbron-upload. Standalone TypeScript niet opnieuw gevraagd/uitgevoerd; de eerder vastgestelde vier compliance-testbaselinefouten zijn geen nieuwe bevinding en niet gerepareerd.
- **git diff --check PASS; secrets-patterncontrole 0 treffers** op vier taakbestanden. Geen volledige externe secretsaudit geclaimd. Gegenereerde Next-typesverwijzing teruggebracht; geen buildartefact in wijzigingsset.
- Exact gewijzigd: `docs/a07-privacy-cookies.md`, `src/content/public-legal.ts`, `src/app/cookies/page.tsx`, `src/app/public-legal-pages.test.tsx`. Alleen onderzoek, conceptcopy en test; geen nieuwe cookies, banner, TTL, login-/logoutlogica, accounts, database of configuratie gewijzigd.
- **Ingelogde cookieacceptatie: OPEN voor opdrachtgever, dienstverlener en platformbeheer.** Geen geslaagde juridische eindacceptatie of volledige runtime-inventaris geclaimd. PR #40 blijft Draft.


## Ontwerpvervolg — nog geen implementatie

Het [ontwerp- en herstelvoorstel voor browseropslag en sessies](a07-storage-session-design.md) beschrijft de expliciete loginoptie, native sessieduren, voorgestelde 24-uursconceptopslag, logout/legacy-overgang, gereproduceerde hydratatieoorzaak en minimale testomgeving. De twee geïsoleerde oorzaakproeven zijn geslaagd; de bestaande component blijft ongewijzigd. Alle implementatie- en inrichtingskeuzes vereisen afzonderlijk akkoord. De cookie-/privacyverklaring blijft de huidige implementatie beschrijven, niet het voorgestelde gedrag. De drie ingelogde rolcontroles blijven OPEN.
