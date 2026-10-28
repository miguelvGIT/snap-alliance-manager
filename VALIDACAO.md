# Validation and release status

28 October 2026. Working local implementation; no deployment has been performed. The full MVP has not been signed off while mandatory device and release evidence remains open.

## Verified locally

| Check | Result |
| --- | --- |
| TypeScript build check | Passed |
| Production frontend/PWA build | Passed |
| Vitest | 79 tests passed: 34 domain, 6 storage, 4 retained P2 sync-engine, 13 reminder-queue, 10 API and 12 OCR/cancellation/column/grouping checks. |
| Playwright | 42 distinct checks passed across 1440×900, 768×1024 and 390×844 on compiled local Cloudflare assets: 39 full-suite passes plus the corrected three conflict checks in the final 12-image-check run. Image checks include zoom before/after recognition, capture-to-total reading, clipboard, grouping and explicit conflict choice. Notification state and screen sharing are simulated; OCR uses the real packaged engine. |
| Deferred P2 browser tests | Three sync-test skips; automatic sync is disabled in the shipped MVP |
| Cloudflare package | Dry run passed; no upload/deployment |
| Visual inspection | 0 failures; one small-text warning for secondary copy and metadata |
| Push runtime probe | Real local Workerd produced an AES128GCM payload; zero external network requests |

Environment: Node 24.22.1, pnpm 11.25.0, TypeScript 5.9.3, Vite 7.3.7, Vitest 3.2.7, Playwright 1.64.1, Microsoft Edge 156.0.4314.42, Wrangler 4.153.0.

The app was checked both through the development server and as compiled assets served by local Cloudflare. Fictional reference data was imported into isolated contexts. The visible user browser was not populated with test data.

The final browser run verifies English onboarding, **Set up your dashboard**, **Start**, and the absence of reset-time callouts. It also checks persistence, date-range headers, missed-minimum indicators, required exemption reasons, manual renaming, local file transfer, calendar export, search and the Ko-fi link.

Earlier prototype evidence: the two-context test used approved invitations and independent IndexedDB stores. A name change arrives through the automatic sync cycle with contact and historical points preserved. This is browser evidence, not proof of physical iPhone/Android synchronization.

## P0/P1 audit

The specification has 51 P0 scenarios and 23 P1 scenarios: 74 mandatory acceptance scenarios. The automated test totals above are recorded executions, not 74 acceptance approvals. Image OCR/multi-image clipboard intake are P0; assisted capture on compatible PCs is P1. Automatic sync and remote conflicts are P2. The shipped MVP hides the prototype UI, starts no sync engine, and rejects direct sync API calls. A stored credential from the prototype does not trigger requests. Free file transfer stays available. Conditional paid Ko-fi access is planned for a future sync release; no payments are enabled.

### Correction status

| Priority and criterion | Current behavior | Work remaining |
| --- | --- | --- |
| P2, AC30; deferred prototype | After three failed exchanges, `SyncEngine.run()` rejects further automatic runs. A focus/visibility event calls the same guarded path, so returning to the app does not resume the cycle. Manual retry or recreating the engine can resume it. | Restart a bounded retry cycle when the app becomes active again, with backoff and focus coalescing preserved. Test service recovery and return-to-app recovery without an infinite retry loop. |
| P1, AC43 | Fixed locally: updates to an existing schedule and removals are persisted in a device-only queue before sending. Failed requests retain the intended change across reopening; confirmation updates preferences. Bounded retries resume on return/online or explicit retry. Newer commands survive older responses. | Native-device and deployed-service checks remain open. First-time registration still needs a successful service connection. |
| P1, AC46 | Fixed locally: permission/subscription state is read again on focus/visibility changes. Revocation removes the confirmed-schedule display and disables test sends. Calendar export stays available. | Browser checks use simulated permission state; actual OS/browser revocation must still be verified. |

The AC43/AC46 corrections passed local regression checks, including reload, service failure/recovery and simulated revocation. These do not prove native notification delivery. AC30 remains an open P2 prototype issue.

### Acceptance coverage still needed

65 mandatory IDs appear in automated tests. Some assertions cover only part of their named scenario. A test title is not proof that every condition in that scenario was checked.

The following nine mandatory scenarios have no explicit automated-test reference:

- P0: AC10 (late entry of an earlier collection), AC13 (twenty historical weeks with eight visible), AC54 (published PWA installation), AC82 (explicit creation of a new identity during review).
- P1: AC24 (repeat-miss distinction), AC42 (drafts do not suppress reminders), AC45 (stale notification expiry), AC47 (real iPhone receipt), AC49 (notification-click destination and lock-screen content).

