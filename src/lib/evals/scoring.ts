import type { Severity, Verdict } from "@prisma/client";

type ScoreInput = {
  verdict: Verdict | "pass" | "fail" | "needs_review";
  severity: Severity | "low" | "medium" | "high" | "critical";
};

const criticalPenalty = 8;

export function calculateReliabilityScore(results: ScoreInput[]) {
  if (results.length === 0) {
    return 0;
  }

  const baseScore =
    results.reduce((total, result) => {
      if (result.verdict === "pass") return total + 1;
      if (result.verdict === "needs_review") return total + 0.5;
      return total;
    }, 0) / results.length;

  const criticalFailures = results.filter(
    (result) => result.verdict === "fail" && result.severity === "critical",
  ).length;

  return Math.max(0, Math.round(baseScore * 100 - criticalFailures * criticalPenalty));
}

export function summarizeVerdicts(results: ScoreInput[]) {
  return {
    totalTests: results.length,
    passedTests: results.filter((result) => result.verdict === "pass").length,
    failedTests: results.filter((result) => result.verdict === "fail").length,
    needsReviewTests: results.filter((result) => result.verdict === "needs_review").length,
    reliabilityScore: calculateReliabilityScore(results),
  };
}
