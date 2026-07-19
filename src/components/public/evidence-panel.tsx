import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'

export function EvidencePanel() {
  return <Card variant="subtle" className="shadow-none"><Heading as="h2" size="h3">Belangrijk bij deze uitleg</Heading><Text className="mt-3">Deze informatie is algemeen en gebaseerd op de hieronder genoemde officiële bronnen. Uw werkzaamheden, arbeidsrelaties en branche kunnen van invloed zijn. Laat uw concrete situatie beoordelen als u zekerheid nodig heeft.</Text></Card>
}
