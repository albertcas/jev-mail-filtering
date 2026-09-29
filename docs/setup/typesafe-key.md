# Create a TypeSafe API key

🇪🇸 [Leer en español](typesafe-key.es.md)

JEV Mail Filtering classifies each email with Jev, TypeSafe's model, using **your own** TypeSafe account. The key stays on your computer and is only used by the local server.

> Provider websites change. If what you see differs from these steps, follow what is on the screen.

## Before you start

- A TypeSafe account with access to Jev. Jev is in early access; if your account does not have access yet, see [No access yet?](#no-access-yet) below.

## Steps

1. Open [console.typesafe.ai/keys](https://console.typesafe.ai/keys) and sign in.
2. Create a new API key. Give it a name you will recognise, such as `JEV Mail Filtering`.
3. Copy the key right away; you may not be able to see it again.
4. In the setup wizard (step 1, *TypeSafe API key*), paste it and select **Verify**. Verifying only lists the available models, so it costs nothing.

![Step 1 of the setup wizard: TypeSafe API key](../assets/setup-key.png)

The key is saved in your operating system's keychain (Keychain on macOS, Credential Manager on Windows, Secret Service on Linux), never in the browser.

**With Docker**, put the key in your `.env` file instead and restart the container:

```bash
TYPESAFE_API_KEY=your-key
```

## What it costs

Jev is billed per input token (about $0.042 per million at the time of writing; output is free). In the demo inbox an email takes about 1,150 input tokens, so 1,000 emails cost roughly five cents. The wizard shows an estimate before the first sync, and the dashboard shows the running total.

## No access yet?

If you are on the waiting list, you can still see the app working with the demo inbox, which uses recorded Jev answers and needs no key:

```bash
DEMO_MODE=1 npm start    # from a clone, after npm install and npm run build (see the README)
```

On Windows PowerShell: `$env:DEMO_MODE="1"; npm start`. Once the package is published on npm, `npx jev-mail-filtering --demo` will do the same without cloning.

## Common problems

| Message | What to do |
|---|---|
| *That key was rejected* | The key was copied incompletely, or it was deleted in the console. Copy it again or create a new one. |
| *Could not reach the service* | Check your internet connection, VPN or proxy, and try again. |
| Classification stops later with a key or permission error | The key was revoked, or the account ran out of balance or lost access to Jev. Check the console; what was already classified stays visible. |

To stop using the key, delete it in the console and select **Settings → Delete all local data** in the app.
