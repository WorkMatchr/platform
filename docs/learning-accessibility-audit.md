# WorkMatchr Learning — WCAG 2.2 A/AA accessibility audit

**Auditdatum:** 30 september 2026 | **Doelstandaard:** WCAG 2.2 niveau A en AA
**Conclusie:** audited against WCAG 2.2 A/AA; dit rapport is geen conformiteits- of juridische conformiteitsverklaring.

## Git en auditbasis

Deze opvolging is uitgevoerd in de bestaande Learning-worktree op branch `codex/learning-vertical-slice-current`, start-HEAD `688b96fa533c4378c8795391a2dd2f3948f19f50`. De reeds aanwezige examdialoogfix is behouden. De actuele wijzigingen omvatten die dialoogfix, de PDFKit-certificaatgenerator met tests en dependencies, en dit auditverslag; er is niets gecommit.

De bestaande in-app browserinventaris bevatte geen tabs. Er is geen nieuw browservenster gestart en geen account gebruikt. Daardoor zijn geen visuele, browser-, keyboard-only, schermlezer-, viewport-, zoom- of contrastmetingen uitgevoerd. Statische code-inspectie wordt hieronder niet als bewijs voor die handmatige controles gepresenteerd.

## Samenvatting

| Status | Aantal criteria | Betekenis |
|---|---:|---|
| PASS | 13 | Positief onderbouwd met broncode-/testbewijs; niet gelijk aan end-to-end conformiteit. |
| FAIL | 0 | Geen open FAIL in de beperkte code-/testscope van deze fase. |
| MANUAL REVIEW REQUIRED | 27 | Tagged PDF-techniek is aanwezig; PDF/UA-, leesvolgorde-, contrast- en schermlezervalidatie ontbreekt nog. |
| NOT APPLICABLE | 11 | Geen relevante inhoud of interactie aangetroffen in de geïnspecteerde Learning-scope. |
| NOT TESTED — TOOLING LIMITATION | 4 | Vereist een browser-/PDF-inspectievoorziening die niet beschikbaar was. |

## WCAG 2.2 A/AA-matrix

De statuskolom gebruikt uitsluitend de afgesproken statuswaarden. `MANUAL REVIEW REQUIRED` betekent dat broncode-inspectie alleen onvoldoende bewijs geeft. Criteria zijn opgenomen voor zover ze binnen WCAG 2.2 niveau A/AA vallen.

