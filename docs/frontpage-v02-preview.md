# Frontpage v0.2 — productiepromotie

`/` rendert `PublicHomepageV02`. `/frontpage-v02` verwijst permanent (308) naar `/`.
De eerdere homepage blijft als `PublicHomepageV01` behouden voor een gecontroleerde rollback; deze heeft geen publieke route.
De preview gebruikt bestaande proces-, diensten-, verplichtingen- en kennisdata.
Interfacevoorbeelden zijn fictief en lezen geen databasegegevens. Geen nieuwe taxonomie.
De secundaire heroactie verwijst naar de Advieswijzer-uitleg op dezelfde pagina.
Aanvraagacties verwijzen naar de bestaande `/advieswijzer`.
De homepage behoudt canonical `/` en indexeerbare metadata. De tijdelijke preview heeft geen eigen content meer.
Release uitsluitend homepage en Advieswijzer-instappunten; geen databasewijziging.

De vier Ja/Nee-keuzevlakken gebruiken `/advieswijzer?start=deskundigheid` en `?start=onderwerp`. Dit initialiseert alleen de bestaande routekeuze op stap 1, met focus en scroll naar de selectie. Overige antwoorden blijven behouden; bij een andere route worden de bestaande routegebonden keuzes gewist. Onbekende/ontbrekende waarden behouden de gewone hervatflow. Bestaande concepten worden niet overschreven. Generieke CTA’s blijven `/advieswijzer`.
