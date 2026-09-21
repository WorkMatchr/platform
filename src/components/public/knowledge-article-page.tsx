import { Text } from '@/components/ui/text'
import type { KnowledgeArticleContent } from '@/content/public-content-model'
import { publicRoutes } from '@/content/public-routes'
import { resolvePublicSources } from '@/content/public-sources'
import { KnowledgeInformationNotice } from '@/components/knowledge/knowledge-information-notice'
import { KnowledgeSummary } from './knowledge-summary'
import { PublicContentCallToAction, PublicContentRelations } from './public-content-pathways'
import { PublicPageLayout } from './public-page-layout'
import { PublicBulletList, PublicContentStatus, PublicDetailBody, PublicFaqList, PublicSourceList, PublicTextSection } from './public-detail-shared'

function PreventionOfficerArticleContent({ content }: { content: KnowledgeArticleContent }) {
  const steps = [
    'Controleer of ten minste één preventiemedewerker is aangewezen.',
    'Controleer of de rol en beschikbare deskundigheid passen bij de risico’s uit de RI&E.',
    'Zorg voor voldoende tijd, middelen, informatie en rechtstreekse toegang tot werkgever of management.',
    'Betrek werknemers en OR of PVT waar dat vereist is.',
    'Organiseer periodieke rondgangen en een herkenbare route voor signalen van werknemers.',
    'Leg vast hoe signalen en maatregelen worden opgevolgd.',
    'Schakel aanvullende deskundigheid in als risico’s specialistischer zijn dan de interne kennis.',
  ] as const

  return <>
    <PublicTextSection id="verplicht" title="Voor welke werkgevers is dit verplicht?">
      <Text>Iedere werkgever met werknemers moet ten minste één preventiemedewerker aanwijzen. Bij maximaal 25 werknemers mag de werkgever onder de wettelijke voorwaarden zelf de preventietaken uitvoeren.</Text>
    </PublicTextSection>
    <PublicTextSection id="positie" title="Een interne en herkenbare positie">
      <Text>De Arbowet gaat uit van deskundige bijstand door één of meer werknemers. De preventiemedewerker kent de dagelijkse werksituatie, is bereikbaar voor werknemers en kan risico’s en signalen bij de werkgever onder de aandacht brengen.</Text>
      <Text>Wanneer werkzaamheden of risico’s te complex zijn voor de interne deskundigheid, kan aanvullende externe ondersteuning nodig zijn. Die ondersteuning vervangt niet automatisch de verplichting om intern een preventiemedewerker aan te wijzen.</Text>
    </PublicTextSection>
    <PublicTextSection id="kerntaken" title="De drie wettelijke kerntaken">
      <PublicBulletList items={[
        'meewerken aan het verrichten en opstellen van de RI&E, inclusief het plan van aanpak;',
        'adviseren aan en nauw samenwerken met OR of PVT en de betrokken arbodeskundigen, waaronder arbodienst of bedrijfsarts;',
        'meewerken aan het uitvoeren van de maatregelen voor goede arbeidsomstandigheden.',
      ]} />
      <Text>“Meewerken aan” betekent niet dat de preventiemedewerker eindverantwoordelijk wordt voor de RI&E, het arbobeleid of alle maatregelen. Die verantwoordelijkheid blijft bij de werkgever.</Text>
    </PublicTextSection>
    <PublicTextSection id="medezeggenschap" title="Werkgever en medezeggenschap">
      <Text>De werkgever blijft verantwoordelijk voor het arbobeleid. De preventiemedewerker ondersteunt, adviseert, signaleert, werkt mee aan maatregelen en helpt de opvolging bewaken.</Text>
      <Text>Als er een OR of PVT is, heeft deze instemmingsrecht over de persoon en de positie van de preventiemedewerker. OR of PVT moet daarnaast tijdig worden betrokken bij relevante regelingen en arbo-onderwerpen voor zover de toepasselijke medezeggenschapsregels dat vereisen.</Text>
    </PublicTextSection>
    <PublicTextSection id="deskundigheid" title="Deskundigheid, tijd en middelen">
      <Text>Er is niet één uniforme opleiding of één certificaat dat voor iedere preventiemedewerker wettelijk verplicht is. De preventiemedewerker moet wel voldoende kennis en ervaring hebben voor de aanwezige risico’s en taken. De werkgever moet voldoende tijd, middelen, informatie en gelegenheid voor verdere deskundigheidsontwikkeling beschikbaar stellen.</Text>
    </PublicTextSection>
    <PublicTextSection id="relevant" title="Wanneer is betrokkenheid extra relevant?">
      <PublicBulletList items={[
        'bij het opstellen of actualiseren van de RI&E en het plan van aanpak;',
        'bij nieuwe machines, stoffen, werkprocessen of reorganisaties;',
        'na incidenten of bijna-ongevallen;',
        'wanneer signalen of afgesproken maatregelen blijven liggen.',
      ]} />
      <Text>Dit zijn praktische voorbeelden en geen uitputtende lijst.</Text>
    </PublicTextSection>
    <PublicTextSection id="praktijkvoorbeeld" title="Praktijkvoorbeeld">
      <Text>{content.practiceExample} De preventiemedewerker stelt daarbij niet zelfstandig medische of specialistische oorzaken vast. Als zulke beoordeling nodig is, kan bijvoorbeeld een bedrijfsarts of arbeids- en organisatiedeskundige worden betrokken.</Text>
    </PublicTextSection>
    <PublicTextSection id="aandachtspunten" title="Praktische aandachtspunten">
      <PublicBulletList items={content.practicalPoints} />
    </PublicTextSection>
    <PublicTextSection id="rie" title="Wat is de relatie met de RI&E?">
      <Text>Meewerken aan de RI&E en het plan van aanpak behoort tot de wettelijke kerntaken. De preventiemedewerker verbindt de formele risicoanalyse met dagelijkse ervaringen en helpt bewaken dat nieuwe of veranderde risico’s worden verwerkt.</Text>
      <Text>De preventiemedewerker hoeft niet alle risico’s zelfstandig te beoordelen. Voor specialistische risico’s kan aanvullende deskundigheid nodig zijn.</Text>
    </PublicTextSection>
    <PublicTextSection id="ondersteuning" title="Externe ondersteuning versterkt de interne rol">
      <Text>Externe deskundigen kunnen helpen bij complexe risico’s, onderzoek of deskundigheidsontwikkeling. Laat die ondersteuning de interne rol versterken en niet onzichtbaar vervangen.</Text>
    </PublicTextSection>
    <section aria-labelledby="vervolg-title"><h2 id="vervolg-title" className="text-2xl font-bold text-brand-dark">Wat kunt u nu doen?</h2><ol className="mt-4 space-y-3">{steps.map((step, index) => <li key={step} className="flex gap-3"><span aria-hidden="true" className="font-bold text-brand-primary">{index + 1}.</span><p className="text-text-secondary">{step}</p></li>)}</ol></section>
    <PublicTextSection id="wettelijke-context" title="Wettelijke context">
      <Text>Artikel 13 van de Arbeidsomstandighedenwet regelt de deskundige bijstand door werknemers en de taken van de preventiemedewerker. Iedere werkgever met werknemers moet ten minste één preventiemedewerker aanwijzen. Bij maximaal 25 werknemers mag de werkgever onder voorwaarden zelf deze rol vervullen.</Text>
    </PublicTextSection>
  </>
}

