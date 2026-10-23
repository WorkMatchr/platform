// Explicit holds from the 2026-10-17 source review. These are not legal approvals.
// Removing a hold requires a reviewed question/answer-to-claim mapping and new checksum.
export const f4RuleReviewHolds: Readonly<Record<string, string>> = {
  RIETESTING: 'Controleer de toetsingsplicht, de gezamenlijke uren zonder de wettelijke DGA-uitzondering mee te tellen, en de geldigheid van een branche-instrument of cao-model. De huidige antwoorden stellen dit nog niet voldoende vast.',
  PREVENTIONOFFICER: 'Controleer wie de preventietaken uitvoert en of de voorwaarden voor uitvoering door werkgever/directeur of externe bijstand gelden. Alleen de aanwijzingsvraag beslist dit niet.',
  PREVENTIONCONSULTATION: 'Controleer of OR/PVT aanwezig is en of vereiste instemming met persoon en positie is verkregen. Betrokkenheid alleen bewijst geen instemming.',
  BHVAPPOINTED: 'Controleer afzonderlijk de aanwijzing van BHV’ers en de feitelijke beschikbaarheid. Het gecombineerde antwoord maakt niet duidelijk welk onderdeel ontbreekt.',
  EXPERTTASKSCOVERED: 'Controleer per deskundige taak de toepasselijkheid en uitvoering. Een algemene bevestiging onderbouwt niet alle taken of uitzonderingen.',
  'CW2-PAGO-02': 'Controleer de voorlichting over vrijwillige deelname. De wettelijke aanbiedingsplicht bewijst geen afzonderlijke overtreding uitsluitend doordat deze uitleg ontbreekt.',
  ACCIDENTREGISTRATION: 'Controleer het ongevallenregister en eventuele registratieplichtige ongevallen. Een procesbeschrijving bewijst niet dat de vereiste registratie is uitgevoerd.',
  ACCIDENTREPORTING: 'Controleer eventuele meldingsplichtige ongevallen en de feitelijke melding. Bekendheid met de meldplicht bewijst de uitvoering daarvan niet.',
  'CW2-ONG-01': 'Controleer of later bekend geworden ernstige gevolgen daadwerkelijk direct zijn gemeld. Een vooraf geregelde procedure bewijst dat niet.',
}
