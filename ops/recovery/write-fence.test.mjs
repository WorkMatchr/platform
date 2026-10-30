import test from 'node:test'
import assert from 'node:assert/strict'
import { fenceSql } from './write-fence.mjs'
const plan = () => ({ scope:'D2D_DATABASE_LOGIN_FENCE', approved:true, approvalReference:'synthetic-only-approval', database:'d2d_fixture', operator:'d2d_operator', writers:[{name:'d2d_writer',originalLogin:true}] })
test('separate operator, explicit database and role states; no automatic backend termination', () => {
  const p=plan(); assert.match(fenceSql(p,'close'), /ALTER ROLE "d2d_writer" NOLOGIN/)
  assert.match(fenceSql(p,'verify'), /BEGIN READ ONLY/)
  assert.match(fenceSql(p,'verify'), /Prepared transactions remain/)
  assert.match(fenceSql(p,'open'), /ALTER ROLE "d2d_writer" LOGIN/)
  assert.doesNotMatch(fenceSql(p,'close'), /pg_terminate_backend|REVOKE|DROP/)
})
for(const [name,change] of [
  ['no approval',p=>p.approved=false],['self lockout',p=>p.operator='d2d_writer'],['empty writers',p=>p.writers=[]],
  ['duplicate writers',p=>p.writers.push(p.writers[0])],['provider admin',p=>p.writers[0].name='cloud_admin'],
  ['SQL injection',p=>p.database="fixture_db'; DROP"],['unknown login state',p=>delete p.writers[0].originalLogin],
]) test(`refuses ${name}`,()=>{const p=plan();change(p);assert.throws(()=>fenceSql(p,'close'))})
test('preserves originally closed role on resume',()=>{const p=plan();p.writers[0].originalLogin=false;assert.match(fenceSql(p,'open'),/ALTER ROLE "d2d_writer" NOLOGIN/)})
