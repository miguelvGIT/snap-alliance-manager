# Validation and release status

28 October 2026. Working local implementation; no deployment has been performed. The full MVP has not been signed off while mandatory device and release evidence remains open.

## Verified locally

| Check | Result |
| --- | --- |
| TypeScript build check | Passed |
| Production frontend/PWA build | Passed |
| Vitest | 52 tests passed: 34 domain, 6 storage, 4 sync-engine, 8 API |
| Playwright | 19 browser tests passed across 1440×900, 768×1024 and 390×844 |
| Repeated sync test projects | Two skips: the same two-context test runs once in the desktop project, with a second 390 px session |
| Cloudflare package | Dry run passed; no upload/deployment |
| Visual inspection | 0 failures; one small-text warning for secondary copy and metadata |
| Push runtime probe | Real local Workerd produced an AES128GCM payload; zero external network requests |

Environment: Node 24.22.1, pnpm 11.25.0, TypeScript 5.9.3, Vite 7.3.7, Vitest 3.2.7, Playwright 1.64.1, Microsoft Edge 156.0.4314.42, Wrangler 4.153.0.

The app was checked both through the development server and as compiled assets served by local Cloudflare. Fictional reference data was imported into isolated contexts. The visible user browser was not populated with test data.

The final browser run verifies English onboarding, **Set up your dashboard**, **Start**, and the absence of reset-time callouts. It also checks persistence, date-range headers, missed-minimum indicators, required exemption reasons, manual renaming, local file transfer, calendar export, search and the Ko-fi link.

The two-context test uses approved invitations and independent IndexedDB stores. A name change arrives through the automatic sync cycle with contact and historical points preserved. This is browser evidence, not proof of physical iPhone/Android synchronization.

## P0/P1 audit

The specification has 57 P0 scenarios and 23 P1 scenarios: 80 mandatory acceptance scenarios. The automated test totals above are the last recorded executions, not 80 acceptance approvals. This audit reviews the current source and test assertions; it does not record a new test run.

### Implementation corrections still needed

| Priority and criterion | Current behavior | Work remaining |
| --- | --- | --- |
| P0, AC30; PLANO 5.2 | After three failed exchanges, `SyncEngine.run()` rejects further automatic runs. A focus/visibility event calls the same guarded path, so returning to the app does not resume the cycle. Manual retry or recreating the engine can resume it. | Restart a bounded retry cycle when the app becomes active again, with backoff and focus coalescing preserved. Test service recovery and return-to-app recovery without an infinite retry loop. |
| P1, AC43 | A lead-time change is sent to the API before preferences are saved. If that request fails, the changed value exists only in component state and is lost when Settings is reopened. Failed disable requests also have no durable pending command. | Persist pending reminder changes, distinguish pending from remotely confirmed state, and retry safely when the active app can reach the service. Test a failed change, reopening, recovery and cancellation. This does not require offline startup. |
| P1, AC46 | Notification permission is read when Settings mounts and after a permission request. It is not refreshed on focus/visibility changes. A revocation outside the app can therefore leave the displayed permission stale. | Refresh the actual permission/subscription state when returning, show the correct state and keep the calendar alternative available. Test revocation while Settings is open. |

These findings come from code inspection. They are open defects, not completed fixes or successful acceptance tests.

### Acceptance coverage still needed

66 mandatory IDs appear in automated tests. Some assertions cover only part of their named scenario. A test title is not proof that every condition in that scenario was checked.

The following 14 mandatory scenarios have no explicit automated-test reference:

- P0: AC10 (late entry of an earlier collection), AC11 (reference-image use and network privacy), AC13 (twenty historical weeks with eight visible), AC19 (historical corrections), AC34 (disconnect/change spaces), AC54 (published PWA installation), AC82 (explicit creation of a new identity during review).
- P1: AC24 (repeat-miss distinction), AC42 (drafts do not suppress reminders), AC45 (stale notification expiry), AC46 (permission states), AC47 (real iPhone receipt), AC48 (device-specific subscriptions), AC49 (notification-click destination and lock-screen content).

AC54 and AC47 require real devices. The absence of an automated reference does not by itself prove that a feature is missing, and automation alone will not approve those cases.

Examples of partial coverage that need stronger checks:

- AC38 currently checks preservation of an incompatible stored format, not a running-app update with retained data and pending operations.
- AC31 checks server-side conflict retention, not two browser sessions making divergent corrections and explicitly resolving them.
- AC40 checks invalid calendar lead times, not the complete valid/invalid reminder-settings flow.
- AC67/AC68 include a null collection-time assertion, not the full correction and multiple-collection-time transfer scenario.
- AC74 triggers thirty edit events around one pending operation; it does not yet demonstrate thirty real result edits, repeated focus events and multiple tabs.
- AC80 checks contact search, not all search keys and ordering invariants.
- AC87 checks backup retention of a pending row; the browser sync test changes a name but does not assert the full rename-decision/alias/pending-row round trip.

### Release work still needed

