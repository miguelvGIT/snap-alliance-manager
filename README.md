# Alliance

A private, installable dashboard for Marvel Snap alliance managers. The interface is English-only for this version. Player names and notes stay as entered; dates and times follow the device locale and time zone.

Save weekly scores, review missed minimums, and preserve history when names change. The app tracks an existing alliance; it does not create one in the game.

## Run locally

Use Node.js 22 or newer and pnpm.

```powershell
pnpm install
pnpm db:migrate
pnpm build
pnpm dev:api
```

The compiled app and local API are available at http://127.0.0.1:8787. For live development, also run `pnpm dev` and use http://127.0.0.1:5173.

```powershell
pnpm test
pnpm test:e2e
```

Browser tests use Microsoft Edge installed on Windows. To test the compiled app against local Cloudflare:

```powershell
$env:ALLIANCE_TEST_URL = 'http://127.0.0.1:8787'
pnpm test:e2e
```

Tests use fictional data and isolated contexts. No production account or database is needed.

## First use

Enter your existing alliance's name and minimum/target, then select **Start**. You can also import a complete backup.

- **Record scores:** paste names and points, specify collection time, and review assignments. Unknown and missing names are highlighted separately. You confirm name changes and new players.
- **Overview:** averages and missed minimums use all eligible history; the table shows eight recent weeks. A missing score stays distinct from zero.
- **History:** review weeks, collection times and revision reasons.
- **Settings:** change defaults, export/import and choose reminders.
- **Support the project:** opens https://ko-fi.com/tequilasunsett without player data.

Local use creates no account and uploads no tables. Complete file transfer is free and available in the MVP. Automatic sync is P2 and disabled in the shipped app and API. Its retained local prototype is not a released feature. Future sync that incurs service/call costs will require server-verified paid access through Ko-fi; payment integration, price and access duration are not implemented. Backups exclude credentials and push subscriptions.

## Reminders

The calendar export works without a server. Import the file into a compatible calendar and confirm its alarm. Remove/replace the previous event after changing the lead time.

Web Push needs VAPID keys. For local development, `node scripts/local-keys.mjs` creates ignored `.dev.vars` without printing its private key. Restart the API after configuration. Notification permission is requested through the enable action.

Real iOS/Android delivery and calendar-client behavior still require device tests. No full offline cache is implemented.

Wrangler does not fire Cron automatically during local development. Its local scheduled endpoint can be invoked manually for testing; the deployed Cron is what runs the weekly reminder service.

## Structure

- `src/domain`: identity, membership, weeks, metrics and file validation.
- `src/data`: IndexedDB, atomic replacement and ordered outbox.
- `src/sync`: transport contract, HTTP implementation, batching and conflicts.
- `src/ui`: overview, weekly review, players and settings.
- `worker`: private API, D1 migration and reminder scheduler.
- `tests`, `e2e`: domain, persistence, API and browser checks.

PLANO.md and TESTES_ACEITACAO.md retain the business specification and acceptance IDs. VALIDACAO.md records evidence and remaining release checks. The original planning documents are Portuguese; application copy is English.

## Publication

Nothing has been deployed. A release needs a Cloudflare Free account/D1 binding, stable HTTPS origin, VAPID secrets and a real contact address. Serve assets directly and route only `/api/*` to the Worker. Never enable paid billing automatically.

The scheduler claims bounded batches of ten reminders per minute. Measure peak delivery and actual Workers CPU before a public Web Push rollout. The local crypto benchmark does not measure Cloudflare production CPU.

Do not publish the local push probe, real backups, `.dev.vars`, traces or personal data.
