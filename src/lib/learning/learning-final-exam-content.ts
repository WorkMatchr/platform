export type FinalExamQuestion = {
  code: `E${string}`
  title: string
  chapterNumber: number
  knowledgeArea: string
  cognitiveLevel: 'B' | 'T' | 'A'
  difficulty: number
  type: 'SINGLE_CHOICE' | 'MULTI_CHOICE'
  isCritical: boolean
  criticalObjective: string | null
  questionText: string
  options: Array<{ value: string; text: string; isCorrect: boolean }>
  correctAnswer: string[]
  explanation: string
}

const difficultyByLabel: Record<string, number> = { Basis: 1, Midden: 2, 'Midden/hoog': 3, Hoog: 3, 'Zeer hoog': 4 }

export const finalExamLegalReviewCodes = ['E31', 'E32', 'E33', 'E34', 'E39', 'E44'] as const
export const finalExamDistractorPolishedCodes = ['E15', 'E19', 'E24', 'E26', 'E27', 'E29', 'E35', 'E37', 'E38', 'E46', 'E49', 'E50'] as const
export const finalExamV11TextAdjustedCodes = [
  'E01', 'E03', 'E05', 'E07', 'E08', 'E10', 'E11', 'E13', 'E14', 'E16', 'E17', 'E18',
  'E21', 'E22', 'E23', 'E25', 'E26', 'E28', 'E29', 'E30', 'E35', 'E37', 'E39', 'E40',
  'E42', 'E46', 'E47', 'E48', 'E50',
] as const

