import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";

function keys(o: object, prefix = ""): string[] {
  return Object.entries(o).flatMap(([k, v]) => (typeof v === "object" && v ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
}

describe("messages", () => {
  it("es and en have exactly the same keys", () => {
    expect(keys(es).sort()).toEqual(keys(en).sort());
  });
  it("covers every reason key produced by the policy", () => {
    const reasonKeys = ["resembles", "authFailed", "mismatchedLinks", "replyToDiffers", "riskyAttachment", "impersonation", "requestsSensitiveData", "pressureTactics", "addressesClassifier", "ongoingThread", "knownSender", "asksToAct", "personal", "promotional", "bulkUnsubscribe", "manualOverride"];
    for (const k of reasonKeys) expect(en.reason).toHaveProperty(k);
  });
});
