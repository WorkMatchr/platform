# Negatieve antwoorden en doelresolutie

## Bewezen oorzaak (Preview 894c309, 31 augustus 2026)

Na het antwoord “Er zijn nog geen metingen of onderzoek gedaan” op de
WORK_ENVIRONMENT_FACTORS-vraag koos de runtime EXISTING_ASSESSMENT,
rule/variant null, SAFE_SHARED_CONTEXT. De UI vroeg opnieuw of de situatie
was onderzocht of beoordeeld.

De code-trace toont:

1. De classifier/cache gebruikt de oorspronkelijke hulpvraag; de vrije
   vervolgtekst wordt niet opnieuw semantisch vertaald naar de assessment-
   en measurement-facts.
2. answeredQuestionKeys bevat de beantwoorde domeinvraag, niet
   context_existing_investigation.
3. De service voegt alleen satisfiesFactCodes van het beantwoorde doel toe:
   CONTEXT_ANSWERED_S1_WORK_ENVIRONMENT_FACTORS, USER_CONFIRMED. Het eerdere
   LOCATION_PATTERN-slot was eveneens vastgelegd.
4. EXISTING_ASSESSMENT/EXISTING_MEASUREMENTS ontbreken. De generieke
   onderzoeksvraag vereist EXISTING_ASSESSMENT als resolution-fact.
5. Deduplicatie kan de gedeelde vraag daarom niet als opgelost herkennen.
   SAFE_SHARED_CONTEXT is de selectieclassificatie, niet de oorzaak.

Dit is generieke antwoordresolutie vóór deduplicatie. Een negatieve waarde
werd in deze trace niet weggefilterd: de inhoudelijke fact was nooit gemaakt.
Daarnaast telde de planner onbekende stringwaarden ten onrechte als bekend.

## Contract

Bekend antwoord is niet hetzelfde als bewijs van aanwezigheid. false/geen/
niet uitgevoerd kan een informatiedoel oplossen; UNKNOWN en hypotheses niet.
De bestaande isReliablePresentFact-guard blijft ongewijzigd. Negatieve facts
leveren dus geen positief bewijs voor applicability, presupposities of routing.

De centrale negative-answer-resolution-module verwerkt volledige expliciete
Nederlandse afwezigheidsuitspraken over metingen, onderzoek/beoordeling,
maatregelen en eerdere incidenten. Dit is een conservatieve linguïstische
extractie, geen algemene taalbegripsclaim en geen scenario- of domeinselectie.
Beperkte, onzekere, geciteerde en tegenstrijdige uitspraken worden niet
verbreed tot algemene afwezigheid. Niet-herkende formuleringen blijven
onopgelost; er komt geen extra AI-call of limiterwijziging bij.

Facts houden bronvraag en letterlijk bewijs bij. Alleen expliciete,
ongekwalificeerde CASE_WIDE_ABSENCE kan ook een overeenkomstig domeindoel
oplossen. Brede positieve facts blijven onvoldoende voor specifieke varianten.
Geen metingen impliceert niet geen onderzoek; alleen expliciet benoemde
informatietypen worden opgelost. Equivalentie volgt uitsluitend de bestaande
gedeclareerde equivalentGoalCodes, en alleen na een bekend antwoord.

Onbekend antwoord blijft unresolved; een reeds gestelde vraag wordt niet
automatisch nogmaals gesteld. Alleen het stellen/beantwoorden zonder bekende
inhoud lost geen semantisch equivalent ander doel op.

Geen schema, governance, Knowledge-publicatie, expert-routing of guardwijziging.
Producttoets: PC-026 (geen dubbel uitvragen), PC-048/070 (geen ongefundeerde
zekerheid). Browseracceptatie blijft vereist vóór een productmatige PASS.
