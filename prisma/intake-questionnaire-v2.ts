import type { IntakeQuestionnaireQuestionSeed } from './intake-questionnaire-v1'

export type IntakeQuestionVisibilityRule = {
  questionKey: string
  oneOf: readonly string[]
}

export type IntakeQuestionnaireV2Question = IntakeQuestionnaireQuestionSeed & {
  version: 2
  active: boolean
  dependsOn?: readonly string[]
  visibleWhen?: IntakeQuestionVisibilityRule
}

function options(entries: ReadonlyArray<readonly [string, string, string, boolean?]>) {
  return entries.map(([id, value, label, isExclusive], index) => ({
    id,
    value,
    label,
    sortOrder: (index + 1) * 10,
    ...(isExclusive === undefined ? {} : { isExclusive }),
  }))
}

const q = (
  question: Omit<IntakeQuestionnaireV2Question, 'version' | 'active'>,
  active = true,
): IntakeQuestionnaireV2Question => ({ ...question, version: 2, active })

export const intakeQuestionnaireV2 = {
  id: '00000000-0000-4000-8000-000000005000',
  versionId: '00000000-0000-4000-8000-000000007001',
  slug: 'client-occupational-health-and-safety',
  name: 'Opdrachtintake — opdrachtgever',
  version: 2,
  questions: [
    q({
      id: '00000000-0000-4000-8000-000000007101', key: 'HELP_REQUEST_DESCRIPTION', category: 'HELP_REQUEST', inputType: 'LONG_TEXT',
      label: 'Waarbij heeft uw organisatie hulp nodig?',
      helpText: 'Beschrijf in uw eigen woorden wat er speelt en wat u wilt laten verbeteren of oplossen. U hoeft nog niet te weten welke deskundige nodig is. Vermeld geen namen of medische gegevens.',
      isRequired: true, sortOrder: 10, minLength: 20, maxLength: 3000,
    }),
    q({
      id: '00000000-0000-4000-8000-000000007102', key: 'CONFIRMED_HELP_CATEGORY', category: 'HELP_REQUEST', inputType: 'SINGLE_SELECT',
      label: 'Past deze categorie bij uw hulpvraag?',
      helpText: 'WorkMatchr doet een voorstel op basis van uw omschrijving. U houdt zelf de regie en kunt de categorie aanpassen of aangeven dat u het nog niet weet.',
      isRequired: true, sortOrder: 20, minSelections: 1, maxSelections: 1,
      options: options([
        ['00000000-0000-4000-8000-000000007201', 'BHV', 'BHV en ontruiming'],
        ['00000000-0000-4000-8000-000000007202', 'RIE', 'RI&E en plan van aanpak'],
        ['00000000-0000-4000-8000-000000007203', 'HAZARDOUS_SUBSTANCES', 'Gevaarlijke stoffen'],
        ['00000000-0000-4000-8000-000000007204', 'INCIDENT', 'Incident of ongeval'],
        ['00000000-0000-4000-8000-000000007205', 'ERGONOMICS', 'Ergonomie en fysieke belasting'],
        ['00000000-0000-4000-8000-000000007206', 'OCCUPATIONAL_HEALTH', 'Gezondheid en inzetbaarheid'],
        ['00000000-0000-4000-8000-000000007207', 'MACHINERY_SAFETY', 'Machine- en arbeidsmiddelenveiligheid'],
        ['00000000-0000-4000-8000-000000007208', 'PSA', 'Werkdruk en sociale veiligheid'],
        ['00000000-0000-4000-8000-000000007209', 'OTHER', 'Anders'],
        ['00000000-0000-4000-8000-000000007210', 'NOT_SURE', 'Dat weet ik nog niet', true],
      ]),
    }),
    q({
      id: '00000000-0000-4000-8000-000000007103', key: 'LOCATION_MODE', category: 'LOCATION', inputType: 'SINGLE_SELECT',
      label: 'Waar vindt de ondersteuning plaats?', helpText: 'Kies wat nu het beste past. Een onbekende locatie blokkeert uw concept niet.',
      isRequired: true, sortOrder: 30, minSelections: 1, maxSelections: 1,
      options: options([
        ['00000000-0000-4000-8000-000000007211', 'REGISTERED', 'Op een bestaande organisatielocatie'],
        ['00000000-0000-4000-8000-000000007212', 'OTHER', 'Op een andere bedrijfslocatie'],
        ['00000000-0000-4000-8000-000000007213', 'MULTIPLE', 'Op meerdere locaties'],
        ['00000000-0000-4000-8000-000000007214', 'REMOTE', 'Volledig op afstand'],
        ['00000000-0000-4000-8000-000000007215', 'UNKNOWN', 'Dat weet ik nog niet'],
      ]),
    }),
    q({
      id: '00000000-0000-4000-8000-000000007104', key: 'REGISTERED_LOCATION', category: 'LOCATION', inputType: 'ORGANIZATION_LOCATION',
      label: 'Kies de organisatielocatie', helpText: 'Alleen actieve locaties van uw eigen organisatie zijn beschikbaar.',
      isRequired: true, sortOrder: 40, dependsOn: ['LOCATION_MODE'], visibleWhen: { questionKey: 'LOCATION_MODE', oneOf: ['REGISTERED'] },
    }),
    q({
      id: '00000000-0000-4000-8000-000000007105', key: 'OTHER_LOCATION_CITY', category: 'LOCATION', inputType: 'SHORT_TEXT',
      label: 'In welke plaats is de andere locatie?', helpText: 'Deze locatie geldt alleen voor deze hulpvraag en wordt niet automatisch als vestiging opgeslagen.',
      isRequired: true, sortOrder: 50, minLength: 2, maxLength: 120, dependsOn: ['LOCATION_MODE'], visibleWhen: { questionKey: 'LOCATION_MODE', oneOf: ['OTHER'] },
    }),
    q({
      id: '00000000-0000-4000-8000-000000007106', key: 'OTHER_LOCATION_DETAILS', category: 'LOCATION', inputType: 'LONG_TEXT',
      label: 'Adres of toelichting bij de andere locatie', helpText: 'Vul desgewenst een adres, locatienaam of praktische toelichting in.',
      isRequired: false, sortOrder: 60, maxLength: 1000, dependsOn: ['LOCATION_MODE'], visibleWhen: { questionKey: 'LOCATION_MODE', oneOf: ['OTHER'] },
    }, false),
    q({
      id: '00000000-0000-4000-8000-000000007107', key: 'MULTIPLE_LOCATION_DETAILS', category: 'LOCATION', inputType: 'LONG_TEXT',
      label: 'Welke locaties zijn betrokken?', helpText: 'Noem per locatie minimaal de plaats en desgewenst de locatienaam.',
      isRequired: true, sortOrder: 70, minLength: 3, maxLength: 1500, dependsOn: ['LOCATION_MODE'], visibleWhen: { questionKey: 'LOCATION_MODE', oneOf: ['MULTIPLE'] },
    }),
    q({
      id: '00000000-0000-4000-8000-000000007108', key: 'PREFERRED_START', category: 'PLANNING', inputType: 'SINGLE_SELECT',
      label: 'Wanneer wilt u bij voorkeur starten?', helpText: 'Dit is een voorkeur en geen garantie. De definitieve planning spreekt u later met de professional af.',
      isRequired: true, sortOrder: 80, minSelections: 1, maxSelections: 1,
      options: options([
        ['00000000-0000-4000-8000-000000007216', 'AS_SOON_AS_POSSIBLE', 'Zo spoedig mogelijk'],
        ['00000000-0000-4000-8000-000000007217', 'WITHIN_TWO_WEEKS', 'Binnen twee weken'],
        ['00000000-0000-4000-8000-000000007218', 'WITHIN_ONE_MONTH', 'Binnen één maand'],
        ['00000000-0000-4000-8000-000000007219', 'WITHIN_THREE_MONTHS', 'Binnen drie maanden'],
        ['00000000-0000-4000-8000-000000007220', 'SPECIFIC_DATE', 'Voor een specifieke datum'],
        ['00000000-0000-4000-8000-000000007221', 'NO_PREFERENCE', 'Geen voorkeur'],
      ]),
    }, false),
    q({
      id: '00000000-0000-4000-8000-000000007109', key: 'PREFERRED_START_DATE', category: 'PLANNING', inputType: 'DATE',
      label: 'Welke datum heeft uw voorkeur?', helpText: 'De datum is een planningsvoorkeur en nog geen toezegging.',
      isRequired: true, sortOrder: 90, dependsOn: ['PREFERRED_START'], visibleWhen: { questionKey: 'PREFERRED_START', oneOf: ['SPECIFIC_DATE'] },
    }, false),
    q({
      id: '00000000-0000-4000-8000-000000007110', key: 'EXPECTED_ENGAGEMENT_SIZE', category: 'PLANNING', inputType: 'SINGLE_SELECT',
      label: 'Hoe groot verwacht u dat de opdracht ongeveer is?', helpText: 'Een eerste inschatting is voldoende.',
      isRequired: true, sortOrder: 100, minSelections: 1, maxSelections: 1,
      options: options([
        ['00000000-0000-4000-8000-000000007222', 'SHORT_ADVICE', 'Kort advies'],
        ['00000000-0000-4000-8000-000000007223', 'LIMITED_ASSIGNMENT', 'Beperkte opdracht'],
        ['00000000-0000-4000-8000-000000007224', 'BROADER_TRAJECTORY', 'Breder traject'],
        ['00000000-0000-4000-8000-000000007225', 'UNKNOWN', 'Dat weet ik nog niet'],
      ]),
    }, false),
    q({ id: '00000000-0000-4000-8000-000000007111', key: 'BHV_LOCATION_COUNT', category: 'SITUATION', inputType: 'NUMBER', label: 'Om hoeveel locaties gaat het?', helpText: 'Vul het aantal locaties in waarvoor u BHV-ondersteuning zoekt.', isRequired: true, sortOrder: 110, minNumber: 1, maxNumber: 10000, visibleWhen: { questionKey: 'CONFIRMED_HELP_CATEGORY', oneOf: ['BHV'] } }),
    q({ id: '00000000-0000-4000-8000-000000007112', key: 'BHV_EMPLOYEE_COUNT', category: 'SITUATION', inputType: 'NUMBER', label: 'Hoeveel medewerkers werken er ongeveer?', helpText: 'Een schatting is voldoende.', isRequired: true, sortOrder: 120, minNumber: 1, maxNumber: 1000000, visibleWhen: { questionKey: 'CONFIRMED_HELP_CATEGORY', oneOf: ['BHV'] } }),
    q({ id: '00000000-0000-4000-8000-000000007113', key: 'BHV_EMPLOYEE_DISTRIBUTION', category: 'SITUATION', inputType: 'LONG_TEXT', label: 'Hoe zijn de medewerkers over de locaties verdeeld?', helpText: 'Een globale verdeling per locatie is voldoende.', isRequired: false, sortOrder: 130, maxLength: 1000, visibleWhen: { questionKey: 'CONFIRMED_HELP_CATEGORY', oneOf: ['BHV'] } }),
    q({ id: '00000000-0000-4000-8000-000000007114', key: 'BHV_SHIFT_PATTERN', category: 'SITUATION', inputType: 'SINGLE_SELECT', label: 'Wordt er in ploegendiensten of buiten reguliere werktijden gewerkt?', helpText: 'Kies wat structureel voor uw organisatie geldt.', isRequired: true, sortOrder: 140, minSelections: 1, maxSelections: 1, visibleWhen: { questionKey: 'CONFIRMED_HELP_CATEGORY', oneOf: ['BHV'] }, options: options([['00000000-0000-4000-8000-000000007226', 'YES', 'Ja'], ['00000000-0000-4000-8000-000000007227', 'NO', 'Nee'], ['00000000-0000-4000-8000-000000007228', 'UNKNOWN', 'Dat weet ik nog niet']]) }),
    q({ id: '00000000-0000-4000-8000-000000007115', key: 'BHV_SHIFT_EXPLANATION', category: 'SITUATION', inputType: 'LONG_TEXT', label: 'Kunt u de werktijden kort toelichten?', helpText: 'Noem bijvoorbeeld avond-, nacht- of weekendwerk.', isRequired: false, sortOrder: 150, maxLength: 1000, visibleWhen: { questionKey: 'BHV_SHIFT_PATTERN', oneOf: ['YES'] } }),
    q({ id: '00000000-0000-4000-8000-000000007116', key: 'BHV_EVACUATION_SUPPORT', category: 'SITUATION', inputType: 'SINGLE_SELECT', label: 'Zijn er tijdens een ontruiming mensen die extra ondersteuning nodig kunnen hebben?', helpText: 'Beschrijf geen medische gegevens of namen. Het gaat alleen om organisatorische aandachtspunten.', isRequired: true, sortOrder: 160, minSelections: 1, maxSelections: 1, visibleWhen: { questionKey: 'CONFIRMED_HELP_CATEGORY', oneOf: ['BHV'] }, options: options([['00000000-0000-4000-8000-000000007229', 'YES', 'Ja'], ['00000000-0000-4000-8000-000000007230', 'NO', 'Nee'], ['00000000-0000-4000-8000-000000007231', 'UNKNOWN', 'Dat weet ik nog niet']]) }),
    q({ id: '00000000-0000-4000-8000-000000007117', key: 'BHV_EVACUATION_SUPPORT_CONTEXT', category: 'SITUATION', inputType: 'LONG_TEXT', label: 'Welke organisatorische ondersteuning kan nodig zijn?', helpText: 'Denk aan begeleiding van bezoekers, cliënten of medewerkers. Noem geen medische gegevens.', isRequired: false, sortOrder: 170, maxLength: 1200, visibleWhen: { questionKey: 'BHV_EVACUATION_SUPPORT', oneOf: ['YES'] } }),
    q({ id: '00000000-0000-4000-8000-000000007118', key: 'BHV_EXISTING_STAFF', category: 'SITUATION', inputType: 'SINGLE_SELECT', label: 'Zijn er al opgeleide BHV’ers binnen uw organisatie?', helpText: 'Kies de actuele situatie.', isRequired: true, sortOrder: 180, minSelections: 1, maxSelections: 1, visibleWhen: { questionKey: 'CONFIRMED_HELP_CATEGORY', oneOf: ['BHV'] }, options: options([['00000000-0000-4000-8000-000000007232', 'YES', 'Ja'], ['00000000-0000-4000-8000-000000007233', 'NO', 'Nee'], ['00000000-0000-4000-8000-000000007234', 'UNKNOWN', 'Dat weet ik nog niet']]) }),
    q({ id: '00000000-0000-4000-8000-000000007119', key: 'BHV_EXISTING_STAFF_COUNT', category: 'SITUATION', inputType: 'NUMBER', label: 'Hoeveel opgeleide BHV’ers zijn er ongeveer?', helpText: 'Vul het huidige aantal in.', isRequired: false, sortOrder: 190, minNumber: 0, maxNumber: 100000, visibleWhen: { questionKey: 'BHV_EXISTING_STAFF', oneOf: ['YES'] } }),
    q({ id: '00000000-0000-4000-8000-000000007120', key: 'BHV_EXISTING_DOCUMENTS', category: 'SITUATION', inputType: 'MULTI_SELECT', label: 'Welke BHV-documenten of voorzieningen zijn er al?', helpText: 'Kies alles wat van toepassing is.', isRequired: false, sortOrder: 200, maxSelections: 5, visibleWhen: { questionKey: 'CONFIRMED_HELP_CATEGORY', oneOf: ['BHV'] }, options: options([['00000000-0000-4000-8000-000000007235', 'BHV_PLAN', 'BHV-plan'], ['00000000-0000-4000-8000-000000007236', 'EVACUATION_PLAN', 'Ontruimingsplan'], ['00000000-0000-4000-8000-000000007237', 'FLOOR_PLANS', 'Plattegronden of vluchtroutes'], ['00000000-0000-4000-8000-000000007238', 'EXERCISE_REPORTS', 'Verslagen van oefeningen'], ['00000000-0000-4000-8000-000000007239', 'NONE_OR_UNKNOWN', 'Geen of onbekend', true]]) }),
    q({ id: '00000000-0000-4000-8000-000000007121', key: 'BHV_SUPPORT_NEEDED', category: 'SITUATION', inputType: 'MULTI_SELECT', label: 'Waarbij wilt u concreet ondersteuning?', helpText: 'Kies één of meer onderdelen.', isRequired: true, sortOrder: 210, minSelections: 1, maxSelections: 6, visibleWhen: { questionKey: 'CONFIRMED_HELP_CATEGORY', oneOf: ['BHV'] }, options: options([['00000000-0000-4000-8000-000000007240', 'ASSESSMENT', 'Beoordelen wat nodig is'], ['00000000-0000-4000-8000-000000007241', 'PLAN', 'BHV- of ontruimingsplan opstellen'], ['00000000-0000-4000-8000-000000007242', 'TRAINING', 'Opleiding of herhaling organiseren'], ['00000000-0000-4000-8000-000000007243', 'EXERCISE', 'Ontruimingsoefening voorbereiden'], ['00000000-0000-4000-8000-000000007244', 'ORGANIZATION', 'BHV-organisatie inrichten'], ['00000000-0000-4000-8000-000000007245', 'UNKNOWN', 'Dat weet ik nog niet', true]]) }),
    q({ id: '00000000-0000-4000-8000-000000007122', key: 'BHV_LOCATION_CHARACTERISTICS', category: 'SITUATION', inputType: 'LONG_TEXT', label: 'Zijn er bijzondere kenmerken van de locatie?', helpText: 'Denk aan meerdere verdiepingen, publiek, opslag, machines of beperkte bereikbaarheid.', isRequired: false, sortOrder: 220, maxLength: 1800, visibleWhen: { questionKey: 'CONFIRMED_HELP_CATEGORY', oneOf: ['BHV'] } }),
    q({ id: '00000000-0000-4000-8000-000000007123', key: 'GENERAL_SUPPORT_GOAL', category: 'SITUATION', inputType: 'LONG_TEXT', label: 'Wat wilt u met de ondersteuning bereiken?', helpText: 'Beschrijf kort welk resultaat voor uw organisatie nuttig zou zijn.', isRequired: true, sortOrder: 230, minLength: 10, maxLength: 1500, visibleWhen: { questionKey: 'CONFIRMED_HELP_CATEGORY', oneOf: ['RIE', 'HAZARDOUS_SUBSTANCES', 'INCIDENT', 'ERGONOMICS', 'OCCUPATIONAL_HEALTH', 'MACHINERY_SAFETY', 'PSA', 'OTHER', 'NOT_SURE'] } }, false),
    q({ id: '00000000-0000-4000-8000-000000007124', key: 'GENERAL_RELEVANT_CONTEXT', category: 'SITUATION', inputType: 'LONG_TEXT', label: 'Welke informatie is verder belangrijk?', helpText: 'Noem alleen feiten die nodig zijn om de opdracht te begrijpen en vermijd persoonsgegevens.', isRequired: false, sortOrder: 240, maxLength: 2000, visibleWhen: { questionKey: 'CONFIRMED_HELP_CATEGORY', oneOf: ['RIE', 'HAZARDOUS_SUBSTANCES', 'INCIDENT', 'ERGONOMICS', 'OCCUPATIONAL_HEALTH', 'MACHINERY_SAFETY', 'PSA', 'OTHER', 'NOT_SURE'] } }, false),
    q({ id: '00000000-0000-4000-8000-000000007125', key: 'ADDITIONAL_NOTES', category: 'CONSTRAINTS', inputType: 'LONG_TEXT', label: 'Zijn er bijzondere omstandigheden of aanvullende opmerkingen?', helpText: 'Dit veld is optioneel. Noem geen namen, medische gegevens of andere bijzondere persoonsgegevens.', isRequired: false, sortOrder: 250, maxLength: 2000 }),
  ] satisfies IntakeQuestionnaireV2Question[],
} as const
