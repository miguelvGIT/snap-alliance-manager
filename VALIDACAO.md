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

## Scope implemented

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
