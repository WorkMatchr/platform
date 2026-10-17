import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/layout/container'
import { PublicPageLayout } from '@/components/public/public-page-layout'
import { legalIdentityDraft, privacyMailbox } from '@/config/legal-identity'
import { legalDraft, privacyProcessing } from '@/content/public-legal'
import { publicRoutes } from '@/content/public-routes'

export const metadata: Metadata = {
  title: 'Privacyverklaring — concept | WorkMatchr',
  description: 'Conceptinformatie over persoonsgegevens, doeleinden, bewaartermijnen en privacyrechten bij WorkMatchr.',
  alternates: { canonical: publicRoutes.privacy },
  openGraph: { title: 'Privacyverklaring — concept | WorkMatchr', description: 'Conceptinformatie over persoonsgegevens en privacyrechten bij WorkMatchr.', url: publicRoutes.privacy },
  robots: { index: false, follow: true },
}
const linkStyle = 'rounded-control underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary'
export default function PrivacyPage() {
  return <PublicPageLayout breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Privacy' }]} eyebrow="Privacy" title="Privacyverklaring — concept" description="Hoe WorkMatchr met persoonsgegevens omgaat en welke keuzes nog moeten worden vastgesteld." compactHero>
    <Container className="py-8 sm:py-12">
      <article className="mx-auto max-w-3xl space-y-8 break-words text-text-secondary leading-relaxed">
        <section className="rounded-card border border-border bg-surface-subtle p-5" aria-labelledby="draft-status">
          <h2 id="draft-status" className="text-xl font-bold text-brand-dark">Concept — nog niet vastgesteld</h2>
          <p className="mt-3">Versie {legalDraft.version}, beoordeeld op <time dateTime={legalDraft.reviewedOn}>{legalDraft.reviewedOnLabel}</time>. Dit is een voorstel voor beoordeling door de Product Owner. Rechtsgronden, overige bewaartermijnen, leveranciersafspraken en bedrijfsgegevens zijn nog niet definitief vastgesteld. Het hieronder genoemde bewaarbeleid voor ontvangen algemene e-mailberichten is wel door de Product Owner vastgesteld. Deze tekst is nog niet de definitieve juridische publicatie.</p>
        </section>
        <section aria-labelledby="controller"><h2 id="controller" className="text-2xl font-bold text-brand-dark">Wie is verantwoordelijk?</h2>
          <p className="mt-3">Voorlopig opgegeven, nog te bevestigen: {legalIdentityDraft.legalName}, handelend onder de naam {legalIdentityDraft.tradeName}, KvK {legalIdentityDraft.chamberOfCommerceNumber}. Huidig correspondentieadres: {legalIdentityDraft.correspondenceAddress}.</p>
          <p className="mt-3 font-semibold text-brand-dark">{legalIdentityDraft.releaseRequirement}</p>
          <p className="mt-3">Officieel e-mailadres voor privacyverzoeken: <a className={linkStyle} href={`mailto:${legalIdentityDraft.privacyEmail}`}>{legalIdentityDraft.privacyEmail}</a>. WorkMatchr bepaalt de verwerking voor de eigen platformdienst. De rolverdeling bij gegevens die organisaties en professionals zelf aanleveren moet per dienst nog worden vastgelegd; zij kunnen ook eigen verantwoordelijkheden hebben.</p>
        </section>
        <section aria-labelledby="processing"><h2 id="processing" className="text-2xl font-bold text-brand-dark">Welke gegevens gebruiken wij en waarom?</h2>
          <div className="mt-5 space-y-6">{privacyProcessing.map(item => <section key={item.title}><h3 className="text-lg font-semibold text-brand-dark">{item.title}</h3><p className="mt-2">{item.text}</p></section>)}</div>
        </section>
        <section aria-labelledby="recipients"><h2 id="recipients" className="text-2xl font-bold text-brand-dark">Met wie delen wij persoonsgegevens?</h2>
          <p className="mt-3">WorkMatchr deelt persoonsgegevens uitsluitend wanneer dit noodzakelijk is voor de uitvoering van onze dienstverlening, het verwerken van betalingen, het voldoen aan wettelijke verplichtingen of het veilig beheren van het platform.</p>
          <p className="mt-3">Hiervoor maken wij gebruik van externe dienstverleners, waaronder aanbieders van hosting, databaseopslag, e-maildiensten, betalingsverwerking en boekhoudsoftware.</p>
          <p className="mt-3">Afhankelijk van de betreffende verwerking kunnen persoonsgegevens worden verwerkt door Vercel (hosting), Neon (databaseopslag), Resend (uitgaande applicatiemails), Vimexx (e-mailforwarding en ontvangende mailbox), Mollie (betalingen) en Jortt (boekhouding).</p>
          <p className="mt-3">Mail aan {legalIdentityDraft.privacyEmail} wordt via een automatische forwarder van {privacyMailbox.forwardingProvider} doorgestuurd naar {privacyMailbox.destination}, een mailbox bij {privacyMailbox.mailboxProvider}. De Product Owner heeft deze route bevestigd; de mailboxinstellingen zijn niet onafhankelijk technisch geverifieerd. Of de forwarder aanvullende kopieën of logs bewaart en hoe lang, moet nog worden vastgesteld.</p>
          <p className="mt-3">Niet iedere dienstverlener ontvangt dezelfde gegevens. Waar vereist moeten afspraken over de bescherming en verwerking van persoonsgegevens zijn vastgelegd. Vóór definitieve publicatie moet nog worden aangetoond dat deze afspraken voor WorkMatchr bestaan en passend zijn; ontbrekende afspraken moeten eerst worden ingevuld.</p>
          <p className="mt-3">Voor eigen betaal- en wettelijke doeleinden treedt Mollie op als zelfstandige verwerkingsverantwoordelijke. De daadwerkelijk geldende contracten, regio’s, subverwerkers en bewaartermijnen moeten nog worden bevestigd. Better Auth is de authenticatiebibliotheek binnen WorkMatchr, geen afzonderlijke externe inlogdienst.</p>
          <p className="mt-3">Bij het instellen of wijzigen van een wachtwoord controleert Have I Been Pwned of het voorkomt in bekende datalekken. De server verstuurt daarvoor alleen de eerste vijf tekens van een wachtwoordhash; niet uw volledige wachtwoord, volledige hash of e-mailadres.</p>
          <p className="mt-3">Verwerking buiten de Europese Economische Ruimte kan voorkomen. Resend beschrijft bijvoorbeeld opslag in de Verenigde Staten, ook bij verzending vanuit een Europese regio. Welke passende waarborgen daadwerkelijk voor WorkMatchr gelden, zoals standaardcontractbepalingen of een toepasselijk adequaatheidsbesluit, moet vóór vaststelling worden gecontroleerd. Een Europese serverlocatie alleen sluit internationale doorgifte niet uit.</p>
        </section>
        <section aria-labelledby="retention"><h2 id="retention" className="text-2xl font-bold text-brand-dark">Hoe lang bewaren wij gegevens?</h2>
          <p className="mt-3">Uitgangspunt van dit voorstel: niet langer dan noodzakelijk voor het doel, wettelijke verplichtingen of het behandelen van een concreet geschil. Voor accounts, opdrachten, offertes, berichten, scanresultaten en auditgegevens moeten bewaartermijnen, startmomenten en verwijderprocedures nog worden vastgesteld en getest. Accountblokkering is niet hetzelfde als verwijdering.</p>
          <section className="mt-5" aria-labelledby="contact-retention">
            <h3 id="contact-retention" className="text-lg font-semibold text-brand-dark">Hoe lang bewaren wij contactberichten?</h3>
            <p className="mt-3">WorkMatchr bewaart ontvangen algemene e-mailberichten maximaal één jaar na de datum van ontvangst.</p>
            <p className="mt-3">Berichten die betrekking hebben op een lopende zaak, klacht, geschil of andere noodzakelijke behandeling kunnen langer worden bewaard zolang daarvoor een gerechtvaardigde reden bestaat.</p>
            <p className="mt-3">Na afronding van de zaak wordt opnieuw beoordeeld of verdere bewaring noodzakelijk is. Berichten die niet langer nodig zijn, worden verwijderd.</p>
            <p className="mt-3">De eigenaar van WorkMatchr is verantwoordelijk voor de handmatige controle en verwijdering van deze berichten.</p>
            <p className="mt-3">Dit beleid geldt voor zowel de inbox als het archief. De technische verwijdering uit de prullenbak en back-ups is afhankelijk van de instellingen en bewaartermijnen van de e-mailprovider.</p>
            <p className="mt-3">De Product Owner heeft dit bewaarbeleid definitief vastgesteld op 15 oktober 2026. De privacyverklaring als geheel blijft concept; de uitvoering is nog niet aantoonbaar ingevoerd. De exacte prullenbak- en back-upretentie bij Vimexx staat nog open totdat deze is geverifieerd. Toegang is uitsluitend bedoeld voor geautoriseerde WorkMatchr-beheerders; de uitvoering van dit toegangsbeleid en MFA moet nog worden gecontroleerd.</p>
          </section>
          <p className="mt-3">Fiscale basisgegevens moeten in beginsel zeven jaar worden bewaard. De precieze indeling en eventuele uitzonderingen moeten met de administratie worden vastgesteld. Deze termijn geldt niet automatisch voor alle platformgegevens. Cookies en browseropslag hebben hun eigen termijnen in de <Link className={linkStyle} href={publicRoutes.cookies}>cookieverklaring</Link>.</p>
        </section>
        <section aria-labelledby="rights"><h2 id="rights" className="text-2xl font-bold text-brand-dark">Uw rechten en vragen</h2>
          <p className="mt-3">U kunt vragen om inzage, correctie, verwijdering of beperking van uw gegevens en, waar van toepassing, overdracht van gegevens. U kunt bezwaar maken tegen verwerking op basis van gerechtvaardigd belang. Als een verwerking op toestemming berust, kunt u die toestemming intrekken; eerdere rechtmatige verwerking blijft daarmee geldig.</p>
          <p className="mt-3">Voor privacyverzoeken kunt u het hierboven genoemde officiële contactadres gebruiken. Stuur niet standaard een kopie van uw identiteitsbewijs mee. Identiteitscontrole moet passend en zo beperkt mogelijk zijn. De AVG verlangt in beginsel binnen één maand een reactie; bij een toegestane verlenging moet u binnen die maand worden geïnformeerd. De interne afhandeling moet nog worden ingericht en bevestigd.</p>
          <p className="mt-3">U kunt een klacht indienen bij de <a className={linkStyle} href="https://autoriteitpersoonsgegevens.nl/een-tip-of-klacht-indienen-bij-de-ap">Autoriteit Persoonsgegevens</a>.</p>
        </section>
        <section aria-labelledby="security"><h2 id="security" className="text-2xl font-bold text-brand-dark">Beveiliging en bijzondere gegevens</h2>
          <p className="mt-3">De applicatie gebruikt wachtwoordhashing, sessiecontrole, server-side rol- en organisatiecontroles en afgeschermde gegevensroutes. Deze maatregelen zijn geen garantie dat incidenten onmogelijk zijn. De uitvoering van beheerprocedures, back-ups en toegangscontroles bij leveranciers moet afzonderlijk worden geverifieerd.</p>
          <p className="mt-3">Vul geen medische dossiers, gezondheidsgegevens, BSN of andere onnodige gevoelige persoonsgegevens in opdrachtteksten, scanantwoorden of contactberichten in. WorkMatchr is hiervoor niet bedoeld. De huidige opdrachtflow laat u zelf deskundigheid of onderwerp kiezen. Automatische matching en scanuitkomsten ondersteunen de dienstverlening; de gevolgen, transparantie en eventuele beoordeling onder artikel 22 AVG moeten nog worden vastgelegd. Oudere AI-integraties zijn niet zonder aanvullende controle als actuele verwerking aangemerkt.</p>
        </section>
        <section aria-labelledby="sources"><h2 id="sources" className="text-2xl font-bold text-brand-dark">Bronnen en actualisatie</h2><ul className="mt-3 list-disc space-y-2 pl-5">
          <li><a className={linkStyle} href="https://eur-lex.europa.eu/eli/reg/2016/679/oj">Algemene verordening gegevensbescherming</a></li>
          <li><a className={linkStyle} href="https://autoriteitpersoonsgegevens.nl/nl/zelf-doen/privacyrechten/recht-op-informatie">Autoriteit Persoonsgegevens: recht op informatie</a></li>
          <li><a className={linkStyle} href="https://www.rijksoverheid.nl/themas/werk/inkomstenbelasting/vraag-en-antwoord/inkomstenbelasting/hoe-lang-moet-ik-mijn-financiele-administratie-bewaren">Rijksoverheid: fiscale bewaarplicht</a></li>
        </ul><p className="mt-3">Na vaststelling en bij relevante wijzigingen worden versie, datum en inhoud bijgewerkt.</p></section>
      </article>
    </Container>
  </PublicPageLayout>
}
