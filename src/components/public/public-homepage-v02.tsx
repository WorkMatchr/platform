import type { ReactNode } from 'react'
import { Heading } from '@/components/ui/heading'
import { LinkButton } from '@/components/ui/link-button'
import Link from '@/components/ui/navigation-link'
import { publicHomepageContent } from '@/content/public-homepage'
import { knowledgeOverview, legalOverview, type PublicOverviewItem } from '@/content/public-overviews'
import { services } from '@/content/services'
import { publicLearning } from '@/content/public-learning'
import { publicRoutes } from '@/content/public-routes'

const selectedRoutes = [publicRoutes.rieService, publicRoutes.safetyExpertService, publicRoutes.occupationalHygienistService, publicRoutes.ergonomistService, publicRoutes.occupationalPhysicianService, publicRoutes.incidentInvestigationService]
const featuredServices = selectedRoutes.flatMap(href => services.filter(service => service.href === href))
const benefits = [
  ['Gerichter zoeken', 'Uw hulpvraag en benodigde deskundigheid worden eerst concreet gemaakt voordat u een opdracht publiceert.'],
  ['Passende opdrachtnemers', 'Uw opdracht wordt gekoppeld aan professionals en organisaties die aansluiten op de gevraagde expertise.'],
  ['Offertes vergelijken', 'Reacties, voorwaarden en voorstellen staan overzichtelijk bij dezelfde opdracht.'],
  ['U houdt zelf de regie', 'WorkMatchr faciliteert het proces. U bepaalt met welke opdrachtnemer u verdergaat.'],
]
function Band({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  return <section id={id} className={`py-12 sm:py-16 ${className}`}><div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-10">{children}</div></section>
}
function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="mb-4 text-sm font-bold tracking-widest text-brand-primary-hover">{children}</p>
}
function ReadingLinks({ items }: { items: readonly PublicOverviewItem[] }) {
  return <ul className="mt-8 grid gap-6 md:grid-cols-3">{items.slice(0, 3).map(item => <li key={item.href} className="min-w-0 border-t border-border pt-5"><Heading as="h3" size="h3"><Link href={item.href!} className="rounded-control hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary">{item.title}</Link></Heading><p className="mt-3 text-sm leading-6 text-text-secondary">{item.description}</p></li>)}</ul>
}
export function PublicHomepageV02() {
  return <>
    <Band className="bg-brand-primary-subtle">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div className="min-w-0">
          <Eyebrow>ARBO- EN VEILIGHEIDSONDERSTEUNING</Eyebrow>
          <Heading as="h1" size="display" className="text-brand-dark">Vind de juiste deskundige voor uw vraag</Heading>
          <p className="mt-6 max-w-xl text-lg leading-8 text-text-secondary">Beschrijf wat er speelt. WorkMatchr helpt u uw hulpvraag concreet te maken, een opdracht te publiceren en passende opdrachtnemers te vergelijken.</p>
          <div className="mt-8 flex flex-wrap items-center gap-4"><LinkButton href="/advieswijzer">Vraag ondersteuning aan</LinkButton><LinkButton href="#advieswijzer" variant="ghost">Ontdek eerst wat u nodig heeft</LinkButton></div>
          <p className="mt-6 text-sm leading-6 text-text-secondary">Onafhankelijk · Transparant · U kiest zelf de opdrachtnemer</p>
        </div>
        <figure className="min-w-0 overflow-hidden rounded-card bg-surface shadow-xl">
          <figcaption className="bg-brand-dark px-6 py-4 text-sm font-bold text-text-on-dark">WorkMatchr / Vraag ondersteuning aan</figcaption>
          <div className="p-6 sm:p-8">
            <p className="text-sm font-semibold text-brand-primary-hover">Begin met uw hulpvraag</p>
            <p className="mt-4 text-xl font-bold leading-snug text-brand-dark">Weet u welke deskundigheid u nodig heeft?</p>
            <div className="mt-6 space-y-3">
              <Link href="/advieswijzer?start=deskundigheid" className="block rounded-control border border-border bg-brand-primary-subtle p-4 hover:border-brand-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary">
                <span className="block font-semibold text-brand-dark">Ja, ik kies een deskundigheid</span>
                <span className="mt-1 block text-sm leading-6 text-text-secondary">Ik weet welke expertise ik zoek.</span>
              </Link>
              <Link href="/advieswijzer?start=onderwerp" className="block rounded-control border border-border bg-surface-subtle p-4 hover:border-brand-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary">
                <span className="block font-semibold text-brand-dark">Nee, help mij mijn vraag bepalen</span>
                <span className="mt-1 block text-sm leading-6 text-text-secondary">WorkMatchr helpt mij eerst bepalen wat passend is.</span>
              </Link>
            </div>
            <p className="mt-5 text-sm leading-6 text-text-secondary">U hoeft nog niet precies te weten welke expertise u nodig heeft.</p>
          </div>
        </figure>
      </div>
    </Band>
    <Band>
      <Eyebrow>ZO WERKT WORKMATCHR</Eyebrow><Heading>Van hulpvraag naar opdrachtnemer</Heading>
      <ol className="mt-8 grid gap-8 lg:grid-cols-4 lg:gap-6">{publicHomepageContent.steps.map((step, index) => <li key={step.title} className="relative min-w-0">
        {index < 3 && <span aria-hidden="true" className="absolute left-14 top-5 hidden w-[calc(100%-2rem)] border-t border-border lg:block" />}
        <span className="inline-grid size-10 place-items-center rounded-full bg-brand-primary-subtle font-bold text-brand-primary-hover" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
        <Heading as="h3" size="h3" className="mt-4">{step.title}</Heading><p className="mt-3 leading-7 text-text-secondary">{step.description}</p>
        {index === 1 && <p className="mt-4 text-sm leading-6 text-text-secondary"><span className="font-semibold">Optioneel</span> — Selecteer externe ondersteuners die u voor de opdracht wilt uitnodigen.</p>}
      </li>)}</ol><div className="mt-8"><LinkButton href="/advieswijzer">Vraag ondersteuning aan</LinkButton></div>
    </Band>
    <Band className="bg-surface-subtle">
      <Eyebrow>WAARMEE KUNNEN WIJ U HELPEN?</Eyebrow><Heading className="max-w-3xl">Deskundigheid voor verschillende Arbo- en veiligheidsvragen</Heading>
      <ul className="mt-8 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">{featuredServices.map(service => <li key={service.href} className="border-b border-border"><Link href={service.href} className="flex min-h-20 items-center justify-between gap-4 py-5 font-semibold text-brand-dark hover:text-brand-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary">{service.title}<span aria-hidden="true">→</span></Link></li>)}</ul>
      <div className="mt-8"><LinkButton href="/diensten" variant="outline">Bekijk alle deskundigheden</LinkButton></div>
    </Band>
    <Band><Heading>Waarom organisaties WorkMatchr gebruiken</Heading><div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">{benefits.map(([title, text]) => <div key={title}><span aria-hidden="true" className="font-bold text-brand-primary-hover">✓</span><Heading as="h3" size="h3" className="mt-3">{title}</Heading><p className="mt-3 leading-7 text-text-secondary">{text}</p></div>)}</div></Band>
    <Band id="advieswijzer" className="scroll-mt-24 bg-brand-dark text-text-on-dark"><div className="grid items-center gap-10 lg:grid-cols-[1.4fr_1fr]"><div><Heading>Eerst begrijpen. Dan de juiste expertise.</Heading><p className="mt-5 max-w-2xl text-lg leading-8">Niet iedere arbovraag vraagt direct om een externe deskundige. Met de Advieswijzer helpt WorkMatchr u eerst bepalen wat er speelt en welke vervolgstap passend kan zijn.</p><div className="mt-6"><LinkButton href="/advieswijzer" variant="outline">Start de Advieswijzer</LinkButton></div></div><div className="rounded-card bg-surface p-6 text-text-primary"><p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Voorbeeld van de Advieswijzer</p><p className="mt-4 text-xl font-bold">Weet u welke deskundigheid u nodig heeft?</p><ul className="mt-5 space-y-3 text-sm"><li><Link href="/advieswijzer?start=deskundigheid" className="block border-l-4 border-brand-primary bg-surface-subtle p-3 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary">Ja, ik kies een deskundigheid</Link></li><li><Link href="/advieswijzer?start=onderwerp" className="block border-l-4 border-border bg-surface-subtle p-3 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary">Nee, ik kies eerst een onderwerp</Link></li></ul><p className="mt-4 text-xs text-text-secondary">Illustratie — start de Advieswijzer om uw vraag in te vullen.</p></div></div></Band>
    <Band><Eyebrow>WETTELIJKE VERPLICHTINGEN</Eyebrow><Heading>Wat moet uw organisatie regelen?</Heading><ReadingLinks items={legalOverview} /><div className="mt-8"><LinkButton href="/wettelijke-verplichtingen" variant="outline">Bekijk alle wettelijke verplichtingen</LinkButton></div></Band>
    <Band className="bg-surface-subtle"><Eyebrow>KENNISCENTRUM</Eyebrow><Heading>Inzicht voor uw volgende stap</Heading><ReadingLinks items={knowledgeOverview} /><div className="mt-8"><LinkButton href="/kenniscentrum" variant="outline">Naar het kenniscentrum</LinkButton></div></Band>
    <Band id="opleidingen" className="bg-surface-subtle"><Eyebrow>WORKMATCHR-OPLEIDINGEN</Eyebrow><Heading>Praktische Arbo-opleidingen</Heading><div className="mt-6 max-w-3xl"><p className="font-semibold text-brand-primary-hover">{publicLearning.status}</p><Heading as="h3" size="h3" className="mt-3">{publicLearning.title}</Heading><p className="mt-3 leading-7 text-text-secondary">Leer risico’s herkennen en vertalen naar praktische maatregelen. Online, in uw eigen tempo, met oefeningen, een eindtoets en een certificaat van afronding.</p><div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap"><LinkButton href="/e-learning" variant="outline">Bekijk WorkMatchr-opleidingen</LinkButton><LinkButton href={publicLearning.href}>Bekijk RI&E in de praktijk</LinkButton></div></div></Band>
    <Band className="bg-brand-dark text-text-on-dark"><div className="max-w-3xl"><Heading>Uw volgende arbovraag begint hier</Heading><p className="mt-5 text-lg leading-8">Beschrijf uw situatie of kies direct de deskundigheid die u zoekt. WorkMatchr helpt u van hulpvraag naar een concrete opdracht.</p><div className="mt-8 flex flex-wrap gap-4"><LinkButton href="/advieswijzer" variant="outline">Vraag ondersteuning aan</LinkButton><Link href="/advieswijzer" className="inline-flex min-h-11 items-center rounded-control px-3 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current">Ik weet nog niet wat ik nodig heb</Link></div></div></Band>
  </>
}
