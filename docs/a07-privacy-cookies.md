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
| Contactpersonen | E-mail, naam, bericht/bijlagen via bestaande mailto-contactroutes; A06: toekomstige velden naam/e-mail/onderwerp/bericht en abuse-controls | 6f correspondentie of 6b concrete aanvraag; 6c alleen bij specifieke rechtenverzoeken; WorkMatchr eigen verantwoordelijkheid | P: contact@workmatchr.nl via Vimexx-forwarder naar info@workmatchr.nl bij Vimexx. A06 gebruikt Resend voor uitgaande applicatiemail. Technische mailboxcontrole, contract/regio en doorgifte open | PO-voorstel: algemene mail max. 12 maanden na afhandeling in inbox én archief; trash max. 30 dagen indien ondersteund. Privacy/klachten en backups open; niets bewezen ingevoerd | Huidige `src/app/contact/page.tsx`; A06-documentatie in PR #39. Geen mails getest |
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

**Besluit nu:** geen automatische cookieconsentbanner toegevoegd. Noodzakelijke login/opdrachtcontinuïteit vormt een plausibele vrijstelling; de onbeperkte Compliance-conceptopslag is nog geen definitief bevestigde vrijstelling. PO/privacyadviseur moet bewaarbeperking of aantoonbare noodzaak besluiten. Niet-vrijgestelde technieken mogen niet actief worden zonder voorafgaande geldige toestemming. Als die worden aangetoond: blokkeer netwerk/opslag vooraf, gelijkwaardige Accepteren/Weigeren, geen voorafselectie, keuze per doel en permanent eenvoudige intrekking. Dit is een ontwerpvoorwaarde, geen geïmplementeerde CMP. A07-fase 1 maakt geen storage- of consentlogica anders.

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
4. **PO + mailboxbeheerder:** voorstel 12 maanden na afhandeling implementeren/aantonen voor inbox en archief; maximaal 30 dagen trash indien ondersteund; afzonderlijke onderbouwde privacy-/klachttermijn; backupretentie; toegang/MFA. Geen instellingen of berichten gewijzigd in deze opdracht.
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
| Inbox en archief | Roundcube ondersteunt mappen, speciale mappen en filters [V6] | Mailboxbeheerder: inventariseer inbox, archief, verzonden mail, bijlagen en lokale exports/kopieën. Stel afhandeling en vervaldatum vast; filters bewijzen geen bewaartermijn op basis van afhandeling |
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

### Bewaarbeleid — voorstel, uitvoering niet aangetoond

| Categorie | Voorgestelde termijn / criterium | Open besluit |
|---|---|---|
| Algemene contactberichten | Maximaal 12 maanden na vastgelegde afhandeling, inbox en archief gelijk | PO stelt beleid/startpunt vast; mailboxbeheerder bewijst uitvoering. Verplaatsen naar archief of trash herstart de termijn niet |
| Prullenbak | Definitief wissen uiterlijk 30 dagen na verwijderen, indien technisch uitvoerbaar | Pakketgedrag en expunge aantonen; onderstaande wekelijkse handmatige uitvoering is een voorstel, geen reeds ingestelde taak |
| Privacyverzoeken en klachten | Afzonderlijke, juridisch onderbouwde termijn en startpunt | PO/privacyadviseur bepaalt noodzakelijkheid, wettelijke eisen en geschilbewaring; geen willekeurige duur invullen. Tot besluit afzonderlijk behandelen met periodieke noodzakelijkheidstoets, niet onbeperkt laten staan |
| Backups, exports en transportlogs | Alleen conform aantoonbaar vastgesteld Vimexx-beleid en beleid voor eigen kopieën | Maximale termijn en uitfasering vaststellen; backupwissen is niet bewezen door mailboxwissen. Resend-logs/backups afzonderlijk in leveranciersmatrix beoordelen |
| Toegang | Uitsluitend geautoriseerde WorkMatchr-beheerders, passende MFA en minimale rechten | Actuele uitvoering aantonen per toegangspad, inclusief clients/herstel |

Het voorstel betreft contactcorrespondentie. Niet alle mail in `info@workmatchr.nl` valt automatisch in deze categorie; facturen of andere wettelijke dossiers kunnen een andere onderbouwde termijn hebben. De 12-maandstermijn is een bovengrens, geen reden om onnodige gegevens zo lang te bewaren. Een concrete bewaarexceptie vereist doel, grondslag, eind-/herbeoordelingsdatum en beperkte toegang.

### Voorgestelde uitvoerbare verwijderprocedure

**Nog niet ingevoerd; uitvoering of instellingwijziging vereist afzonderlijk PO-akkoord.** Er wordt in deze opdracht niets verwijderd.

