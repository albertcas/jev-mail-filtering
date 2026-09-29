import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3", "@napi-rs/keyring", "imapflow", "mailparser"],
  // The demo reads fixtures with fs at runtime; make sure they ship with the server bundle.
  outputFileTracingIncludes: { "/**": ["./fixtures/demo/**"] },
};

export default withNextIntl(nextConfig);
