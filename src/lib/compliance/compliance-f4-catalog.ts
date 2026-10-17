import type { Condition as ComplianceCondition } from './compliance-v2-conditions'

export const F4_BINDING = { id: 'f4000000-0000-4000-8000-000000000021', frameworkCode: 'NL_ARBO_GUIDE', version: '2.1' } as const
export const f4ModuleTitles: Record<string, string> = { C01: 'RI&E en toetsing', C02: 'Plan van aanpak', C03: 'Preventiemedewerker', C04: 'Basiscontract en bedrijfsarts', C05: 'Bedrijfshulpverlening', C06: 'PAGO', C08: 'Voorlichting en onderricht', C09: 'Arbeidsongevallen', C10: 'Raadpleging van werknemers', R06: 'Psychosociale arbeidsbelasting' }
type CatalogQuestion = { code: string; module: string; prompt: string; kind: 'PROFILE' | 'CONTEXT' | 'LEGAL' | 'RECOMMENDATION'; parent?: string }
export const f4Catalog: readonly CatalogQuestion[] = [
  {
    "code": "HASEMPLOYEES",
    "module": "C01",
    "prompt": "Heeft uw organisatie werknemers?",
    "kind": "PROFILE"
  },
  {
    "code": "EMPLOYEECOUNT",
    "module": "C01",
    "prompt": "Hoeveel werknemers heeft uw organisatie?",
    "kind": "CONTEXT"
  },
  {
    "code": "REPRESENTATION",
    "module": "C10",
    "prompt": "Welke werknemersvertegenwoordiging is aanwezig?",
    "kind": "CONTEXT"
  },
  {
    "code": "GENERALPOLICY",
    "module": "C01",
    "prompt": "Is binnen uw organisatie een samenhangend arbobeleid geregeld?",
    "kind": "LEGAL"
  },
  {
    "code": "RIE",
    "module": "C01",
    "prompt": "Heeft uw organisatie een actuele RI&E?",
    "kind": "LEGAL"
  },
  {
    "code": "ACTIONPLAN",
    "module": "C02",
    "prompt": "Is er een plan van aanpak bij de RI&E?",
    "kind": "LEGAL"
  },
  {
    "code": "RIEUPDATED",
    "module": "C01",
    "prompt": "Wordt de RI&E aangepast bij relevante veranderingen of nieuwe risico’s?",
    "kind": "LEGAL"
  },
  {
    "code": "RIETESTING",
    "module": "C01",
    "prompt": "Is deskundige toetsing geregeld wanneer die voor uw RI&E verplicht is?",
    "kind": "LEGAL"
  },
  {
    "code": "PREVENTIONOFFICER",
    "module": "C03",
    "prompt": "Is minimaal één preventiemedewerker aangewezen?",
    "kind": "LEGAL"
  },
  {
    "code": "PREVENTIONCONSULTATION",
    "module": "C03",
    "prompt": "Is de werknemersvertegenwoordiging betrokken bij persoon en positie van de preventiemedewerker waar dat vereist is?",
    "kind": "LEGAL"
  },
  {
    "code": "BHVORGANIZED",
    "module": "C05",
    "prompt": "Is bedrijfshulpverlening georganiseerd?",
    "kind": "LEGAL"
  },
  {
    "code": "BHVAPPOINTED",
    "module": "C05",
    "prompt": "Zijn één of meer BHV’ers aangewezen en is vervanging geregeld?",
    "kind": "LEGAL"
  },
  {
    "code": "BHVRISKBASED",
    "module": "C05",
    "prompt": "Sluit de BHV-organisatie aantoonbaar aan op de RI&E, bezetting, locaties en bedrijfsrisico’s?",
    "kind": "LEGAL"
  },
  {
    "code": "BHVPREPARED",
    "module": "C05",
    "prompt": "Zijn passende opleiding, oefeningen en middelen geregeld?",
    "kind": "LEGAL"
  },
  {
    "code": "BASICCONTRACT",
    "module": "C04",
    "prompt": "Is er een basiscontract met een arbodienst of bedrijfsarts?",
    "kind": "LEGAL"
  },
  {
    "code": "OCCUPATIONALPHYSICIANACCESS",
    "module": "C04",
    "prompt": "Kunnen werknemers de bedrijfsarts ook preventief en zonder onnodige drempels raadplegen?",
    "kind": "LEGAL"
  },
  {
    "code": "EXPERTTASKSCOVERED",
    "module": "C04",
    "prompt": "Zijn de relevante wettelijke deskundige taken in de arbodienstverlening geborgd?",
    "kind": "LEGAL"
  },
  {
    "code": "PAGOOFFERED",
    "module": "C06",
    "prompt": "Wordt periodiek een PAGO aangeboden dat aansluit op de arbeidsrisico’s?",
    "kind": "LEGAL"
  },
  {
    "code": "INSTRUCTION",
    "module": "C08",
    "prompt": "Krijgen werknemers passende voorlichting en instructie over werkzaamheden en arbeidsrisico’s?",
    "kind": "LEGAL"
  },
  {
    "code": "SUPERVISION",
    "module": "C08",
    "prompt": "Wordt waar nodig toezicht gehouden op veilig gebruik van arbeidsmiddelen en persoonlijke beschermingsmiddelen?",
    "kind": "LEGAL"
  },
  {
    "code": "WORKERCONSULTATION",
    "module": "C10",
    "prompt": "Worden werknemers aantoonbaar geraadpleegd over relevante arbo-onderwerpen?",
    "kind": "LEGAL"
  },
  {
    "code": "ACCIDENTREGISTRATION",
    "module": "C09",
    "prompt": "Is er een proces voor het registreren van relevante arbeidsongevallen?",
    "kind": "LEGAL"
  },
  {
    "code": "ACCIDENTREPORTING",
    "module": "C09",
    "prompt": "Is bekend dat overlijden, ziekenhuisopname of blijvend letsel direct bij de Nederlandse Arbeidsinspectie moet worden gemeld?",
    "kind": "LEGAL"
  },
  {
    "code": "CW2-RIE-01",
    "module": "C01",
    "prompt": "Zijn alle werkzaamheden en werkplekken van uw organisatie in de RI&E meegenomen, ook thuiswerk en werk bij anderen als dat voorkomt?",
    "kind": "LEGAL",
    "parent": "RIE"
  },
  {
    "code": "CW2-RIE-02",
    "module": "C01",
    "prompt": "Is in de RI&E bekeken of bepaalde groepen extra bescherming nodig hebben, bijvoorbeeld jongeren, uitzendkrachten of werk waarbij zwangerschap of borstvoeding extra aandacht vraagt?",
    "kind": "LEGAL",
    "parent": "RIE"
  },
  {
    "code": "CW2-RIE-03",
    "module": "C01",
    "prompt": "Kunnen werknemers de RI&E inzien?",
    "kind": "LEGAL",
    "parent": "RIE"
  },
  {
    "code": "CW2-RIE-04",
    "module": "C01",
    "prompt": "Werkt uw betaalde personeel samen in totaal maximaal 40 uur per week?",
    "kind": "CONTEXT"
  },
  {
    "code": "CW2-RIE-05",
    "module": "C01",
    "prompt": "Met welk instrument is uw RI&E gemaakt?",
    "kind": "CONTEXT",
    "parent": "RIE"
  },
  {
    "code": "CW2-PVA-01",
    "module": "C02",
    "prompt": "Staat in het plan van aanpak welke maatregelen u neemt voor de gevonden risico’s?",
    "kind": "LEGAL",
    "parent": "ACTIONPLAN"
  },
  {
    "code": "CW2-PVA-02",
    "module": "C02",
    "prompt": "Staat bij de maatregelen binnen welke termijn ze worden uitgevoerd?",
    "kind": "LEGAL",
    "parent": "ACTIONPLAN"
  },
  {
    "code": "CW2-PVA-03",
    "module": "C02",
    "prompt": "Is afgesproken wie de uitvoering van de maatregelen bewaakt?",
    "kind": "RECOMMENDATION",
    "parent": "ACTIONPLAN"
  },
  {
    "code": "CW2-PRE-01",
    "module": "C03",
    "prompt": "Heeft degene die de preventietaken uitvoert voldoende kennis en ervaring voor de risico’s in uw organisatie?",
    "kind": "LEGAL",
    "parent": "PREVENTIONOFFICER"
  },
  {
    "code": "CW2-PRE-02",
    "module": "C03",
    "prompt": "Krijgt degene die de preventietaken uitvoert voldoende tijd en middelen om dit goed te doen?",
    "kind": "LEGAL",
    "parent": "PREVENTIONOFFICER"
  },
  {
    "code": "CW2-PRE-03",
    "module": "C03",
    "prompt": "Werkt de preventiemedewerker mee aan de RI&E, het adviseren over maatregelen en de uitvoering daarvan?",
    "kind": "LEGAL",
    "parent": "PREVENTIONOFFICER"
  },
  {
    "code": "CW2-BHV-01",
    "module": "C05",
    "prompt": "Weten werkenden hoe zij bij een noodsituatie hulp inschakelen en de BHV bereiken?",
    "kind": "LEGAL",
    "parent": "BHVORGANIZED"
  },
  {
    "code": "CW2-BHV-02",
    "module": "C05",
    "prompt": "Is geregeld hoe werkenden en andere aanwezigen bij gevaar in veiligheid worden gebracht?",
    "kind": "LEGAL",
    "parent": "BHVORGANIZED"
  },
  {
    "code": "CW2-BHV-03",
    "module": "C05",
    "prompt": "Zijn de afspraken over noodsituaties afgestemd met andere werkgevers op gedeelde werkplekken?",
    "kind": "LEGAL"
  },
  {
    "code": "CW2-BC-01",
    "module": "C04",
    "prompt": "Is afgesproken dat de bedrijfsarts de werkplekken kan bezoeken?",
    "kind": "LEGAL",
    "parent": "BASICCONTRACT"
  },
  {
    "code": "CW2-BC-02",
    "module": "C04",
    "prompt": "Is geregeld hoe een werknemer een second opinion bij een andere bedrijfsarts kan aanvragen?",
    "kind": "LEGAL",
    "parent": "BASICCONTRACT"
  },
  {
    "code": "CW2-BC-03",
    "module": "C04",
    "prompt": "Is duidelijk hoe werknemers een klacht over de dienstverlening van de bedrijfsarts kunnen indienen?",
    "kind": "LEGAL",
    "parent": "BASICCONTRACT"
  },
  {
    "code": "CW2-PAGO-01",
    "module": "C06",
    "prompt": "Heeft de bedrijfsarts geadviseerd over de inhoud en frequentie van het PAGO op basis van de arbeidsrisico’s?",
    "kind": "LEGAL",
    "parent": "PAGOOFFERED"
  },
  {
    "code": "CW2-PAGO-02",
    "module": "C06",
    "prompt": "Is aan werknemers uitgelegd dat zij zelf kunnen kiezen of zij deelnemen aan het aangeboden PAGO?",
    "kind": "LEGAL",
    "parent": "PAGOOFFERED"
  },
  {
    "code": "CW2-INS-01",
    "module": "C08",
    "prompt": "Zijn instructies begrijpelijk voor de mensen die het werk doen, rekening houdend met taal, kennis en ervaring?",
    "kind": "LEGAL",
    "parent": "INSTRUCTION"
  },
  {
    "code": "CW2-INS-02",
    "module": "C08",
    "prompt": "Is geregeld dat werknemers passende instructie krijgen wanneer hun werk, arbeidsmiddelen of risico’s veranderen?",
    "kind": "LEGAL",
    "parent": "INSTRUCTION"
  },
  {
    "code": "CW2-PSA-01",
    "module": "R06",
    "prompt": "Zijn werkdruk en ongewenst gedrag als mogelijke risico’s in de RI&E onderzocht?",
    "kind": "LEGAL"
  },
  {
    "code": "CW2-PSA-02",
    "module": "R06",
    "prompt": "Zijn passende maatregelen tegen de vastgestelde risico’s van werkdruk en ongewenst gedrag opgenomen in het plan van aanpak?",
    "kind": "LEGAL",
    "parent": "CW2-PSA-01"
  },
  {
    "code": "CW2-ONG-01",
    "module": "C09",
    "prompt": "Is geregeld dat een arbeidsongeval alsnog direct wordt gemeld als ziekenhuisopname of blijvend letsel pas later bekend wordt?",
    "kind": "LEGAL"
  },
  {
    "code": "CW2-ONG-02",
    "module": "C09",
    "prompt": "Omvat de ongevallenregistratie alle gemelde arbeidsongevallen én ongevallen met meer dan drie werkdagen verzuim, met ten minste aard en datum?",
    "kind": "LEGAL",
    "parent": "ACCIDENTREGISTRATION"
  }
]

