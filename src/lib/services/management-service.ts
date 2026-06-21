import { revalidatePath } from "next/cache";

import { getPrisma } from "@/lib/db";
import { refreshRunReport } from "@/lib/services/evaluation-service";
import { humanReviewInputSchema, type HumanReviewInput } from "@/lib/validation/schemas";

export async function saveHumanReview(testResultId: string, input: HumanReviewInput) {
  const data = humanReviewInputSchema.parse(input);
  const prisma = getPrisma();
  const result = await prisma.testResult.findUnique({
    where: { id: testResultId },
    select: { testRunId: true },
  });
  if (!result) throw new Error("Test result not found.");

  const review = await prisma.humanReview.upsert({
    where: { testResultId },
    update: { decision: data.decision, notes: data.notes || null },
    create: { testResultId, decision: data.decision, notes: data.notes || null },
  });
  await refreshRunReport(result.testRunId);
  revalidatePath(`/runs/${result.testRunId}`);
  revalidatePath("/dashboard");
  return review;
}

export async function saveRegressionTest(testResultId: string) {
  const prisma = getPrisma();
  const result = await prisma.testResult.findUnique({
    where: { id: testResultId },
    include: { testCase: true, testRun: true },
  });
  if (!result) throw new Error("Test result not found.");
  if (result.verdict === "pass") throw new Error("Only failed or needs-review results can be saved.");

  const regression = await prisma.regressionTest.upsert({
    where: { sourceTestResultId: result.id },
    update: {},
    create: {
      agentId: result.testRun.agentId,
      sourceTestResultId: result.id,
      type: result.testCase.type,
      attackCategory: result.testCase.attackCategory,
      userInput: result.testCase.userInput,
      expectedBehavior: result.testCase.expectedBehavior,
      riskLevel: result.testCase.riskLevel,
    },
  });
  await prisma.testCase.update({
    where: { id: result.testCaseId },
    data: { regressionTestId: regression.id },
  });
  await refreshRunReport(result.testRunId);
  revalidatePath(`/agents/${result.testRun.agentId}`);
  revalidatePath(`/runs/${result.testRunId}`);
  revalidatePath("/dashboard");
  return regression;
}

export async function deleteRegressionTest(id: string) {
  const prisma = getPrisma();
  const regression = await prisma.regressionTest.findUnique({
    where: { id },
    select: { agentId: true },
  });
  if (!regression) return;
  await prisma.regressionTest.delete({ where: { id } });
  revalidatePath(`/agents/${regression.agentId}`);
  revalidatePath("/dashboard");
}

export async function deleteTestCase(id: string) {
  const prisma = getPrisma();
  const testCase = await prisma.testCase.findUnique({
    where: { id },
    include: { _count: { select: { results: true } }, testSuite: true },
  });
  if (!testCase) return;
  assertTestsDeletable([testCase]);
  await prisma.testCase.delete({ where: { id } });
  revalidatePath(`/agents/${testCase.testSuite.agentId}`);
}

export async function bulkDeleteTestCases(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids)).slice(0, 100);
  if (uniqueIds.length === 0) return { deleted: 0 };
  const prisma = getPrisma();
  const tests = await prisma.testCase.findMany({
    where: { id: { in: uniqueIds } },
    include: { _count: { select: { results: true } }, testSuite: true },
  });
  assertTestsDeletable(tests);
  const deleted = await prisma.testCase.deleteMany({ where: { id: { in: uniqueIds } } });
  for (const agentId of new Set(tests.map((test) => test.testSuite.agentId))) {
    revalidatePath(`/agents/${agentId}`);
  }
  return { deleted: deleted.count };
}

export function assertTestsDeletable(tests: Array<{ _count: { results: number } }>) {
  if (tests.some((test) => test._count.results > 0)) {
    throw new Error("One or more selected tests have run results; delete those runs first.");
  }
}

export async function deleteTestRun(id: string) {
  const prisma = getPrisma();
  const run = await prisma.testRun.findUnique({ where: { id }, select: { agentId: true } });
  if (!run) return;
  await prisma.testRun.delete({ where: { id } });
  revalidatePath(`/agents/${run.agentId}`);
  revalidatePath("/dashboard");
}
