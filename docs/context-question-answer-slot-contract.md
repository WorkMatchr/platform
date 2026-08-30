# Vraagverificatie: bewijs versus antwoordslots

`applicabilityEvidence` bevat uitsluitend reeds betrouwbare feiten, gescheiden
van `targetAnswerSlots` uit de geselecteerde regel (`satisfiesFactCodes`).
Een target hoeft vóór de vraag niet bekend te zijn. Alleen exact gedeclareerde
targets worden uit de bewijs-factcodes van de verifier gescheiden; eenzelfde
prefix of een slot van een andere regel geeft geen uitzondering.

De onafhankelijke verifier blijft iedere presuppositie, causaliteitsaanname,
verkeerde informatiedoelbehoud en niet-letterlijke evidence controleren.
Onbekende overige factcodes en hypotheses als bewijs blijven afkeurgronden.
Targets worden nooit in `factsSupportingQuestion` opgenomen en worden door
vraagformulering niet als opgelost gemarkeerd. De bestaande antwoordservice
voegt pas na een geldig `ANSWERED` antwoord het `USER_CONFIRMED` slot toe.

Formulatorversie 2.0.1 maakt deze scheiding expliciet in de modelinvoer en
instructies. Geen governance-, database-, applicability- of routingwijziging.
Regressies dekken LOCATION_PATTERN, EXISTING_MEASUREMENTS, EXPOSURE_SOURCE en
EXISTING_MEASURES, inclusief ontbrekende targets, ongeldige bewijsfeiten,
hypotheses, presupposities, grounding en oplossen na beantwoording.

Producttoets: onbekende informatie mag neutraal worden uitgevraagd (PC-025/026),
maar mag niet als reeds vaststaand of causaal worden gepresenteerd (PC-048/070).
Technische tests vervangen de verplichte Preview-browseracceptatie niet.

Tijdelijke diagnostiek voor uitsluitend de bekende fictieve Preview-casus toont
de bestaande AI-autorisatiereden: RATE_LIMITED, SECURITY_CHECK_UNAVAILABLE
(bestaande PROTECTION_UNAVAILABLE) of ABUSE_CONTEXT_MISSING. Geen extra
limiter-aanroep, geen gewijzigde beslissing, geen tokens of gebruikersinhoud.
