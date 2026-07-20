# Berichten en notificaties v1

Een provider kan een uitnodiging gemotiveerd weigeren zonder deelname of creditreservering. De opdrachtgever ontvangt daarvan één idempotente in-appnotificatie. Berichten ontstaan pas na geaccepteerde deelname en blijven per opdracht-providercombinatie geïsoleerd.

Berichten bestaan alleen binnen `opdracht + opdrachtgever + één deelnemende provider`. Concurrenten delen nooit een kanaal. `OWNER` en `ADMIN` schrijven; `MEMBER` leest. Na gunning blijft het winnaarskanaal open en worden overige kanalen alleen-lezen. Tekst is maximaal 4.000 tekens; bijlagen zijn uitgeschakeld.

Notificaties zijn persistent, idempotent en per ontvanger leesbaar. Belangrijke gebeurtenissen maken daarnaast een outboxrecord. De outbox bewaart geen tokens of private zakelijke inhoud. E-mailverwerking en retries mogen falen zonder de zakelijke transactie terug te draaien.