| Criterium | Naam | Niveau | Van toepassing | Status | Bewijs | Route/component | Bevinding | Aanbevolen actie |
|---|---|---|---|---|---|---|---|---|
| 1.1.1 | Non-text Content | A | Ja | MANUAL REVIEW REQUIRED | Certificaat-PDF markeert logo/ornamenten als Artifact en de QR als Figure met alternatieve tekst; het certificaatnummer en verificatie-informatie staan ook als echte tekst. De volledige H1–H10-media-inventaris ontbreekt nog. | Lescontent; certificaat-PDF | Niet alle opgeslagen cursusmedia zijn beoordeeld. | Inventariseer cursusmedia en bevestig inhoudelijke tekstalternatieven voor informatieve/complexe visuals. |
| 1.2.1 | Audio-only and Video-only (Prerecorded) | A | Nee | NOT APPLICABLE | Geen audio-/video-only Learning-media aangetroffen in geïnspecteerde scope. | WL-001 | Geen relevante media. | Herbeoordeel wanneer media wordt toegevoegd. |
| 1.2.2 | Captions (Prerecorded) | A | Nee | NOT APPLICABLE | Geen vooraf opgenomen video aangetroffen. | WL-001 | Geen relevante media. | Herbeoordeel wanneer video wordt toegevoegd. |
| 1.2.3 | Audio Description or Media Alternative (Prerecorded) | A | Nee | NOT APPLICABLE | Geen vooraf opgenomen video aangetroffen. | WL-001 | Geen relevante media. | Herbeoordeel wanneer video wordt toegevoegd. |
| 1.2.4 | Captions (Live) | AA | Nee | NOT APPLICABLE | Geen live audio/video aangetroffen. | WL-001 | Geen relevante media. | Herbeoordeel wanneer live media wordt toegevoegd. |
| 1.2.5 | Audio Description (Prerecorded) | AA | Nee | NOT APPLICABLE | Geen vooraf opgenomen video aangetroffen. | WL-001 | Geen relevante media. | Herbeoordeel wanneer video wordt toegevoegd. |
| 1.3.1 | Info and Relationships | A | Ja | MANUAL REVIEW REQUIRED | PDFKit 0.20.2 genereert expliciet `/MarkInfo`, `/StructTreeRoot`, `/Lang (nl)`, Document/H1/H2/P/Figure-structuur; PDF.js leest de structuurboom uit en de tests bevestigen tagrollen. | Certificaat-PDF | Technische tagging is aantoonbaar, maar geen externe PDF/UA-validatie of assistive-technologycontrole. | Voer PDF/UA-checker- en schermlezertest uit; controleer structuur in een PDF-accessibility inspector. |
| 1.3.2 | Meaningful Sequence | A | Ja | MANUAL REVIEW REQUIRED | PDFKit-structuurelementen worden in documentvolgorde toegevoegd; PDF.js bevestigt de boom en de tests controleren de volgorde van hoofdonderdelen. | Lescontent; PDF | Daadwerkelijke leeservaring en volgorde moeten nog met validator/schermlezer worden bevestigd. | Controleer leesvolgorde met PDF-accessibility checker en schermlezer. |
| 1.3.3 | Sensory Characteristics | A | Ja | PASS | Procesvisualisatie geeft betekenis als genummerde lijst en tekst (`lesson-player.tsx`). | PROCESS-blokken | In geïnspecteerde renderer niet uitsluitend kleur/positie gebruikt. | Herbeoordeel alle inhoudelijke visuals handmatig. |
| 1.3.4 | Orientation | AA | Ja | MANUAL REVIEW REQUIRED | Geen viewport-/oriëntatietest uitgevoerd. | Learning en exam | Oriëntatiebeperkingen niet uitgesloten. | Test portrait en landscape zonder lock. |
| 1.3.5 | Identify Input Purpose | AA | Ja | PASS | Certificaatnaamvelden gebruiken `autocomplete="given-name"` en `family-name`. | Certificaatgegevensformulier | Twee profielvelden zijn programmatisch herkenbaar. | Controleer overige persoonsgegevensvelden als die aan Learning worden toegevoegd. |
| 1.4.1 | Use of Color | A | Ja | PASS | Examenstatus bevat tekst “beantwoord/onbeantwoord”; feedback bevat tekstuele boodschap. | Examplayer en LessonPlayer | Betekenis is in code niet alleen via kleur uitgedrukt. | Bevestig visueel dat ook selectie-/statusverschillen tekstueel herkenbaar blijven. |
| 1.4.2 | Audio Control | A | Nee | NOT APPLICABLE | Geen automatisch afgespeelde audio aangetroffen. | WL-001 | Geen relevante audio. | Herbeoordeel bij audio. |
| 1.4.3 | Contrast (Minimum) | AA | Ja | MANUAL REVIEW REQUIRED | Tokens tonen `#496579` secundaire tekst en diverse statuskleuren; geen gerenderde contrastmetingen. | Alle Learning-routes | Contrast van tekst, links, labels en feedback is niet gemeten. | Meet WCAG-contrast op gerenderde combinaties en herstel falende tokens. |
| 1.4.4 | Resize Text | AA | Ja | NOT TESTED — TOOLING LIMITATION | Geen browser/zoomtool beschikbaar. | Learning en exam | 200%-tekstvergroting niet geprobeerd. | Test 200% zoom zonder content-/functieverlies. |
| 1.4.5 | Images of Text | AA | Ja | MANUAL REVIEW REQUIRED | HTML-coursecontent is hoofdzakelijk tekst; logo/PDF niet volledig visueel geïnventariseerd. | Lescontent; certificaat-PDF | Niet vastgesteld of eventuele contentafbeeldingen tekst bevatten. | Inventariseer content en vervang tekstafbeeldingen door echte tekst waar mogelijk. |
| 1.4.10 | Reflow | AA | Ja | NOT TESTED — TOOLING LIMITATION | Geen bestaande browsertab/viewport beschikbaar. | Learning, examoverzicht, certificaatkaart | 320 CSS px / 400%-reflow niet getest. | Controleer horizontale overflow en volledige bediening bij reflow. |
| 1.4.11 | Non-text Contrast | AA | Ja | MANUAL REVIEW REQUIRED | `--color-border: #c8dce7` wordt als componentgrens gebruikt; geen contrastmeting van gerenderde controls/focus. | Form controls en focus | Licht border-token kan onvoldoende onderscheiden op lichte surface; te verifiëren. | Meet grens/focus/icon/statuscontrasten; pas token gericht aan. |
| 1.4.12 | Text Spacing | AA | Ja | NOT TESTED — TOOLING LIMITATION | Geen browser/teststylesheet voor tekstspacing beschikbaar. | Lesson/exam content | Instellingen voor regel-, alinea-, letter- en woordafstand niet getest. | Test de voorgeschreven spacing override zonder clipping/overlap. |
| 1.4.13 | Content on Hover or Focus | AA | Ja | PASS | Geen hover-/focus-only popovers of extra content aangetroffen in geïnspecteerde Learning-componenten. | LessonPlayer, examplayer | Geen aanvullende content waarvoor dismiss/hover nodig is aangetroffen. | Herbeoordeel bij tooltips/popovers. |
| 2.1.1 | Keyboard | A | Ja | MANUAL REVIEW REQUIRED | Native controls en buttons aanwezig; geen keyboard-only run uitgevoerd. | Alle Learning-flows | Volledige flowbediening met keyboard onbevestigd. | Voer keyboard-only test uit inclusief navigatie, sorting, submit en download. |
| 2.1.2 | No Keyboard Trap | A | Ja | MANUAL REVIEW REQUIRED | De aangepaste dialoog heeft een expliciete Tab/Shift+Tab-focuscyclus en Escape-afhandeling; browserkeyboard-/screenreadercontrole ontbreekt nog. | Exam submitdialoog | Tab/Shift+Tab worden binnen de dialoog gehouden en Escape sluit de dialoog buiten een lopende submit; echte browserbediening is niet gevalideerd. | Bevestig Tab/Shift+Tab/Escape en herstel focus handmatig; zie A11Y-01. |
| 2.1.4 | Character Key Shortcuts | A | Nee | NOT APPLICABLE | Geen single-character shortcut aangetroffen. | Learning | Geen relevante shortcuts. | Herbeoordeel bij shortcuts. |
| 2.2.1 | Timing Adjustable | A | Ja | PASS | Exam policy/player bevat geen timer of tijdslimiet; opslag is voortgangsgestuurd. | Examplayer | Geen examenklok waargenomen in code. | Authsessietimeout separaat beoordelen. |
| 2.2.2 | Pause, Stop, Hide | A | Nee | NOT APPLICABLE | Geen automatisch bewegende/scrollende of zelfverversende content aangetroffen. | Learning | Geen relevante bewegende content. | Herbeoordeel bij dynamische media. |
| 2.3.1 | Three Flashes or Below Threshold | A | Ja | PASS | Geen flash-/strobe-effect aangetroffen in de geïnspecteerde Learning-code. | Lesson/exam UI | Geen flitsende content in code-inventaris. | Visuele browsercheck blijft onderdeel van integrale review. |
| 2.4.1 | Bypass Blocks | A | Ja | PASS | Skiplink verwijst naar `#main-content`, dat in `ApplicationChrome` als `<main>` bestaat. | Globale layout | Bypassmogelijkheid is programmatisch aanwezig. | Verifieer werking/focus in browser. |
| 2.4.2 | Page Titled | A | Ja | MANUAL REVIEW REQUIRED | Metadata aanwezig op enkele routes; geen volledige document.title-run. | Alle Learning-routes | Titel van dynamische routes niet route voor route bevestigd. | Controleer unieke, beschrijvende documenttitels. |
| 2.4.3 | Focus Order | A | Ja | MANUAL REVIEW REQUIRED | Vraagwissel focust heading; de dialoog heeft nu initieel focusbeheer en herstel, getest met jsdom. | FinalExamPlayer | Browser-/screenreaderbevestiging ontbreekt. | Controleer focusvolgorde en herstel handmatig in browser. |
| 2.4.4 | Link Purpose (In Context) | A | Ja | MANUAL REVIEW REQUIRED | Kernlinks hebben actietekst in broncode; volledige route-/contextreview ontbreekt. | Learning en certificaat | Niet alle links in de volledige cursus geïnventariseerd. | Controleer linktekst in context en vermijd onduidelijke icon-only links. |
| 2.4.5 | Multiple Ways | AA | Ja | MANUAL REVIEW REQUIRED | Hoofdstuknavigatie bestaat; cursusbreed alternatieve vindbaarheid niet getest. | WL-001 | Niet vastgesteld dat relevante pagina’s op meer dan één manier te vinden zijn. | Verifieer cursusbrede route-/navigatiemogelijkheden. |
| 2.4.6 | Headings and Labels | AA | Ja | MANUAL REVIEW REQUIRED | H1/H2, legends en labels komen voor; geen volledige outline-/accessibility-tree-review. | Learning routes | Semantische hiërarchie over alle pagina’s onbevestigd. | Controleer koppenstructuur per route en vraaggroep. |
| 2.4.7 | Focus Visible | A | Ja | MANUAL REVIEW REQUIRED | Globale `:focus-visible`-outline van 3 px bestaat; kleur/afkapping niet visueel gemeten. | Globale styles en Learning controls | CSS-aanwezigheid bewijst niet dat focus in alle omstandigheden zichtbaar is. | Visueel toetsen op alle componenten, achtergronden en zoom. |
| 2.4.11 | Focus Not Obscured (Minimum) | AA | Ja | MANUAL REVIEW REQUIRED | Geen sticky/fixed/scroll-container focusrun uitgevoerd. | Appchrome, lesson/exam, dialog | Afdekking door viewport-/scrollcontainers onbekend. | Test focused items op desktop en mobiel. |
| 2.5.1 | Pointer Gestures | A | Ja | PASS | Geïnspecteerde interacties gebruiken standaard controls; geen multipoint/pathgesture. | Lesson/exam controls | Alternatieven voor complexe pointergebaren niet nodig in code-inventaris. | Herbeoordeel bij nieuwe gebaren. |
| 2.5.2 | Pointer Cancellation | A | Ja | PASS | Acties gebruiken standaard buttons/links en niet pointer-down-only handlers. | Learning controls | Geen afwijkende pointer-activering aangetroffen. | Bevestig bij nieuwe custom pointerlogica. |
| 2.5.3 | Label in Name | A | Ja | PASS | Opties hebben gekoppelde zichtbare `<label>`-tekst; examoverzicht heeft vraagnummer in naam. | LessonPlayer, FinalExamPlayer | Zichtbare namen zijn in code aanwezig. | Controleer browser accessibility tree. |
| 2.5.4 | Motion Actuation | A | Nee | NOT APPLICABLE | Geen motion-/bewegingssensorbediening aangetroffen. | WL-001 | Geen relevante bediening. | Herbeoordeel bij introductie. |
| 2.5.7 | Dragging Movements | AA | Ja | PASS | Sorting gebruikt selectvelden om categorie/volgorde toe te kennen, geen drag-only interaction. | LessonPlayer SORTING | Keyboardalternatief zit in de bediening zelf. | Behoud en test dit voor alle sortingvarianten. |
| 2.5.8 | Target Size (Minimum) | AA | Ja | MANUAL REVIEW REQUIRED | Examknoppen en antwoordkaarten hebben `min-h-11`; werkelijke afmetingen/afstand niet gemeten. | Examoverzicht en controls | Niet alle routecontrols en spacing gecontroleerd. | Meet targets en tussenruimte, ook bij 390 px. |
| 3.1.1 | Language of Page | A | Ja | PASS | Root-layout gebruikt `<html lang="nl">`. | Hele app | Programma-taal aanwezig. | Controleer gerenderde DOM bij runtime. |
| 3.1.2 | Language of Parts | AA | Ja | MANUAL REVIEW REQUIRED | Content bevat vaktermen; taalwisseling niet volledig geïnventariseerd. | H1–H10, e-mail | Niet vastgesteld of anderstalige passages markering behoeven. | Review passages en markeer betekenisvolle taalwisselingen. |
| 3.2.1 | On Focus | A | Ja | MANUAL REVIEW REQUIRED | Geen focus-only route-/contextwijziging uit geïnspecteerde controls zichtbaar; niet met keyboard getest. | Learning routes | Runtimecontextwijziging onbevestigd. | Doorloop focus-only states handmatig. |
| 3.2.2 | On Input | A | Ja | MANUAL REVIEW REQUIRED | Formatieve radioselectie en examautosave veroorzaken updates; verandering van context niet browsergetest. | Lesson/exam | Voorspelbaarheid en melding van wijzigingen onbevestigd. | Test radio-, checkbox- en sortingkeuzes met assistive technology. |
| 3.2.3 | Consistent Navigation | AA | Ja | MANUAL REVIEW REQUIRED | Routeverschillen zijn niet visueel vergeleken. | Learning en certificaat | Volgorde/plaatsing van herhaalde navigatie onbekend. | Vergelijk herhaalde navigatie over routes. |
| 3.2.4 | Consistent Identification | AA | Ja | MANUAL REVIEW REQUIRED | Geen volledige component-/labelvergelijking uitgevoerd. | Learning controls | Consistente identificatie onbevestigd. | Controleer dezelfde functies op gelijke namen en gedrag. |
| 3.2.6 | Consistent Help | A | Nee | NOT APPLICABLE | Geen herhaalde hulpfunctie/contactmechanisme geïdentificeerd in de geïnspecteerde Learning-scope. | Learning | Geen relevante helpvoorziening. | Herbeoordeel als help op meerdere pagina’s wordt toegevoegd. |
| 3.3.1 | Error Identification | A | Ja | MANUAL REVIEW REQUIRED | Componenten gebruiken alert/status; profile validation text bestaat, maar foutkoppeling niet browsergetest. | Enrollment, profile, save/submit | Herkenning en koppeling aan invoer onbevestigd. | Test foutscenario’s; koppel fouttekst programmatisch waar nodig. |
| 3.3.2 | Labels or Instructions | A | Ja | PASS | Exam gebruikt fieldset/legend; certificaatnaamformulier koppelt label/input en gebruikt required/autocomplete. | Exam en certificaatnaam | Kernvelden hebben zichtbare/programmatic instructies. | Controleer enrollmentformulieren volledig. |
| 3.3.3 | Error Suggestion | AA | Ja | MANUAL REVIEW REQUIRED | Geen complete foutpaden-/hersteltest uitgevoerd. | Formulieren, exam | Bruikbare herstelstappen onbekend. | Doorloop fouten en bevestig concrete hersteltekst. |
| 3.3.4 | Error Prevention (Legal, Financial, Data) | AA | Ja | MANUAL REVIEW REQUIRED | Exam submitdialoog toont unanswered-count en terugoptie in code. | Exam submission | Visuele/interactionele werking vóór onomkeerbare actie niet bevestigd. | Test submit flow incl. onbeantwoord-waarschuwing. |
| 3.3.7 | Redundant Entry | A | Nee | NOT APPLICABLE | Geen herhaalde invoer van eerder verstrekte informatie in geïnspecteerde Learning-flow vastgesteld. | Learning | Geen relevante dubbele invoer. | Herbeoordeel bij nieuwe formulieren. |
| 3.3.8 | Accessible Authentication (Minimum) | AA | Ja | NOT TESTED — TOOLING LIMITATION | Geen bestaande ingelogde browsertab of loginflow beschikbaar. | Login voor Learning | Password manager/paste en cognitieve verificatie niet gecontroleerd. | Voer bestaande loginflow met keyboard/screenreader uit; geen account wijzigen. |
| 4.1.2 | Name, Role, Value | A | Ja | MANUAL REVIEW REQUIRED | Native controls en statusrollen zichtbaar in code; browser accessibility tree niet beschikbaar. | Lesson/exam/dialog | Werkelijke rol/name/value en dialogsemantiek niet gecontroleerd. | Inspecteer accessibility tree en NVDA/Chrome. |
| 4.1.3 | Status Messages | AA | Ja | MANUAL REVIEW REQUIRED | Lesfeedback gebruikt `status`/`alert`; exam save state gebruikt live status. | LessonPlayer, FinalExamPlayer | Aankondiging, timing en duplicatie niet met schermlezer getest. | Test feedback en autosave-announcements met NVDA. |

