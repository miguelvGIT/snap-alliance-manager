# Alliance

A private, installable dashboard for Marvel Snap alliance managers. The interface is English-only for this version. Player names and notes stay as entered; dates and times follow the device locale and time zone.

Public test version: https://snap-alliance-manager.snap-alliance-manager.workers.dev. Each visitor starts with their own local data; supplied game screenshots and private test records are not published.

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

- **Record scores:** add multiple screenshots or paste clipboard images without saving a file. Read them locally, check total points against the images, and confirm assignments. Compatible desktop browsers can capture visible game rows while you scroll the authorized window. Unknown and missing names are highlighted separately; you confirm name changes and new players.
- **Overview:** averages and missed minimums use all eligible history; the table shows eight recent weeks. A missing score stays distinct from zero.
- **History:** review weeks, collection times and revision reasons.
- **Settings:** change defaults, export/import and choose reminders.
- **Minimums:** Settings holds both the default for new weeks and a separate saved-week correction with a required reason. The weekly editor shows the applied minimum.
- **Support the project:** opens https://ko-fi.com/tequilasunsett without player data.

Local use creates no account and uploads no tables. Complete file transfer is free and available in the MVP. Automatic sync is P2 and disabled in the shipped app and API. Its retained local prototype is not a released feature. Future sync that incurs service/call costs will require server-verified paid access through Ko-fi; payment integration, price and access duration are not implemented. Backups exclude credentials and push subscriptions.

## Image intake

PNG, JPEG and WebP are supported, up to 20 images per batch and 20 MB per image. Paste into the marked area or use **Paste images**; clipboard permission depends on the browser. **Capture game window** requires a compatible desktop browser and an explicit window selection. Scroll slowly, then stop capture and read the collected images. It cannot start silently at the weekly reset. Saved-video import remains P2.

The OCR worker, WebAssembly engine and English model are copied from locked dependencies by the dev/build/browser-test scripts into ignored `public/ocr/`. They load from this app's origin on first use; images and recognized names/scores are never sent to an OCR service. The reader assumes the game's Player / Cube / Bounty / Total layout and detects the columns automatically. Contrast preparation removes colored role-icon noise; separate numeric reads preserve zero scores. Four real screenshots have been checked locally; stylized names still need review and the broader corpus/device checks remain open.

Uploads and pasted images start with an unknown capture time. Set it if known; live frames record their actual capture time. Repeated names appear once per collection, retaining all original source rows. Overlaps are never summed; different totals require an explicit choice or correction. Similar names are not merged. Open any image or review reference to zoom, view actual size or pan. Images remain in memory while the weekly screen is open; backups contain structured proposals and source/time metadata, not image files.

## Reminders

Changes to an existing reminder and removal requests are saved on this device before sending. If the service fails, Settings shows them as pending across reopening. Retries are bounded while the app is active; return to the app or use **Retry pending change** after they pause. Permission and subscription state refresh on return. These device credentials/commands are excluded from transferable backups. First-time activation still needs a successful service connection.

The calendar export works without a server. Import the file into a compatible calendar and confirm its alarm. Remove/replace the previous event after changing the lead time.

Web Push needs VAPID keys. For local development, `node scripts/local-keys.mjs` creates ignored `.dev.vars` without printing its private key. Restart the API after configuration. Notification permission is requested through the enable action.

Real iOS/Android delivery and calendar-client behavior still require device tests. No full offline cache is implemented.

Wrangler does not fire Cron automatically during local development. Its local scheduled endpoint can be invoked manually for testing; the deployed Cron is what runs the weekly reminder service.

## Structure

- `src/domain`: identity, membership, weeks, metrics and file validation.
- `src/data`: IndexedDB, atomic replacement and ordered outbox.
- `src/sync`: transport contract, HTTP implementation, batching and conflicts.
- `src/ui`: overview, weekly review, players and settings.
- `src/ocr`: local image reading and coordinate-based row proposals.
- `worker`: private API, D1 migration and reminder scheduler.
- `tests`, `e2e`: domain, persistence, API and browser checks.

PLANO.md and TESTES_ACEITACAO.md retain the business specification and acceptance IDs. VALIDACAO.md records evidence and remaining release checks. The original planning documents are Portuguese; application copy is English.

## Publication

The test version was published to Cloudflare on 28 October 2026. The `production` environment contains its D1 binding and HTTPS origin; local configuration stays separate. Deploy updates after validation with:

```powershell
pnpm build
pnpm exec wrangler deploy --env production
```

Serve assets directly and route only `/api/*` to the Worker. No paid billing was activated. Production Web Push keys are not configured; the calendar export remains available. Creating production credentials needs separate authorization. After that approval, `node scripts/configure-production-push.mjs` creates keys through stdin, stores them only in Cloudflare and preserves existing keys. It is never run by the build or deploy commands.

The deployed scheduler is configured every minute, with bounded batches of ten reminders. Web Push stays unavailable until its credentials are configured. Measure peak delivery and actual Workers CPU before a wider push rollout. The local crypto benchmark does not measure Cloudflare production CPU.

Do not publish the local push probe, real backups, `.dev.vars`, traces or personal data.
