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
- Full offline support, OCR/video and FUT01–FUT03 are outside this version.
- Emulation does not prove native installation, real push receipt or a reset-week pilot.
