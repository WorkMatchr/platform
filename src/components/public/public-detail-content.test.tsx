import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { obligations } from '@/content/obligations'
import { knowledgeArticles } from '@/content/knowledge/articles'
import { resolveKnowledgeContextByRoute } from '@/content/knowledge/knowledge-contexts'
import { services } from '@/content/services'
import { KnowledgeArticlePage } from './knowledge-article-page'
import { ObligationDetailPage } from './obligation-detail-page'
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

  it.each(obligations)('$href plaatst de algemene toelichting eenmaal na de bronnen', (content) => {
    const html = renderToStaticMarkup(<ObligationDetailPage content={content} />)
    const sources = html.indexOf('Bronnen en onderbouwing')
    const evidence = html.indexOf('Belangrijk bij deze uitleg')
    const pathways = html.indexOf('Stel uw vraag')

    expect(sources).toBeGreaterThan(0)
    expect(evidence).toBeGreaterThan(sources)
    expect(pathways).toBeGreaterThan(evidence)
    expect(html.match(/Belangrijk bij deze uitleg/g)).toHaveLength(1)
    expect(html).toContain('hierboven genoemde officiële bronnen')
    expect(html).not.toContain('hieronder genoemde officiële bronnen')
  })

  it.each(knowledgeArticles)('$href biedt één contextuele route naar de Advieswijzer', (article) => {
    const context = resolveKnowledgeContextByRoute(article.href)
    const html = renderToStaticMarkup(<KnowledgeArticlePage content={article} />)

    expect(context).not.toBeNull()
    expect(html).toContain(`href="/advieswijzer?context=${context?.id}"`)
    expect(html).toContain('Schakel een adviseur in')
    expect(html.match(/Schakel een adviseur in/g)).toHaveLength(1)
    expect(html).not.toContain(`href="/hulpvragen/nieuw?context=${context?.id}"`)
    expect(html).not.toContain('Start een opdracht')
    expect(html).not.toContain('Direct een opdracht plaatsen')
  })

  it('stuurt de Bedrijfsarts-pagina niet naar een BHV-context', () => {
    const article = knowledgeArticles.find((item) => item.href === '/kenniscentrum/wanneer-bedrijfsarts-inschakelen')
    expect(article).toBeDefined()

    const html = renderToStaticMarkup(<KnowledgeArticlePage content={article!} />)

    expect(html).toContain('href="/advieswijzer?context=OCCUPATIONAL_PHYSICIAN"')
    expect(html).not.toContain('context=BHV')
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
    expect(faq).toContain('mt-3 space-y-3')
    expect(faq).toContain('mt-1 text-body leading-6')
  })
})
