export type SecretName = "typesafe_api_key" | "imap_password";

export interface SecretStore {
  readonly kind: "keyring" | "env" | "memory";
  readonly writable: boolean;
  get(name: SecretName): Promise<string | null>;
  set(name: SecretName, value: string): Promise<void>;
  delete(name: SecretName): Promise<void>;
}

const ENV_NAMES: Record<SecretName, string> = { typesafe_api_key: "TYPESAFE_API_KEY", imap_password: "IMAP_PASSWORD" };
const SERVICE = "jev-mail-filtering";
const PROBE_USER = "__probe__";

export class EnvSecretStore implements SecretStore {
  readonly kind = "env";
  readonly writable = false;
  constructor(private readonly env: Record<string, string | undefined> = process.env) {}
  async get(name: SecretName) {
    return this.env[ENV_NAMES[name]] || null;
  }
  async set(): Promise<void> {
    throw new Error("Secrets are read-only in env mode: edit your .env file");
  }
  async delete(): Promise<void> {
    throw new Error("Secrets are read-only in env mode: edit your .env file");
  }
}

export class MemorySecretStore implements SecretStore {
  readonly kind = "memory";
  readonly writable = true;
  readonly #m = new Map<SecretName, string>();
  async get(name: SecretName) { return this.#m.get(name) ?? null; }
  async set(name: SecretName, value: string) { this.#m.set(name, value); }
  async delete(name: SecretName) { this.#m.delete(name); }
}

type KeyringModule = typeof import("@napi-rs/keyring");

export class KeyringSecretStore implements SecretStore {
  readonly kind = "keyring";
  readonly writable = true;
  constructor(private readonly mod: KeyringModule) {}
  private entry(name: SecretName | typeof PROBE_USER) { return new this.mod.Entry(SERVICE, name); }
  async get(name: SecretName) {
    const pwd = this.entry(name).getPassword();
    return pwd ?? null;
  }
  async set(name: SecretName, value: string) { this.entry(name).setPassword(value); }
  async delete(name: SecretName) {
    const deleted = this.entry(name).deletePassword();
    if (!deleted) {
      // entry was already absent
    }
  }
}

export async function createSecretStore(
  loadKeyring: () => Promise<KeyringModule> = () => import("@napi-rs/keyring")
): Promise<SecretStore> {
  if (process.env.JEV_SECRETS === "env") return new EnvSecretStore();
  try {
    const mod = await loadKeyring();
    const store = new KeyringSecretStore(mod);
    // perform real round-trip probe: set → get → delete
    const probe = new mod.Entry(SERVICE, PROBE_USER);
    try {
      probe.setPassword("__test__");
      const retrieved = probe.getPassword();
      if (retrieved !== "__test__") {
        throw new Error("Probe: password mismatch");
      }
    } finally {
      probe.deletePassword();
    }
    return store;
  } catch {
    return new EnvSecretStore();
  }
}
