# JEV Mail Filtering

🇪🇸 [Leer en español](README.es.md)

**Your inbox, triaged by AI, on your own computer.** JEV Mail Filtering reads your mailbox over IMAP (read-only), asks [TypeSafe](https://typesafe.ai)'s Jev model a few precise questions about each email, and sorts everything into a dashboard: what needs a reply, what is worth reading, what is marketing and what looks like a scam.

![Dashboard of the demo inbox: emails sorted into Needs reply, Worth reading, Commercial, Possible scam and Unsure](https://raw.githubusercontent.com/albertcas/jev-mail-filtering/main/docs/assets/demo.gif)

You can try it without an API key or a mailbox: demo mode uses 50 fictional emails and recorded Jev answers. Run it [from source](#from-source) with `DEMO_MODE=1 npm start`. A hosted demo is planned.

## What it does

| Column | What lands there |
|---|---|
| **Needs reply** | A person is waiting for your answer, decision or action. Sorted by urgency. |
| **Worth reading** | Useful, but no reply needed: newsletters you signed up for, receipts, account notices. |
| **Commercial** | Marketing and sales outreach. |
| **Possible scam** | Signs of phishing or fraud: lookalike domains, failed sender authentication, requests for passwords or payments. |
| **Unsure** | Jev was not confident enough, so the app does not guess. |

Automated noise (bounces, social network digests) goes to an **Others** filter, hidden by default.

- **Read-only.** The mailbox is opened with `EXAMINE` and read with `BODY.PEEK`: nothing is moved, deleted, labelled or marked as read.
- **Local.** The app runs on `127.0.0.1:3737`. Your settings, results and credentials stay on your computer.
- **Explainable.** Every card shows why it is there ("Domain resembles paypal", "Sender authentication failed", "Asks for sensitive data"). The reasons are produced by code, never by a model.
- **Tunable.** Move the threshold sliders and the columns update instantly, without calling Jev again.

| Light | Dark | Phone |
|---|---|---|
| ![Dashboard, light theme](https://raw.githubusercontent.com/albertcas/jev-mail-filtering/main/docs/assets/dashboard-light.png) | ![Dashboard, dark theme](https://raw.githubusercontent.com/albertcas/jev-mail-filtering/main/docs/assets/dashboard-dark.png) | ![Dashboard on a phone](https://raw.githubusercontent.com/albertcas/jev-mail-filtering/main/docs/assets/mobile.png) |

## Quick start

You need Node.js 22 or later, a TypeSafe API key with access to Jev, and an email account that supports app passwords.

1. **Start the app** [from source](#from-source) (or [with npx](#with-npx-once-published-on-npm) once the package is published on npm) and open `http://127.0.0.1:3737`. The setup wizard guides you through the rest.
2. **Create a TypeSafe API key:** see [docs/setup/typesafe-key.md](docs/setup/typesafe-key.md).
3. **Create an app password for your mailbox:** [Gmail](docs/setup/gmail.md) · [iCloud Mail](docs/setup/icloud.md) · [Yahoo Mail](docs/setup/yahoo.md) · [Other IMAP](docs/setup/imap.md).

The wizard checks the key and the connection, shows a cost estimate and runs the first sync. After that the app syncs every 15 minutes (configurable) while it is running. Credentials are stored in your operating system's keychain and data in `~/.jev-mail-filtering/`.

### From source

```bash
git clone https://github.com/albertcas/jev-mail-filtering.git
cd jev-mail-filtering
npm install
npm run build
npm start                  # your inbox: setup wizard on http://127.0.0.1:3737
DEMO_MODE=1 npm start      # or the demo inbox: no key or mailbox needed
```

On Windows PowerShell, start the demo with `$env:DEMO_MODE="1"; npm start`. `npm start` prints a Next.js warning about `output: standalone`; you can ignore it.

### With npx (once published on npm)

After the package is published on npm, you will not need to clone the repository:

```bash
npx jev-mail-filtering           # opens http://127.0.0.1:3737 in your browser (--no-open to skip)
npx jev-mail-filtering --demo    # demo inbox
```

### Docker

```bash
git clone https://github.com/albertcas/jev-mail-filtering.git
cd jev-mail-filtering
cp .env.example .env    # then fill in TYPESAFE_API_KEY and IMAP_PASSWORD
docker compose up -d
```

Open `http://127.0.0.1:3737` and complete the wizard (server and email address; the password is read from `.env`). The port is published on `127.0.0.1` only and the data lives in the `jev-data` volume. In this mode the secrets are kept in plain text in `.env`, so protect that file.

## Privacy

For each email, the app sends one request to TypeSafe containing:

- the start of the text, as plain text (at most 2,000 characters);
- the sender's name and address, the subject, and your own name and address;
- the domains of the links (not the full URLs) and the names of the attachments (not their content);
- the signals the app computed locally (for example, "sender authentication failed").

It does **not** send full headers, attachments, the full body, dates, or anything from other emails. TypeSafe states that it does not train on customer data; zero data retention is only available on its enterprise plan. Details, and how to delete everything, in [PRIVACY.md](PRIVACY.md).

## Accuracy

Evaluated with `jev-1.13.0` on the 50 emails of the demo inbox (English and Spanish), with the default thresholds:

| Category | Precision | Recall | Emails |
|---|---|---|---|
| Needs reply | 100% | 100% | 12 |
| Worth reading | 100% | 100% | 12 |
| Commercial | 100% | 100% | 12 |
| Possible scam | 100% | 100% | 12 |
| Others (noise) | 100% | 100% | 2 |
| **Overall** | | **100%** (50/50) | English 100% · Spanish 100% |

Read these numbers with care: the evaluation set is 50 fictional emails written by the author, each with a clear-cut label. Real inboxes are messier, so expect lower accuracy on yours. Full report in [docs/eval-results.md](docs/eval-results.md); reproduce it with `npm run eval`.

> **Scam detection is advisory. Never trust it blindly.** An email outside the *Possible scam* column is not guaranteed to be safe.

## How it works

```
IMAP (read-only) ──► signals (code) ──► Jev: 9 questions ──► policy (code) ──► dashboard
                     SPF/DKIM/DMARC,     one call per email    thresholds,
                     lookalike domains,  typed probabilities   "safety first"
                     mismatched links
```

Deterministic code checks what can be verified (authentication results, lookalike domains, links whose text and target disagree, risky attachments). Jev judges what needs language understanding (is someone asking you to act? is this pressure or impersonation?). A small, pure policy function combines both into the final column. Code stays in control of the flow; the model only answers bounded questions. Architecture, the nine questions and the decision rules: [docs/how-it-works.md](docs/how-it-works.md).

## Requirements

- Node.js 22 or later, or Docker.
- A TypeSafe API key with access to Jev (currently in early access). Without one you can still run the demo.
- A mailbox with IMAP and app passwords: Gmail, iCloud Mail, Yahoo Mail or any standard IMAP server. Outlook/Hotmail is not supported yet (it requires OAuth).

## Roadmap

- Outlook and Microsoft 365 (OAuth).
- Deadline extraction for emails that need a reply.

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md). To report a vulnerability, see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE). Built by [acastell.dev](https://acastell.dev).