### Waarneembaar

Les- en examcontent gebruikt semantische koppen, fieldsets/legends en zichtbare statuscopy. De HTML-root declareert Nederlands. De certificaat-PDF bevat nu expliciete PDFKit-tags, documenttaal, structuurboom en getagde QR-alttekst. PDF/UA-conformiteit, leesvolgorde met assistive technology, alle media-alternatieven, browsercontrast, reflow en spacing zijn nog niet volledig gevalideerd.

### Bedienbaar

Native radio’s, checkboxen en selectvelden maken de vraagtypen en sorting in de broncode zonder drag-and-drop bedienbaar. De examplayer verplaatst focus bij vraagwissel naar de vraagkop. De submitbevestiging is een zelfgebouwde `aria-modal`-dialoog zonder focusverplaatsing, focusbegrenzing of herstel van focus in de geïnspecteerde component; dit kan de toetsinlevering met toetsenbord en schermlezer hinderen.

### Begrijpelijk

De meeste onderzochte acties hebben beschrijvende tekst en de examenflow toont aantallen onbeantwoorde vragen vóór definitieve inlevering. Consistentie over alle routes, foutassociatie, inputgedrag en authenticatie zijn niet handmatig gevalideerd.

### Robuust

Er zijn semantische HTML-elementen en statusrollen in de Learning-componenten. Er is geen axe-/accessibility-testharness of browser E2E-configuratie gevonden. Screenreadercompatibiliteit, browser accessibility tree en dynamische announcements zijn niet met een assistive technology getest.

