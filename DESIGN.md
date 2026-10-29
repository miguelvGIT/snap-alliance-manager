# Application interface

Operate mode. The main task is to review weekly contributions and identify players needing attention.

Direction: true-black-flat, seed 1430960693, design-taste-frontend. Black background, #111/#2a2a2a surfaces, white primary text, #b4b4b4 secondary text and #949494 metadata. Primary controls are white. Color is reserved for scores, target progress and status. Inter is self-hosted.

The contribution table is the main element. Weekly date ranges follow the device locale. Real zeroes are zero; missing values are dashes. Target progress is calculated from recorded scores. Repeated misses have both a text label and color.

A compact header has no sidebar. Content is capped at 1208 px. Mobile navigation collapses; controls have 44 px touch targets; the table scrolls inside its frame. Dialogs protect file replacement, exemptions and assignments.

The onboarding headline is "Your alliance, week by week." Its form heading is "Set up your dashboard", and the button is "Start". The overview identifies players needing attention instead of highlighting reset time.

New installations are empty. Fictional fixtures are used only in isolated tests.

Minimum changes belong in Settings. The weekly editor displays the applied minimum without an edit action. Settings separates the default for new weeks from a collapsed saved-week correction form with a required reason.

Validation includes the current unsaved review, shows actionable blockers for unassigned/empty results, and focuses a saved-score confirmation with an overview link after success. Current-week validated totals appear immediately; historical metrics keep their end-of-week rules. The date shortcut is labelled "Find week by date", uses local date/time and is distinguished from capture time. Week changes protect unsaved images/reviews; saved collections can be reopened individually.

Light mode is P2: a future Settings choice between dark and light, persisted locally. The current version keeps the existing dark theme.

Settings contains Change alliance and Archived alliances beside the backup controls. Switching defaults to archiving; deletion and restoration use warnings, a mandatory acknowledgement and an explicit final action. Optional new minimum/target fields are collapsed to keep the confirmation readable on small screens. One alliance is active at a time; archives remain local.

Opening or canceling validation leaves its state unchanged. Only a successful final save publishes the validated state. Revision and score-correction notes are optional; exemption and historical-minimum reasons remain required. Validation highlights missing fields and unresolved assignments with text and a border, then focuses and scrolls to the first. Known scores can be explicitly validated as incomplete. The information icon sits to the right of the points and opens source readings using Image 1/Image 2 labels; filenames remain metadata.

Score intake offers Add images, Paste images and compatible desktop capture. A focusable paste area explains clipboard use without requiring a saved file. Image previews retain separate capture-time fields and open a zoom/pan viewer. The game's fixed score columns are detected automatically; there is no format selector. Repeated names occupy one review row with original readings behind the information icon. Divergent totals require an explicit choice. Reading has progress, cancellation and recoverable errors. Review retains source images, uncertain-row warnings and manual assignment; recognition never confirms completeness or identity.
