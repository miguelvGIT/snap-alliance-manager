# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Confirmed in PLANO.md: React, TypeScript, Vite, CSS Modules, Dexie, Zod, Cloudflare Workers/D1.

## Users and purpose

Marvel Snap alliance managers preserve weekly contributions and assess minimums. History survives manually confirmed name changes.

Players has a separate Former players section with departure dates and reasons. New departures require a reason and preserve the player's identity, scores and prior membership records. Rejoining opens another membership period; old departure reasons remain available. Legacy records without reasons still load.

## Constraints

No account for local use. No mandatory costs. Private tables and full file transfer. Automatic sync is P2 and disabled in the shipped MVP. File transfer stays free. Future sync with service/call costs requires server-verified paid Ko-fi access. Reminders remain an independent MVP feature. Dates are local, player identity is internal, and missing values differ from zero. Full offline support is out of scope.

Weekly intake is image-based: multiple screenshots or clipboard images with local OCR (P0), plus authorized assisted capture on compatible PCs (P1). No bulk text entry. Individual review corrections remain available. Saved-video import is P2. Images and recognized text stay on the device; engine/model assets use the app's own origin.

## Interface commitments

English-only application copy; localization can follow later. Onboarding explains what the app does and tracks an existing alliance. Its form heading is "Set up your dashboard", and its action is "Start". No reset-time callouts on onboarding or the overview.

Support URL confirmed by the user: https://ko-fi.com/tequilasunsett. "Alliance" is a working product name.

The top navigation is hidden until a dashboard is set up, a backup is imported, or existing local data loads. The support link remains in the footer before setup. The source repository is public by the user's request; alliance records remain private on each device.

## Alliance changes and review

One alliance is active per browser. Settings can archive or delete it before changing to an empty dashboard, with warnings and explicit confirmation. Local archives retain full identities and history and can be exported/restored/deleted. Switching affects all tabs in that browser. Device reminders remain independent.

Validation changes state only after its final successful save. Missing fields are highlighted and focused in place. Revision and score-correction notes are optional; exemption and minimum-change reasons remain required. Source readings use an information icon and simple image numbers.

## Evidence and open checks

PLANO.md and TESTES_ACEITACAO.md contain confirmed behavior. Four supplied real screenshots have been checked locally as two separate weekly batches. The broader OCR corpus and native-device/calendar checks remain open. VALIDACAO.md records executed checks and release blockers.
