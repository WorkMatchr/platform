import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { hashPassword } from 'better-auth/crypto'

export async function createTestAdministrator(db, password) {
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

export async function checkAcademyAdministration({ db,open,login,pw,root,register }) {
  const page = await open()
  try {
    if(process.argv.includes('--management')){
      await db.query('INSERT INTO "Organization"(name,"organizationType",status,"systemKey","updatedAt") VALUES ($1,$2,$3,$4,now())',
        ['Synthetisch platform','PLATFORM_OPERATOR','ACTIVE','WORKMATCHR_PLATFORM'])
    }
    const admin = await createTestAdministrator(db,pw)
    await login(page,admin)
    const catalog = '/platformbeheer/academy/cursussen'
    async function editDraft() {
      await page.goto('/platformbeheer')
      await page.getByRole('link',{name:'Academy · Cursussen en resultaten'}).click()
      await page.getByRole('link',{name:'Nieuwe opleiding',exact:true}).click()
      await page.waitForLoadState('networkidle')
      const save = page.getByRole('button',{name:'Concept opslaan',exact:true})
      const form = page.locator('form').filter({has:save})
      if(process.argv.includes('--management')){
        await fillFields(form,{'Cursuscode (WL-nummer)':'WL-004',Adresnaam:'synthetische-cursus-988',Titel:'Synthetische cursus'})
        await save.click()
        await page.waitForURL(url=>url.pathname.startsWith(catalog+'/'))
        await page.reload({waitUntil:'networkidle'})
        assert.equal(await form.getByLabel('Titel',{exact:true}).inputValue(),'Synthetische cursus')
      }
      await fillFields(form,{
        'Cursuscode (WL-nummer)':'WL-004',Adresnaam:'synthetische-cursus-988',
        Titel:'Synthetische cursus',Omschrijving:'Tijdelijke acceptatiecursus.',
        Categorie:'Oefening',Niveau:'Basis',Hoofdstuktitel:'Proefhoofdstuk',
        Lestitel:'Proefles',Lesinhoud:'Lees de synthetische toelichting.'
      })
      await fillFields(form,{'Uitgebreide omschrijving':'In deze oefening leert u een veilige werkplek te herkennen.','Doelgroep':'Synthetische deelnemers','Leerdoelen':'Herken de veilige keuze.','E-mailadres inhoudelijke beoordelaar':admin.email,'Reguliere consumentenprijs in euro':'25.00'})
      await form.getByRole('combobox',{name:/^Certificaatsjabloon/}).selectOption('STANDARD')
      await fillQuestion(form.getByRole('group',{name:'Hoofdstukcheck',exact:true}))
      await fillQuestion(form.getByRole('group',{name:'Examenvraag 1',exact:true}))
      await Promise.all([page.waitForResponse(r=>r.request().method()==='POST' && r.request().headers()['next-action']),save.click()])
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
      assert.equal(audit.rowCount,process.argv.includes('--management')?4:3)
      console.log('PASS cursus, extra hoofdstuk, les- en toetsbewerking, heropenen en',audit.rowCount,'auditregels')
      await page.getByRole('button',{name:'Preview bekijken'}).click()
      await page.getByRole('heading',{name:'Tweede les'}).waitFor()
      await page.screenshot({path:join(root,'WL004-voorvertoning.png')})
      await page.getByRole('button',{name:'Bewerken',exact:true}).click()
      await page.setViewportSize({width:820,height:1100})
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
      await page.getByRole('heading',{name:'Cursusgegevens en prijs'}).scrollIntoViewIfNeeded()
      await page.screenshot({path:join(root,'WL004-beheer-tablet.png')})
      await page.getByLabel('Nieuwe conceptversie',{exact:true}).fill('1.1')
      await page.getByRole('button',{name:'Versie kopiëren'}).click()
      await page.waitForURL(u=>u.pathname.startsWith(catalog+'/') && !u.pathname.endsWith(draftId))
      await page.getByLabel('Versie',{exact:true}).waitFor()
      assert.equal(await page.getByLabel('Versie',{exact:true}).inputValue(),'1.1')
      await page.goto(catalog+'/'+draftId,{waitUntil:'networkidle'})
      for(const [button,heading] of [['Review','Review'],['Goedgekeurd','Goedgekeurd'],['Vrijgeven in lokale proefomgeving','Gepubliceerd']]){
        await page.getByLabel('Onderbouwing van uw besluit').fill('Synthetische controle van deze cursusversie.')
        if(button==='Goedgekeurd') await page.getByLabel('Referentie juridische goedkeuring').fill('Synthetisch beoordelingsbewijs WL-004')
        await page.getByRole('button',{name:button,exact:true}).click()
        await page.getByRole('heading',{name:'Publicatie: '+heading,exact:true}).waitFor()
      }
      const studentPage=await open()
      try {
        const student=await register(studentPage)
        await login(studentPage,student)
        const course='/e-learnings/synthetische-cursus-988'
        for(let chapter=1;chapter<=2;chapter++){
          await studentPage.goto(course)
          if(chapter===1) await studentPage.getByRole('button',{name:'Start deze e-learning'}).click()
          else await studentPage.getByRole('link',{name:'Open hoofdstuk',exact:true}).last().click()
          await studentPage.waitForURL('**/leren/**')
          await studentPage.getByRole('button',{name:'Volgende',exact:true}).click()
          await studentPage.getByRole('radio').first().check()
          await studentPage.getByRole('button',{name:'Naar afronding',exact:true}).click()
          await studentPage.getByRole('button',{name:'Hoofdstuk afronden'}).click()
          await studentPage.getByRole('heading',{name:'Hoofdstuk '+chapter+' afgerond'}).waitFor()
        }
        await studentPage.goto(course+'/eindtoets')
        await studentPage.getByRole('button',{name:'Start eindtoets'}).click()
        await studentPage.getByRole('radio').first().check()
        await studentPage.getByRole('button',{name:'Volgende',exact:true}).click()
        await studentPage.getByRole('radio').first().check()
        await studentPage.getByRole('button',{name:'Toets inleveren'}).click()
        await studentPage.getByRole('button',{name:'Toch inleveren'}).click()
        await studentPage.getByRole('link',{name:'Naam invullen'}).click()
        await studentPage.locator('#firstName').fill('Test')
        await studentPage.locator('#lastName').fill('Cursist')
        await studentPage.getByRole('button',{name:'Naam opslaan'}).click()
        const [certificateDownload]=await Promise.all([studentPage.waitForEvent('download'),studentPage.getByRole('link',{name:'Certificaat downloaden'}).click()])
        assert.equal((await readFile(await certificateDownload.path())).subarray(0,5).toString(),'%PDF-')
        const publicLink=await db.query('SELECT "certificateNumber" FROM "LearningCertificate" WHERE "userId"=$1 AND "courseVersion"=$2',[student.id,'1.0'])
        assert.equal(publicLink.rowCount,1)
        const anonymous=await open()
        try {
          await anonymous.goto('/certificaat/'+publicLink.rows[0].certificateNumber)
          await anonymous.getByRole('heading',{name:'Geldig certificaat'}).waitFor()
          await anonymous.screenshot({path:join(root,'WL004-certificaat.png')})
        } finally {await anonymous.context().close()}
        await page.reload({waitUntil:'networkidle'})
        await page.getByText('Persoonlijke kortingscode voorbereiden',{exact:true}).click()
        await page.getByLabel('E-mailadres cursist',{exact:true}).fill(student.email)
        await page.getByLabel('Korting in procenten').fill('25')
        await page.getByLabel('Vervaldatum (00.00 UTC)').fill('2035-06-01')
        await Promise.all([page.waitForResponse(r=>r.request().method()==='POST' && r.request().headers()['next-action']),page.getByRole('button',{name:'Code voorbereiden'}).click()])
        await page.getByText(/Persoonlijke code voorbereid:/).waitFor()
        await page.getByText('Cursusrapport',{exact:true}).click()
        const exportLink=page.getByRole('link',{name:'Rapport downloaden (CSV)'})
        const exportUrl=await exportLink.getAttribute('href')
        const [download]=await Promise.all([page.waitForEvent('download'),exportLink.click()])
        assert.equal(download.suggestedFilename(),'cursusrapport.csv')
        const csv=await readFile(await download.path(),'utf8')
        const privateReport=await studentPage.evaluate(async url=>{
          const response=await fetch(url)
          return {status:response.status,path:new URL(response.url).pathname,type:response.headers.get('content-type')}
        },exportUrl)
        assert.ok([403,404].includes(privateReport.status) || privateReport.path==='/account','Cursist mag het beheerrapport niet exporteren')
        assert.ok(!privateReport.type?.includes('text/csv'))
        const coupon=await db.query('SELECT d.status,d."maximumUses",d."percentageBps" FROM "DiscountCode" d JOIN "LearningPilotAssignment" a ON d.id=a."discountCodeId" WHERE a."courseVersionId"=$1 AND a."userId"=$2',[draftId,student.id])
        assert.deepEqual(coupon.rows,[{status:'BLOCKED',maximumUses:1,percentageBps:2500}])
        assert.equal((await db.query('SELECT COUNT(*)::int AS count FROM "FinancialPurchase" WHERE "createdByUserId"=$1',[student.id])).rows[0].count,0)
        assert.match(csv,/Geslaagd;1/)
        await page.getByText('Persoonlijke kortingscode voorbereiden',{exact:true}).click()
        await page.getByRole('link',{name:'Rapport downloaden (CSV)'}).scrollIntoViewIfNeeded()
        await page.screenshot({path:join(root,'WL004-rapport.png')})
        console.log('PASS WL-004 prijs, sjabloon, voorvertoning, kopie, review, student en certificaat')
      } finally {await studentPage.context().close()}

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
      const published = await db.query('SELECT id FROM "LearningCourseVersion" WHERE version=$1 AND status=$2',[process.env.ACADEMY_TEST_ASSIGNED_PILOT==='1'?'1.2-r07':'1.2','PUBLISHED'])
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
    for (const scenario of (process.argv.includes('--management')?[editDraft]:[editDraft,readResults,importRevision])) {
      try { await scenario() } catch (error) {
        await page.screenshot({path:join(root,'WL004-'+scenario.name+'-fout.png')})
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
