const MAX_TITLE_LENGTH = 120

function normalizeLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function generateAssignmentTitle(helpRequest: string): string {
  const firstLine = helpRequest
    .split(/\r?\n/)
    .map(normalizeLine)
    .find(Boolean)

  if (!firstLine) {
    throw new Error('De hulpvraag bevat geen bruikbare titelbron.')
  }

  if (firstLine.length <= MAX_TITLE_LENGTH) return firstLine

  const availableLength = MAX_TITLE_LENGTH - 1
  const candidate = firstLine.slice(0, availableLength + 1)
  const wordBoundary = candidate.lastIndexOf(' ')
  const shortened = wordBoundary >= 40 ? candidate.slice(0, wordBoundary) : firstLine.slice(0, availableLength)

  return `${shortened.trimEnd()}…`
}

export function generateAssignmentDescription(input: {
  helpRequest: string
  desiredOutcome: string
  situation: string
}): string {
  return [
    `Hulpvraag\n${input.helpRequest.trim()}`,
    `Gewenst resultaat\n${input.desiredOutcome.trim()}`,
    `Huidige situatie\n${input.situation.trim()}`,
  ].join('\n\n')
}
