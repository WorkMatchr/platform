export type SafeExpression = Record<string, unknown>

function field(input: Record<string, unknown>, name: unknown) {
  if (typeof name !== 'string' || !/^[a-zA-Z0-9_.-]{1,120}$/.test(name)) throw new Error('Ongeldige veldreferentie.')
  return name.split('.').reduce<unknown>((value, key) => value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined, input)
}

export function evaluateSafeExpression(expression: SafeExpression, input: Record<string, unknown>): unknown {
  const keys = Object.keys(expression)
  if (keys.length !== 1) throw new Error('Een expressie bevat exact één operator.')
  const [operator] = keys
  const operand = expression[operator]
  if (operator === 'value') return operand
  if (operator === 'field') return field(input, operand)
  if (operator === 'not') return !Boolean(evaluateSafeExpression(operand as SafeExpression, input))
  if (operator === 'all' || operator === 'any') {
    if (!Array.isArray(operand)) throw new Error('Logische operator verwacht een lijst.')
    const values = operand.map((entry) => Boolean(evaluateSafeExpression(entry as SafeExpression, input)))
    return operator === 'all' ? values.every(Boolean) : values.some(Boolean)
  }
  if (!['eq', 'gt', 'gte', 'lt', 'lte', 'in'].includes(operator) || !Array.isArray(operand) || operand.length !== 2) throw new Error('Niet-ondersteunde declaratieve expressie.')
  const left = typeof operand[0] === 'object' ? evaluateSafeExpression(operand[0] as SafeExpression, input) : operand[0]
  const right = typeof operand[1] === 'object' && !Array.isArray(operand[1]) ? evaluateSafeExpression(operand[1] as SafeExpression, input) : operand[1]
  if (operator === 'eq') return left === right
  if (operator === 'in') return Array.isArray(right) && right.includes(left)
  if (typeof left !== 'number' || typeof right !== 'number') throw new Error('Vergelijking verwacht getallen.')
  return operator === 'gt' ? left > right : operator === 'gte' ? left >= right : operator === 'lt' ? left < right : left <= right
}

export function scoreChecklist(items: Array<{ order: number; required: boolean; scoreRules?: unknown }>, answers: Record<number, unknown>) {
  const missing = items.filter((item) => item.required && answers[item.order] === undefined).map((item) => item.order)
  if (missing.length) return { complete: false, missing, score: null }
  const score = items.reduce((total, item) => {
    const rules = item.scoreRules
    if (!rules || typeof rules !== 'object') return total
    const value = (rules as Record<string, unknown>)[String(answers[item.order])]
    return total + (typeof value === 'number' ? value : 0)
  }, 0)
  return { complete: true, missing: [], score }
}
