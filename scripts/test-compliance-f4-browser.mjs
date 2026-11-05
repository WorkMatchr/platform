// Acceptance-only browser driver. Uses an installed Playwright; never provider transport.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const directory = '.local-storage/f4-browser'
const { base, password, users } = JSON.parse(readFileSync(`${directory}/runtime.json`, 'utf8'))
assert.equal(base, 'http://127.0.0.1:3089')
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await context.newPage()
page.setDefaultTimeout(60000)
const errors = []
page.on('pageerror', error => errors.push(error.name + ': ' + error.message.slice(0, 180)))
async function login(index = 0) {
  await page.goto(`${base}/inloggen?returnTo=${encodeURIComponent('/wijzers/compliance/v2')}`)
  await page.getByLabel('E-mailadres', { exact: true }).fill(users[index].email)
  await page.getByLabel('Wachtwoord', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Inloggen', exact: true }).click()
  await page.waitForURL('**/wijzers/compliance/v2')
  await page.getByRole('button', { name: 'Concept opslaan', exact: true }).waitFor()
}
async function logout() {
  await page.getByRole('button', { name: 'Uitloggen', exact: true }).click()
  await page.waitForURL(base + '/')
  const response = await context.request.get(base + '/wijzers/compliance/v2/drafts')
  assert.equal(response.status(), 401)
}
try {
  await login()
  await page.getByRole('heading', { name: /Eerste scan:.*24,95.*excl\. btw/ }).waitFor()
  assert.match(await page.getByRole('region', { name: 'Prijs uitgebreide scan' }).innerText(), /21% btw:.*5,24.*Totaal:.*30,19/)
  if (process.argv[2] === 'draft') {
    await page.getByRole('radio', { name: 'Ja, werknemers in dienst', exact: true }).check()
    page.once('dialog', dialog => dialog.dismiss())
    await page.getByRole('button', { name: 'Uitloggen', exact: true }).click()
    assert.ok(page.url().endsWith('/wijzers/compliance/v2'))
    await page.getByRole('button', { name: 'Concept opslaan', exact: true }).click()
    await page.getByRole('status').filter({ hasText: 'Uw concept is opgeslagen' }).waitFor()
    await page.keyboard.press('Tab')
    assert.ok(await page.evaluate(() => document.activeElement !== document.body))
    await page.screenshot({ path: `${directory}/desktop.png`, fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.screenshot({ path: `${directory}/mobile.png`, fullPage: true })
    await logout()
    await login()
  await page.getByRole('heading', { name: /Eerste scan:.*24,95.*excl\. btw/ }).waitFor()
  assert.match(await page.getByRole('region', { name: 'Prijs uitgebreide scan' }).innerText(), /21% btw:.*5,24.*Totaal:.*30,19/)
    await page.getByRole('button', { name: /Hervat concept van/ }).click()
    assert.equal(await page.getByRole('radio', { name: 'Ja, werknemers in dienst', exact: true }).isChecked(), true)
    await logout()
    await login(1)
    assert.equal(await page.getByRole('button', { name: /Hervat concept van/ }).count(), 0)
    await logout()
  } else {
    await page.getByRole('button', { name: /Hervat concept van/ }).click()
    for (let i = 0; i < 9; i++) await page.getByRole('button', { name: 'Volgende', exact: true }).click()
    await page.getByRole('button', { name: 'Beoordeling afronden en opslaan', exact: true }).click()
    await page.getByRole('heading', { name: 'Uw resultaat', exact: true }).waitFor()
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download rapport (PDF)', exact: true }).click()
    await (await download).saveAs(`${directory}/report.pdf`)
    await page.screenshot({ path: `${directory}/result.png`, fullPage: true })
    await logout()
  }
  assert.deepEqual(errors, [])
  writeFileSync(`${directory}/${process.argv[2]}-result.json`, JSON.stringify({ result: 'PASS', javascriptErrors: errors, true200PercentZoom: 'NOT_TESTED' }))
  console.log(`Browser ${process.argv[2]} PASS`)
} catch (error) {
  await page.screenshot({ path: `${directory}/failure.png`, fullPage: true })
  console.error('Browser check failed:', error.message.replaceAll(password, '[REDACTED]').slice(0, 300)); process.exitCode = 1
} finally { await context.close(); await browser.close() }
