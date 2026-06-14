import { getPrisma } from "@/lib/db";

export async function getDashboardMetrics() {
  const prisma = getPrisma();

  const [
    totalAgents,
    totalTestRuns,
    reliability,
    highRiskFailures,
    verdicts,
    failuresByCategory,
    modelCallsByProvider,
    latencyByProvider,
  ] = await Promise.all([
    prisma.agent.count(),
    prisma.testRun.count(),
    prisma.testRun.aggregate({ _avg: { reliabilityScore: true } }),
    prisma.failure.count({
      where: {
        severity: { in: ["high", "critical"] },
      },
    }),
    prisma.testResult.groupBy({
      by: ["verdict"],
      _count: true,
    }),
    prisma.testResult.groupBy({
      by: ["failureCategory"],
      where: {
        failureCategory: { not: "none" },
      },
      _count: true,
    }),
    prisma.modelCall.groupBy({
      by: ["provider"],
      _count: true,
    }),
    prisma.modelCall.groupBy({
      by: ["provider"],
      _avg: { latencyMs: true },
    }),
  ]);

  const passCount = verdicts.find((item) => item.verdict === "pass")?._count ?? 0;
  const failCount = verdicts.find((item) => item.verdict === "fail")?._count ?? 0;
  const needsReviewCount =
    verdicts.find((item) => item.verdict === "needs_review")?._count ?? 0;

  return {
    summary: {
      totalAgents,
      totalTestRuns,
      averageReliabilityScore: Math.round(reliability._avg.reliabilityScore ?? 0),
      highRiskFailures,
    },
    passFailRate: [
      { name: "Pass", value: passCount },
      { name: "Fail", value: failCount },
      { name: "Needs review", value: needsReviewCount },
    ],
    failuresByCategory: failuresByCategory.map((item) => ({
      name: item.failureCategory,
      value: item._count,
    })),
    modelCallsByProvider: modelCallsByProvider.map((item) => ({
      name: item.provider,
      value: item._count,
    })),
    averageLatency: latencyByProvider.map((item) => ({
      name: item.provider,
      value: Math.round(item._avg.latencyMs ?? 0),
    })),
  };
}
