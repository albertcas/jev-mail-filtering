# Security

## Reporting a vulnerability

Please email **acastell.dev@gmail.com** with a description, the steps to reproduce and the version or commit you tested. Do not open a public issue for security problems.

You will get an acknowledgement within a few days. Once a fix is released, you will be credited in the release notes unless you prefer otherwise.

Only the latest version on `main` is supported.

## Threat model (summary)

JEV Mail Filtering is a single-user app that runs on the user's own computer. It holds two secrets (a TypeSafe API key and an IMAP app password) and processes untrusted content (email). The design assumes that other websites open in the same browser, and the emails themselves, may be hostile.

| Threat | Mitigation |
|---|---|
| **Access from the network** | The server binds to `127.0.0.1` (the Docker image publishes the port on `127.0.0.1` only). |
| **CSRF** from other websites in the browser | Every state-changing API route requires an `Origin` header equal to the app's own host and port. Pages on other local ports are rejected too. |
| **DNS rebinding** | Every API route rejects requests whose `Host` header is not `127.0.0.1`, `localhost` or `[::1]`. |
| **Malicious email content** (XSS, tracking, phishing) | Email content is rendered as escaped plain text; HTML from emails is never rendered and remote images are never loaded. |
| **Prompt injection** against the classifier | Jev only answers fixed, typed questions and cannot trigger any action. Verifiable facts (authentication, lookalike domains, link mismatches) are computed in code. The `addresses_the_classifier` question turns attempts to instruct the model into scam evidence. See [docs/how-it-works.md](docs/how-it-works.md). |
| **Changes to the mailbox** | The IMAP connection is read-only (`EXAMINE`, `BODY.PEEK`). The app has no code path that moves, deletes or flags messages. |
| **Secret leakage** | Secrets are stored in the OS keychain (or environment variables in Docker), read only on the server, and never included in API responses or logs. |
| **Public demo abuse** | With `DEMO_MODE=1` every write route returns `403`, and the demo holds no secrets. |

Out of scope: an attacker who already runs code as your user on the same machine, and the security of TypeSafe's service or your mail provider.

Scam detection is advisory and is not a security control. Never trust it blindly.
