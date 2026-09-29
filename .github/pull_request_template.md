## What and why

<!-- What does this change and why? Link the issue it closes, e.g. "Closes #12". -->

## How it was tested

<!-- Commands you ran and what you checked by hand (demo mode is enough for most UI changes). -->

## Checklist

- [ ] `npm test`, `npm run lint` and `npm run typecheck` pass
- [ ] `npm run test:e2e` passes if the UI changed
- [ ] New or changed text is in both `messages/en.json` and `messages/es.json`
- [ ] If a Jev question in `src/core/classify/questions.ts` changed, `QUESTIONS_VERSION` was bumped (the maintainer re-records the demo answers)
- [ ] The app stays read-only and no new personal data is sent to TypeSafe
- [ ] No real emails, addresses, API keys or passwords in code, fixtures, screenshots or this description
