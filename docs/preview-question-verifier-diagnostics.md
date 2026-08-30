# Tijdelijke Preview-verifierdiagnostiek

Deze instrumentatie wijzigt geen verifier-, selectie- of routingbeslissing.
Alleen `VERCEL_ENV=preview`, Git-branch `codex/ai-help-request-intake-v2`
en de SHA-256 van de expliciet toegestane fictieve kantoorcasus activeren logging.
Er is geen publieke diagnose-endpoint, bypass of extra modelaanroep.

De serverlog `PREVIEW_SYNTHETIC_QUESTION_VERIFIER` bevat rule/variant-ID,
factcodes met status (geen waarden), hypothesecodes, claim-ID's en de vijf
bestaande verifierchecks afzonderlijk. Een geweigerde verifieraanroep wordt
als `VERIFICATION_NOT_AUTHORIZED` onderscheiden van een inhoudelijke afkeur.
Vraagtekst en bewijsquotes gebruiken een beperkte diagnostische woordenlijst;
onbekende woorden worden geredigeerd. Geen volledige prompts, antwoorden,
providerresponses, persoonsgegevens of environmentwaarden worden gelogd.

De woordenlijst heeft uitsluitend betrekking op logredactie, nooit op
inhoudelijke beoordeling. Productieverkeer en andere Preview-casussen loggen
niets via deze helper. Loggingfouten beïnvloeden de toepassing niet.
Verwijder de tijdelijke instrumentatie na afronding van deze diagnose, vóór
eventuele Production-promotie. Geen governancepublicatie nodig.
