# Connect iCloud Mail

🇪🇸 [Leer en español](icloud.es.md)

JEV Mail Filtering signs in to iCloud Mail over IMAP with an **app-specific password**: a password that only this app uses and that you can revoke at any time. Your Apple Account password does not work here.

> Provider websites change. If what you see differs from these steps, follow what is on the screen.

## Before you start

- **Two-factor authentication must be on** for your Apple Account. Apple only offers app-specific passwords when it is. Most accounts already have it; you can check in *Settings → [your name] → Sign-In & Security* on an iPhone or at [account.apple.com](https://account.apple.com).
- You need an iCloud Mail address (`@icloud.com`, `@me.com` or `@mac.com`).

## Steps

1. Sign in at [account.apple.com](https://account.apple.com).
2. Open **Sign-In and Security → App-Specific Passwords**.
3. Select **Generate an app-specific password** (or **+**), type a label such as `JEV Mail Filtering` and confirm. Apple may ask for your Apple Account password.
4. Copy the password (it looks like `xxxx-xxxx-xxxx-xxxx`).
5. In the setup wizard (step 2, *Your mailbox*), choose **iCloud Mail**, enter your **full** iCloud address (for example `you@icloud.com`) as the email and paste the password.
6. Select **Test connection**. When it says *Connected*, continue.

![Step 2 of the setup wizard (shown with Gmail selected; choose iCloud Mail)](../assets/setup-mailbox.png)

**With Docker**, put the password in your `.env` file as `IMAP_PASSWORD` and restart the container; leave the password field in the wizard empty.

## Server settings

The wizard fills these in for you:

| Setting | Value |
|---|---|
| IMAP server | `imap.mail.me.com` |
| Port | `993` |
| TLS | On |
| Username | Your full iCloud address, e.g. `you@icloud.com` |

## Common problems

| Problem | What to do |
|---|---|
| No *App-Specific Passwords* option | Two-factor authentication is not on for this Apple Account. Turn it on first. |
| *The server rejected the email or app password* | Use your iCloud Mail address, not a phone number or another address linked to the account. Create a new app-specific password if needed. |
| It worked before and now fails | Changing your Apple Account password revokes all app-specific passwords. Create a new one. |
| *Could not reach the service* / timeouts | A firewall or network may be blocking port 993. Try another network. |

To disconnect, revoke the password under **Sign-In and Security → App-Specific Passwords**. The app never modifies your mailbox: nothing is moved, deleted or marked as read.