function normalizeText(value: string) {
  return value
    .replace(/\\\r?\n/g, ' ')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseSection(code: string, title: string, section: string): FinalExamQuestion {
  const questionMatch = /(?:\*\*)?Vraag:(?:\*\*)?/.exec(section)
  const correctMatch = /(?:\*\*)?Correct:(?:\*\*)?/.exec(section)
  const feedbackMatch = /(?:\*\*)?Feedback:(?:\*\*)?/.exec(section)
  const questionMarker = questionMatch?.index ?? -1
  const correctMarker = correctMatch?.index ?? -1
  const feedbackMarker = feedbackMatch?.index ?? -1
  if (!questionMatch || !correctMatch || !feedbackMatch || correctMarker < questionMarker || feedbackMarker < correctMarker) {
    throw new Error(`${code}: canonieke sectie mist Vraag, Correct of Feedback`)
  }

  const metadata = normalizeText(section.slice(0, questionMarker).replace(/\\\|/g, '|').replace(/\*\*/g, ''))
  const fields = metadata.split('|').map((field) => field.trim())
  const chapterNumber = Number(fields[0]?.match(/^H(\d+)$/)?.[1])
  const knowledgeArea = fields[1]
  const cognitiveLevel = fields[2]
  const difficultyLabel = fields[3]
  const type = fields[4]
  const critical = fields[5]?.match(/^Kritiek:\s*(ja|nee)(?:\s*---\s*(.+?))?(?:\s*\|\s*Definitieve kwaliteitsversie)?$/i)
  if (!chapterNumber || !knowledgeArea || !['B', 'T', 'A'].includes(cognitiveLevel ?? '') || !difficultyByLabel[difficultyLabel ?? ''] || !['SINGLE_CHOICE', 'MULTI_CHOICE'].includes(type ?? '') || !critical) {
    throw new Error(`${code}: ongeldige canonieke metadata: ${metadata}`)
  }

  const questionBody = normalizeText(section.slice(questionMarker + questionMatch[0].length, correctMarker))
  const optionMarkers = [...questionBody.matchAll(/(?:^|\s)([A-E])\.\s+/g)]
  if (optionMarkers.length < 2 || optionMarkers[0].index === undefined) throw new Error(`${code}: antwoordopties ontbreken`)
  const questionText = questionBody.slice(0, optionMarkers[0].index).trim()
  const options = optionMarkers.map((marker, index) => {
    const start = marker.index! + marker[0].length
    const next = optionMarkers[index + 1]
    const end = next?.index ?? questionBody.length
    return { value: marker[1], text: questionBody.slice(start, end).trim() }
  })
  if (!questionText || options.some((option) => !option.text) || new Set(options.map((option) => option.value)).size !== options.length) {
    throw new Error(`${code}: lege of dubbele vraag-/optietekst`)
  }

  const answerText = normalizeText(section.slice(correctMarker + correctMatch[0].length, feedbackMarker))
  const correctAnswer = [...answerText.matchAll(/\b([A-E])\b/g)].map((match) => match[1])
  if (!correctAnswer.length || new Set(correctAnswer).size !== correctAnswer.length || correctAnswer.some((answer) => !options.some((option) => option.value === answer))) {
    throw new Error(`${code}: ongeldige correcte antwoordset: ${answerText}`)
  }
  if ((type === 'SINGLE_CHOICE' && correctAnswer.length !== 1) || (type === 'MULTI_CHOICE' && correctAnswer.length < 2)) {
    throw new Error(`${code}: correcte antwoordset past niet bij ${type}`)
  }

  const explanation = normalizeText(section.slice(feedbackMarker + feedbackMatch[0].length))
  if (!explanation) throw new Error(`${code}: feedback ontbreekt`)
  const answerSet = new Set(correctAnswer)
  return {
    code: code as `E${string}`,
    title,
    chapterNumber,
    knowledgeArea,
    cognitiveLevel: cognitiveLevel as 'B' | 'T' | 'A',
    difficulty: difficultyByLabel[difficultyLabel],
    type: type as 'SINGLE_CHOICE' | 'MULTI_CHOICE',
    isCritical: critical[1].toLowerCase() === 'ja',
    criticalObjective: critical[2]?.trim() ?? null,
    questionText,
    options: options.map((option) => ({ ...option, isCorrect: answerSet.has(option.value) })),
    correctAnswer,
    explanation,
  }
}

export function parseFinalExamQuestionBank(markdown: string): FinalExamQuestion[] {
  const headers = [...markdown.matchAll(/^## (E\d{2}) --- (.+)$/gm)]
  if (headers.length !== 50) throw new Error(`Canonieke vraagbank moet exact 50 secties bevatten; gevonden: ${headers.length}`)
  const questions = headers.map((header, index) => {
    const start = header.index! + header[0].length
    const end = headers[index + 1]?.index ?? markdown.indexOf('# Canonical exam rules', start)
    if (end < 0) throw new Error('Canonieke afsluiting ontbreekt')
    return parseSection(header[1], header[2].trim(), markdown.slice(start, end))
  })
  const expectedCodes = Array.from({ length: 50 }, (_, index) => `E${String(index + 1).padStart(2, '0')}`)
  if (questions.some((question, index) => question.code !== expectedCodes[index])) throw new Error('Vraagcodes moeten exact E01–E50 in volgorde zijn')
  const expectedDistribution = [3, 4, 5, 6, 6, 5, 5, 4, 4, 8]
  const actualDistribution = expectedDistribution.map((_, index) => questions.filter((question) => question.chapterNumber === index + 1).length)
  if (actualDistribution.some((count, index) => count !== expectedDistribution[index])) {
    throw new Error(`Onjuiste hoofdstukverdeling: ${actualDistribution.join('/')}`)
  }
  return questions
}

export function analyzeFinalExamAnswerLengths(questions: FinalExamQuestion[]) {
  const singleChoice = questions.filter((question) => question.type === 'SINGLE_CHOICE')
  const items = singleChoice.map((question) => {
    const correctLength = question.options.find((option) => option.isCorrect)!.text.length
    const maximumDistractorLength = Math.max(...question.options.filter((option) => !option.isCorrect).map((option) => option.text.length))
    return {
      code: question.code,
      correctLength,
      maximumDistractorLength,
      correctIsClearlyLongest: correctLength > maximumDistractorLength,
      correctTiesLongest: correctLength === maximumDistractorLength,
    }
  })
  return {
    count: singleChoice.length,
    clearlyLongestCount: items.filter((item) => item.correctIsClearlyLongest).length,
    tieCount: items.filter((item) => item.correctTiesLongest).length,
    items,
  }
}
