import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
const token=process.env.TRADING_ADMIN_API_TOKEN
if(!token)throw new Error('Synthetic scan token required')
function walk(path){for(const entry of readdirSync(path,{withFileTypes:true})){const name=join(path,entry.name);if(entry.isDirectory())walk(name);else if(readFileSync(name).includes(Buffer.from(token)))throw new Error('Management token in browser bundle')}}
walk('.next/static')
console.log('Trading management token is absent from browser bundles')