## Bevindingen

| ID | WCAG | Prioriteit | Route/component | Bevinding en impact | Aanbevolen vervolg | Inspanning | Status |
|---|---|---|---|---|---|---|---|
| A11Y-01 | 2.4.3 Focus Order; 2.4.11 Focus Not Obscured | P1 | `FinalExamPlayer` submitdialoog | De dialoog is aangepast met benoemde dialogsemantiek, initieel focusbeheer, Tab-focusbegrenzing, Escape-sluiting, focusherstel en een inerte achtergrond. Componentregressietests dekken deze werking; browser-/screenreaderbevestiging ontbreekt nog. | Voer de resterende handmatige browser-/screenreadercontrole uit van dialognaam, focuscyclus, Escape en focusherstel. | Middel | CODE FIXED; MANUAL REVIEW REQUIRED — componenttests groen; browser/screenreader niet beschikbaar |
| A11Y-02 | 1.3.1 Info and Relationships; PDF-documenttoegankelijkheid | P1 | `learning-certificate-pdf.ts` | De generator gebruikt nu PDFKit 0.20.2 met `tagged: true`, `lang: 'nl'`, titelmetadata en expliciet aangemaakte Document/H1/H2/P/Figure-elementen. Logo, accentbalk en lijn zijn Artifact; de QR is Figure met alt; de verificatiecode staat ook als tekst. PDF.js bevestigt `/MarkInfo`, documenttaal en de structuurboom. | Voer nog PDF/UA-checker en handmatige schermlezer-/leesvolgordecontrole uit. | Groot | MANUAL REVIEW REQUIRED — technische tagged-PDF-structuur en geautomatiseerde inspectie aanwezig; geen externe PDF/UA- of screenreader-validatie |
| A11Y-03 | 1.4.3 Contrast (Minimum); 1.4.11 Non-text Contrast | P2 | Learning design tokens en form controls | De code gebruikt onder meer `--color-border: #c8dce7` op witte/surface-achtergronden. Dat is een zeer lichte grens; afhankelijk van de control kan de grens het 3:1 minimum voor noodzakelijke visuele controlinformatie niet halen. De uiteindelijke browserstijl en contrastverhouding zijn niet gemeten. | Meet tekst, links, feedback, focus, controlgrenzen en statuskleuren op gerenderde pagina’s; versterk alleen tokens/componenten die aantoonbaar falen. | Middel | MANUAL REVIEW REQUIRED — tokeninspectie; geen browsermeting |
| A11Y-04 | 1.1.1 Non-text Content | P2 | H1–H10 content; certificaat-PDF | Certificaatlogo is decoratief gemarkeerd; QR heeft Figure-alttekst en dezelfde verificatiecode is zichtbaar als tekst. De volledige cursusmedia heeft geen afgeronde inhoudelijke alt-audit. | Inventariseer gepubliceerde media en bevestig alternatieven voor informatieve/complexe visuals. | Middel/groot | MANUAL REVIEW REQUIRED — certificaat-PDF technisch afgedekt; cursusasset-audit open |
| A11Y-05 | 1.3.1; 1.3.2; 1.3.3 | P2 | PROCESS, CALLOUT, SUMMARY, casuscontent | PROCESS wordt als genummerde lijst gerenderd en H1–H10-content als tekstblokken; de correcte betekenis en leesvolgorde van alle casuskaarten en opgeslagen blokken zijn niet browser-/schermlezergewijs gecontroleerd. | Controleer iedere complexe visual/casus tegen de opgeslagen tekst en leesvolgorde; zorg dat geen informatie alleen visueel wordt uitgedrukt. | Middel | MANUAL REVIEW REQUIRED — code toont ordelijke lijstmarkup, maar niet de volledige perceptuele ervaring |
| A11Y-06 | 1.4.4 Resize Text; 1.4.10 Reflow; 1.4.12 Text Spacing | P2 | Learning-, examen- en certificaatroutes | Geen 200%-zoom, 400%-reflow (320 CSS px), verhoogde tekstspacing of viewporttest uitgevoerd. Lange examopties, het 1–50-overzicht en de certificaatkaart/PDF blijven daarom onbevestigd. | Test de aangegeven zoom-, reflow- en spacinginstellingen in browser; leg eventuele horizontale overflow en verlies van functionaliteit vast. | Middel | NOT TESTED — TOOLING LIMITATION |
| A11Y-07 | 2.1.1 Keyboard; 2.4.7 Focus Visible | P2 | Hele Learning-flow | De broncode gebruikt native inputs/selects/buttons en globale `:focus-visible`-outline. Dit is positief, maar de volledige route, focusvolgorde, zichtbaarheid op alle achtergronden en daadwerkelijke toetsenbordbediening zijn niet doorlopen. | Voer keyboard-only test uit op catalogus, enrollment, les, sorting, examen, dialoog en certificaatroutes. | Middel | MANUAL REVIEW REQUIRED |
| A11Y-08 | 2.1.2 No Keyboard Trap | P2 | Exam submitdialoog | Er is geen expliciete keyboard trap zichtbaar; de echte Tab-/Shift+Tab-/Escape-afhandeling is niet getest. Dit criterium vereist dat focus niet vast komt te zitten, maar de modalgedraging zelf is afzonderlijk bevinding A11Y-01. | Verifieer bediening en uitweg met keyboard; test ook dialogsluiting. | Klein | MANUAL REVIEW REQUIRED |
| A11Y-09 | 2.1.4 Character Key Shortcuts | AA | Learning-/examenroutes | Geen Learning-specifieke single-character shortcuts aangetroffen in de geïnspecteerde componenten. | Geen vervolg nodig zolang zulke shortcuts niet worden toegevoegd. | Klein | NOT APPLICABLE |
| A11Y-10 | 2.2.1 Timing Adjustable | A | Examplayer en lesflow | De examplayer toont geen timer en examenbeleid gebruikt geen tijdslimiet; er is geen andere Learning-sessie-/antwoordtimer in de geïnspecteerde flow aangetroffen. Authsessietimeouts vallen buiten deze productcontrole. | Bevestig auth-timeoutbeleid separaat bij integrale auth-audit. | Klein | PASS — examplayer/policy-code-inspectie; geen runtime auth-timeouttest |
| A11Y-11 | 2.2.2 Pause, Stop, Hide | A | Learning-content | Geen automatisch bewegende of zelfverversende Learning-content aangetroffen; animaties zijn korte decoratieve transities. | Herbeoordeel bij introductie van carrousels, autoplay of bewegende content. | Klein | NOT APPLICABLE |
| A11Y-12 | 2.3.1 Three Flashes or Below Threshold | A | Learning-content | In geïnspecteerde componenten geen flitsende content of herhaalde flitsanimatie aangetroffen. | Bevestig visueel tijdens browserreview als nieuwe media wordt toegevoegd. | Klein | MANUAL REVIEW REQUIRED |
| A11Y-13 | 2.4.1 Bypass Blocks | A | Globale layout | Root-layout bevat een zichtbare-bij-focus skiplink naar `#main-content`; ApplicationChrome levert een `<main id="main-content">`. | Browsermatig verifiëren dat link focusbaar is en naar de juiste hoofdinhoud springt op Learning-routes. | Klein | PASS — `src/app/layout.tsx`, `src/components/layout/application-chrome.tsx` |
| A11Y-14 | 2.4.2 Page Titled | A | Learning- en certificaatroutes | Enkele route-metadata is aanwezig, maar titels van alle dynamische routes zijn niet systematisch in browser/tab gecontroleerd. | Controleer document.title voor aanbod, cursus, hoofdstuk, examstart, attempt, resultaat, Mijn e-learnings en verificatie. | Klein | MANUAL REVIEW REQUIRED |
| A11Y-15 | 2.4.3 Focus Order | A | Examplayer en submitdialoog | Vraagwissel focust de nieuwe examvraagheading; hoofdstukplayer richt focus op nieuwe les-/completionheading. De submitdialoog heeft nu initieel focusbeheer en herstel, afgedekt door componenttests. | Bevestig beide focuspatronen handmatig met browser en assistive technology. | Middel | MANUAL REVIEW REQUIRED — dialoogfix en jsdom-tests aanwezig; niet browser-/screenreadergetest |
| A11Y-16 | 2.4.4 Link Purpose (In Context) | A | Learning-/certificaatlinks | Geïnspecteerde kernlinks zoals “Mijn e-learnings”, “Certificaat downloaden” en “Terug naar de toets” beschrijven de actie. De volledige routeset is niet visueel/tekstueel doorgelopen. | Controleer overige links en samengestelde cursuskaarten in context. | Klein | MANUAL REVIEW REQUIRED |
| A11Y-17 | 2.4.5 Multiple Ways | AA | WL-001-navigatie | Navigatievarianten en zoek-/overzichtsroutes over de volledige cursus zijn niet in browser gecontroleerd; in de lesplayer is een hoofdstuknavigatie aanwezig. | Bevestig meerdere manieren om relevante Learning-pagina’s te vinden of documenteer toepasselijkheid van de sitebrede navigatie. | Klein | MANUAL REVIEW REQUIRED |
| A11Y-18 | 2.4.6 Headings and Labels | AA | Lesplayer, examen, forms | Components gebruiken headings en fieldset-legends; headingniveau’s per alle serverroutes, cursusblokken en checkresultaten zijn niet met accessibility tree gevalideerd. | Voer headings-outline- en accessible-name-inspectie uit voor iedere route. | Klein | MANUAL REVIEW REQUIRED |
| A11Y-19 | 2.4.7 Focus Visible | A | Globale styles en Learning controls | Globale CSS definieert `:focus-visible` met 3px outline; lesplayer-controls hebben daarnaast focusstijl. Contrasts en clipping door overflow/sticky elementen zijn niet visueel getest. | Bevestig focuszichtbaarheid en niet-afdekking op iedere interactieve control. | Klein | MANUAL REVIEW REQUIRED |
| A11Y-20 | 2.4.11 Focus Not Obscured (Minimum) | AA | Sticky/fixed appchrome, dialog | De layout bevat scroll-/overflowcontainers en de submitdialoog is fixed. Geen toets uitgevoerd met toetsenbordfocus rond sticky/fixed elementen of bij zoom. | Test focus op alle viewports; zorg dat focused item niet volledig wordt bedekt. | Middel | MANUAL REVIEW REQUIRED |
| A11Y-21 | 2.5.1 Pointer Gestures | A | Learning-interacties | De geïnspecteerde controls vragen geen multipoint- of padgebaseerd gebaar; sorting gebruikt selectvelden. | Herbeoordeel bij nieuwe gebaarinteracties. | Klein | PASS — native controlimplementatie |
| A11Y-22 | 2.5.2 Pointer Cancellation | A | Learning buttons | Interacties zijn standaard buttons/links en gebruiken geen pointer-down-only uitvoering in geïnspecteerde code. Geen handmatige pointertest. | Controleer indien custom pointer-handlers worden toegevoegd. | Klein | MANUAL REVIEW REQUIRED |
| A11Y-23 | 2.5.3 Label in Name | A | Examvraagopties en action controls | Optietekst staat binnen gekoppelde `<label>`-elementen; vraagoverzichtbuttons hebben expliciete aria-labels die ook het zichtbare vraagnummer bevatten. | Test accessible names met browser accessibility tree. | Klein | PASS — les-/examplayercode en bestaande componenttests |
| A11Y-24 | 2.5.4 Motion Actuation | A | Learning-interacties | Geen beweging-geactiveerde bediening aangetroffen. | Geen vervolg nodig tenzij bewegingssensorbediening wordt toegevoegd. | Klein | NOT APPLICABLE |
| A11Y-25 | 2.5.7 Dragging Movements | AA | SORTING-oefeningen | SORTING gebruikt per item een native `<select>` voor categorie of volgordepositie; geen drag-onlybediening aangetroffen. De werking van alle H1–H10-seeds is niet interactief doorlopen. | Behoud het selectalternatief bij iedere sortingvraag en test keyboard/screenreader op representatieve vragen. | Klein | PASS — `lesson-player.tsx`; componenttest toont sortingselect |
| A11Y-26 | 2.5.8 Target Size (Minimum) | AA | Vraagoverzicht, keuzes, navigatie | Geïnspecteerde examenbuttons en antwoordkaarten hebben `min-h-11` of groter; dat is groter dan 24 CSS px. Afstand/uitzonderingen en overige routes zijn niet visueel gecontroleerd. | Meet feitelijke klikdoelen en spacing op browser/390 px viewport. | Klein | MANUAL REVIEW REQUIRED |
| A11Y-27 | 3.1.1 Language of Page | A | Hele app | Root HTML declareert `<html lang="nl">`. | Controleer gerenderde route en documenttaal in browser. | Klein | PASS — `src/app/layout.tsx` |
| A11Y-28 | 3.1.2 Language of Parts | AA | WL-001-content en e-mail | Mogelijke anderstalige termen/citaten zijn niet systematisch gemarkeerd of inhoudelijk geïnventariseerd. | Markeer anderstalige passages met passende `lang` waar uitspraak/reproductie relevant is. | Klein | MANUAL REVIEW REQUIRED |
| A11Y-29 | 3.2.1 On Focus | A | Lesson/exam controls | Broncode toont native focusbare controls; geen routeverandering uitsluitend door focus zichtbaar. Niet met keyboard getest. | Verifieer volledige keyboardflow. | Klein | MANUAL REVIEW REQUIRED |
| A11Y-30 | 3.2.2 On Input | A | SINGLE/MULTI_CHOICE en SORTING | Examenkeuzes worden opgeslagen zonder directe inhoudelijke feedback; formatieve single choice geeft na selectie feedback zoals bedoeld. Geen onverwachte navigatie is uit code af te leiden, maar dynamisch gedrag is niet browsergetest. | Test representatieve single-, multi- en sortinginteracties. | Klein | MANUAL REVIEW REQUIRED |
| A11Y-31 | 3.2.3 Consistent Navigation | AA | Site-/Learning-chrome | Navigatieconsistentie tussen aanbod, Mijn e-learnings, hoofdstukken, exam en certificaat is niet visueel vergeleken. | Vergelijk locatie, volgorde en labels van herhaalde navigatie. | Klein | MANUAL REVIEW REQUIRED |
| A11Y-32 | 3.2.4 Consistent Identification | AA | Gedeelde Learning-controls | Geen volledige vergelijking van gelijksoortige controls, meldingen en labels uitgevoerd. | Controleer gedeelde identificatie tijdens routewalkthrough. | Klein | MANUAL REVIEW REQUIRED |
| A11Y-33 | 3.2.6 Consistent Help | A | Learning | Geen herhaalde helpfunctie in de geïnspecteerde cursusflow geïdentificeerd. | Herbeoordeel zodra helpcontact of hulpfunctie op Learning-routes voorkomt. | Klein | NOT APPLICABLE |
| A11Y-34 | 3.3.1 Error Identification | A | Enrollment, profielnaam, save/submit | Sommige fouten krijgen `role="alert"` en exam-saves tonen een status; geen browsercontrole van fouttekst, bronfocus of relatie met de betreffende invoer uitgevoerd. | Controleer dat elke fout tekstueel benoemd, ontdekt en aan de betreffende invoer/actie gekoppeld is. | Middel | MANUAL REVIEW REQUIRED |
| A11Y-35 | 3.3.2 Labels or Instructions | A | Examopties en certificaatnaamformulier | Examkeuzes gebruiken fieldsets/legends en labels; naamvelden hebben gekoppelde labels, `required` en autocomplete-attributen. | Controleer overige enrollment-/accountformulieren en zichtbare verplichte instructies. | Klein | PASS — `final-exam-player.tsx`, certificate name page |
| A11Y-36 | 3.3.3 Error Suggestion | AA | Naamformulier, save- en submitfouten | Bruikbare suggesties en herstelacties zijn niet voor alle foutpaden in een browser beoordeeld. | Test fouten en bevestig dat de gebruiker weet hoe te herstellen. | Klein | MANUAL REVIEW REQUIRED |
| A11Y-37 | 3.3.4 Error Prevention (Legal, Financial, Data) | AA | Definitief examen inleveren | Submitflow toont beantwoord/onbeantwoord aantallen, waarschuwing en “Terug naar de toets” vóór definitieve inlevering. De complete transactiewalkthrough is niet uitgevoerd. | Verifieer browsermatig dat waarschuwing en bevestiging vóór onomkeerbare submission worden getoond. | Klein | MANUAL REVIEW REQUIRED |
| A11Y-38 | 3.3.7 Redundant Entry | A | Learning-formulieren | Geen herhaalde invoer van dezelfde gegevens binnen de geïnspecteerde leerflow aangetroffen. | Geen vervolg nodig zolang dubbele invoer ontbreekt. | Klein | NOT APPLICABLE |
| A11Y-39 | 3.3.8 Accessible Authentication (Minimum) | AA | Login/session voor Learning | De audit heeft geen loginflow met bestaande browsersessie kunnen uitvoeren. Er is geen controle op password manager, plakken of cognitieve functietest verricht. | Test bestaande authenticatieflow zonder accountwijzigingen; controleer copy/paste en password managers. | Middel | NOT TESTED — TOOLING LIMITATION |
| A11Y-40 | 4.1.2 Name, Role, Value | A | Les-, examen- en dialoogcontrols | Native controls en expliciete roles/namen zijn zichtbaar; juistheid van de gerenderde accessibility tree, vooral de `aria-modal`-dialoog, is niet getest met assistive technology. | Browser accessibility-tree- en schermlezerreview. | Middel | MANUAL REVIEW REQUIRED |
| A11Y-41 | 4.1.3 Status Messages | AA | Lesfeedback, opslaan, fouten | Lesfeedback gebruikt `role="status"`/`alert` met live announcement; examsave-status gebruikt `role="status" aria-live="polite"`; submitfouten gebruiken `role="alert"`. Announcement timing/duplicatie is niet met schermlezer getest. | Verifieer meldingen met NVDA + Chrome/Edge en voorkom dubbele/overmatige aankondiging. | Klein | MANUAL REVIEW REQUIRED |

