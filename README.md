# JEV Mail Filtering

🇪🇸 [Leer en español](README.es.md)

**Your inbox, triaged by AI, on your own computer.**

![Your inbox sorted into Needs reply, Worth reading, Commercial, Possible scam, Unsure and Others](https://raw.githubusercontent.com/albertcas/jev-mail-filtering/main/docs/assets/dashboard-light.png)

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js 22 or newer](https://img.shields.io/badge/node-%E2%89%A5%2022-339933.svg)](https://nodejs.org)
[![CI](https://github.com/albertcas/jev-mail-filtering/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/albertcas/jev-mail-filtering/actions/workflows/ci.yml)

## What it does

JEV Mail Filtering reads your mailbox over IMAP (read-only), asks [TypeSafe](https://typesafe.ai)'s Jev model a few precise questions about each email, and shows the result as a mail client. The sidebar sorts everything into categories:

| Category | What lands there |
|---|---|
| **Needs reply** | A person is waiting for your answer, decision or action. Sorted by urgency. |
| **Worth reading** | Useful, but no reply needed: newsletters you signed up for, receipts, account notices. |
| **Commercial** | Marketing and sales outreach. |
| **Possible scam** | Signs of phishing or fraud: lookalike domains, failed sender authentication, requests for passwords or payments. |
| **Unsure** | Jev was not confident enough, so the app does not guess. |
| **Others** | Automated noise such as bounces and social network digests. |

- **Read-only.** The mailbox is opened with `EXAMINE` and read with `BODY.PEEK`: nothing is moved, deleted, labelled or marked as read.
- **Local.** The app runs on `127.0.0.1:3737`. Your settings, results and credentials stay on your computer.
- **Explainable.** Every email shows why it is in its category ("Domain resembles paypal", "Sender authentication failed", "Asks for sensitive data"). The reasons are produced by code, never by a model.
- **Tunable.** Open **Adjust**, move the threshold sliders and the list and its counters update instantly, without calling Jev again.

| Light | Dark | Phone |
|---|---|---|
| ![Light theme](https://raw.githubusercontent.com/albertcas/jev-mail-filtering/main/docs/assets/dashboard-light.png) | ![Dark theme](https://raw.githubusercontent.com/albertcas/jev-mail-filtering/main/docs/assets/dashboard-dark.png) | ![On a phone](https://raw.githubusercontent.com/albertcas/jev-mail-filtering/main/docs/assets/mobile.png) |

## Get started in 5 minutes

### What you need

- **Node.js 22 LTS or newer**: [download it from nodejs.org](https://nodejs.org). Check with `node -v` in a terminal.
- **Git** (optional, only for Option B): [git-scm.com](https://git-scm.com/downloads).
- **A TypeSafe API key** with access to Jev: [how to create one](docs/setup/typesafe-key.md).
- **An app password from your mail provider**, a separate password just for this app that you can revoke at any time: [Gmail](docs/setup/gmail.md) · [iCloud Mail](docs/setup/icloud.md) · [Yahoo Mail](docs/setup/yahoo.md) · [Other IMAP](docs/setup/imap.md).

No key or mailbox yet? You can [try the demo first](#try-it-first-without-an-account).

### Step 1. Get the code

**Option A · Download ZIP.** On the [GitHub page](https://github.com/albertcas/jev-mail-filtering) select **Code → Download ZIP**, or use the [direct link](https://github.com/albertcas/jev-mail-filtering/archive/refs/heads/main.zip). Unzip it, then open a terminal inside the unzipped folder (Windows: right-click the folder and choose **Open in Terminal**; macOS: right-click the folder and choose **New Terminal at Folder**).

**Option B · git clone.**

```bash
git clone https://github.com/albertcas/jev-mail-filtering.git
cd jev-mail-filtering
```

### Step 2. Install, build and start

These commands are the same on Windows (PowerShell), macOS and Linux:

```bash
npm install
npm run build
npm start
```

The first `npm install` and build take a couple of minutes. `npm start` prints a Next.js warning about `output: standalone`; you can ignore it.

### Step 3. Open the app

Open <http://127.0.0.1:3737> in your browser and follow the setup wizard. It checks your key and your mailbox connection, shows a cost estimate and runs the first analysis. After that the app syncs every 15 minutes (configurable in **Settings**) while it is running.

## Try it first without an account

Demo mode uses 50 fictional emails and recorded Jev answers: no API key and no mailbox needed. Run the build once (Step 2 above), then:

```bash
# macOS / Linux
DEMO_MODE=1 npm start
```

```powershell
# Windows PowerShell
$env:DEMO_MODE="1"; npm start
```

To turn demo mode off, stop the app with Ctrl+C and start it again from a new terminal. In the same PowerShell window, run `Remove-Item Env:DEMO_MODE` first, then `npm start`.

## With npx (once published on npm)

This is a future path: the package is not on npm yet, so it does not work today. Once it is published you will not need to download anything:

```bash
npx jev-mail-filtering           # opens http://127.0.0.1:3737 in your browser (--no-open to skip)
npx jev-mail-filtering --demo    # demo inbox
```

## Docker

An alternative if you prefer containers. You need [Docker](https://www.docker.com/products/docker-desktop/) and the code from Option A or B above. In the project folder:

```bash
# macOS / Linux
cp .env.example .env
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

Open `.env` in a text editor and fill in `TYPESAFE_API_KEY` and `IMAP_PASSWORD`. Then:

```bash
docker compose up -d
```

Open <http://127.0.0.1:3737> and complete the wizard (server and email address; the password is read from `.env`). Stop it with `docker compose down`. The port is published on `127.0.0.1` only and the data lives in the `jev-data` Docker volume. In this mode the secrets are kept in plain text in `.env`, so protect that file.

## Everyday use

- **Start it again later:** open a terminal in the project folder and run `npm start`, then open <http://127.0.0.1:3737>.
- **Stop it:** press Ctrl+C in the terminal.
- **Update:** run `git pull` (Option B), or download the new ZIP (Option A) and unzip it into a new folder. Then, in the project folder, run `npm install` followed by `npm run build`.
- **Where your data lives:** in `~/.jev-mail-filtering` (Windows: `%USERPROFILE%\.jev-mail-filtering`). Your API key and app password are stored in your operating system's keychain (Windows Credential Manager on Windows).
- **Uninstall and delete everything:** in the app select **Settings → Delete all local data** (this removes the local database, your settings and the stored credentials; your mailbox is not touched), then delete the project folder. Revoke the app password with your mail provider and delete the API key in the TypeSafe console if you no longer use them.

## Troubleshooting

| Problem | What to do |
|---|---|
| **Port 3737 is already in use** | `npm start` always uses port 3737, so free it. A previous `npm start` may still be running in another terminal (press Ctrl+C there). Otherwise find the process: on Windows run `netstat -ano \| findstr :3737` and stop it with `taskkill /PID <id> /F`; on macOS/Linux run `lsof -i :3737` and `kill <pid>`. |
| **Wrong Node.js version** | Run `node -v`. It must print v22 or higher; if not, install Node.js 22 LTS from [nodejs.org](https://nodejs.org) and open a new terminal. |
| **`npm install` fails while building native modules** | Use Node.js 22 LTS. On Windows, run the Node.js installer again and tick **Automatically install the necessary tools** (Tools for Native Modules). |
| **Gmail rejects the app password** | 2-Step Verification must be on, and app passwords must be allowed. Google Workspace administrators can block IMAP or app passwords. See the [Gmail guide](docs/setup/gmail.md). |
| **Nothing is classified, or "Your TypeSafe key was rejected or has no credit"** | Jev is in early access: check that your key has access to it and that your account has credit. Verifying the key in the wizard costs nothing. |
| **Emails are not marked as read** | By design. The app never changes your mailbox. |

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

Read these numbers with care: the evaluation set is 50 fictional emails written by the author, each with a clear-cut label, and the same set was at hand while the questions were written. It is a sanity check, not a benchmark: with a sample this small, no misses in 12 scam emails is still compatible with missing up to about 22% of them. Real inboxes are messier, so expect lower accuracy on yours. Full report in [docs/eval-results.md](docs/eval-results.md); reproduce it with `npm run eval`.

> **Scam detection is advisory. Never trust it blindly.** An email outside the *Possible scam* category is not guaranteed to be safe.

## How it works

```
IMAP (read-only) ──► signals (code) ──► Jev: 9 questions ──► policy (code) ──► your inbox
                     SPF/DKIM/DMARC,     one call per email    thresholds,
                     lookalike domains,  typed probabilities   "safety first"
                     mismatched links
```

Deterministic code checks what can be verified (authentication results, lookalike domains, links whose text and target disagree, risky attachments). Jev judges what needs language understanding (is someone asking you to act? is this pressure or impersonation?). A small, pure policy function combines both into the final category. Code stays in control of the flow; the model only answers bounded questions. Architecture, the nine questions and the decision rules: [docs/how-it-works.md](docs/how-it-works.md).

## Requirements

- Node.js 22 or later, or Docker.
- A TypeSafe API key with access to Jev (currently in early access). Without one you can still run the demo.
- A mailbox with IMAP and app passwords: Gmail, iCloud Mail, Yahoo Mail or any standard IMAP server. Outlook/Hotmail is not supported yet (it requires OAuth).

## Roadmap

- Outlook and Microsoft 365 (OAuth).
- Deadline extraction for emails that need a reply.
- A hosted demo.

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md). To report a vulnerability, see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE). Built by [acastell.dev](https://acastell.dev).