1. **PO/privacyverantwoordelijke stelt vast:** mailboxbeheerder en vervanger, categorieën/termijnen, uitzonderingen en herstelprocedure. Verifieer providerpakket, MFA en bevoegdheden vooraf. Bewijs geen mailboxinhoud doorsturen naar dit rapport, Git of een PR.
2. **Behandelaar bij ontvangst/afhandeling:** classificeer algemene mail, privacyverzoek, klacht of andere administratie binnen de afgeschermde werkomgeving; leg afhandelingsdatum en uiterste verwijderdatum vast. Neem relevante antwoordkopieën/bijlagen mee. Inventariseer eerst bestaande contactmail; een onbekende afhandelingsdatum niet verzinnen of onbeperkte bewaring toestaan, maar individueel beoordelen.
3. **Aangewezen beheerder wekelijks:** selecteer algemene correspondentie die vóór de volgende weekcontrole de 12-maandsgrens bereikt, zodat de maximumtermijn niet door de controlecadans wordt overschreden. Controleer inbox, archief en beheerde kopieën. Leg twijfel/geschil voor aan privacyverantwoordelijke; diens uitzondering bevat een herbeoordelingsdatum.
4. **Na goedgekeurde selectie:** verwijder de berichten en bijlagen uit actieve mappen en gecontroleerde lokale kopieën. Leeg/verwijder deze uit de prullenbak bij de wekelijkse controle; verifieer server-side definitieve verwijdering voor zover het pakket dit ondersteunt. Trash wordt geen extra archief. Als de 30-dagengrens technisch niet aantoonbaar haalbaar is: afwijking registreren en PO laten beslissen vóór acceptatie, geen complianceclaim.
5. **Spam/quarantaine:** controleer op werkdagen of echte vragen/klachten onterecht zijn tegengehouden en voer ze terug naar de behandeling. Stel apart vast hoe spam wordt verwijderd, met behoud van tijdige herkenning van rechtenverzoeken; automatische filtering alleen is onvoldoende bewijs.
6. **Backups/herstel:** laat providertermijnen schriftelijk bevestigen en bestaande herstelrechten toetsen. Bij later noodzakelijk herstel eerst afgeschermd beoordelen welke eerder verwijderde gegevens terugkomen en opnieuw verwijderen vóór regulier gebruik. Een eventueel noodzakelijk verwijderregister blijft beperkt, afgeschermd en krijgt een eigen termijn; het bevat geen berichtinhoud. Geen volledige mailboxbackup maken uitsluitend als verwijderbewijs.
7. **Bewijs en controle:** wekelijkse uitvoeringsregistratie met datum, beleidsversie, gecontroleerde opslagcategorieën, aantallen verwijderd/uitgesteld, deadlinecontrole en rol van uitvoerder. Geen namen, mailadressen, onderwerpen, inhoud, message-ID's of mailboxscreenshots in rapport/PR. Maandelijks controleert een tweede bevoegde beheerder volledigheid en achterstanden; PO beoordeelt per kwartaal toegang/MFA en uitzonderingen. Persoonsherleidbare interne verantwoordingsgegevens, indien noodzakelijk, blijven in een apart beperkt toegankelijk register met eigen termijn.

### Samenhang A06 — uitsluitend read-only

Beoordeeld op PR #39, commit `afd46590901cb31b1aa154c4ca28744a4e622764`; geen wijziging aan A06-branch of runtimeconfiguratie.

- `src/app/api/contact/route.ts`: accepteert alleen als `CONTACT_FORM_ENABLED === 'true'` en bestaande mailconfiguratie beschikbaar is. `src/app/contact/page.tsx` gebruikt dezelfde expliciete flag. Ontbrekend/anders blijft **uit**; build- en runtimeflag moeten bij latere release overeenkomen.
- `src/lib/contact/contact-service.ts`: ontvanger standaard `contact@workmatchr.nl`; `CONTACT_EMAIL_TO` wordt uitsluitend server-side aangeleverd en gevalideerd. De client kan geen ander ontvangstadres kiezen. `sendAuthEmail` gebruikt de bestaande Resend-laag. Alleen `RESEND/ACCEPTED` geeft succes; dit bewijst geen inboxdelivery.
- Beoogde volledige route: formulier → server-side validatie/limiter → Resend → contact@workmatchr.nl → Vimexx-forwarder → info@workmatchr.nl. De PO-bevestiging past bij de bestaande default; geen A06-codecorrectie nodig. Een afwijkende ingestelde `CONTACT_EMAIL_TO` vóór vrijgave controleren, niet stilzwijgend overschrijven.
- A06 toont een privacytoelichting met `/privacy`-link. De A07-conceptverklaring benoemt ontvangers, conceptgrondslag, rechten en retentievoorstel. Conceptstatus is **geen** juridische vrijgave voor inschakeling.
- A06 bewaart geen berichtinhoud structureel in de platformdatabase; wel pseudonieme HMAC-limiettellers met opportunistische opschoning bij volgende verzoeken. Ook die serverdata en Resend-bewaring vallen buiten alleen het Vimexx-mailboxbeleid en vragen afzonderlijke retentieacceptatie.
- Eerdere A06-read-only metadata vermeldde ontbrekende `CONTACT_FORM_ENABLED`/`CONTACT_EMAIL_TO` in productie en aanwezige providerconfiguratie; dit is historisch bewijs, geen actuele hercontrole van waarden of delivery. Deze opdracht wijzigt geen omgevingsvariabelen en houdt het formulier standaard uit.

### Open vóór juridische publicatie / A06-inschakeling

- [ ] PO bevestigt voorlopige bedrijfsgegevens en nieuw correspondentieadres in Zwolle; contact@workmatchr.nl is al bevestigd.
- [ ] PO/privacyadviseur stelt grondslagen, rolverdeling, privacy-/klachtretentie en dit verwijderbeleid vast.
- [ ] Mailboxbeheerder levert read-only configuratiebewijs voor route, extra kopieën, bevoegdheden, MFA per toegangspad, mappen, trash en spam/quarantaine; provider vult beperkingen aan.
- [ ] PO/leveranciersbeheer verifieert toepasselijke Vimexx- en overige verwerkersafspraken, regio's/subverwerkers/doorgifte en contractueel geldende log-/backupretentie. Publieke providerdocumentatie is geen bewijs van gesloten afspraken.
- [ ] Na apart akkoord: beleid implementeren, daadwerkelijke verwijdering/uitfasering en auditprocedure aantonen; juridische eindacceptatie door PO blijft open.
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