## Automatische tests en tooling

- `lesson-player.test.tsx` bevat renderer- en interactietests voor labels/controls, feedback en sortingselects; `final-exam-player.test.tsx` controleert onder meer radio/checkbox en de expliciete multi-selectinstructie.
- De certificaat-PDF-tests controleren één pagina, A4-landscape, echte tekst, disclaimer, certificaatnummer, titelmetadata, taal `nl`, `/MarkInfo`, `/StructTreeRoot`, Figure-altmarker en de uitleesbare Document/H1/H2/P/Figure-boom via PDF.js. Dit is geen volledige PDF/UA-validatie of schermlezertest.
- Er is geen repository-eigen axe-/pa11y-/Playwright-/Cypress-accessibilityharness gevonden. `axe-core` komt transitief voor in `package-lock.json`, maar is niet als Learning-auditrunner geconfigureerd. De eerdere examdialoogrun bleef 2 testbestanden/6 tests groen. In de PDF-remediatieronde zijn 8 gerichte regressietestbestanden uitgevoerd: 49 passed, 0 failed, 0 skipped.
- Browserinventaris: geen bruikbare browsertab beschikbaar voor deze remediation. Daardoor geen console-, netwerk-, viewport- of visuele screenshots en geen handmatige focus-/dialogverificatie.
- NVDA of een andere schermlezer is niet gebruikt. Alle toepasselijke screenreader-/keyboardflows blijven handmatige review.

