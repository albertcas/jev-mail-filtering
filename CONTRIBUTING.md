# Contributing

Thanks for your interest. Issues and pull requests are welcome. For anything larger than a small fix, please open an issue first so we can agree on the approach. By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

You don't need a TypeSafe API key or a real mailbox to contribute: the tests replay recorded Jev answers and demo mode uses fictional emails.

## Setup

Requirements: Node.js 22 or later (CI uses 22), and Docker if you want to run the IMAP integration tests.

```bash
git clone https://github.com/albertcas/jev-mail-filtering.git
cd jev-mail-filtering
npm install
DEMO_MODE=1 npm run dev   # demo inbox, no API key or mailbox needed
npm run dev               # real setup wizard
```

The app runs on `http://127.0.0.1:3737`. On Windows PowerShell, set the variable with `$env:DEMO_MODE="1"; npm run dev`.

To use the real wizard without touching your keychain or your normal data folder, set `JEV_SECRETS=env` (secrets are read from `TYPESAFE_API_KEY` and `IMAP_PASSWORD`) and `JEV_DATA_DIR=/some/scratch/folder`.

## Checks

Run these before opening a pull request; CI runs the same:

```bash
npm run lint
npm run typecheck
npm test                 # unit tests (Vitest)
npm run eval             # evaluation in replay mode, no API key needed
npm run test:e2e         # Playwright, builds and starts the demo on 127.0.0.1:3737
```

### IMAP integration tests (GreenMail)

```bash
docker run -d --rm --name greenmail -p 3025:3025 -p 3143:3143 -p 8080:8080 \
  -e GREENMAIL_OPTS="-Dgreenmail.setup.test.smtp -Dgreenmail.setup.test.imap -Dgreenmail.hostname=0.0.0.0 -Dgreenmail.users.login=email" \
  greenmail/standalone:2.1.0
GREENMAIL=1 npm run test:integration
docker stop greenmail
```

These tests check, among other things, that syncing never marks a message as read.

## Project layout

- `src/core/` holds the logic, independent of Next.js: `mail/`, `signals/`, `classify/`, `policy/`, `store/`, `secrets/`, `sync/`. Keep `signals/` and `policy/` pure functions.
- `src/app/` holds the UI and the internal API routes. Every API route must call `checkRequest` from `src/server/guard.ts`.
- `messages/en.json` and `messages/es.json` hold all UI text. Add every new string to both.
- `fixtures/demo/` holds the demo inbox (`source.json`), the generated `.eml` files and the recorded Jev answers (`jev-cache.json`).

See [docs/how-it-works.md](docs/how-it-works.md) for the design.

## Adding a brand to lookalike detection

Lookalike detection compares sender and link domains against `BRANDS` in [`src/core/signals/lookalike.ts`](src/core/signals/lookalike.ts). To add a brand:

1. Add an entry whose key is the brand label as it appears in domains (lowercase) and whose value lists **all** of its official registrable domains, for example `ing: ["ing.com", "ing.es"]`. A missing official domain means real emails from that brand get flagged.
2. Short labels (fewer than 5 characters) only match as a whole token (`ing-secure.com`), not by edit distance, to avoid false positives.
3. Add a test in `tests/unit/signals.test.ts` with an official domain (must not match) and a lookalike (must match).

## Changing the questions sent to Jev

The questions live in [`src/core/classify/questions.ts`](src/core/classify/questions.ts). **Any change to an instruction or criterion must bump `QUESTIONS_VERSION`.** The recorded answers are keyed by a hash of the questions, their version and the state, so after a change:

1. Bump `QUESTIONS_VERSION`.
2. Re-record the answers with a real key: `TYPESAFE_API_KEY=… npm run eval -- --live`. This updates `fixtures/demo/jev-cache.json` and `docs/eval-results.md`.
3. Commit both files and mention the accuracy change in the pull request.

The app's default model is pinned to the version the answers were recorded with (`DEFAULT_MODEL` in [`src/core/config.ts`](src/core/config.ts)). To move to a newer Jev, change it and re-record in the same pull request; a unit test fails while the two differ.

To add an evaluation email, add an entry to `fixtures/demo/source.json` (fictional people only; legitimate senders use reserved domains such as `*.example` or `example.com`), run `npm run fixtures:demo`, then record answers as above.

## Style

- TypeScript strict; no `any` without a reason.
- Email content is untrusted: render it as text only, never as HTML.
- Never log or return secrets.
- Commits follow Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`…).

By contributing, you agree that your contributions are licensed under the MIT License.
