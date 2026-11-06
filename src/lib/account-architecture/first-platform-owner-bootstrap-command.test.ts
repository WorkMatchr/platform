import { describe, expect, it } from 'vitest'
import { parseFirstPlatformOwnerBootstrapArguments as parse } from './first-platform-owner-bootstrap-command'
const base=['--user-id','9ed991ab-bcc8-43be-94d6-2d610fa0a503','--operator-reference','SEC-ACADEMY-001']
describe('first owner explicit CLI boundary',()=>{
  it('defaults to dry-run and requires both explicit execution flags',()=>{
    expect(parse(base).execute).toBe(false)
    expect(parse([...base,'--dry-run']).execute).toBe(false)
    expect(parse([...base,'--execute','--confirm-first-platform-owner']).execute).toBe(true)
  })
  it.each([
    [],[...base,'--execute'],[...base,'--confirm-first-platform-owner'],[...base,'--execute','--confirm-first-platform-owner','--dry-run'],
    [...base,'--password','private'],[...base,'--unknown'],[...base,'--execute','--execute'],[...base,'--user-id','duplicate'],
    ['--user-id','--operator-reference','SEC-ACADEMY-001'],['--user-id','invalid','--operator-reference','SEC-ACADEMY-001'],
    ['--user-id',base[1],'--operator-reference','operator@example.invalid'],
  ].map(args=>({args})))('rejects unsafe/missing/ambiguous arguments without echoing their values (%#)',({args})=>{
    expect(()=>parse(args)).toThrow()
    try{parse(args)}catch(error){expect(String(error)).not.toMatch(/private|operator@example.invalid/)}
  })
})
