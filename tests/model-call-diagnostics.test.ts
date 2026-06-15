import { describe, expect, it } from "vitest";

import {
  formatCallStatus,
  formatCostEstimate,
  summarizeModelCallDiagnostics,
} from "@/lib/services/model-call-diagnostics";

describe("model-call diagnostics", () => {
  it("summarizes failed evaluator calls for warning banners", () => {
    const diagnostics = summarizeModelCallDiagnostics([
      {
        provider: "groq",
        purpose: "first_pass_evaluation_fallback",
        success: false,
        estimatedCostUsd: 0.00012,
        error: "RateLimitError",
      },
      {
        provider: "groq",
        purpose: "mock_target_agent_response",
        success: true,
        estimatedCostUsd: 0.0001,
        error: null,
      },
    ]);

    expect(diagnostics.failedCalls).toHaveLength(1);
    expect(diagnostics.evaluatorFallbacks).toHaveLength(1);
    expect(diagnostics.hasEvaluatorFallbackWarning).toBe(true);
    expect(formatCostEstimate(diagnostics.totalEstimatedCostUsd)).toBe("$0.000220");
  });

  it("formats call status labels", () => {
    expect(formatCallStatus(true)).toBe("succeeded");
    expect(formatCallStatus(false)).toBe("failed");
  });
});
