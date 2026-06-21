import { getPrisma } from "@/lib/db";
import { calculateHumanReviewMetrics } from "@/lib/evals/human-review";

export async function getDashboardMetrics() {
  const prisma = getPrisma();

  const [
    totalAgents,
    totalTestRuns,
    reliability,
    highRiskFailures,
    verdicts,
    failuresByCategory,
    owaspRisks,
    severity,
    confidence,
    modelCallsByProvider,
    latencyByProvider,
    reliabilityRuns,
    reviewableResults,
    regressionResults,
    policyCoverage,
  ] = await Promise.all([
    prisma.agent.count(),
    prisma.testRun.count(),
    prisma.testRun.aggregate({ _avg: { reliabilityScore: true } }),
    prisma.failure.count({ where: { severity: { in: ["high", "critical"] } } }),
    prisma.testResult.groupBy({ by: ["verdict"], _count: true }),
    prisma.testResult.groupBy({
      by: ["failureCategory"],
      where: { failureCategory: { not: "none" } },
      _count: true,
    }),
    prisma.testResult.groupBy({
      by: ["owaspRisk"],
      where: { verdict: { not: "pass" } },
      _count: true,
    }),
    prisma.testResult.groupBy({ by: ["severity"], _count: true }),
    prisma.testResult.aggregate({ _avg: { confidenceScore: true } }),
    prisma.modelCall.groupBy({ by: ["provider"], _count: true }),
    prisma.modelCall.groupBy({ by: ["provider"], _avg: { latencyMs: true } }),
    prisma.testRun.findMany({
      where: { status: "completed", reliabilityScore: { not: null } },
      orderBy: { startedAt: "asc" },
      take: 24,
      include: { agent: true, promptVersion: true },
    }),
    prisma.testResult.findMany({
      where: { verdict: { not: "pass" } },
      include: { humanReview: true },
    }),
    prisma.testResult.findMany({
      where: { testCase: { regressionTestId: { not: null } } },
      select: { verdict: true },
    }),
    prisma.testRun.aggregate({ _avg: { policyCoverageScore: true } }),
  ]);

  const passCount = verdicts.find((item) => item.verdict === "pass")?._count ?? 0;
  const failCount = verdicts.find((item) => item.verdict === "fail")?._count ?? 0;
  const needsReviewCount = verdicts.find((item) => item.verdict === "needs_review")?._count ?? 0;
  const reviewMetrics = calculateHumanReviewMetrics(
    reviewableResults,
  );

  return {
    summary: {
      totalAgents,
      totalTestRuns,
      averageReliabilityScore: Math.round(reliability._avg.reliabilityScore ?? 0),
      highRiskFailures,
      averageConfidence: Math.round((confidence._avg.confidenceScore ?? 0) * 100),
      humanAgreement: reviewMetrics.agreementRate,
      unresolvedReviews: reviewMetrics.unresolvedReviews,
      policyCoverage: Math.round(policyCoverage._avg.policyCoverageScore ?? 0),
    },
    passFailRate: [
      { name: "Pass", value: passCount },
      { name: "Fail", value: failCount },
      { name: "Needs review", value: needsReviewCount },
    ],
    reliabilityTrend: reliabilityRuns.map((run, index) => ({
      name: `R${index + 1} v${run.promptVersion?.versionNumber ?? 1}`,
      value: Math.round(run.reliabilityScore ?? 0),
      agent: run.agent.name,
    })),
    failuresByCategory: failuresByCategory.map((item) => ({ name: item.failureCategory, value: item._count })),
    owaspRisks: owaspRisks.map((item) => ({ name: item.owaspRisk, value: item._count })),
    severityDistribution: severity.map((item) => ({ name: item.severity, value: item._count })),
    regressionStatus: [
      { name: "Pass", value: regressionResults.filter((item) => item.verdict === "pass").length },
      { name: "Fail", value: regressionResults.filter((item) => item.verdict === "fail").length },
      { name: "Needs review", value: regressionResults.filter((item) => item.verdict === "needs_review").length },
    ],
    modelCallsByProvider: modelCallsByProvider.map((item) => ({ name: item.provider, value: item._count })),
    averageLatency: latencyByProvider.map((item) => ({ name: item.provider, value: Math.round(item._avg.latencyMs ?? 0) })),
  };
}
