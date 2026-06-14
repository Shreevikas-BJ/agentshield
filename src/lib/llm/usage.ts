import type { ModelCallMetadata } from "@/lib/validation/schemas";

type UsageLike = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
};

const perMillionRates: Record<string, { input: number; output: number }> = {
  groq: { input: 0.2, output: 0.6 },
  gemini: { input: 0.15, output: 0.6 },
  openai: { input: 1.25, output: 10 },
  mock: { input: 0, output: 0 },
};

export function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function normalizeUsage(usage: unknown, fallbackInput: string, fallbackOutput: string) {
  const usageLike = (usage ?? {}) as UsageLike;
  const inputTokens =
    usageLike.inputTokens ?? usageLike.promptTokens ?? estimateTokens(fallbackInput);
  const outputTokens =
    usageLike.outputTokens ?? usageLike.completionTokens ?? estimateTokens(fallbackOutput);

  return { inputTokens, outputTokens };
}

export function estimateCostUsd(
  provider: ModelCallMetadata["provider"],
  inputTokens: number,
  outputTokens: number,
) {
  const rates = perMillionRates[provider];
  return Number(
    ((inputTokens / 1_000_000) * rates.input + (outputTokens / 1_000_000) * rates.output).toFixed(6),
  );
}

export function createMockCall(
  purpose: string,
  input: string,
  output: string,
): ModelCallMetadata {
  const inputTokens = estimateTokens(input);
  const outputTokens = estimateTokens(output);

  return {
    provider: "mock",
    model: "agentshield-deterministic-mock-v1",
    purpose,
    inputTokens,
    outputTokens,
    latencyMs: 1,
    estimatedCostUsd: 0,
    success: true,
  };
}
