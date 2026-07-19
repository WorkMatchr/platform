import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import AdviceGuidePage, { metadata } from './advieswijzer/page'

describe('publieke Advieswijzer', () => {
  it('rendert de eerste werkende flow zonder placeholderclaim', () => {
    const html = renderToStaticMarkup(<AdviceGuidePage />)
    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1)
    expect(html).toContain('Verduidelijk uw vraag in maximaal vijf stappen')
    expect(html).toContain('Vraag 1 van 5')
    expect(html).toContain('Ik heb personeel in dienst')
    expect(html).toContain('Andere situaties')
    expect(html).not.toContain('In ontwikkeling')
    expect(html).not.toContain('Start de bestaande intake')
  })

  it('heeft unieke indexeerbare metadata en canonical', () => {
    expect(metadata.title).toBe('Advieswijzer | WorkMatchr')
    expect(metadata.description).toContain('vijf')
    expect(metadata.alternates?.canonical).toBe('/advieswijzer')
    expect(metadata.robots).toBeUndefined()
  })

  it('borgt conditionele datumweergave en focusgedrag in de clientlaag', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/public/guided-intake.tsx'), 'utf8')
    expect(source).toContain("selectedValue === question.dateRefinement.when")
    expect(source).toContain('onInput={(event) => {')
    expect(source).toContain('const desiredDate = event.currentTarget.value')
    expect(source).toContain('setAnswers((current) => ({ ...current, desiredDate }))')
    expect(source).toContain('dateRef.current?.focus()')
    expect(source).toContain('headingRef.current?.focus()')
    expect(source).toContain('role="alert"')
  })
})
