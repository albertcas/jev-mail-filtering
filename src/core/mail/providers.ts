export const PROVIDERS = {
  gmail: { host: "imap.gmail.com", port: 993, secure: true, appPasswordUrl: "https://myaccount.google.com/apppasswords" },
  icloud: { host: "imap.mail.me.com", port: 993, secure: true, appPasswordUrl: "https://account.apple.com/account/manage" },
  yahoo: { host: "imap.mail.yahoo.com", port: 993, secure: true, appPasswordUrl: "https://login.yahoo.com/account/security" },
} as const;
export type ProviderId = keyof typeof PROVIDERS | "imap";
