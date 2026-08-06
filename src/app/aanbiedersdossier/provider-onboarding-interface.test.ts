import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const route = (path: string) => join(root, 'src', 'app', 'aanbiedersdossier', path, 'page.tsx')

describe('provider-onboardinginterface', () => {
  it('bevat de volledige Nederlandstalige routeboom', () => {
    const routes = [
      'bedrijfsgegevens', 'diensten-en-ervaring', 'diensten', 'sectorervaring', 'werkgebied',
      'professionals', 'professionals/nieuw', 'professionals/[professionalId]',
      'professionals/[professionalId]/kwalificaties', 'verzekeringen', 'bewijsstukken',
      'verklaringen', 'controleren',
    ]
    for (const path of routes) expect(existsSync(route(path)), path).toBe(true)
    expect(existsSync(route('beschikbaarheid'))).toBe(false)
  })

  it('houdt databasegebruik buiten pagina’s en Client Components', () => {
    const sources = [
      readFileSync(join(root, 'src', 'app', 'aanbiedersdossier', 'actions.ts'), 'utf8'),
      readFileSync(join(root, 'src', 'components', 'providers', 'provider-onboarding-forms.tsx'), 'utf8'),
    ]
    for (const source of sources) {
      expect(source).not.toContain('getPrisma(')
      expect(source).not.toContain("from '@/lib/prisma'")
    }
  })

  it('borgt tenantcontext, veilige foutmeldingen en fail-closed bewijsupload', () => {
    const actions = readFileSync(join(root, 'src', 'app', 'aanbiedersdossier', 'actions.ts'), 'utf8')
    const evidence = readFileSync(route('bewijsstukken'), 'utf8')
    expect(actions).toContain('requireProviderDossierContext')
    expect(actions).toContain('De wijziging kon niet veilig worden opgeslagen.')
    expect(evidence).toContain('Bewijsstukken uploaden is nog niet beschikbaar')
    expect(evidence).not.toContain('productie-fail-closed')
    expect(evidence).not.toContain('type="file"')
  })

  it('toont een zichtbare professionalactie en bewaakt mutaties in de service', () => {
    const professionals = readFileSync(route('professionals'), 'utf8')
    const professionalService = readFileSync(
      join(root, 'src', 'lib', 'providers', 'provider-professional-service.ts'),
      'utf8',
    )
    expect(professionals).toContain('<LinkButton href="/aanbiedersdossier/professionals/nieuw"')
    expect(professionals).toContain('Kwalificaties beheren')
    expect(professionals).toContain('/kwalificaties`')
    expect(professionals).not.toContain('bg-brand ')
    expect(professionals).toContain('Professional toevoegen is tijdelijk niet beschikbaar')
    expect(professionalService).toContain('requireProviderManager(transaction, userId, providerProfileId)')
    expect(professionalService).toContain("requireProviderSectionEditable(transaction, providerProfileId, 'PROFESSIONALS')")
    const providerContext = readFileSync(
      join(root, 'src', 'lib', 'providers', 'provider-onboarding-context.ts'),
      'utf8',
    )
    expect(providerContext).toContain('toegang=geen-aanbieder')
    expect(providerContext).toContain('toegang=providerprofiel-ontbreekt')
  })

  it('houdt kwalificatie-invoer eenvoudig, zelfverklaard en aan meerdere centrale diensten koppelbaar', () => {
    const forms = readFileSync(join(root, 'src', 'components', 'providers', 'provider-onboarding-forms.tsx'), 'utf8')
    const service = readFileSync(join(root, 'src', 'lib', 'providers', 'provider-professional-service.ts'), 'utf8')
    expect(forms).toContain('>Kwalificatie</label>')
    expect(forms).toContain('>Opleider of uitgevende instantie</label>')
    expect(forms).toContain('>Betreft dit een certificaat?</legend>')
    expect(forms).toContain('>Behaald op <span')
    expect(forms).toContain('>Geldig tot <span')
    expect(forms).toContain('door u opgegeven')
    expect(forms).toContain('name="capabilityIds"')
    expect(forms).toContain("form.values('capabilityIds')")
    expect(service).toContain("verificationLevel: 'SELF_DECLARED'")
    expect(service).toContain('new Set(input.capabilityIds)')
  })

  it('borgt het groepsoverzicht, de sectorervaringstitel, actieve hoofdgroep en inhoudshoogte van de actiekaart', () => {
    const overview = readFileSync(route('diensten-en-ervaring'), 'utf8')
    const services = readFileSync(route('diensten'), 'utf8')
    const sector = readFileSync(route('sectorervaring'), 'utf8')
    const layout = readFileSync(join(root, 'src', 'app', 'aanbiedersdossier', 'layout.tsx'), 'utf8')
    const openActions = readFileSync(
      join(root, 'src', 'components', 'providers', 'provider-open-actions.tsx'),
      'utf8',
    )
    expect(overview).toContain("href: '/aanbiedersdossier/diensten'")
    expect(overview).toContain("href: '/aanbiedersdossier/sectorervaring'")
    expect(services).toContain('title="Diensten en specialismen"')
    expect(services).toContain('groupLabel="Diensten en ervaring"')
    expect(sector).toContain('title="Sectorervaring"')
    expect(sector).toContain('groupLabel="Diensten en ervaring"')
    expect(layout).toContain("href: '/aanbiedersdossier/diensten-en-ervaring'")
    expect(layout).toContain("'/aanbiedersdossier/diensten-en-ervaring', '/aanbiedersdossier/diensten', '/aanbiedersdossier/sectorervaring'")
    expect(openActions).toContain('grid items-start gap-6')
  })

  it('toont het dienstformulier vóór een compacte responsive dienstenlijst zonder competentieveld', () => {
    const services = readFileSync(route('diensten'), 'utf8')
    const form = readFileSync(join(root, 'src', 'components', 'providers', 'provider-capability-form.tsx'), 'utf8')
    const actions = readFileSync(join(root, 'src', 'app', 'aanbiedersdossier', 'actions.ts'), 'utf8')
    expect(services).toContain('lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]')
    expect(services).toContain('grid min-w-0 items-start gap-6')
    expect(services).toContain('min-w-0')
    expect(services).toContain('sm:flex-row sm:items-center sm:justify-between')
    expect(services).toContain('shrink-0 sm:self-center')
    expect(services.indexOf('Dienst toevoegen')).toBeLessThan(services.indexOf('Uw diensten'))
    expect(form).toContain('name="serviceTermId"')
    expect(form).toContain('name="specialismTermId"')
    expect(form).toContain('name="deliveryModes"')
    expect(form).not.toMatch(/competencyTermId|Competentie|competencies/)
    expect(actions.slice(actions.indexOf('const capabilitySchema'), actions.indexOf('const sectorSchema'))).not.toContain('competencyTermId')
  })

  it('gebruikt uitsluitend de zichtbare term Dienstverlenersprofiel', () => {
    const sources = [
      readFileSync(join(root, 'src', 'components', 'layout', 'header-model.ts'), 'utf8'),
      readFileSync(join(root, 'src', 'components', 'providers', 'provider-breadcrumbs.tsx'), 'utf8'),
      readFileSync(join(root, 'src', 'components', 'providers', 'provider-dossier-navigation.tsx'), 'utf8'),
      readFileSync(join(root, 'src', 'app', 'aanbiedersdossier', 'layout.tsx'), 'utf8'),
      readFileSync(join(root, 'src', 'app', 'aanbiedersdossier', 'page.tsx'), 'utf8'),
      readFileSync(join(root, 'src', 'app', 'aanbiedersdossier', 'loading.tsx'), 'utf8'),
      readFileSync(join(root, 'src', 'app', 'aanbiedersdossier', 'error.tsx'), 'utf8'),
    ].join('\n')
    expect(sources).toContain('Dienstverlenersprofiel')
    expect(sources).toContain('Uw dienstverlenersprofiel')
    expect(sources).not.toMatch(/Aanbiedersdossier|Providerdossier|Mijn providerdossier|Mijn aanbiedersdossier/)
  })

  it('start geen querygroepen parallel binnen één providertransactie', () => {
    const serviceFiles = [
      'provider-assessment-service.ts',
      'provider-capability-service.ts',
      'provider-compliance-service.ts',
      'provider-dossier-service.ts',
      'provider-onboarding-query-service.ts',
      'provider-professional-service.ts',
      'provider-record-mutation-service.ts',
    ]
    for (const file of serviceFiles) {
      const source = readFileSync(join(root, 'src', 'lib', 'providers', file), 'utf8')
      expect(source, file).not.toContain('Promise.all')
    }
  })

  it('start op het dienstverlenersprofiel geen drie interactieve readtransacties parallel', () => {
    const page = readFileSync(route('profiel'), 'utf8')
    const editor = readFileSync(join(root, 'src', 'lib', 'providers', 'provider-decision-profile-service.ts'), 'utf8')
    const options = readFileSync(join(root, 'src', 'lib', 'providers', 'provider-onboarding-query-service.ts'), 'utf8')
    const editorRead = editor.slice(editor.indexOf('export async function getProviderProfileEditor'), editor.indexOf('export async function getAssignmentProviderDecisionProfile'))

    expect(editorRead).not.toContain('$transaction')
    expect(options).not.toContain('$transaction')
    expect(page.indexOf('await getProviderDossierDashboard')).toBeLessThan(page.indexOf('await Promise.all'))
    expect(page).toContain('lg:max-h-[calc(100vh-3rem)]')
    expect(page).toContain('lg:overflow-y-auto')
    expect(page).toContain('Lidmaatschappen')
    expect(page).toContain('Registraties')
  })

  it('beheert profielteksten op één plek en gebruikt begrijpelijke organisatierollen', () => {
    const profile = readFileSync(route('profiel'), 'utf8')
    const organization = readFileSync(route('bedrijfsgegevens'), 'utf8')
    const header = readFileSync(join(root, 'src', 'components', 'providers', 'provider-page-header.tsx'), 'utf8')

    expect(profile).toContain('Introductie, omschrijving en werkwijze')
    expect(organization).not.toContain('<ProviderProfileForm')
    expect(organization).toContain('Dienstverlenersprofiel openen')
    expect(header).not.toMatch(/OWNER|ADMIN|MEMBER/)
    expect(profile).toContain('eigenaar of beheerder')
  })

  it('laadt de controlepagina eenmaal en invalideert providerdata na een reviewstatuswijziging', () => {
    const controlPage = readFileSync(route('controleren'), 'utf8')
    const reviewActions = readFileSync(join(root, 'src', 'app', 'beheer', 'dossiers', 'actions.ts'), 'utf8')
    expect(controlPage).toContain('await getProviderDossierControlView(')
    expect(controlPage).not.toContain('Promise.all')
    expect(controlPage).not.toContain('getProviderDossierDashboard')
    expect(controlPage).toContain('profileVersion={control.profileVersion}')
    expect(reviewActions.match(/revalidatePath\('\/aanbiedersdossier', 'layout'\)/g)).toHaveLength(4)
  })

  it('gebruikt begrijpelijke verzekerings- en validatieteksten', () => {
    const actions = readFileSync(join(root, 'src', 'app', 'aanbiedersdossier', 'actions.ts'), 'utf8')
    const insurance = readFileSync(route('verzekeringen'), 'utf8')
    expect(actions).not.toContain('verzekeringsmetadata')
    expect(insurance).not.toContain('verzekeringsmetadata')
    expect(actions).toContain('Selecteer een geldige waarde.')
    expect(actions).toContain('De verzekeringsgegevens zijn opgeslagen')
  })
})
