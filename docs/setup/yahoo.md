# Connect Yahoo Mail

🇪🇸 [Leer en español](yahoo.es.md)

JEV Mail Filtering signs in to Yahoo Mail over IMAP with an **app password**: a password that only this app uses and that you can revoke at any time. Your normal Yahoo password does not work here.

> Provider websites change. If what you see differs from these steps, follow what is on the screen.

## Before you start

- A Yahoo Mail account you can sign in to on the web.

## Steps

1. Open [login.yahoo.com/account/security](https://login.yahoo.com/account/security) (*Account security*) and sign in if asked.
2. Select **Generate app password** (it may be called *Generate and manage app passwords*).
3. Type a name such as `JEV Mail Filtering` and select **Generate password**.
4. Copy the password that appears and select **Done**.
5. In the setup wizard (step 2, *Your mailbox*), choose **Yahoo Mail**, enter your full Yahoo address and paste the password.
6. Select **Test connection**. When it says *Connected*, continue.

![Step 2 of the setup wizard (shown with Gmail selected; choose Yahoo Mail)](../assets/setup-mailbox.png)

**With Docker**, put the password in your `.env` file as `IMAP_PASSWORD` and restart the container; leave the password field in the wizard empty.

## Server settings

The wizard fills these in for you:

| Setting | Value |
|---|---|
| IMAP server | `imap.mail.yahoo.com` |
| Port | `993` |
| TLS | On |
| Username | Your full address, e.g. `you@yahoo.com` |

## Common problems

| Problem | What to do |
|---|---|
| No *Generate app password* option | Yahoo may require two-step verification first. Turn it on in *Account security* and look again. |
| *The server rejected the email or app password* | Check that you used the full address and the app password (not your normal password). Generate a new one if needed. |
| *Could not reach the service* / timeouts | A firewall or network may be blocking port 993. Try another network. |

To disconnect, remove the app password in *Account security*. The app never modifies your mailbox: nothing is moved, deleted or marked as read.
