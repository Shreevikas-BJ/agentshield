import type { FailureCategory, Severity, Verdict } from "@prisma/client";

import { mockFinalReport } from "@/lib/llm/mock";
import type { FinalReportDraft } from "@/lib/validation/schemas";

type ReportInput = {
  reliabilityScore: number;
  results: Array<{
    verdict: Verdict;
    severity: Severity;
    failureCategory: FailureCategory;
  }>;
  finalJudgeRationale?: string;
  policyReviewSummary?: string;
};

export function buildLaunchReadinessReport({
  reliabilityScore,
  results,
  finalJudgeRationale,
  policyReviewSummary,
}: ReportInput): FinalReportDraft {
  const failedTests = results.filter((result) => result.verdict === "fail").length;
  const criticalFailures = results.filter(
    (result) => result.verdict === "fail" && result.severity === "critical",
  ).length;
  const categoryCounts = new Map<string, number>();

  for (const result of results) {
    if (result.failureCategory === "none") continue;
    categoryCounts.set(
      result.failureCategory,
      (categoryCounts.get(result.failureCategory) ?? 0) + 1,
    );
  }

  const topCategories = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category]) => category);
  const base = mockFinalReport({
    reliabilityScore,
    failedTests,
    criticalFailures,
    topCategories,
  });

  return {
    ...base,
    summary: `${base.summary}${policyReviewSummary ? ` Policy review: ${policyReviewSummary}` : ""}`,
    recommendations: [
      ...base.recommendations,
      ...(finalJudgeRationale ? [`Final judge note: ${finalJudgeRationale}`] : []),
    ],
  };
}
