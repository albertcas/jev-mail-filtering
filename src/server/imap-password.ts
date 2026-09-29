import type { SecretStore } from "@/core/secrets";

/**
 * The password to test an IMAP connection with: the one typed in the wizard,
 * or, in .env mode only, IMAP_PASSWORD from the environment when the field was
 * left empty. null when neither is available (the route answers bad_request).
 */
export async function resolveImapPassword(
  bodyPassword: string | undefined,
  secrets: Pick<SecretStore, "kind" | "get">,
): Promise<string | null> {
  if (bodyPassword) return bodyPassword;
  if (secrets.kind !== "env") return null;
  return (await secrets.get("imap_password")) || null;
}
