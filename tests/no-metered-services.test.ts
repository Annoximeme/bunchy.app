import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Nothing in Bunchy bills per request.
 *
 * The operator is one person, and a feature that costs a fraction of a cent
 * every time somebody types in a search box is a feature whose bill grows with
 * exactly the thing the product is trying to encourage. So the assistant is
 * deterministic and in-process, and this test is what keeps it that way after
 * everyone has forgotten the decision.
 *
 * It is deliberately a *code* test rather than a note in a README. A hosted
 * model is one `fetch` away, and the moment it is added by accident, a
 * half-finished experiment, a copied snippet, this fails and someone has to
 * argue for it on purpose.
 *
 * Adding a self-hosted model later is fine and this will not stand in the way:
 * an Ollama endpoint on localhost is not a metered host. What fails here is a
 * commercial inference API.
 */

const ROOT = join(import.meta.dirname, "..", "src");

/** Hosts that answer with an invoice at the end of the month. */
const METERED_HOSTS = [
  "api.anthropic.com",
  "api.openai.com",
  "generativelanguage.googleapis.com",
  "api.cohere.ai",
  "api.mistral.ai",
  "api.replicate.com",
  "api.together.xyz",
  "openrouter.ai",
  "api.groq.com",
  "bedrock-runtime",
  "openai.azure.com",
];

/** Environment variables whose only purpose is to authenticate a paid API. */
const BILLING_KEYS = [
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "GOOGLE_API_KEY",
  "GEMINI_API_KEY",
  "COHERE_API_KEY",
  "MISTRAL_API_KEY",
  "REPLICATE_API_TOKEN",
  "TOGETHER_API_KEY",
  "OPENROUTER_API_KEY",
  "GROQ_API_KEY",
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      // Generated Prisma output is not ours and is enormous.
      return entry === "generated" ? [] : sourceFiles(path);
    }
    return /\.(ts|tsx|mts)$/.test(entry) ? [path] : [];
  });
}

const FILES = sourceFiles(ROOT);

describe("no paid service is reachable from the product", () => {
  it("finds source files to check", () => {
    // Guards the guard: a broken walk would make everything below vacuously
    // pass, which is the classic way a rule like this quietly stops working.
    expect(FILES.length).toBeGreaterThan(50);
  });

  it("calls no metered inference API", () => {
    for (const file of FILES) {
      // This test names the hosts, so it would otherwise match itself.
      if (file.includes("no-metered-services")) continue;
      const contents = readFileSync(file, "utf8");
      for (const host of METERED_HOSTS) {
        expect(contents, `${file} reaches ${host}`).not.toContain(host);
      }
    }
  });

  it("reads no API key that exists to be billed", () => {
    for (const file of FILES) {
      if (file.includes("no-metered-services")) continue;
      const contents = readFileSync(file, "utf8");
      for (const key of BILLING_KEYS) {
        expect(contents, `${file} reads ${key}`).not.toContain(key);
      }
    }
  });

  it("declares no billing variable in the environment schema", async () => {
    const env = readFileSync(join(ROOT, "server", "env.ts"), "utf8");
    for (const key of BILLING_KEYS) {
      expect(env, `env.ts declares ${key}`).not.toContain(key);
    }
  });

  it("resolves an assistant that needs no configuration at all", async () => {
    // The real proof: with a bare environment the assistant still works.
    const { assistant } = await import("@/server/modules/ai/index");
    const instance = assistant();

    const starters = await instance.conversationStarters({
      viewerName: "Sarah",
      otherName: "Milan",
      sharedInterests: ["Warhammer"],
      complementaryInterests: [],
      otherGoals: [],
    });

    expect(starters.length).toBeGreaterThan(0);
    expect(instance.id).not.toContain("anthropic");
  });
});
