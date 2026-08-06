import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  generalProfessionalInformationText,
  KnowledgeInformationNotice,
  knowledgeImprovementPromptText,
} from './knowledge-information-notice'

describe('algemene vakinformatie', () => {
  it('toont vaste context- en verbetertekst zonder technische termen', () => {
    const html = renderToStaticMarkup(<KnowledgeInformationNotice reportHref="/kenniscentrum/verbetering-melden/10000000-0000-4000-8000-000000000001" />)
    expect(html).toContain('Algemene vakinformatie')
    expect(html).toContain(generalProfessionalInformationText)
    expect(html).toContain('Onjuistheid of wijziging melden')
    expect(html).toContain(knowledgeImprovementPromptText)
    expect(html).toContain('Verbetering melden')
    expect(html).not.toContain('KnowledgeClaim')
    expect(html).not.toContain('sourceControlStatus')
  })

  it('toont zonder toegestane meldroute geen misleidende actie', () => {
    expect(renderToStaticMarkup(<KnowledgeInformationNotice />)).not.toContain('Verbetering melden')
  })

  it('markeert een developmenttest expliciet', () => {
    const html = renderToStaticMarkup(
      <KnowledgeInformationNotice
        reportHref="/kenniscentrum/verbetering-melden/10000000-0000-4000-8000-000000000001"
        developmentTestMode
      />,
    )
    expect(html).toContain('Developmenttest:')
    expect(html).toContain('nog niet gepubliceerd kennisitem')
  })
})