## Scope-afbakening en resterende acties

Geïnspecteerd: WL-001 lesson- en examcomponents, aanbod/cursus/hoofdstuk-/examen-/resultaat-/Mijn e-learningsroutes, publieke certificaatverificatie, certificaatnaamformulier, PDF-generator, e-mailtemplate, globale skiplink/layout en Learning-tests. In Phase 1 is de exam-inleverdialoog aangepast en is uitsluitend de certificaat-PDF-generator naar PDFKit getagd; overige PDF-generators zijn niet gemigreerd.

Prioriteiten voor vervolg: (1) handmatige browser-/schermlezerbevestiging van de aangepaste dialogfocuscyclus, (2) PDF/UA-validator en schermlezercontrole van de certificaatstructuur, leesvolgorde en QR-verificatie, (3) browsermatige keyboardflow, (4) contrastmeting van controls en focus, (5) 200%-zoom/400%-reflow/text-spacing, (6) visuele en alt-inventaris van alle opgeslagen H1–H10-content en de volledige publieke cursusflow.

**Geen conformiteitsclaim:** op basis van deze beperkte code-inspectie is WorkMatchr Learning niet als WCAG 2.2 AA-conform vastgesteld.


## WCAG-remediation phase 1 — beperkte opvolging

### A11Y-01 / Focus Order — codeherstel

