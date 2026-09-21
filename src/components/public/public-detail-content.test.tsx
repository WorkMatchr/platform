import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { obligations } from '@/content/obligations'
import { knowledgeArticles } from '@/content/knowledge/articles'
import { services } from '@/content/services'
import { sectors } from '@/content/sectors'
import { KnowledgeArticlePage } from './knowledge-article-page'
import { ObligationDetailPage } from './obligation-detail-page'
import { PublicBulletList, PublicFaqList, PublicSteps } from './public-detail-shared'
import { SectorDetailPage } from './sector-detail-page'
import { ServiceDetailPage } from './service-detail-page'

describe('publieke detailcontent', () => {
  it('rendert het preventiemedewerkerartikel met interne rol en drie wettelijke kerntaken', () => {
    const article = knowledgeArticles.find((item) => item.id === 'knowledge:preventiemedewerker')!
    const html = renderToStaticMarkup(<KnowledgeArticlePage content={article} />)
    const legal = html.indexOf('Wettelijke context')
    const faq = html.indexOf('Veelgestelde vragen')
    const cta = html.indexOf('Hulp nodig bij uw situatie?')
    const generalInformation = html.indexOf('Algemene vakinformatie')
    const sources = html.indexOf('Bronnen en onderbouwing')

    expect(html).toContain('Iedere werkgever met werknemers moet ten minste één preventiemedewerker aanwijzen')
    expect(html).toContain('De drie wettelijke kerntaken')
    expect(html).toContain('meewerken aan het verrichten en opstellen van de RI&amp;E')
    expect(html).toContain('adviseren aan en nauw samenwerken met OR of PVT')
    expect(html).toContain('meewerken aan het uitvoeren van de maatregelen')
    expect(html).toContain('De werkgever blijft verantwoordelijk voor het arbobeleid')
    expect(html).toContain('instemmingsrecht over de persoon en de positie')
    expect(html).toContain('niet één uniforme opleiding')
    expect(html).toContain('vervangt niet automatisch de verplichting')
    expect(html).toContain('Artikel 13 van de Arbeidsomstandighedenwet')
    expect(html).not.toContain('Moet iedere werkgever een preventiemedewerker hebben?')
    expect(html).not.toContain('Moet een preventiemedewerker een opleiding hebben?')
    expect(html).not.toContain('Kan een externe adviseur de preventiemedewerker vervangen?')
    expect(html).not.toContain('Verder met uw vraag')
    expect(faq).toBe(-1)
    expect(legal).toBeGreaterThan(0)
    expect(cta).toBeGreaterThan(legal)
    expect(generalInformation).toBeGreaterThan(cta)
    expect(sources).toBeGreaterThan(generalInformation)
    expect(html.match(/Hulp nodig bij uw situatie\?/g)).toHaveLength(1)
    expect(html).toContain('bg-brand-dark')
    expect(html).toContain('text-text-on-dark')
    expect(html).toContain('focus-visible:outline-text-on-dark')
  })

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

  it.each(obligations)('$href plaatst CTA vóór bronnen en de algemene toelichting erna', (content) => {
    const html = renderToStaticMarkup(<ObligationDetailPage content={content} />)
    const faq = html.indexOf('Veelgestelde vragen')
    const cta = html.indexOf('Hulp nodig bij uw situatie?')
    const sources = html.indexOf('Bronnen en onderbouwing')
    const evidence = html.indexOf('Belangrijk bij deze uitleg')

    expect(faq).toBeGreaterThan(0)
    expect(cta).toBeGreaterThan(faq)
    expect(sources).toBeGreaterThan(cta)
    expect(sources).toBeGreaterThan(0)
    expect(evidence).toBeGreaterThan(sources)
    expect(html.match(/Belangrijk bij deze uitleg/g)).toHaveLength(1)
    expect(html).toContain('hierboven genoemde officiële bronnen')
    expect(html).not.toContain('hieronder genoemde officiële bronnen')
  })

  it('houdt op alle detailtypen de vaste eindvolgorde aan', () => {
    const pages = [
      renderToStaticMarkup(<KnowledgeArticlePage content={knowledgeArticles[0]} />),
      renderToStaticMarkup(<ServiceDetailPage content={services[0]} />),
      renderToStaticMarkup(<ObligationDetailPage content={obligations[0]} />),
      renderToStaticMarkup(<SectorDetailPage content={sectors[0]} />),
    ]

    for (const html of pages) {
      const related = html.indexOf('Verder met uw vraag')
      const faq = html.indexOf('Veelgestelde vragen')
      const cta = html.indexOf('Hulp nodig bij uw situatie?')
      const sources = html.indexOf('Bronnen en onderbouwing')

      expect(related).toBeGreaterThan(0)
      expect(faq).toBeGreaterThan(related)
      expect(cta).toBeGreaterThan(faq)
      expect(sources).toBeGreaterThan(cta)
      expect(html).not.toContain('Gerelateerde sectoren')
      expect(html.match(/Hulp nodig bij uw situatie\?/g)).toHaveLength(1)
      expect(html).toContain('Weet u niet zeker wat deze informatie voor uw organisatie betekent?')
      expect(html).toContain('Start de Advieswijzer')
      expect(html).toContain('href="/advieswijzer"')
    }
  })

  it.each(knowledgeArticles)('$href biedt één directe route naar de Advieswijzer', (article) => {
    const html = renderToStaticMarkup(<KnowledgeArticlePage content={article} />)

    expect(html).toContain('href="/advieswijzer"')
    expect(html).toContain('Start de Advieswijzer')
    expect(html).not.toContain('href="/hulpvragen/nieuw')
    expect(html).not.toContain('Start een opdracht')
    expect(html).not.toContain('Direct een opdracht plaatsen')
  })

  it('stuurt de Bedrijfsarts-pagina niet naar een BHV-context', () => {
    const article = knowledgeArticles.find((item) => item.href === '/kenniscentrum/wanneer-bedrijfsarts-inschakelen')
    expect(article).toBeDefined()

    const html = renderToStaticMarkup(<KnowledgeArticlePage content={article!} />)

    expect(html).toContain('href="/advieswijzer"')
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
