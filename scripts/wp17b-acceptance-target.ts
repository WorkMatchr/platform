import assert from 'node:assert/strict'

// This operator fixture is pinned to the new empty WP17B project. Never a generic
// seeder, production provisioner, or replacement for application authorization.
export const WP17B_TARGET = {
  project: 'polished-truth-73185704', branch: 'br-steep-base-bamb189s',
  endpoint: 'ep-dry-hat-bao6j8me', host: 'ep-dry-hat-bao6j8me.c-8.eu-central-1.aws.neon.tech',
  database: 'workmatchr_wp17b', owner: 'wp17b_migrator', runtime: 'workmatchr_preview_wp17b',
} as const

export function assertWp17bTarget(connectionString: string, identity?: Record<string, unknown>) {
  try {
    const url = new URL(connectionString)
    assert.ok(['postgres:', 'postgresql:'].includes(url.protocol))
    assert.equal(url.hostname, WP17B_TARGET.host)
    assert.equal(url.pathname, `/${WP17B_TARGET.database}`)
    assert.ok([WP17B_TARGET.owner, WP17B_TARGET.runtime].includes(decodeURIComponent(url.username) as typeof WP17B_TARGET.owner))
    assert.ok(!url.port || url.port === '5432')
    assert.ok(url.password && !url.hash)
    assert.ok([...url.searchParams.keys()].every(key => key === 'sslmode'))
    assert.ok(['require', 'verify-full'].includes(url.searchParams.get('sslmode') ?? ''))
    if (identity) {
      assert.equal(identity.branch, WP17B_TARGET.branch)
      assert.equal(identity.endpoint, WP17B_TARGET.endpoint)
      assert.equal(identity.database, WP17B_TARGET.database)
      assert.equal(identity.role, decodeURIComponent(url.username))
    }
    return url
  } catch { throw new Error('WP17B_ACCEPTANCE_TARGET_REQUIRED') }
}
