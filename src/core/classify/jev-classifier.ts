import { TypeSafeClient } from "@typesafe-ai/sdk";
import { JevAnswersSchema, NOUL_IDS, type JevAnswers } from "./answers";
import { QUESTIONS } from "./questions";
import type { JevState } from "./state";

export interface Classifier {
  classify(state: JevState): Promise<JevAnswers>;
}

export class JevClassifier implements Classifier {
  readonly #client: TypeSafeClient;

  constructor(opts: { apiKey: string; model?: string; fetch?: (input: string, init?: RequestInit) => Promise<Response> }) {
    this.#client = new TypeSafeClient({
      apiKey: opts.apiKey,
      defaultModel: opts.model ?? "jev-latest",
      timeout: 15_000,
      logLevel: "off",
      ...(opts.fetch ? { fetch: opts.fetch } : {}),
    });
  }

  async classify(state: JevState): Promise<JevAnswers> {
    const res = await this.#client.systemOne({ state, questions: QUESTIONS });
    return JevAnswersSchema.parse({
      model: res.model,
      inputTokens: res.usage.input_tokens,
      category: {
        choice: res.answers.category.choice,
        confidence: res.answers.category.confidence,
        probabilities: res.answers.category.probabilities,
      },
      nouls: Object.fromEntries(NOUL_IDS.map((id) => [id, res.answers[id].noul])),
      urgency: { score: res.answers.urgency.score, confidence: res.answers.urgency.confidence },
    });
  }
}
