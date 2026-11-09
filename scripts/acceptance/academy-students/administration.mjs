import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { hashPassword } from 'better-auth/crypto'

async function createTestAdministrator(db, password) {
  const id = randomUUID()
  const email = id + '@example.invalid'
  const org = await db.query('SELECT id FROM "Organization" WHERE "systemKey"=$1', ['WORKMATCHR_PLATFORM'])
  assert.equal(org.rowCount, 1)
  await db.query(`INSERT INTO "User"(id,email,"platformRole","emailVerified",status,"accountType","updatedAt")
    VALUES ($1,$2,'ADMIN',true,'ACTIVE','CLIENT',now())`, [id,email])
  await db.query(`INSERT INTO "Account"("userId","providerId","accountId",password,"updatedAt")
    VALUES ($1,'credential',$3,$2,now())`, [id,await hashPassword(password),id])
  await db.query(`INSERT INTO "OrganizationMembership"("organizationId","userId",role,status,"updatedAt")
    VALUES ($1,$2,'OWNER','ACTIVE',now())`, [org.rows[0].id,id])
  return { id,email }
}

async function fillFields(form, fields) {
  for (const [label,value] of Object.entries(fields)) {
    await form.getByLabel(label,{exact:true}).fill(value)
  }
}

async function fillQuestion(group) {
  await fillFields(group,{
    Vraag:'Welke optie is juist?', Toelichting:'De eerste optie is juist.',
    'Antwoord 1':'Eerste optie','Antwoord 2':'Tweede optie'
  })
}

