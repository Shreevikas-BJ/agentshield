import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

import { runMockTargetAgent } from "@/lib/agent/mockTargetAgent";
import { getPrisma } from "@/lib/db";
import { combineTestCases, generateLocalAttackCases } from "@/lib/evals/attack-templates";
import { calculatePolicyCoverage, type PolicyCoverageSummary } from "@/lib/evals/policy-coverage";
import { buildProgressCounts } from "@/lib/evals/progress";
import { calculateReliabilityScore, summarizeVerdicts } from "@/lib/evals/scoring";
import { evaluateAgentResponseWithGemini, reviewPolicyContext } from "@/lib/llm/gemini";
import { generateTestCases } from "@/lib/llm/groq";
import { finalJudge } from "@/lib/llm/openai";
import { delay } from "@/lib/llm/retry";
import type { AgentDefinition } from "@/lib/llm/types";
import { buildLaunchReadinessReport } from "@/lib/services/report-service";
import { recordModelCall } from "@/lib/services/model-calls";
import {
  attackCategorySchema,
  testCaseDraftSchema,
  type ScanLevel,
  type SimulatedAgentMode,
  type TestCaseDraft,
} from "@/lib/validation/schemas";

const evaluatorThrottleMs = 200;

type ScanOptions = {
  scanLevel?: ScanLevel;
  simulationMode?: SimulatedAgentMode;
};

export async function generateTestSuiteForAgent(agentId: string, options: ScanOptions = {}) {
  const prisma = getPrisma();
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      promptVersions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
  });

  if (!agent) throw new Error("Agent not found.");

  const scanLevel = options.scanLevel ?? agent.scanLevel;
  const simulationMode = options.simulationMode ?? agent.simulationMode;
  const agentDefinition = toAgentDefinition(agent);
  const localCases = generateLocalAttackCases(agentDefinition, scanLevel);
  const [policyReview, generated] = await Promise.all([
    reviewPolicyContext(agent.policyText),
    generateTestCases(agentDefinition, scanLevel),
  ]);

  await recordModelCall(policyReview.call);
  await recordModelCall(generated.call);

  const groqCases = generated.data.map((testCase) => ({
    ...testCase,
    attackCategory: testCase.attackCategory ?? inferAttackCategory(testCase),
    source: generated.call.provider === "mock" ? "mock" as const : "groq" as const,
  }));
  const testCases = combineTestCases(localCases, groqCases, scanLevel);
  const policyCoverage = calculatePolicyCoverage(agent.policyText, testCases);
  const promptVersion = agent.promptVersions[0];

  const suite = await prisma.testSuite.create({
    data: {
      agentId: agent.id,
      promptVersionId: promptVersion?.id,
      name: `${agent.name} ${scanLevel} suite ${new Date().toLocaleDateString("en-US")}`,
      scanLevel,
      simulatedMode: simulationMode,
      policyCoverageScore: policyCoverage.score,
      policyCoverage: policyCoverage as unknown as Prisma.InputJsonValue,
      testCases: {
        create: testCases.map((testCase) => ({
          type: testCase.type,
          userInput: testCase.userInput,
          expectedBehavior: testCase.expectedBehavior,
          riskLevel: testCase.riskLevel,
          attackCategory: testCase.attackCategory,
          source: testCase.source ?? "groq",
        })),
      },
    },
    include: { testCases: true },
  });

  revalidatePath(`/agents/${agentId}`);
  revalidatePath("/dashboard");
  return suite;
}

export async function createEvaluationRun(
  agentId: string,
  suiteId?: string,
  options: ScanOptions = {},
) {
  const prisma = getPrisma();
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      promptVersions: { orderBy: { versionNumber: "desc" }, take: 1 },
      testSuites: {
        where: suiteId ? { id: suiteId } : undefined,
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { testCases: { orderBy: { createdAt: "asc" } } },
      },
    },
  });

  if (!agent) throw new Error("Agent not found.");
  let suite = agent.testSuites[0];
  if (!suite) suite = await generateTestSuiteForAgent(agentId, options);

  return prisma.testRun.create({
    data: {
      agentId: agent.id,
      testSuiteId: suite.id,
      promptVersionId: agent.promptVersions[0]?.id,
      status: "pending",
      phase: "queued",
      totalTests: suite.testCases.length,
      policyCoverageScore: suite.policyCoverageScore,
      simulatedMode: options.simulationMode ?? agent.simulationMode,
      scanLevel: options.scanLevel ?? suite.scanLevel,
    },
  });
}