| Priority and requirement | Remaining evidence or setup |
| --- | --- |
| P0, RF10 / AC54 | Stable HTTPS deployment, real D1 binding, production origin and required secrets. The private GitHub repository stores source; it is not a deployed application. |
| P0, RF07 / AC35, AC70, AC72 | File selection, saving and restoration on real iOS, Android and Windows devices, including local-only transfer and permission behavior. |
| P0, RF08 / AC28 | Automatic synchronization between physical PC/mobile devices against the deployed private service; browser contexts are the current evidence. |
| P0, RF12 / ESC04 | Record actual Workers CPU and D1 reads/writes, plus the weekly reminder peak, without player data. The current scheduler processes at most ten due reminders per minute; queue delay and expiry need a load test and any required adjustment. |
| P0, AC53 | Finish 360 px, keyboard/touch and 200% zoom checks; review secondary text legibility and accessibility. Existing viewport checks are 390/768/1440 px. |
| P1, RF16 / AC41–AC50, AC65 | Configure production Web Push and verify real receipt with the app closed, revocation, device selection, duplicate suppression, expiry and the click destination. |
| P1, RF17 / AC76 | Import the generated file into target calendar clients and verify the actual recurrence/alarm, including changes and duplicate-event handling. |
| PLANO stage 6 | Run a real collection/reset pilot, verify the contribution column, consult history afterward, restore a backup and check the optional sync/reminders. |

The next implementation work is the open behavior corrections and their regression tests, followed by the missing/partial acceptance checks. Deployment and physical-device checks come after those local corrections. OCR/video, FUT01–FUT03, other-game support and localization remain future scope; AC29 remains retired.

## Implemented local paths

- Local use without an account; private IndexedDB data.
- Players, previous names, contacts, membership periods and weekly records.
- Separate unknown-name and missing-name warnings; manual assignment/renaming.
- Historical minimums, zero/missing distinction, partial-entry exemptions and manually justified exemptions.
- Eligible lifetime averages and missed-minimum counts; eight recent weeks on the overview.
- Collection times distinct from entry/import times, with revisions.
- Complete versioned backup/restore, preview and atomic replacement.
- Optional private sync, invitations, approval, revocation, recovery keys and retained conflicts.
- A replaceable sync transport, ordered outbox, delta transfer and bounded retries.
- Calendar file generation, optional push registration, weekly scheduling and expiring notifications.
- PWA manifest/icons, same-origin headers, lazy-loaded screens and the confirmed Ko-fi URL.

The planning and acceptance files remain the behavior specification. The number of automated tests is not the number of fully approved acceptance criteria.

## Resource evidence and limits

Local use and file transfer made zero point/reminder API calls in the browser test. Static asset requests are separate.

A controlled debounce test generated thirty edit events and one exchange after the five-second pause. Hidden sessions made no polling calls. Three failed attempts preserved the outbox and stopped repeated retries.

Empty sync checks no longer fetch every entity head; changed keys and indexed deltas restrict reads. Initial records use bulk SQL, and expired rate-limit/invitation records are cleaned through indexed queries. Large catch-ups are read through all delta pages before cross-entity validation.

The scheduler currently claims ten due reminders per minute. This is a bounded implementation batch, not a guaranteed capacity. Queue delay at the weekly peak must be measured before enabling public Web Push at scale.

The offline Node crypto benchmark recorded 7.9 ms average CPU and a 48 ms maximum for a ten-message preparation batch, with no sends. Node process CPU is not Workers invocation CPU; these numbers do not demonstrate compliance with the Free plan's 10 ms limit. Actual Cloudflare CPU and D1 read/write consumption remain release measurements.

The calendar alternative has no weekly calls to this app's API after import.

## Open release checks

| Required evidence | Current status |
| --- | --- |
| Stable HTTPS deployment and real D1 binding | Not started; configuration still contains the local placeholder database ID |
| Production VAPID secrets and real contact address | Local development keys exist; production setup not performed |
| Workers CPU, D1 rows and peak reminder delivery | Local behavior checked; production budget/load measurement pending |
| Installation on real iOS, Android and Windows devices | Browser rendering checked; native installation pending |
| Push receipt with the PWA closed, permission revocation and expiry | Scheduler logic/crypto checked; actual delivery pending |
| Calendar import and alarm behavior in target clients | File structure/download checked; client tests pending |
| 360 px, 200% zoom and broader assistive-technology review | Responsive checks cover 390/768/1440 px; remaining checks pending |
| Real weekly collection/reset pilot and restore | Not performed |
| Game-column/OCR sample verification | No representative captures supplied; OCR is not shipped |

No screenshots or mock pushes are counted as successful native delivery. No production resource or paid plan has been enabled.

## Design review

The contribution table answers the main question; the overview's side panel identifies repeat misses. Color is confined to progress/status/focus. Names, scores and target totals are derived from one dataset. Missing values remain separate from zero.

The mobile layout folds navigation and confines horizontal scrolling to the table. Form inputs and primary data use 14 px text; 11–12 px copy is reserved for secondary information. This is the reason for retaining the inspector's small-text warning. The wider accessibility checks above remain open.

The direction is true-black-flat, seed 1430960693, with self-hosted Inter. No visual redraw was needed. The user-requested English copy and app-focused onboarding were reviewed in new screenshots.

## Future scope

AC29 (full offline startup/use) is retired. OCR/video and transports FUT01–FUT03 remain future work. Localization into other languages is deferred. No integration with an official Marvel Snap alliance API is claimed.
