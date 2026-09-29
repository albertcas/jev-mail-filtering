import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { JevAnswersSchema, type JevAnswers } from "./answers";
import { QUESTIONS, QUESTIONS_VERSION } from "./questions";
import type { JevState } from "./state";
import type { Classifier } from "./jev-classifier";

export class CacheMissError extends Error {
  constructor(key: string) {
    super(`No cached Jev answer for ${key}`);
    this.name = "CacheMissError";
  }
}

export function cacheKey(state: JevState): string {
  return createHash("sha256").update(JSON.stringify({ v: QUESTIONS_VERSION, q: QUESTIONS, state })).digest("hex");
}

export function loadCache(path: string): Record<string, JevAnswers> {
  const raw = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, JevAnswersSchema.parse(v)]));
}

export class CachedClassifier implements Classifier {
  constructor(private readonly cache: Record<string, JevAnswers>) {}
  async classify(state: JevState): Promise<JevAnswers> {
    const key = cacheKey(state);
    const hit = this.cache[key];
    if (!hit) throw new CacheMissError(key);
    return hit;
  }
}

export class RecordingClassifier implements Classifier {
  readonly #entries: Record<string, JevAnswers> = {};
  constructor(private readonly inner: Classifier) {}
  async classify(state: JevState): Promise<JevAnswers> {
    const answers = await this.inner.classify(state);
    this.#entries[cacheKey(state)] = answers;
    return answers;
  }
  entries(): Record<string, JevAnswers> {
    return { ...this.#entries };
  }
}