export async function createRegressionRun(agentId: string, options: ScanOptions = {}) {
  const prisma = getPrisma();
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      promptVersions: { orderBy: { versionNumber: "desc" }, take: 1 },
      regressionTests: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!agent) throw new Error("Agent not found.");
  if (agent.regressionTests.length === 0) throw new Error("No saved regression tests.");

  const testCases = agent.regressionTests.map((test) => ({
    type: test.type,
    userInput: test.userInput,
    expectedBehavior: test.expectedBehavior,
    riskLevel: test.riskLevel,
    attackCategory: attackCategorySchema.safeParse(test.attackCategory).data,
    source: "regression" as const,
  }));
  const coverage = calculatePolicyCoverage(agent.policyText, testCases);
  const suite = await prisma.testSuite.create({
    data: {
      agentId,
      promptVersionId: agent.promptVersions[0]?.id,
      name: `${agent.name} regression suite v${agent.promptVersions[0]?.versionNumber ?? 1}`,
      scanLevel: options.scanLevel ?? agent.scanLevel,
      simulatedMode: options.simulationMode ?? agent.simulationMode,
      policyCoverageScore: coverage.score,
      policyCoverage: coverage as unknown as Prisma.InputJsonValue,
      testCases: {
        create: agent.regressionTests.map((test) => ({
          type: test.type,
          userInput: test.userInput,
          expectedBehavior: test.expectedBehavior,
          riskLevel: test.riskLevel,
          attackCategory: test.attackCategory,
          source: "regression",
          regressionTestId: test.id,
        })),
      },
    },
  });

  return createEvaluationRun(agentId, suite.id, options);
}

