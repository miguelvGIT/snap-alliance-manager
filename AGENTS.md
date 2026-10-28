# Development

- Product behavior: PLANO.md and TESTES_ACEITACAO.md. Preserve acceptance IDs.
- UI copy is English-only for this version. Localization is future work; preserve device-local dates.
- Onboarding tracks an existing alliance. Do not imply creating an alliance in the game. The initial action is "Start".
- Do not highlight reset time on onboarding or the overview. Reminder settings and collection metadata may show operational timing.
- Stack: React/TypeScript/Vite/CSS Modules, Dexie/IndexedDB, Zod, Cloudflare Workers/D1.
- Commands: `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm test:e2e`, `pnpm db:migrate`, `pnpm dev:api`.
- Commit each meaningful project increment with a short, plain message explaining what changed. Include only the work for that increment and complete the relevant checks before committing.
- Local use requires no account. Send tables only after explicit sync activation. No paid APIs or automatic billing.
- Keep real data, backups, credentials and secrets out of Git/logs. `.dev.vars` is ignored.
- Tests use localhost, fictional data and local D1, never production.
- Player IDs are internal. Never infer a rename, assignment or departure automatically.
- Group repeated image observations into one review row per exact name, preserving originals; never merge similar names or player identities. Conflicting totals require an explicit choice. The game's fixed four-column layout is automatic; keep zoom/pan available for captured and uploaded images.
- Automatic sync and remote conflicts are P2; keep the prototype disabled in the shipped MVP. If future sync incurs service/call costs, require server-verified paid access through Ko-fi. Local use and file transfer stay free.
- Weekly intake uses local image OCR: multi-image selection and clipboard images are P0; authorized assisted screen capture on compatible PCs is P1. No bulk text-paste entry. Individual review corrections remain available. Never upload images or use paid OCR APIs. Saved-video import, full offline support and FUT01–FUT03 remain future scope.
- Emulation does not prove native installation, real push receipt or a reset-week pilot.
