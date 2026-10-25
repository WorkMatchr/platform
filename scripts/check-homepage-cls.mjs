/** Real Chromium regression check. No account, database or extra npm dependency required. */
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { once } from 'node:events'
import assert from 'node:assert/strict'

const url = new URL(process.argv[2] ?? 'http://127.0.0.1:3050/')
assert(['http:', 'https:'].includes(url.protocol) && !url.username && !url.password)
const chromePath = process.env.CHROME_PATH
assert(chromePath, 'Set CHROME_PATH to a local Chromium/Chrome executable')
const output = path.resolve(process.argv[3] ?? '.local-storage/p01-cls')
await mkdir(output, { recursive: true })
const results = []
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))

for (const [mode, width, height, scale] of [['desktop', 1350, 940, 1], ['mobile', 412, 823, 1.75]]) {
  const profile = await mkdtemp(path.join(tmpdir(), 'workmatchr-p01-'))
  const child = spawn(chromePath, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions', 'about:blank'], { stdio: 'ignore', windowsHide: true })
  let socket
  try {
    let port
    for (let attempt = 0; attempt < 100; attempt++) {
      try { port = Number((await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break } catch { await pause(100) }
    }
    assert(port, 'Chromium did not expose a debugging port')
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
    const target = targets.find(item => item.type === 'page')
    assert(target?.webSocketDebuggerUrl)
    socket = new WebSocket(target.webSocketDebuggerUrl)
    await once(socket, 'open')
    let id = 0
    const pending = new Map()
    const exceptions = []
    let documentStatus
    socket.addEventListener('message', event => {
      const data = JSON.parse(event.data)
      if (data.method === 'Network.responseReceived' && data.params.type === 'Document') documentStatus = data.params.response.status
      if (data.method === 'Runtime.exceptionThrown') exceptions.push(data.params.exceptionDetails.text)
      if (!data.id) return
      const request = pending.get(data.id)
      if (!request) return
      clearTimeout(request.timer); pending.delete(data.id)
      if (data.error) request.reject(new Error(data.error.message)); else request.resolve(data.result)
    })
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const requestId = ++id
      const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`CDP timeout: ${method}`)) }, 30000)
      pending.set(requestId, { resolve, reject, timer })
      socket.send(JSON.stringify({ id: requestId, method, params }))
    })
    await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
    await send('Network.setCacheDisabled', { cacheDisabled: true })
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: mode === 'mobile' })
    await send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 })
    await send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `
      window.__p01Shifts = [];
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__p01Shifts.push({time:entry.startTime,value:entry.value,sources:entry.sources.map(source=>({node:source.node?.tagName,previous:source.previousRect.toJSON(),current:source.currentRect.toJSON()}))});
        }
      }).observe({type:'layout-shift',buffered:true});
    ` })
    await send('Page.navigate', { url: url.href })
    let complete = false
    for (let attempt = 0; attempt < 120; attempt++) {
      const state = await send('Runtime.evaluate', { expression: `document.readyState === 'complete' && !!document.querySelector('h1')`, returnByValue: true })
      if (state.result.value) { complete = true; break }
      await pause(500)
    }
    assert(complete, `${mode}: page did not finish loading`)
    await pause(5000)
    const measured = await send('Runtime.evaluate', { expression: `JSON.stringify({shifts:window.__p01Shifts,overflow:document.documentElement.scrollWidth>innerWidth,h1:document.querySelector('h1')?.textContent})`, returnByValue: true })
    const data = JSON.parse(measured.result.value)
    // CLS is the largest session window: <1s between shifts and <5s total.
    let cls = 0, session = 0, start = 0, previous = -Infinity
    for (const shift of data.shifts) {
      if (shift.time - previous >= 1000 || shift.time - start >= 5000) { session = 0; start = shift.time }
      session += shift.value; previous = shift.time; cls = Math.max(cls, session)
    }
    const screenshot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(path.join(output, `${mode}.png`), Buffer.from(screenshot.data, 'base64'))
    const version = await send('Browser.getVersion')
    const row = { mode, url: url.href, status: documentStatus, viewport: { width, height, scale }, network: { latencyMs: 150, downloadBytesPerSecond: 200000 }, cpuSlowdown: 4, browser: version.product, cls, ...data, exceptions }
    results.push(row)
    await writeFile(path.join(output, 'layout-shifts.json'), JSON.stringify(results, null, 2))
    console.log(JSON.stringify({ mode, cls, overflow: data.overflow, exceptions }))
  } finally {
    socket?.close()
    if (child.exitCode === null) {
      const closed = once(child, 'exit'); child.kill(); await closed
    }
    // Only remove this invocation's freshly created browser profile.
    assert(path.dirname(profile) === path.resolve(tmpdir()) && path.basename(profile).startsWith('workmatchr-p01-'))
    await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 })
  }
}
assert.equal(results.length, 2)
for (const result of results) {
  assert.equal(result.status, 200, `${result.mode}: homepage HTTP status`)
  assert(result.cls <= 0.1, `${result.mode}: CLS ${result.cls} exceeds 0.10`)
  assert(!result.overflow, `${result.mode}: horizontal overflow`)
  assert.equal(result.exceptions.length, 0, `${result.mode}: browser runtime errors`)
}