export async function executeEvaluationRun(runId: string) {
  const prisma = getPrisma();
  const run = await prisma.testRun.findUnique({
    where: { id: runId },
    include: {
      agent: true,
      promptVersion: true,
      testSuite: {
        include: { testCases: { orderBy: { createdAt: "asc" } } },
      },
    },
  });
  if (!run) throw new Error("Run not found.");
  if (run.status === "completed") return run;

  await prisma.testRun.update({
    where: { id: run.id },
    data: { status: "running", phase: "preparing", evaluatorStatus: "waiting" },
  });

  try {
    const agentDefinition = toAgentDefinition({
      ...run.agent,
      systemPrompt: run.promptVersion?.systemPrompt ?? run.agent.systemPrompt,
      toolsText: run.promptVersion?.toolsText ?? run.agent.toolsText,
      policyText: run.promptVersion?.policyText ?? run.agent.policyText,
      sampleTasksText: run.promptVersion?.sampleTasksText ?? run.agent.sampleTasksText,
    });
    const persistedResults = [];

    for (const [index, testCase] of run.testSuite.testCases.entries()) {
      const testCaseDraft = toTestCaseDraft(testCase);
      const label = `TC-${index + 1}`;
      await prisma.testRun.update({
        where: { id: run.id },
        data: {
          phase: "simulating_target",
          evaluatorStatus: "waiting",
          currentTestLabel: label,
          currentAttackCategory: testCase.attackCategory ?? testCase.type,
        },
      });
      const targetResponse = await runMockTargetAgent({
        agent: agentDefinition,
        testCase: testCaseDraft,
        mode: run.simulatedMode,
      });
      await recordModelCall(targetResponse.call, run.id);

      await prisma.testRun.update({
        where: { id: run.id },
        data: { phase: "evaluating", evaluatorStatus: "evaluating" },
      });
      const evaluation = await evaluateAgentResponseWithGemini({
        agent: agentDefinition,
        testCase: testCaseDraft,
        actualOutput: targetResponse.data,
        targetSimulationFailed:
          targetResponse.call.provider === "groq" && !targetResponse.call.success,
      });
      const evaluationCalls = [evaluation.call, ...(evaluation.additionalCalls ?? [])];
      for (const call of evaluationCalls) await recordModelCall(call, run.id);
      const effectiveCall = [...evaluationCalls].reverse().find((call) => call.success)
        ?? evaluationCalls.at(-1)
        ?? evaluation.call;
      const usedFallback = !evaluation.call.success || effectiveCall.provider !== "gemini";

      const result = await prisma.testResult.create({
        data: {
          testRunId: run.id,
          testCaseId: testCase.id,
          actualOutput: targetResponse.data,
          verdict: evaluation.data.verdict,
          severity: evaluation.data.severity,
          failureCategory: evaluation.data.category,
          explanation: evaluation.data.reason,
          owaspRisk: evaluation.data.owaspRisk,
          evidence: evaluation.data.evidence,
          recommendedFix: evaluation.data.recommendedFix,
          confidenceScore: evaluation.data.confidenceScore,
          evaluatorProvider: effectiveCall.provider,
          usedFallback,
        },
        include: { testCase: true, humanReview: true },
      });

      if (result.verdict === "fail" && result.failureCategory !== "none") {
        await prisma.failure.create({
          data: {
            testRunId: run.id,
            testResultId: result.id,
            category: result.failureCategory,
            severity: result.severity,
            details: result.explanation,
            owaspRisk: result.owaspRisk,
          },
        });
      }

      persistedResults.push(result);
      const progress = buildProgressCounts(persistedResults, index + 1);
      await prisma.testRun.update({
        where: { id: run.id },
        data: {
          completedTests: progress.completedTests,
          passedTests: progress.passedTests,
          failedTests: progress.failedTests,
          needsReviewTests: progress.needsReviewTests,
          evaluatorStatus: "completed",
        },
      });

      if (process.env.GROQ_API_KEY && index < run.testSuite.testCases.length - 1) {
        await delay(evaluatorThrottleMs);
      }
    }

    const verdictSummary = summarizeVerdicts(persistedResults);
    const reliabilityScore = calculateReliabilityScore(persistedResults);
    await prisma.testRun.update({
      where: { id: run.id },
      data: {
        phase: "building_report",
        reliabilityScore,
        totalTests: verdictSummary.totalTests,
        passedTests: verdictSummary.passedTests,
        failedTests: verdictSummary.failedTests,
        needsReviewTests: verdictSummary.needsReviewTests,
      },
    });

    const highRiskResults = persistedResults
      .filter((result) => result.verdict !== "pass" && ["high", "critical"].includes(result.severity))
      .slice(0, 6)
      .map((result) => ({
        userInput: result.testCase.userInput,
        expectedBehavior: result.testCase.expectedBehavior,
        actualOutput: result.actualOutput,
        verdict: result.verdict,
        severity: result.severity,
        failureCategory: result.failureCategory,
        explanation: result.explanation,
      }));
    const judge = await finalJudge({ agentName: run.agent.name, highRiskResults });
    await recordModelCall(judge.call, run.id);
    await refreshRunReport(run.id, judge.data.rationale);

    const completed = await prisma.testRun.update({
      where: { id: run.id },
      data: {
        status: "completed",
        phase: "completed",
        evaluatorStatus: "completed",
        currentTestLabel: null,
        currentAttackCategory: null,
        completedAt: new Date(),
      },
    });

    revalidatePath(`/agents/${run.agentId}`);
    revalidatePath(`/runs/${run.id}`);
    revalidatePath("/dashboard");
    return completed;
  } catch (error) {
    await prisma.testRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        phase: "failed",
        evaluatorStatus: "failed",
        completedAt: new Date(),
      },
    });
    throw error;
  }
}

export async function runEvaluation(agentId: string, suiteId?: string, options: ScanOptions = {}) {
  const run = await createEvaluationRun(agentId, suiteId, options);
  return executeEvaluationRun(run.id);
}

