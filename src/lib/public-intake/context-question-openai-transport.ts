import 'server-only'
import { createConfiguredAIClassifier } from '@/lib/ai-intake-classifier/ai-classifier-service'
import { readOpenAIResponseOutputText } from '@/lib/ai-intake-classifier/openai-ai-classifier'
import type { ContextQuestionTransport } from './context-question-formulator'

/** Same provider/model as classification; no new SDK or provider selection. */
export function createContextQuestionOpenAITransport(): ContextQuestionTransport | null {
  const classifier = createConfiguredAIClassifier()
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!classifier || !apiKey) return null
  return async (request) => {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        model: classifier.model, store: false,
        input: [
          { role: 'system', content: request.system },
          { role: 'user', content: JSON.stringify(request.data) },
        ],
        text: { format: { type: 'json_schema', name: `context_question_${request.phase.toLowerCase()}`, strict: true, schema: request.schema } },
        max_output_tokens: 2000,
      }),
    })
    if (!response.ok) throw new Error('CONTEXT_QUESTION_PROVIDER_UNAVAILABLE')
    const data: unknown = await response.json()
    if (!data || typeof data !== 'object' || !('status' in data) || data.status !== 'completed') {
      throw new Error('CONTEXT_QUESTION_PROVIDER_INCOMPLETE')
    }
    return JSON.parse(readOpenAIResponseOutputText({
      output: 'output' in data ? data.output : undefined,
      output_text: 'output_text' in data ? data.output_text : undefined,
    })) as unknown
  }
}