AC54 and AC47 require real devices. The absence of an automated reference does not by itself prove that a feature is missing, and automation alone will not approve those cases.

Examples of partial coverage that need stronger checks:

- AC19 now checks minimum corrections through Settings, required reasons, before/after values in the backup, unchanged defaults/other weeks, recalculated misses and preserved averages. The full points-correction revision flow still needs explicit coverage.
- AC38 currently checks preservation of an incompatible stored format, not a running-app update with retained data and pending operations.
- AC31 is now P2: the retained prototype checks server-side conflict retention, not the complete two-session resolution flow.
- AC40 checks invalid calendar/queue lead times and a browser change to 60 minutes. The complete preset/invalid-field reminder-settings flow still needs explicit coverage.
- AC67/AC68 now include per-image unknown/manual times, automatic simulated-frame times and metadata surviving backup; the full corrected multi-capture timeline/revision scenario remains open.
- AC55/AC56/AC90 have real-engine tests on fictional screenshots, simulated video frames and clipboard inputs, plus four real game screenshots processed locally. The remaining representative corpus, native window selection, mobile clipboard permissions and full 20-image boundary/recovery checks remain open.
- AC74 is now P2: the retained prototype triggers thirty edit events around one pending operation, not thirty real result edits and multiple tabs.
- AC80 checks contact search, not all search keys and ordering invariants.
- AC87 checks backup retention of a pending row; the browser sync test changes a name but does not assert the full rename-decision/alias/pending-row round trip.

### Release work still needed

| Priority and requirement | Remaining evidence or setup |
| --- | --- |
| P0, RF10 / AC54 | Stable HTTPS deployment, real D1 binding, production origin and required secrets. The private GitHub repository stores source; it is not a deployed application. |
| P0, RF04 / AC55, AC90 | Measure total-column/name recognition, omitted rows and review time on at least 20 representative real game screenshots. Verify multi-image selection and image clipboard actions on physical target devices. |
| P1, RF23 / AC56 | Verify native game-window selection, scrolling and sharing termination in supported PC browsers. Simulated frames prove the local flow, not capture of the installed game. |
| P0, RF07 / AC35, AC70, AC72 | File selection, saving and restoration on real iOS, Android and Windows devices, including local-only transfer and permission behavior. |
| P2, RF08 / AC28; not an MVP gate | Automatic synchronization between physical PC/mobile devices against the deployed private service; browser contexts are the current evidence. |
| P0, RF12 / ESC04 | Record actual Workers CPU and D1 reads/writes, plus the weekly reminder peak, without player data. The current scheduler processes at most ten due reminders per minute; queue delay and expiry need a load test and any required adjustment. |
| P0, AC53 | Finish 360 px, keyboard/touch and 200% zoom checks; review secondary text legibility and accessibility. Existing viewport checks are 390/768/1440 px. |
| P1, RF16 / AC41–AC50, AC65 | Configure production Web Push and verify real receipt with the app closed, revocation, device selection, duplicate suppression, expiry and the click destination. |
| P1, RF17 / AC76 | Import the generated file into target calendar clients and verify the actual recurrence/alarm, including changes and duplicate-event handling. |
| PLANO stage 6 | Run a real collection/reset pilot, verify the contribution column, consult history afterward, restore a backup and check reminders. Automatic sync belongs to P2. |

The next MVP work is broader real-image OCR validation and the remaining local acceptance checks, followed by release/device evidence. The reminder corrections have regression tests. Automatic sync/remote conflicts, conditional Ko-fi paid access, saved-video import, light mode, FUT01–FUT03, other-game support and localization remain P2; AC29 remains retired.

## Implemented local paths

