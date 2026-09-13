import { describe, expect, it } from 'vitest'
import { getSimpleAdviceContext } from './simple-advice-context'
import { requestedExpertiseOptions, helpTopicLabels } from '@/lib/requests/simple-advice-contract'
import { getServiceBySlug } from './services'

describe('beschrijvende context op eigen keuze', () => {
  it.each(requestedExpertiseOptions)('$value heeft context zonder selectie te wijzigen', option => {
    const input = Object.freeze({ routeChoice: 'KNOWS_EXPERTISE', requestedExpertise: option.value, helpTopic: 'MACHINES' })
    const context = getSimpleAdviceContext(input, 1)
    expect(context.title).toContain(option.label)
    expect(context.lines.length).toBeGreaterThanOrEqual(2)
    expect(context.lines.every(line => line.length > 20)).toBe(true)
    expect(JSON.stringify(context)).not.toMatch(/wij adviseren|u heeft.{0,80}nodig|de juiste deskundige is/i)
    expect(context.callout).toContain('via ‘Terug’')
    expect(input.requestedExpertise).toBe(option.value)
  })
  it.each(['HVK', 'BEDRIJFSARTS', 'ERGONOMIE_FYSIEKE_BELASTING'])('%s toont uitsluitend de gekozen expertise', requestedExpertise => {
    const text = JSON.stringify(getSimpleAdviceContext({ routeChoice: 'KNOWS_EXPERTISE', requestedExpertise, helpTopic: '' }, 1))
    for (const other of requestedExpertiseOptions.filter(option => ['HVK', 'BEDRIJFSARTS', 'ERGONOMIE_FYSIEKE_BELASTING'].includes(option.value) && option.value !== requestedExpertise)) expect(text.toLowerCase()).not.toContain(other.label.toLowerCase())
  })
  it('leest HVK-inhoud rechtstreeks uit de canonieke dienstcontent', () => {
    expect(getSimpleAdviceContext({ routeChoice: 'KNOWS_EXPERTISE', requestedExpertise: 'HVK', helpTopic: '' }, 1).lines).toContain(getServiceBySlug('hogere-veiligheidskundige')!.positioning)
  })
  it.each(Object.keys(helpTopicLabels))('onderwerp %s bevat geen expertiseclaim', helpTopic => {
    const context = getSimpleAdviceContext({ routeChoice: 'NEEDS_TOPIC', requestedExpertise: 'HVK', helpTopic }, 1)
    expect(context.title).toContain(helpTopicLabels[helpTopic as keyof typeof helpTopicLabels])
    expect(context.lines[0].length).toBeGreaterThan(20)
    for (const option of requestedExpertiseOptions) expect(JSON.stringify(context).toLowerCase()).not.toContain(option.label.toLowerCase())
  })
  it('toont context vanaf de volgende stap en volgt wijzigingen in eigen keuze', () => {
    const selection = { routeChoice: 'KNOWS_EXPERTISE', requestedExpertise: 'HVK', helpTopic: '' }
    expect(getSimpleAdviceContext(selection, 0).title).toBe('Uw keuze')
    expect(getSimpleAdviceContext(selection, 1).title).toContain('HVK')
    expect(getSimpleAdviceContext({ ...selection, requestedExpertise: 'BEDRIJFSARTS' }, 2).title).toContain('Bedrijfsarts')
  })
})