export async function refreshRunReport(runId: string, finalJudgeRationale?: string) {
  const prisma = getPrisma();
  const run = await prisma.testRun.findUnique({
    where: { id: runId },
    include: {
      testSuite: true,
      results: {
        orderBy: { createdAt: "asc" },
        include: { testCase: true, humanReview: true },
      },
      modelCalls: true,
    },
  });
  if (!run) throw new Error("Run not found.");

  const report = buildLaunchReadinessReport({
    reliabilityScore: run.reliabilityScore ?? calculateReliabilityScore(run.results),
    results: run.results,
    policyCoverage: (run.testSuite.policyCoverage as unknown as PolicyCoverageSummary | null) ?? null,
    modelCalls: run.modelCalls,
    finalJudgeRationale,
  });

  return prisma.report.upsert({
    where: { testRunId: run.id },
    update: {
      summary: report.summary,
      strengths: [...report.strengths],
      weaknesses: [...report.weaknesses],
      recommendations: [...report.recommendations],
      launchReadiness: report.launchReadiness,
      details: report.details as unknown as Prisma.InputJsonValue,
    },
    create: {
      testRunId: run.id,
      summary: report.summary,
      strengths: [...report.strengths],
      weaknesses: [...report.weaknesses],
      recommendations: [...report.recommendations],
      launchReadiness: report.launchReadiness,
      details: report.details as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function getRunProgress(id: string) {
  const prisma = getPrisma();
  return prisma.testRun.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      phase: true,
      totalTests: true,
      completedTests: true,
      passedTests: true,
      failedTests: true,
      needsReviewTests: true,
      currentTestLabel: true,
      currentAttackCategory: true,
      evaluatorStatus: true,
      simulatedMode: true,
      reliabilityScore: true,
    },
  });
}

export async function getRunDetail(id: string) {
  const prisma = getPrisma();
  return prisma.testRun.findUnique({
    where: { id },
    include: {
      agent: true,
      promptVersion: true,
      testSuite: true,
      results: {
        orderBy: [{ severity: "desc" }, { createdAt: "asc" }],
        include: { testCase: true, humanReview: true, savedRegression: true },
      },
      failures: { orderBy: [{ severity: "desc" }, { createdAt: "asc" }] },
      modelCalls: { orderBy: { createdAt: "asc" } },
      report: true,
    },
  });
}

function toAgentDefinition(agent: {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  toolsText: string;
  policyText: string;
  sampleTasksText: string | null;
  simulationMode?: SimulatedAgentMode;
  scanLevel?: ScanLevel;
}): AgentDefinition {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    systemPrompt: agent.systemPrompt,
    toolsText: agent.toolsText,
    policyText: agent.policyText,
    sampleTasksText: agent.sampleTasksText,
    simulationMode: agent.simulationMode,
    scanLevel: agent.scanLevel,
  };
}

function inferAttackCategory(testCase: TestCaseDraft) {
  const mapping: Record<TestCaseDraft["type"], TestCaseDraft["attackCategory"]> = {
    normal: "normal",
    edge_case: "edge_case",
    adversarial: "prompt_injection",
    tool_safety: "unauthorized_tool_use",
    privacy: "privacy_leak",
    policy: "policy_bypass",
  };
  return mapping[testCase.type];
}

function toTestCaseDraft(testCase: {
  type: string;
  userInput: string;
  expectedBehavior: string;
  riskLevel: string;
  attackCategory: string | null;
  source: string;
}) {
  const inferred = inferAttackCategory(testCaseDraftSchema.pick({
    type: true,
    userInput: true,
    expectedBehavior: true,
    riskLevel: true,
  }).parse(testCase));

  return testCaseDraftSchema.parse({
    ...testCase,
    attackCategory: attackCategorySchema.safeParse(testCase.attackCategory).data ?? inferred,
    source: ["local_template", "groq", "regression", "mock"].includes(testCase.source)
      ? testCase.source
      : "groq",
  });
}