- Local use without an account; private IndexedDB data.
- Players, previous names, contacts, membership periods and weekly records.
- Separate unknown-name and missing-name warnings; manual assignment/renaming.
- Multi-image selection, clipboard events and the Clipboard button; fixed game columns detected automatically, local OCR proposals and manual correction. Repeated names appear once with preserved originals and explicit total-conflict choices. Captured images/references open in a zoom/pan viewer. No bulk text entry or column-layout selector.
- Assisted visible-frame capture in compatible desktop browsers with per-frame timestamps, explicit stopping and unmount cleanup. Native game/window capture remains a release check.
- Historical minimums, zero/missing distinction, partial-entry exemptions and manually justified exemptions.
- Eligible lifetime averages and missed-minimum counts; eight recent weeks on the overview.
- Collection times distinct from entry/import times, with revisions.
- Complete versioned backup/restore, preview and atomic replacement.
- Retained P2 sync prototype with invitations, recovery and conflicts. It is disabled in the MVP UI/API and creates no automatic sync traffic.
- A replaceable sync transport, ordered outbox, delta transfer and bounded retries.
- Calendar file generation, optional push registration, weekly scheduling and expiring notifications. Existing schedule changes/removals use a durable device-only queue; permission state refreshes on return.
- PWA manifest/icons, same-origin headers, lazy-loaded screens and the confirmed Ko-fi URL.

The planning and acceptance files remain the behavior specification. The number of automated tests is not the number of fully approved acceptance criteria.

## Resource evidence and limits

Local use and file transfer made zero point/reminder API calls in the browser test. Static asset requests are separate.

The image test observed no external HTTP(S) requests and no POST/PUT requests while importing/reading images on compiled local Cloudflare assets. Worker/engine/model files came from that same origin under the shipped CSP with `wasm-unsafe-eval`. The generated OCR directory has 21 files totaling 56,290,333 bytes; the largest is 10,923,060 bytes. A browser loads its selected engine variant, not every variant at first use. No image bytes or OCR result bodies go to the backend. Generated files are ignored in Git and recreated from locked packages at build time.

An earlier retained P2 prototype debounce test generated thirty edit events and one exchange after the five-second pause. Hidden sessions made no polling calls. Three failed attempts preserved the outbox and stopped repeated retries.

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

The direction is true-black-flat, seed 1430960693, with self-hosted Inter. No visual redraw was needed. The user-requested English copy and app-focused onboarding were reviewed in new screenshots. Pending-reminder and permission-denied screens were also reviewed at all three widths. Static lint has no failures; its hexadecimal zero-padding warning concerns token hashing, not UI numbering.

## Future scope

AC29 (full offline startup/use) is retired. OCR/video and transports FUT01–FUT03 remain future work. Light mode (RF22/AC89) and localization into other languages are deferred to P2. No integration with an official Marvel Snap alliance API is claimed.

## Reminder increment checks

Thirteen queue tests cover durable edits, reopening, bounded retries/return, replacement of a pending edit by removal, stale responses, invalid values, hidden/disconnected behavior, quota failure, permission reads and exclusion from backups. The API tests also verify device isolation, subscription-endpoint validation and repeatable removal.

Two browser scenarios run at each width: failed schedule change/reload/recovery with simulated revocation, and failed removal/reload/recovery. Requests contain reminder settings and device credentials, never player tables. No real notification was sent and no payment or production service was activated.

## Minimum settings increment checks

The weekly editor displays the applicable minimum without an edit action. All minimum changes are in Settings: the default for new weeks and a separate, collapsed saved-week correction with a mandatory reason. Tests at 1440/768/390 px verify historical isolation, old/new values in the exported revision, indicator recalculation and the absence of the old action. Light mode is planned as P2 only.

## Real screenshot and image-review increment

Four user-provided screenshots were processed on localhost as two independent weekly batches, without importing them into the visible user browser. Raw captures, transcripts and recognized names remain in ignored local diagnostics and are excluded from Git, deployment assets and logs.

| Batch | Proposed rows before grouping | Visible unique names | Missing totals after grouping | Numeric totals versus visual reference | External HTTP requests |
| --- | --- | --- | --- | --- | --- |
| Images 1–2 | 46 | 29 | 0 | Match | 0 |
| Images 3–4 | 33 | 30 | 0 | Match | 0 |

The first reader omitted many zero rows. The corrected reader prepares text contrast, removes colored role-icon noise, infers score-column positions, reads numbers separately and retries uncertain totals within their row. Cut-off names are omitted; missing/covered totals stay unknown unless another readable observation of that exact name supplies the value. Cube + Bounty checks consistency; it never substitutes for an unreadable Total.

Repeated names are grouped within each collection, without assigning a player identity or merging merely similar names. Original readings and image/time links survive backup. Conflicting totals require an explicit choice or manual correction before a confirmed result is saved. The UI uses the game's fixed format and offers image zoom, fit, actual size and panning both before reading and in the review.

Stylized names and ambiguous letters still need manual verification. Four screenshots from two weeks are useful regression evidence, not the planned 20-image representative accuracy study or proof of native game-window capture. No claim of perfect name recognition is made.