export function KnowledgeArticlePage({
  content,
  improvementReportHref,
  developmentImprovementTestMode = false,
}: {
  content: KnowledgeArticleContent
  improvementReportHref?: `/kenniscentrum/verbetering-melden/${string}`
  developmentImprovementTestMode?: boolean
}) {
  const isPreventionOfficerArticle = content.id === 'knowledge:preventiemedewerker'
  const genericContent = <><PublicTextSection id="relevant" title="Wanneer is dit relevant?"><Text>{content.relevantWhen}</Text></PublicTextSection><PublicTextSection id="context" title="Wat betekent dit in de praktijk?">{content.context.map((paragraph) => <Text key={paragraph}>{paragraph}</Text>)}</PublicTextSection><PublicTextSection id="praktijkvoorbeeld" title="Praktijkvoorbeeld"><Text>{content.practiceExample}</Text></PublicTextSection><PublicTextSection id="aandachtspunten" title="Praktische aandachtspunten"><PublicBulletList items={content.practicalPoints} /></PublicTextSection><PublicTextSection id="rie" title="Wat is de relatie met de RI&E?"><Text>{content.rieRelationship}</Text></PublicTextSection><PublicTextSection id="ondersteuning" title="Wanneer is ondersteuning verstandig?"><Text>{content.supportWhen}</Text></PublicTextSection><PublicTextSection id="vervolg" title="Wat kunt u nu doen?"><Text>{content.nextStep}</Text></PublicTextSection><PublicTextSection id="wettelijke-context" title="Wettelijke context"><Text>{content.legalContext}</Text></PublicTextSection></>
  return <PublicPageLayout breadcrumbs={[{ label: 'Home', href: publicRoutes.home }, { label: 'Kenniscentrum', href: publicRoutes.knowledge }, { label: content.title }]} eyebrow="Kennis" title={content.title} description={content.summary}><PublicDetailBody><PublicContentStatus content={content} /><KnowledgeSummary>{content.shortAnswer}</KnowledgeSummary>{isPreventionOfficerArticle ? <PreventionOfficerArticleContent content={content} /> : genericContent}<KnowledgeInformationNotice reportHref={improvementReportHref} developmentTestMode={developmentImprovementTestMode} /><PublicContentRelations contentId={content.id} /><PublicFaqList faq={content.faq} /><PublicContentCallToAction /><PublicSourceList sources={resolvePublicSources(content.sourceIds)} /></PublicDetailBody></PublicPageLayout>
}
