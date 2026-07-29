import { describe, expect, it, vi } from 'vitest'
import { classifyAIIntakeSafely } from './ai-classifier-service'
import { OpenAIAIClassifier } from './openai-ai-classifier'

const fictionalHelpRequest =
  'Ons fictieve bedrijf wil weten hoe het veilig met brandstof kan werken.'

function successfulResponse(output: unknown): Response {
  return new Response(
    JSON.stringify({
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text:
                typeof output === 'string'
                  ? output
                  : JSON.stringify(output),
            },
          ],
        },
      ],
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  )
}

function classifier(
  fetchImplementation: typeof fetch,
): OpenAIAIClassifier {
  return new OpenAIAIClassifier({
    apiKey: 'test-openai-key',
    model: 'test-model',
    timeoutMs: 500,
    fetchImplementation,
  })
}

describe('OpenAI AI Intake Classifier', () => {
  it.each(['HIGH', 'MEDIUM', 'LOW'] as const)(
    'verwerkt geldige structured output met confidence %s',
    async (confidence) => {
      const fetchImplementation = vi.fn<typeof fetch>(
        async (input, init) => {
          void input
          void init
          return successfulResponse({
            summary:
              'U wilt weten hoe veilig werken met brandstof kan worden georganiseerd.',
            primarySubject:
              confidence === 'LOW' ? 'UNKNOWN' : 'HAZARDOUS_SUBSTANCES',
            secondarySubjects: [],
            confidence,
            alternatives: confidence === 'MEDIUM' ? ['INCIDENT'] : [],
          })
        },
      )

      const result = await classifier(fetchImplementation).classify({
        helpRequest: fictionalHelpRequest,
      })

      expect(result.confidence).toBe(confidence)
      expect(fetchImplementation).toHaveBeenCalledOnce()

      const request = fetchImplementation.mock.calls[0]?.[1]
      const body = JSON.parse(String(request?.body)) as {
        store: boolean
        input: Array<{ role: string; content: string }>
        text: { format: { type: string; strict: boolean } }
      }
      expect(body.store).toBe(false)
      expect(body.input[0]?.content).toContain(
        'Beschrijf in één natuurlijke Nederlandse zin wat de ondernemer waarschijnlijk wil weten',
      )
      expect(body.input[0]?.content).toContain(
        'Begin de samenvatting rechtstreeks met "U wilt weten"',
      )
      expect(body.input[0]?.content).toContain('maximaal twee zinnen')
      expect(body.input[0]?.content).toContain(
        'laat bijzaken weg wanneer die niet nodig zijn om de kern te begrijpen',
      )
      expect(body.input[0]?.content).toContain(
        'welke gevolgen een onvoldoende geveerde chauffeursstoel kan hebben',
      )
      expect(body.input[0]?.content).not.toContain(
        'Vat de eerste hulpvraag samen',
      )
      expect(body.text.format).toMatchObject({
        type: 'json_schema',
        strict: true,
      })
    },
  )

  it.each([
    [
      'ongeldige JSON',
      async () => successfulResponse('{geen-json'),
      'OUTPUT_INVALID',
      null,
    ],
    [
      'onbekend onderwerp',
      async () =>
        successfulResponse({
          summary: 'De ondernemer stelt een vraag over de werksituatie.',
          primarySubject: 'LEGAL_ADVICE',
          secondarySubjects: [],
          confidence: 'HIGH',
          alternatives: [],
        }),
      'OUTPUT_INVALID',
      null,
    ],
    [
      'afgewezen request',
      async () =>
        new Response(JSON.stringify({ error: { message: 'niet loggen' } }), {
          status: 400,
        }),
      'PROVIDER_REQUEST_REJECTED',
      400,
    ],
    [
      'provider unavailable',
      async () =>
        new Response(JSON.stringify({ error: { message: 'niet loggen' } }), {
          status: 503,
        }),
      'PROVIDER_UNAVAILABLE',
      503,
    ],
    [
      'timeout',
      async () => {
        throw new DOMException('Timeout', 'AbortError')
      },
      'PROVIDER_TIMEOUT',
      null,
    ],
  ] as const)(
    'valt veilig terug bij %s',
    async (
      _label,
      responseFactory,
      fallbackReason,
      providerStatusCode,
    ) => {
    const fetchImplementation = vi.fn<typeof fetch>(
      async (input, init) => {
        void input
        void init
        return responseFactory()
      },
    )
    const logger = vi.fn()

    const result = await classifyAIIntakeSafely(fictionalHelpRequest, {
      classifier: classifier(fetchImplementation),
      logger,
      now: (() => {
        let value = 100
        return () => (value += 25)
      })(),
    })

    expect(result).toEqual({
      classification: null,
      fallbackUsed: true,
      fallbackReason,
      providerStatusCode,
    })
    expect(logger).toHaveBeenCalledWith({
      latencyMs: 25,
      provider: 'openai',
      model: 'test-model',
      confidence: null,
      fallbackUsed: true,
      fallbackReason,
      providerStatusCode,
    })
    expect(JSON.stringify(logger.mock.calls)).not.toContain(
      fictionalHelpRequest,
    )
    },
  )
})
