import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CachedClassifier, CacheMissError, loadCache, RecordingClassifier } from "@/core/classify/cached-classifier";
import { JevClassifier, type Classifier } from "@/core/classify/jev-classifier";
import { buildState } from "@/core/classify/state";
import { computeMetrics, renderMarkdown, type EvalRow } from "@/core/eval/metrics";
import { FixtureMailSource } from "@/core/mail/fixture-source";
import { decide } from "@/core/policy/decide";
import { DEFAULT_THRESHOLDS } from "@/core/policy/thresholds";
import { computeSignals } from "@/core/signals";

const live = process.argv.includes("--live");
const dir = join(process.cwd(), "fixtures", "demo");
const cachePath = join(dir, "jev-cache.json");
const labels = new Map(
  (JSON.parse(readFileSync(join(dir, "source.json"), "utf8")) as { file: string; label: string; lang: "es" | "en" }[])
    .map((e) => [`<${e.file}@demo.jev.local>`, e]),
);
// Must match the server's DEMO_RECIPIENT so cache keys are shared with demo mode.
const recipient = { name: "Alex Rivera", address: "alex@example.com" };

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

let classifier: Classifier;
let recorder: RecordingClassifier | null = null;
if (live) {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) fail("Set TYPESAFE_API_KEY to run --live");
  recorder = new RecordingClassifier(new JevClassifier({ apiKey }));
  classifier = recorder;
} else {
  if (!existsSync(cachePath)) {
    fail(`No recorded Jev answers at ${cachePath}.\nRun \`npm run eval -- --live\` first (needs TYPESAFE_API_KEY) to record them.`);
  }
  classifier = new CachedClassifier(loadCache(cachePath));
}

const source = new FixtureMailSource({ emlDir: join(dir, "eml"), contextFile: join(dir, "context.json") });
const ctx = await source.loadContext(recipient);
const { messages } = await source.fetchNew({ folder: "INBOX", sinceDate: new Date(0), afterUid: 0, uidValidity: null, maxMessages: 1000 });

const rows: EvalRow[] = [];
let model = "unknown";
for (const m of messages) {
  const label = labels.get(m.messageId);
  if (!label) throw new Error(`No label for ${m.messageId}`);
  const signals = computeSignals(m, ctx);
  const answers = await classifier.classify(buildState(m, signals, recipient)).catch((err: unknown) => {
    if (err instanceof CacheMissError) {
      fail(`${err.message} (${label.file}).\nThe recorded answers are stale (fixtures or questions changed). Re-run \`npm run eval -- --live\`.`);
    }
    throw err;
  });
  model = answers.model;
  const actual = decide(answers, signals, DEFAULT_THRESHOLDS).category;
  rows.push({ expected: label.label, actual, lang: label.lang });
  if (actual !== label.label) console.log(`✗ ${label.file}: expected ${label.label}, got ${actual}`);
}

const metrics = computeMetrics(rows);
const md = renderMarkdown(metrics, { model, date: new Date().toISOString().slice(0, 10) });
console.log(md);
if (recorder) {
  writeFileSync(cachePath, JSON.stringify(recorder.entries(), null, 2));
  writeFileSync(join(process.cwd(), "docs", "eval-results.md"), md);
  console.log(`Saved ${Object.keys(recorder.entries()).length} answers to ${cachePath}`);
}
