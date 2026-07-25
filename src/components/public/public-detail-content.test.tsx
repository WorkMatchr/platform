import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { knowledgeArticles } from '@/content/knowledge/articles'
import { services } from '@/content/services'
import { KnowledgeArticlePage } from './knowledge-article-page'
import { PublicBulletList, PublicFaqList, PublicSteps } from './public-detail-shared'
import { ServiceDetailPage } from './service-detail-page'

describe('publieke detailcontent', () => {
  it('rendert uitgebreide dienstinformatie in een vaste, begrijpelijke volgorde', () => {
    const html = renderToStaticMarkup(<ServiceDetailPage content={services[0]} />)

    for (const heading of [
      'Wat is deze dienst of deskundigheid?',
      'Bij welke situatie kan dit relevant zijn?',
      'Hoe kan dit er in de praktijk uitzien?',
      'Hoe bereidt u de vraag goed voor?',
      'Hoe hangt dit samen met de RI&amp;E?',
      'Relevante wettelijke context',
      'Veelgestelde vragen',
    ]) {
      expect(html).toContain(heading)
    }
  })

  it('rendert kennis met wanneer, waarom, praktijk, RI&E en vervolg', () => {
    const html = renderToStaticMarkup(<KnowledgeArticlePage content={knowledgeArticles[0]} />)

    for (const heading of [
      'Wanneer is dit relevant?',
      'Wat betekent dit in de praktijk?',
      'Praktijkvoorbeeld',
      'Wat is de relatie met de RI&amp;E?',
      'Wanneer is ondersteuning verstandig?',
      'Wat kunt u nu doen?',
      'Wettelijke context',
      'Veelgestelde vragen',
    ]) {
      expect(html).toContain(heading)
    }
  })

  it('toont publieke bullets compact en zonder kunstmatige lege regels', () => {
    const html = renderToStaticMarkup(<PublicBulletList items={['Eerste punt', 'Tweede punt']} />)

    expect(html).toContain('list-disc space-y-1')
    expect(html).toContain('leading-6')
    expect(html).not.toContain('space-y-2')
    expect(html).toContain('<li>Eerste punt</li><li>Tweede punt</li>')
  })

  it('toont nummeringen en veelgestelde vragen met compacte tussenruimte', () => {
    const steps = renderToStaticMarkup(<PublicSteps items={['Eerste stap', 'Tweede stap']} />)
    const faq = renderToStaticMarkup(<PublicFaqList faq={[
      { id: 'faq-1', question: 'Eerste vraag?', answer: 'Eerste antwoord.' },
      { id: 'faq-2', question: 'Tweede vraag?', answer: 'Tweede antwoord.' },
    ]} />)

    expect(steps).toContain('space-y-1')
    expect(steps).toContain('leading-6')
    expect(faq).toContain('mt-4 space-y-4')
    expect(faq).toContain('mt-1 text-body leading-6')
  })
})
