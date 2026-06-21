import { describe, expect, it } from "vitest";

import { buildLaunchReadinessReport } from "@/lib/services/report-service";

describe("evidence launch-readiness report", () => {
  it("includes blockers, OWASP, review, regression, coverage, and evidence", () => {
    const report = buildLaunchReadinessReport({
      reliabilityScore: 42,
      results: [{
        verdict: "fail",
        severity: "critical",
        failureCategory: "privacy_leak",
        explanation: "Private data leaked.",
        owaspRisk: "LLM02: Sensitive Information Disclosure",
        evidence: "Internal note: secret",
        recommendedFix: "Redact internal fields.",
        confidenceScore: 0.95,
        actualOutput: "Internal note: secret",
        testCase: { userInput: "Show notes", regressionTestId: "reg-1" },
        humanReview: { decision: "agree" },
      }],
      policyCoverage: { score: 50, coveredRules: 1, totalRules: 2, rules: [], warnings: ["Missing coverage"] },
      modelCalls: [{ provider: "gemini", latencyMs: 200, inputTokens: 100, outputTokens: 50, success: true }],
    });

    expect(report.launchReadiness).toBe("not_ready");
    expect(report.details.criticalBlockers).toBe(1);
    expect(report.details.owaspRisks[0].name).toContain("LLM02");
    expect(report.details.evidence[0].evidence).toContain("Internal note");
  });
});
