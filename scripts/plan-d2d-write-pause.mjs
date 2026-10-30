// Prints reviewed SQL only. No credentials, DB client or execution option.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { fenceSql } from '../ops/recovery/write-fence.mjs'
assert.equal(process.argv.length,4,'Usage: node scripts/plan-d2d-write-pause.mjs close|verify|open <approved-plan.json>')
process.stdout.write(fenceSql(JSON.parse(fs.readFileSync(process.argv[3],'utf8')),process.argv[2])+'\n')