De exam-inleverdialoog heeft nu een benoemde `role="dialog"` met `aria-modal="true"`, beschrijving via `aria-describedby`, initiële focus op “Terug naar de toets”, Tab/Shift+Tab-focusbegrenzing, Escape-sluiting zolang geen submission bezig is, focusherstel naar “Toets inleveren” en `inert` op de achterliggende examinterface. Submitfouten worden in de open dialoog aangekondigd. De bestaande server-side submitactie en antwoord-/scoreafscherming zijn niet gewijzigd.

Tests: `final-exam-player.test.tsx` en `final-exam-player-dialog.test.tsx` — 2 bestanden, 6 passed. De jsdom-test simuleert de browser-default focusverplaatsing voor Tab; dit is geen echte browser- of assistive-technologytest. Daarom zijn matrixcriteria 2.4.3 en dialogbevinding A11Y-01 nu `MANUAL REVIEW REQUIRED`, niet PASS. De oorspronkelijke 25 andere handmatige reviewitems zijn inhoudelijk ongewijzigd.

### A11Y-02 / Certificaat-PDF — PDFKit-remediatie

Alleen `src/lib/learning/learning-certificate-pdf.ts` is gemigreerd naar PDFKit 0.20.2. De geïnstalleerde `@types/pdfkit` en `pdfkit/js/pdfkit.js` zijn vóór implementatie gecontroleerd: de gekozen API ondersteunt `tagged`, `lang`, `displayTitle`, `markStructureContent`, `endMarkedContent`, `struct`, `addStructure` en `endMarkings`. De generator gebruikt deze functies expliciet; tagging wordt niet verondersteld.

