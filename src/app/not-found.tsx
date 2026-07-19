import { Container } from '@/components/layout/container'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { LinkButton } from '@/components/ui/link-button'
import { Text } from '@/components/ui/text'
import { publicAnchors, publicRoutes } from '@/content/public-routes'

export default function NotFound() {
  return (
    <Container className="py-16 sm:py-24" size="narrow">
      <Card className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-primary">Pagina niet gevonden</p>
        <Heading as="h1" className="mt-3 text-brand-dark" size="h1">
          Deze pagina kunnen we niet vinden
        </Heading>
        <Text className="mx-auto mt-5 max-w-2xl text-text-secondary" size="lg">
          De link is mogelijk verouderd of het adres is niet juist. Ga terug naar de homepage of begin bij uw vraag.
        </Text>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
          <LinkButton href={publicRoutes.home}>Naar de homepage</LinkButton>
          <LinkButton href={publicAnchors.askQuestion} variant="secondary">Stel uw vraag</LinkButton>
          <LinkButton href={publicRoutes.knowledge} variant="secondary">Bekijk het kenniscentrum</LinkButton>
          <LinkButton href={publicRoutes.services} variant="secondary">Bekijk diensten</LinkButton>
        </div>
      </Card>
    </Container>
  )
}
