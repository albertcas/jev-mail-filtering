import { AppConfigSchema, type AppConfig } from "@/core/config";

/**
 * Applies a partial patch over a saved config. Only keys actually present in the patch
 * override saved values (so zod defaults never clobber them); the merged result is validated.
 * Throws a ZodError when a patched value is invalid.
 */
export function mergeConfig(current: AppConfig, patch: Record<string, unknown>): AppConfig {
  const present = Object.fromEntries(
    Object.entries(patch).filter(([k, v]) => v !== undefined && k in AppConfigSchema.shape),
  );
  return AppConfigSchema.parse({ ...current, ...present });
}