De pagina is één A4-landscapepagina. De bestaande opmaak, WorkMatchr-logo, ingebouwde Helvetica-fonts, gegevens, certificaatcode, QR-verificatielink, disclaimer en bestandsnaaminterface zijn behouden. De logo-afbeelding, accentbalk en scheidingslijn zijn Artifact. Tekst wordt in leesvolgorde opgenomen onder Document met H1/H2/P-rollen. De QR wordt als Figure met alttekst opgenomen; certificaatnummer en verificatie-informatie staan ook tekstueel. De generator retourneert nog steeds `Uint8Array`, zodat private download, mailattachment, snapshot, QR-code en outboxworker dezelfde interface houden.

PDF.js 6.2.108 leest de uitvoer onafhankelijk in tests: één pagina, titelmetadata, taal `nl`, `MarkInfo.Marked = true` en de structuurrollen Document/H1/H2/P/Figure zijn bevestigd; de ruwe PDF bevat `/StructTreeRoot`, `/Lang (nl)` en `/Alt`. Tests bevestigen ook studentnaam, opleiding, code en exacte disclaimer, en afwezigheid van e-mail en score. Dit bewijst de technische tagging-/structuurimplementatie, niet PDF/UA-conformiteit of werkelijke schermlezerleesvolgorde.

De nieuwe runtime-dependencies zijn `pdfkit@0.20.2` en type-dependency `@types/pdfkit@^0.17.6`. `pdf-lib` is behouden omdat andere repositoryonderdelen PDF’s blijven genereren/parsen (onder meer adviesdossiers, compliance-/BHV-rapporten, facturen en knowledge-ingestie). PDFKit wordt uitsluitend vanuit de `server-only` certificaatgenerator geladen; geen clientcomponent importeert de library. De PDFKit-uitvoer blijft afhankelijk van de bestaande Node-route/mailworker.

Bronnen: [pdf-lib PDFDocument API](https://pdf-lib.js.org/docs/api/classes/pdfdocument), [PDFKit accessibility](https://pdfkit.org/docs/accessibility.html), [PDFKit getting started](https://pdfkit.org/docs/getting_started.html), [Apryse PDF/UA](https://docs.apryse.com/core/guides/features/pdfua).

### Publieke HTML-verificatie en QR

Code-inspectie van `src/app/certificaat/[code]/page.tsx` bevestigt een `<h1>` per geldige/ongeldige/onbekende status, `<dl>/<dt>/<dd>` voor de verificatievelden, zichtbare tekst voor certificaatnummer en status, privacybeperkte velden en `robots: noindex`. De PDF bevat daarnaast het certificaatnummer in tekst; QR is dus niet de enige verificatieroute. Keyboard, contrast en gerenderde focus zijn niet browsermatig getest en blijven onderdeel van handmatige review.

### Status van deze auditwijziging

- Browser/schermlezer: `NOT TESTED — TOOLING LIMITATION`.
- WCAG 2.2 AA-conformiteit: niet vastgesteld.
- Certificaat-PDF-tagging: technisch geïmplementeerd en via PDF.js-structuurinspectie bevestigd; auditstatus `MANUAL REVIEW REQUIRED` tot PDF/UA-checker en schermlezer de werkelijke leesvolgorde hebben bevestigd.

### Technische verificatie remediation

Eerdere examdialoogverificatie op branch `codex/learning-vertical-slice-current`, start-HEAD `688b96fa533c4378c8795391a2dd2f3948f19f50`:

- Gerichte Learning-/exam-/certificate-set: 11 testbestanden, 65 passed, 0 failed, 0 skipped.
- `npm run lint`: PASS na herstel van één lintbevinding over ref-toegang tijdens render.
- `npx tsc --noEmit --incremental false`: PASS.
- `npm run build`: NOT COMPLETED — ENVIRONMENT BLOCKED vóór Next.js-compilatie; Prisma-configuratie kon `DATABASE_URL` niet vinden. Er is geen database aangeraakt.
- `git diff --check`: PASS na de codewijzigingen; opnieuw vereist na deze laatste documentwijziging.
- Volledige testsuite, Prisma validate en database runtime: NOT RUN; niet vereist voor deze gerichte accessibilityremediation.
- Browser/schermlezer: `NOT TESTED — TOOLING LIMITATION`.

PDFKit-remediatie, 30 september 2026:

- PDFKit `0.20.2`, `@types/pdfkit` `0.17.6`; PDF.js `6.2.108` inspecteert metadata, documenttaal, MarkInfo en StructTree.
- Gerichte PDF/certificate service/email/examdialog/examplayer/lessonplayer/examcontent/query-testset: 8 bestanden, 49 passed, 0 failed, 0 skipped.
- Tijdelijke lange-naam-PDF met Poppler bekeken: één pagina; A4 landscape `841.89 × 595.28 pt`; `pdfinfo` rapporteert `Tagged: yes`. De visuele render had geen afkapping of overlap; Poppler meldde ontbrekende display fonts voor Symbol/ArialUnicode tijdens inspectie, terwijl de certificaattekst en layout correct worden weergegeven.
- Contrastverhouding van de vier gebruikte tekstkleuren op wit berekend: donkerblauw 14.33:1, blauw 5.56:1, inkt 13.03:1, gedempt 5.88:1. Dit betreft de kleurcombinaties van de generator, niet een volledige gerenderde contrastmeting.
- PDF/UA-validator en schermlezer: `MANUAL REVIEW REQUIRED`; niet beschikbaar/gebruikt. Browser: `NOT TESTED — TOOLING LIMITATION`.
- `npm run lint`: PASS, exit 0, geen bevindingen.
- `npx tsc --noEmit --incremental false`: PASS, exit 0.
- `npm run build`: `BUILD NOT COMPLETED — ENVIRONMENT LIMITATION`; Prisma stopte vóór generatie/Next-build omdat `DATABASE_URL` niet is ingesteld. Alleen `.env.example` is aanwezig; er is geen gedeelde database gebruikt of aangeraakt.
- Definitieve `git diff --check`: PASS, exit 0 na alle product-, test- en documentwijzigingen.
- Geen certificate compilefout vastgesteld; production bundling blijft door de ontbrekende buildomgeving onbevestigd.
