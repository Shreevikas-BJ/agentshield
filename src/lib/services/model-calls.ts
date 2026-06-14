import type { ModelCallMetadata } from "@/lib/validation/schemas";
import { getPrisma } from "@/lib/db";

export async function recordModelCall(call: ModelCallMetadata, testRunId?: string) {
  const prisma = getPrisma();

  return prisma.modelCall.create({
    data: {
      testRunId,
      provider: call.provider,
      model: call.model,
      purpose: call.purpose,
      inputTokens: call.inputTokens,
      outputTokens: call.outputTokens,
      latencyMs: call.latencyMs,
      estimatedCostUsd: call.estimatedCostUsd,
      success: call.success,
      error: call.error,
    },
  });
}
