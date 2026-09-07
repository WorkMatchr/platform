# Trading → Toegang

Route: /platformbeheer/trading/toegang. The existing PlatformAdminShell and operator navigation are reused. requirePlatformOperator protects the page and Server Actions; getPlatformOperatorContext rechecks active account, platform role and membership before every service call. No new WorkMatchr admin login, password system, account or database schema is introduced.

Only trade@workmatchr.nl is shown, with status and last login. Actions request a password reset or terminate all trading sessions. The trading repository owns the separate singleton auth database, Better Auth session/reset implementation and Argon2id credentials.

Server-only configuration: TRADING_MANAGEMENT_BASE_URL=https://trading.workmatchr.nl and TRADING_ADMIN_API_TOKEN, matching the separate secret on trading. Requests use fixed management paths, HTTPS, a 15-second timeout, no redirects and only the configured Bearer header; incoming cookies or auth headers are never forwarded. Local HTTP is allowed only outside production/Vercel on localhost/127.0.0.1.

Reset generation happens in trading. WorkMatchr receives a validated same-origin fragment reset URL only on its backend, then uses existing sendAuthEmail/Resend to send the specified mail to the fixed account. The link lasts 30 minutes and works once. The secret-bearing email is not archived, returned to the browser or passed to developmentUrl (which would log a reset link). Provider acceptance is reported as offered for delivery, not guaranteed receipt. On failure only a generic message appears; a new request replaces any older token.

Existing AdminActionLog records the actor and fixed result codes without URLs, tokens or passwords. User authentication and authorization remain exclusively Better Auth plus existing WorkMatchr guards. Next.js Server Action CSRF protections remain intact.

No real email, database provisioning, secret configuration or deployment was performed. After review configure the two server-side variables, coordinate deployment with the trading Draft PR, and use Trading → Toegang for initial account activation by reset mail.

Product Constitution: familiar Beheer location, one primary reset action, separate session-revocation action with stated effect, Dutch copy, no technical credential fields or password display, explicit unavailable state instead of an invented account status.

## Verification limits

The 25 targeted trading/admin/navigation tests pass. A broader local run exposed five unrelated failing files, reproduced on unchanged main ff5cdd2: advice-guide.test.tsx and public-intake-understanding-confirmation.test.tsx have server-only import failures; public-platform-pages.test.tsx, public-intake-context-question-service.test.ts and public-intake-guidance-presentation.test.ts have existing assertions that fail. These modules were not changed. The feature CI explicitly runs the targeted suite, lint, build and bundle safety; it does not claim the full legacy suite is green.
