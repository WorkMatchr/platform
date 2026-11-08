# Pro-verlengingen en financiële reconciliatie

De eerste betaalpoging kan verlopen terwijl een latere poging voor hetzelfde abonnement wel is betaald. De verlenging zocht de factuur bij de eerste poging. De herstelbranch gebruikt het unieke betaalde aankooprecord met gebonden factuur, organisatie en betaalreferentie. Een ontbrekende of ambigue factuurbron vereist onderzoek.

De abonnementsperiode volgt de contractdag van de oorspronkelijke factuur. Een afwijkende incassodatum vereist reconciliatie. Een oudere betaling krijgt haar eigen betaalrecord en factuur. De laatst betaalde einddatum kan daardoor alleen vooruitgaan. Een mislukking in een reeds betaalde periode verandert het recht op Pro niet. Een herhaalde definitieve fout voor dezelfde incasso telt eenmaal mee. Een opgezegd abonnement wordt door replay niet opnieuw geactiveerd.

Betaalrecord, factuur, Jortt-opdracht en periodewijziging vallen binnen de bestaande serialiseerbare transactie. Na rollback wordt een afzonderlijk incident geregistreerd wanneer de database weer bereikbaar is. Bij volledige database-uitval blijven bewaking van webhookfouten en herverwerking vanaf providergegevens nodig. Een refund of stornering wordt als afzonderlijke waarneming voor beoordeling geregistreerd. De geldteruggave, creditfactuur en abonnementsbeëindiging vereisen een afzonderlijk besluit.

## Reproduceerbaar bewijs

De PostgreSQL-stap in de bestaande workflow maakt een lege, tijdelijke lokale PostgreSQL 18-database aan. De test weigert een extern adres, een onverwachte databasenaam of een bestaande organisatie. De servicecontainer verdwijnt na de job.

- 287 financiële Vitest-controles op de basis van deze reparatie.
- De databaseproef simuleert een verlopen eerste poging, betaalde herkansing, twee verlengingen in omgekeerde volgorde, dubbele gelijktijdige verwerking, factuurrollback, herstel, achterstalligheid, een geslaagde herkansing en afzonderlijke observaties van refund en stornering.
- De proef vergelijkt organisatie, bedrag, btw en betalingskoppeling en telt per verlenging precies één oorspronkelijke factuur en één lokale Jortt-opdracht.
- De bestaande PostgreSQL-suite voor financiën controleert daarnaast creditledger, facturatie en isolatie met synthetische providers.

Een externe ontvangst en aflettering in Jortt vereisen afzonderlijke acceptatie. Deze wijziging corrigeert geen bestaande factuur, start geen incasso en bevat geen migratie.
