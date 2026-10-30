// Offline SQL compiler: never opens a connection or alters a role itself.
// Role changes require a separate operator approval; this is not an app featuregate.
import assert from 'node:assert/strict'

const identifier = value => { assert.match(value, /^[a-z][a-z0-9_]{2,62}$/); return `"${value}"` }
const literal = value => `'${value.replaceAll("'", "''")}'`
export function fenceSql(plan, phase) {
  assert.ok(['close', 'verify', 'open'].includes(phase))
  assert.equal(plan.scope, 'D2D_DATABASE_LOGIN_FENCE')
  assert.equal(plan.approved, true, 'Separate operator authorization required')
  assert.match(plan.approvalReference, /^\S.{8,200}$/)
  identifier(plan.database); identifier(plan.operator)
  assert.ok(Array.isArray(plan.writers) && plan.writers.length > 0 && plan.writers.length <= 20)
  assert.equal(new Set(plan.writers.map(r => r.name)).size, plan.writers.length)
  for (const r of plan.writers) { identifier(r.name); assert.equal(typeof r.originalLogin, 'boolean'); assert.notEqual(r.name, plan.operator) }
  assert.ok(plan.writers.every(r => !['postgres', 'cloud_admin', 'neon_service'].includes(r.name)), 'Never fence provider administrators')
  const names = plan.writers.map(r => literal(r.name)).join(',')
  const expected = phase === 'close' ? plan.writers.map(r => `(${literal(r.name)},${r.originalLogin})`).join(',') : plan.writers.map(r => `(${literal(r.name)},false)`).join(',')
  const check = `DO $fence$
BEGIN
 IF current_database() <> ${literal(plan.database)} OR session_user <> ${literal(plan.operator)} THEN RAISE EXCEPTION 'Fence identity mismatch'; END IF;
 IF EXISTS (SELECT 1 FROM (VALUES ${expected}) AS expected(name, login) LEFT JOIN pg_roles r ON r.rolname=expected.name WHERE r.oid IS NULL OR r.rolcanlogin<>expected.login) THEN RAISE EXCEPTION 'Unexpected role state'; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles r WHERE r.rolcanlogin AND r.rolname NOT IN (${names},${literal(plan.operator)},'postgres','cloud_admin','neon_service') AND EXISTS (SELECT 1 FROM pg_roles w WHERE w.rolname IN (${names}) AND pg_has_role(r.oid,w.oid,'MEMBER'))) THEN RAISE EXCEPTION 'Unfenced membership bypass'; END IF;
END $fence$;`
  if (phase === 'verify') return `BEGIN READ ONLY; SET LOCAL statement_timeout='5s';\n${check}
DO $fence$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND usename IN (${names})) THEN RAISE EXCEPTION 'Writer sessions remain; drain before backup'; END IF;
 IF EXISTS (SELECT 1 FROM pg_prepared_xacts WHERE database=current_database()) THEN RAISE EXCEPTION 'Prepared transactions remain'; END IF;
 IF EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND backend_type='client backend' AND pid<>pg_backend_pid() AND usename<>${literal(plan.operator)}) THEN RAISE EXCEPTION 'Unaccounted database client'; END IF;
END $fence$;\nROLLBACK;`
  return `BEGIN; SET LOCAL lock_timeout='2s'; SET LOCAL statement_timeout='5s';\n${check}\n${plan.writers.map(r => `ALTER ROLE ${identifier(r.name)} ${phase === 'open' && r.originalLogin ? 'LOGIN' : 'NOLOGIN'};`).join('\n')}\nCOMMIT;`
}