export const f4StandardOptions = { YES: 'Ja', PARTIAL: 'Gedeeltelijk', NO: 'Nee', UNKNOWN: 'Dat weet ik niet' }
export function f4Options(code: string): Record<string, string> {
  if (code === 'HASEMPLOYEES') return { YES: 'Ja, werknemers in dienst', OTHERS: 'Geen werknemers, wel anderen onder onze leiding', VOLUNTEERS: 'Alleen vrijwilligers', NO: 'Geen personeel of anderen onder onze leiding', UNKNOWN: 'Dat weet ik niet' }
  if (code === 'EMPLOYEECOUNT') return { ZERO: '0', ONE_TO_25: '1–25', MORE_THAN_25: '26 of meer', UNKNOWN: 'Dat weet ik niet' }
  if (code === 'REPRESENTATION') return { OR: 'Ondernemingsraad', PVT: 'Personeelsvertegenwoordiging', DIRECT: 'Rechtstreekse raadpleging', NONE: 'Geen', UNKNOWN: 'Dat weet ik niet' }
  if (code === 'CW2-RIE-04') return { YES: 'Ja', NO: 'Nee', UNKNOWN: 'Dat weet ik niet' }
  if (code === 'CW2-RIE-05') return { RECOGNIZED_INSTRUMENT: 'Een branche-instrument waarvan de erkenning nog moet worden gecontroleerd', OTHER: 'Een ander instrument', UNKNOWN: 'Dat weet ik niet' }
  if (code === 'CW2-BHV-03') return { ...f4StandardOptions, NO_SHARED_WORKPLACE: 'Er zijn geen gedeelde werkplekken met andere werkgevers' }
  if (code === 'CW2-PSA-02') return { ...f4StandardOptions, NONE_IDENTIFIED: 'Bij het onderzoek zijn geen PSA-risico’s vastgesteld' }
  return f4StandardOptions
}
export function f4Visibility(q: CatalogQuestion): ComplianceCondition | undefined {
  if (q.code === 'HASEMPLOYEES') return undefined
  const scope: ComplianceCondition = { all: [{ question: 'HASEMPLOYEES', notEquals: 'NO' }, { question: 'HASEMPLOYEES', notEquals: 'VOLUNTEERS' }] }
  const conditions: ComplianceCondition[] = [scope]
  if (q.parent) conditions.push({ question: q.parent, notEquals: 'NO' })
  if (q.code === 'CW2-RIE-05') conditions.push({ question: 'EMPLOYEECOUNT', notEquals: 'MORE_THAN_25' })
  return { all: conditions }
}
export function f4Help(code: string) {
  if (code === 'HASEMPLOYEES') return 'Denk ook aan uitzendkrachten en stagiairs. Bij twijfel blijft de toepasselijkheid open.'
  if (code === 'CW2-RIE-04') return 'Tel de uren van alle betaalde werkenden samen. Dit is geen grens per persoon of per voltijdbaan. Een mogelijke uitzondering moet worden gecontroleerd.'
  if (code === 'CW2-RIE-05') return 'Een eigen verklaring bewijst geen erkenning. Branche, instrumentversie en geldigheid moeten afzonderlijk worden geverifieerd.'
  if (code === 'PREVENTIONOFFICER') return 'Bij maximaal 25 werknemers kan de werkgever deze taken onder voorwaarden zelf uitvoeren.'
  if (code === 'CW2-PVA-03') return 'Dit is een praktische aanbeveling; er geldt geen verplicht format voor een verantwoordelijke persoon.'
  if (code === 'CW2-PAGO-02') return 'Het aangeboden PAGO is vrijwillig. Bijzondere wettelijk verplichte keuringen zijn een ander onderwerp.'
  if (code === 'CW2-BC-02') return 'Een second opinion van een andere bedrijfsarts is iets anders dan een deskundigenoordeel van UWV.'
  if (code === 'ACCIDENTREPORTING' || code === 'CW2-ONG-01') return 'Is er nu een ernstig arbeidsongeval? Meld direct bij de Nederlandse Arbeidsinspectie via 0800-5151 of de officiële meldroute.'
  return 'Beantwoord op basis van de actuele situatie. Dit is een zelfverklaring, geen controle van bewijsstukken.'
}

// v1 browser keys remain unchanged in v1; only the new database definitions use canonical codes.
export const f4LegacyQuestionMap = {"hasEmployees": "HASEMPLOYEES", "generalPolicy": "GENERALPOLICY", "rie": "RIE", "actionPlan": "ACTIONPLAN", "rieUpdated": "RIEUPDATED", "rieTesting": "RIETESTING", "preventionOfficer": "PREVENTIONOFFICER", "preventionConsultation": "PREVENTIONCONSULTATION", "bhvOrganized": "BHVORGANIZED", "bhvAppointed": "BHVAPPOINTED", "bhvRiskBased": "BHVRISKBASED", "bhvPrepared": "BHVPREPARED", "basicContract": "BASICCONTRACT", "occupationalPhysicianAccess": "OCCUPATIONALPHYSICIANACCESS", "expertTasksCovered": "EXPERTTASKSCOVERED", "pagoOffered": "PAGOOFFERED", "instruction": "INSTRUCTION", "supervision": "SUPERVISION", "workerConsultation": "WORKERCONSULTATION", "accidentRegistration": "ACCIDENTREGISTRATION", "accidentReporting": "ACCIDENTREPORTING"} as const
