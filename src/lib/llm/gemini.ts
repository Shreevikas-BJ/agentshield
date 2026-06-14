import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

import { getEnv } from "@/lib/env";
import { parseJsonWithRepair } from "@/lib/llm/json";
import { mockPolicyReview } from "@/lib/llm/mock";
import type { LlmResult } from "@/lib/llm/types";
import { estimateCostUsd, normalizeUsage, createMockCall } from "@/lib/llm/usage";
import { policyReviewSchema, type PolicyReview } from "@/lib/validation/schemas";

export async function reviewPolicyContext(policyText: string): Promise<LlmResult<PolicyReview>> {
  const env = getEnv();
  const prompt = `Review this company AI agent policy for launch-readiness testing.
Return JSON only:
{"status":"reviewed","summary":"string","gaps":["string"],"recommendedTestFocus":["string"]}

Policy:
${policyText}`;

  if (!env.GEMINI_API_KEY) {
    const data = mockPolicyReview(policyText);
    return {
      data,
      call: createMockCall("policy_context_review_skipped", prompt, JSON.stringify(data)),
    };
  }

  const startedAt = Date.now();
  const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
  let rawText = "";
  let usage: unknown;

  try {
    const result = await generateText({
      model: google(env.GEMINI_MODEL),
      temperature: 0,
      prompt,
    });

    rawText = result.text;
    usage = result.usage;
    const parsed = await parseJsonWithRepair({
      rawText,
      schema: policyReviewSchema,
      repair: async (invalidJson, error) => {
        const repair = await generateText({
          model: google(env.GEMINI_MODEL),
          temperature: 0,
          prompt: `Repair this JSON for the AgentShield policy review schema. Error: ${error}\n\n${invalidJson}`,
        });
        return repair.text;
      },
    });
    const data = parsed.ok
      ? parsed.data
      : {
          status: "reviewed" as const,
          summary: "Gemini returned malformed JSON; policy review requires human follow-up.",
          gaps: [parsed.error],
          recommendedTestFocus: ["manual policy review"],
        };
    const tokens = normalizeUsage(usage, prompt, JSON.stringify(data));

    return {
      data,
      call: {
        provider: "gemini",
        model: env.GEMINI_MODEL,
        purpose: parsed.ok ? "policy_context_review" : "policy_context_review_malformed",
        inputTokens: tokens.inputTokens,
        outputTokens: tokens.outputTokens,
        latencyMs: Date.now() - startedAt,
        estimatedCostUsd: estimateCostUsd("gemini", tokens.inputTokens, tokens.outputTokens),
        success: parsed.ok,
        error: parsed.ok ? undefined : parsed.error,
      },
    };
  } catch (error) {
    const data = {
      status: "reviewed" as const,
      summary: "Gemini policy review failed; deterministic safeguards remain active.",
      gaps: [error instanceof Error ? error.message : "Unknown Gemini error"],
      recommendedTestFocus: ["manual policy review", "policy bypass attempts"],
    };
    const tokens = normalizeUsage(usage, prompt, JSON.stringify(data));

    return {
      data,
      call: {
        provider: "gemini",
        model: env.GEMINI_MODEL,
        purpose: "policy_context_review",
        inputTokens: tokens.inputTokens,
        outputTokens: tokens.outputTokens,
        latencyMs: Date.now() - startedAt,
        estimatedCostUsd: estimateCostUsd("gemini", tokens.inputTokens, tokens.outputTokens),
        success: false,
        error: error instanceof Error ? error.message : "Unknown Gemini review error",
      },
    };
  }
}
