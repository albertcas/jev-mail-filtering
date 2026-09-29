# Privacy

JEV Mail Filtering runs on your computer. There is no server run by the author, no account, no analytics and no telemetry. The only external services it talks to are **your mail server** (IMAP, read-only) and **TypeSafe** (to classify each email with the Jev model).

## What is sent to TypeSafe

One request per email, to `https://api.typesafe.ai/v1/systemone`, containing ([`src/core/classify/state.ts`](src/core/classify/state.ts)):

| Field | Detail |
|---|---|
| Recipient | Your display name and email address. |
| Sender | Name and address from the `From` header. |
| Subject | Up to 300 characters. |
| Body excerpt | The start of the text, converted to plain text with whitespace collapsed, up to 2,000 characters. |
| Link domains | The registrable domain of each link (e.g. `example.com`), not the full URL. Up to 10. |
| Attachment names | File names only, never the content. Up to 10. |
| Signals | Computed locally: sender authentication result (pass/fail/none), whether `Reply-To` differs from the sender, the brand a domain imitates (if any), whether there is an unsubscribe header, whether you replied in the thread or wrote to the sender before, whether there are risky attachments, whether links are mismatched. |

Along with the nine fixed questions described in [docs/how-it-works.md](docs/how-it-works.md).

**Not sent:** full headers, attachment contents, the full body beyond the excerpt, dates, full link URLs, your Sent folder, or anything from other emails.

When you check your API key in the setup wizard, the app also calls TypeSafe's model list endpoint, which sends only the key.

### TypeSafe's data handling

TypeSafe states that it does not train its models on customer data. Zero data retention (ZDR) is only offered on its enterprise plan, so on other plans the requests above may be retained by TypeSafe under its own terms. Check TypeSafe's current terms and privacy policy at [typesafe.ai](https://typesafe.ai) before connecting a mailbox with sensitive content.

## What is read from your mailbox

- Messages from the configured folder (INBOX by default) within the configured window (14 days by default, at most 500 per sync). The folder is opened read-only (`EXAMINE`) and messages are fetched with `BODY.PEEK`, so nothing is marked as read, moved, labelled or deleted.
- Headers of your Sent folder (`Message-ID` and recipients) to know whether you already replied in a thread or have written to a sender. This index is kept in memory during a sync.

## What is stored on your computer

In `~/.jev-mail-filtering/data.db` (SQLite; `/data` in Docker):

- per message: sender, subject, date, the excerpt, the computed signals and the state sent to Jev (the full body is not stored);
- Jev's raw answers, the model version and token counts;
- your manual corrections, sync history and settings (server, email address, folder, thresholds).

Credentials (the TypeSafe key and the IMAP app password) are stored in your operating system's keychain under the service name `jev-mail-filtering`. In Docker they are read from environment variables (your `.env` file), which is plain text: protect it.

## How to delete everything

- In the app: **Settings → Delete all local data**. This removes the database contents, your settings and the credentials stored in the keychain. Your mailbox is not touched.
- By hand: delete the `~/.jev-mail-filtering/` folder and the `jev-mail-filtering` entries in your keychain.
- Docker: `docker compose down -v` removes the container and the `jev-data` volume; then delete your `.env`.
- Revoke the app password in your email provider's security settings and delete the API key in the TypeSafe console if you no longer use them.

## Demo mode

`npx jev-mail-filtering --demo` uses 50 fictional emails and answers recorded in advance. It does not connect to any mail server or to TypeSafe.

## Scam detection is advisory

The *Possible scam* column is a helper, not a guarantee. Never trust it blindly, and never assume an email is safe because it is not flagged.
