import type { Metadata } from 'next'
import { Section } from '@/components/layout/section'
import { PublicPageLayout } from '@/components/public/public-page-layout'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { LinkButton } from '@/components/ui/link-button'
import { Text } from '@/components/ui/text'
import { publicLearning } from '@/content/public-learning'

const title = 'RI&E in de praktijk — online RI&E-opleiding | WorkMatchr'
const description = 'Leer de RI&E toepassen in 10 hoofdstukken. Online in uw eigen tempo, met oefeningen, een eindtoets en certificaat van afronding. Binnenkort beschikbaar vanaf €149.'
export const metadata: Metadata = { title, description, alternates: { canonical: publicLearning.href }, openGraph: { title, description, url: publicLearning.href } }

export default function RieLearningPage() {
  return <PublicPageLayout breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'E-learning', href: '/e-learning' }, { label: publicLearning.title }]} eyebrow={publicLearning.status} title={publicLearning.title} description="Van risico’s herkennen tot een uitvoerbaar Plan van Aanpak. Een praktische online opleiding over veilig en gezond werken, in uw eigen tempo. Binnenkort beschikbaar." heroActions={<LinkButton href="#programma">Bekijk het programma</LinkButton>}>
    <Section spacing="compact" containerClassName="grid gap-6 md:grid-cols-2">
      <Card><Heading as="h2" size="h2">Voor wie?</Heading><Text className="mt-4 text-text-secondary">Voor preventiemedewerkers, leidinggevenden, HR-medewerkers, ondernemers en andere medewerkers die willen bijdragen aan de RI&E en veilig en gezond werken.</Text></Card>
      <Card variant="subtle"><Heading as="h2" size="h2">Wat leert u?</Heading><ul className="mt-4 list-disc space-y-2 pl-5 text-text-secondary"><li>Risico’s herkennen, inventariseren en beoordelen.</li><li>Passende maatregelen afwegen en vastleggen in een Plan van Aanpak.</li><li>Rollen, toetsing en het actueel houden van de RI&E begrijpen.</li><li>De stap maken van papier naar de dagelijkse praktijk.</li></ul></Card>
    </Section>
    <Section id="programma" spacing="compact" className="bg-surface" aria-labelledby="program-title">
      <Heading as="h2" size="h2" id="program-title">Het programma: 10 hoofdstukken</Heading>
      <Text className="mt-4 max-w-3xl text-text-secondary">U volgt de opleiding straks volledig online en in uw eigen tempo. Praktijkvoorbeelden en oefeningen helpen u de kennis toe te passen.</Text>
      <ol className="mt-6 grid gap-4 md:grid-cols-2">{publicLearning.chapters.map((chapter, index) => <li key={chapter}><Card className="h-full"><Heading as="h3" size="h3">H{index + 1} — {chapter}</Heading></Card></li>)}</ol>
    </Section>
    <Section spacing="compact" aria-labelledby="exam-title"><Heading as="h2" size="h2" id="exam-title">Eindtoets en certificaat van afronding</Heading>
      <Text className="mt-4 max-w-3xl text-text-secondary">De opleiding sluit af met een eindtoets van 50 vragen. U slaagt bij minimaal 40 van de 50 vragen goed: 40/50 = 80%. Na het afronden van de opleiding en behalen van de eindtoets ontvangt u een certificaat van afronding.</Text>
      <Card variant="subtle" className="mt-6 max-w-3xl"><Heading as="h3" size="h3">Wat betekent het certificaat?</Heading><Text className="mt-3 text-text-secondary">Het certificaat bevestigt dat u deze opleiding heeft afgerond en de eindtoets heeft behaald. Het is geen wettelijk erkend diploma, beroepscertificering of bewijs dat uw organisatie aan alle arboverplichtingen voldoet. Het vervangt geen RI&E, deskundige toetsing of professioneel advies.</Text></Card>
    </Section>
    <Section spacing="compact" className="bg-surface" aria-labelledby="retention-title"><Heading as="h2" size="h2" id="retention-title">Optioneel: uw kennis onderhouden</Heading>
      <Text className="mt-4 max-w-3xl text-text-secondary">Na afloop is vrijwillig 12 weken kennisbehoud voorzien, met 5 vragen per week. Daarnaast is een optionele jaarherinnering met een 10-vragencheck voorzien. Deelname is vrijwillig en staat los van het certificaat; een kennischeck verlengt of vernieuwt het certificaat niet.</Text>
      <Text className="mt-4 max-w-3xl text-text-secondary">Ook deze mogelijkheden zijn binnenkort beschikbaar. U kunt kennisbehoud of herinneringen op deze pagina nog niet activeren.</Text>
    </Section>
    <Section spacing="compact" aria-labelledby="price-title"><Heading as="h2" size="h2" id="price-title">Prijs en beschikbaarheid</Heading>
      <div className="mt-6 grid gap-6 md:grid-cols-2"><Card><Heading as="h3" size="h3">Individueel</Heading><Text className="mt-3 text-2xl font-bold">{publicLearning.individualPrice}</Text><Text className="mt-3">Voor 1 deelnemer.</Text></Card><Card><Heading as="h3" size="h3">Samen leren</Heading><Text className="mt-3 text-2xl font-bold">{publicLearning.teamPrice}</Text><Text className="mt-3">Voor 5 deelnemers.</Text></Card></div>
      <Text className="mt-6 font-semibold">{publicLearning.status}</Text><Text className="mt-3 max-w-3xl text-text-secondary">Dit zijn de aangekondigde prijzen. Kopen, inschrijven en starten zijn nog niet mogelijk. Deze pagina geeft informatie over de opleiding in voorbereiding.</Text>
      <LinkButton href="/e-learning" variant="outline" className="mt-6">Bekijk alle WorkMatchr-opleidingen</LinkButton>
    </Section>
  </PublicPageLayout>
}
