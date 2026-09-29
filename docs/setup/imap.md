# Connect another IMAP mailbox

🇪🇸 [Leer en español](imap.es.md)

Any mail server that supports standard IMAP with a password works: hosting providers, company servers, privacy-focused providers and so on. The app only reads (the folder is opened with `EXAMINE`); nothing is moved, deleted or marked as read.

> Provider websites change. If what you see differs from these steps, follow what is on the screen.

## Before you start

You need three things from your provider. Search their help pages for "IMAP settings" or look at the settings of an email app where the account already works.

| Setting | Usually |
|---|---|
| IMAP server | `imap.yourprovider.com` or `mail.yourdomain.com` |
| Port | `993` |
| TLS (SSL) | On |

And a password:

- **If your account uses two-step sign-in**, create an **app password** in the account's security settings (it may be called *app-specific password* or *device password*). Your normal password will usually be rejected.
- Otherwise, use the account's password. If your provider supports app passwords anyway, prefer one: you can revoke it without changing your main password.

Not supported: **Outlook, Hotmail and Microsoft 365** (Microsoft requires OAuth for IMAP; planned) and providers that do not offer IMAP with a password.

## Steps

1. In the setup wizard (step 2, *Your mailbox*), choose **Other IMAP**.
2. Enter the IMAP server, the port and whether to use TLS.
3. Enter your email address (or the username your provider gives you) and the password.
4. Select **Test connection**. When it says *Connected*, continue.

**With Docker**, put the password in your `.env` file as `IMAP_PASSWORD` and restart the container; leave the password field in the wizard empty.

Keep TLS on. Turn it off only for a server on your own machine or network that has no TLS, such as a local bridge or a test server.

## Common problems

| Problem | What to do |
|---|---|
| *The server rejected the email or app password* | Check the username (some providers want the full address, others only the part before `@`) and use an app password if the account has two-step sign-in. |
| *Could not reach the service* / timeouts | Check the server name and port, and that TLS matches the port (993 uses TLS). A firewall may be blocking the port. |
| Connected, but no emails appear | The wizard analyses INBOX by default. Choose another folder in step 3 if your provider stores mail elsewhere, and check the number of days back. |