export async function checkAcademyAdministration({ db,open,login,pw,root }) {
  const page = await open()
  try {
    const admin = await createTestAdministrator(db,pw)
    await login(page,admin)
    const catalog = '/platformbeheer/academy/cursussen'
    async function editDraft() {
      await page.goto(catalog)
      await page.waitForLoadState('networkidle')
      const save = page.getByRole('button',{name:'Concept opslaan',exact:true})
      const form = page.locator('form').filter({has:save})
      await fillFields(form,{
        'Cursuscode (WL-nummer)':'WL-988',Adresnaam:'synthetische-cursus-988',
        Titel:'Synthetische cursus',Omschrijving:'Tijdelijke acceptatiecursus.',
        Categorie:'Oefening',Niveau:'Basis',Hoofdstuktitel:'Proefhoofdstuk',
        Lestitel:'Proefles',Lesinhoud:'Lees de synthetische toelichting.'
      })
      await fillQuestion(form.getByRole('group',{name:'Hoofdstukcheck',exact:true}))
      await fillQuestion(form.getByRole('group',{name:'Examenvraag 1',exact:true}))
      await save.click()
      await page.waitForURL(url=>url.pathname.startsWith(catalog+'/'))
      await page.waitForLoadState('networkidle')
      const draftId = new URL(page.url()).pathname.split('/').at(-1)
      await form.getByRole('button',{name:'Hoofdstuk toevoegen'}).click()
      const chapter = form.locator('section').filter({has:page.getByRole('heading',{name:'Hoofdstuk 2',exact:true})})
      await fillFields(chapter,{Hoofdstuktitel:'Tweede hoofdstuk',Lestitel:'Tweede les',Lesinhoud:'Tweede lesinhoud.'})
      await fillQuestion(chapter.getByRole('group',{name:'Hoofdstukcheck',exact:true}))
      await form.getByRole('button',{name:'Examenvraag toevoegen'}).click()
      const exam = form.getByRole('group',{name:'Examenvraag 2',exact:true})
      await fillQuestion(exam)
      console.log('PASS tweede hoofdstuk en vraag ingevoerd')
      await Promise.all([page.waitForResponse(response=>response.request().method()==='POST' && response.request().headers()['next-action']),save.click()])
      await page.getByText('Cursusconcept opgeslagen.',{exact:true}).waitFor()
      const stored = await db.query(`SELECT v."sourceMetadata"->'authoring'->'content' AS content FROM "LearningCourseVersion" v WHERE id=$1`,[draftId])
      assert.equal(stored.rows[0].content.questions.length,2,'Opgeslagen aantal eindvragen')
      assert.equal(stored.rows[0].content.chapters.length,2,'Opgeslagen aantal hoofdstukken')
      await page.goto(catalog+'/'+draftId,{waitUntil:'networkidle'})
      assert.equal(await form.getByRole('group',{name:'Examenvraag 2',exact:true}).count(),1,'Heropende toetsvraag 2')

      await exam.getByRole('textbox',{name:/^Vraag/}).fill('Welke handeling is juist?')
      await chapter.getByRole('textbox',{name:/^Lesinhoud/}).fill('Gewijzigde lesinhoud.')
      await Promise.all([page.waitForResponse(response=>response.request().method()==='POST' && response.request().headers()['next-action']),save.click()])
      await page.getByText('Cursusconcept opgeslagen.',{exact:true}).waitFor()
      await page.reload({waitUntil:'networkidle'})
      assert.equal(await exam.getByRole('textbox',{name:/^Vraag/}).inputValue(),'Welke handeling is juist?')
      assert.equal(await chapter.getByRole('textbox',{name:/^Lesinhoud/}).inputValue(),'Gewijzigde lesinhoud.')
      const audit = await db.query('SELECT id FROM "MarketplaceAuditEvent" WHERE "actorUserId"=$1 AND "entityId"=$2 AND action=$3',[admin.id,draftId,'ACADEMY_DRAFT_SAVED'])
      assert.equal(audit.rowCount,3)
      console.log('PASS cursus, extra hoofdstuk, les- en toetsbewerking, heropenen en drie auditregels')

    }
    async function readResults() {
      const historical = await db.query(`SELECT c."certificateNumber",e."courseVersionId" FROM "LearningCertificate" c
        JOIN "LearningEnrollment" e ON c."enrollmentId"=e.id WHERE c."courseVersion"='prototype-0.17' LIMIT 1`)
      const cert = historical.rows[0]
      assert.ok(cert)
      await page.goto(catalog+'/'+cert.courseVersionId)
      await page.getByText('Voortgang per hoofdstuk',{exact:true}).first().click()
      const chapters = await page.locator('details[open] li').allTextContents()
      assert.equal(chapters.length,10)
      assert.ok(chapters.every(line=>line.includes('100%')))
      await page.getByText(/40\/50 · Geslaagd/).first().waitFor()
      await page.getByRole('link',{name:/Controleer certificaat/}).first().click()
      await page.getByRole('heading',{name:'Geldig certificaat'}).waitFor()
      await page.goto(catalog)
      await page.getByRole('link',{name:'Uitgegeven certificaten'}).click()
      await page.locator('article').filter({hasText:cert.certificateNumber}).getByRole('heading').getByRole('link').click()
      await page.getByRole('heading',{name:'Certificaatdetails'}).waitFor()
      const href = await page.getByRole('link',{name:'Download certificaat'}).getAttribute('href')
      const pdf = await page.evaluate(async href => {
        const response = await fetch(href)
        return [response.status,response.headers.get('content-type'),new TextDecoder().decode((await response.arrayBuffer()).slice(0,5))]
      },href)
      assert.deepEqual(pdf,[200,'application/pdf','%PDF-'])
      await page.goto(catalog)
      await page.getByRole('link',{name:'Certificaatsjablonen beheren'}).click()
      await page.getByRole('heading',{level:1}).waitFor()
      console.log('PASS deelnemer, toetsresultaat, historische verificatie, beheer-PDF en ontwerper')
    }
    async function importRevision() {
      const published = await db.query('SELECT id FROM "LearningCourseVersion" WHERE version=$1 AND status=$2',['1.2','PUBLISHED'])
      assert.equal(published.rowCount,1)
      await page.goto(catalog+'/'+published.rows[0].id)
      await page.getByLabel('Nieuwe conceptversie',{exact:true}).fill('1.2-night')
      await page.getByRole('button',{name:'Nieuwe conceptversie voorbereiden'}).click()
      await page.getByText(/Nieuwe conceptversie voorbereid\./).waitFor()
      const download = page.waitForEvent('download')
      await page.getByRole('button',{name:'Cursus exporteren'}).click()
      const bundle = join(root,'synthetic-draft.json')
      await (await download).saveAs(bundle)
      await page.goto(catalog)
      await page.waitForLoadState('networkidle')
      await page.getByLabel('Cursusbestand').setInputFiles(bundle)
      const importer = page.locator('section').filter({has:page.getByRole('heading',{name:'Bestaande cursus importeren'})})
      const importButton = importer.getByRole('button',{name:'Conceptversie opslaan'})
      const importError = importer.locator('p[role=alert]')
      await importButton.or(importError).first().waitFor({timeout:30000})
      if (await importError.isVisible()) throw Error(await importError.innerText())
      await importButton.click()
      await page.waitForURL(url=>url.pathname.startsWith(catalog+'/'))
      await page.getByRole('button',{name:'Nieuwe conceptversie voorbereiden'}).waitFor()
      console.log('PASS afgeleide conceptbundel via beheer geïmporteerd')

    }
    const failures = []
    for (const scenario of [editDraft,readResults,importRevision]) {
      try { await scenario() } catch (error) {
        const feedback = await page.locator('p[role=status], p[role=alert]').allTextContents()
        console.log('FAIL',scenario.name,String(error.message).slice(0,500),feedback.join(' ').slice(0,240))
        failures.push(scenario.name)
      }
    }
    assert.deepEqual(failures,[])
  } finally {
    await page.context().close()
  }
}
