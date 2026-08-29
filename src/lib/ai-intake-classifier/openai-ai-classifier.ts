import type {
  AIClassifier,
  AIClassifierInput,
  AIClassifierOutput,
} from './ai-classifier-contract'
import { AIClassifierError } from './ai-classifier-error'
import {
  AI_CLASSIFIER_OUTPUT_JSON_SCHEMA,
  parseAIClassifierOutput,
} from './ai-classifier-validation'

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'

const SYSTEM_INSTRUCTION = [
  'Beschrijf in één natuurlijke Nederlandse zin wat de ondernemer waarschijnlijk wil weten en classificeer uitsluitend het hoofdonderwerp.',
  'Beschrijf de bedoeling achter de hulpvraag; herschrijf de invoer niet letterlijk en laat bijzaken weg wanneer die niet nodig zijn om de kern te begrijpen.',
  'Begin de samenvatting rechtstreeks met "U wilt weten". Gebruik bij voorkeur één en maximaal twee zinnen.',
  'Gebruik natuurlijk Nederlands zonder technische taal. Schrijf niet "De ondernemer vraagt", "De gebruiker wil" of "Er wordt gevraagd".',
  'De samenvatting bevat geen advies, verplichting of conclusie.',
  'Voorbeeld: een onvoldoende geveerde chauffeursstoel wordt "U wilt weten welke gevolgen een onvoldoende geveerde chauffeursstoel kan hebben voor de gezondheid en fysieke belasting van een vrachtwagenchauffeur."',
  'Voorbeeld: een medewerker die tijdens het werk ten val is gekomen wordt "U wilt weten welke verplichtingen u heeft wanneer een medewerker tijdens het werk ten val is gekomen."',
  'Voorbeeld: een vraag over een PMO wordt "U wilt weten welke deskundigheid nodig is voor het uitvoeren van een PMO."',
  'Gebruik alleen de onderwerpcodes uit het opgegeven schema.',
  'Geef buiten de gevraagde samenvatting geen vrije uitleg, advies, juridische conclusie of HTML.',
  'Gebruik UNKNOWN wanneer de hulpvraag onvoldoende duidelijk is.',
  'Structureer daarnaast de volledige situatie in caseUnderstanding. Neem uitsluitend informatie op die expliciet in de tekst staat of semantisch betrouwbaar kan worden geëxtraheerd.',
  'Bewaar de letterlijke of zeer nabije tekstpassage waarop ieder element rust in evidence. Een hypothese blijft HYPOTHESIS en mag nooit als feit worden geformuleerd.',
  'Gebruik UNKNOWN met een lege value en evidence wanneer informatie ontbreekt. Vraag geen diagnose, medische details of persoonsgegevens uit en trek geen juridische, medische, compliance-, CE-, grenswaarde-, Seveso- of veilig/onveiligconclusie.',
  'candidateExpertiseDomains bevat uitsluitend codes uit het schema en is een voorlopige semantische richting; definitieve expertise en matching worden buiten het model door beheerde WorkMatchr-regels bepaald.',
  'Noem bij knownFacts alleen expliciete of betrouwbaar geëxtraheerde feiten. Zet onbewezen verbanden, zoals een vermoede oorzaak, uitsluitend onder een passend element met status HYPOTHESIS.',
  'De gebruiker bevestigt of corrigeert het voorstel altijd.',
].join(' ')

type FetchImplementation = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>

type OpenAIClassifierOptions = Readonly<{
  apiKey: string
  model: string
  timeoutMs: number
  fetchImplementation?: FetchImplementation
}>

type OpenAIResponseBody = {
  output_text?: unknown
  output?: unknown
}

function outputText(response: OpenAIResponseBody): string {
  if (typeof response.output_text === 'string') {
    return response.output_text
  }

  if (!Array.isArray(response.output)) {
    throw new Error('OPENAI_INVALID_RESPONSE')
  }

  for (const item of response.output) {
    if (!item || typeof item !== 'object' || !('content' in item)) continue
    const content = item.content
    if (!Array.isArray(content)) continue

    for (const part of content) {
      if (
        part &&
        typeof part === 'object' &&
        'type' in part &&
        part.type === 'output_text' &&
        'text' in part &&
        typeof part.text === 'string'
      ) {
        return part.text
      }
    }
  }

  throw new Error('OPENAI_MISSING_STRUCTURED_OUTPUT')
}

export class OpenAIAIClassifier implements AIClassifier {
  readonly provider = 'openai'
  readonly model: string

  private readonly apiKey: string
  private readonly timeoutMs: number
  private readonly fetchImplementation: FetchImplementation

  constructor(options: OpenAIClassifierOptions) {
    this.apiKey = options.apiKey
    this.model = options.model
    this.timeoutMs = options.timeoutMs
    this.fetchImplementation = options.fetchImplementation ?? fetch
  }

  async classify(input: AIClassifierInput): Promise<AIClassifierOutput> {
    const abortController = new AbortController()
    const timeout = setTimeout(() => abortController.abort(), this.timeoutMs)

    try {
      let response: Response
      try {
        response = await this.fetchImplementation(OPENAI_RESPONSES_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          signal: abortController.signal,
          body: JSON.stringify({
            model: this.model,
            store: false,
            input: [
              {
                role: 'system',
                content: SYSTEM_INSTRUCTION,
              },
              {
                role: 'user',
                content: input.helpRequest,
              },
            ],
            text: {
              format: {
                type: 'json_schema',
                name: 'workmatchr_ai_intake_classification',
                strict: true,
                schema: AI_CLASSIFIER_OUTPUT_JSON_SCHEMA,
              },
            },
            max_output_tokens: 6_000,
          }),
        })
      } catch (error) {
        if (
          abortController.signal.aborted ||
          (error instanceof Error && error.name === 'AbortError')
        ) {
          throw new AIClassifierError('PROVIDER_TIMEOUT')
        }
        throw new AIClassifierError('PROVIDER_UNAVAILABLE')
      }

      if (!response.ok) {
        throw new AIClassifierError(
          response.status >= 500
            ? 'PROVIDER_UNAVAILABLE'
            : 'PROVIDER_REQUEST_REJECTED',
          response.status,
        )
      }

      try {
        const responseBody = (await response.json()) as OpenAIResponseBody
        const structuredOutput = JSON.parse(
          outputText(responseBody),
        ) as unknown
        return parseAIClassifierOutput(structuredOutput)
      } catch {
        throw new AIClassifierError('OUTPUT_INVALID')
      }
    } finally {
      clearTimeout(timeout)
    }
  }
}
