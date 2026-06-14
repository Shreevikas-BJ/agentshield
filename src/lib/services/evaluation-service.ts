import { revalidatePath } from "next/cache";

import { runMockTargetAgent } from "@/lib/agent/mockTargetAgent";
import { getPrisma } from "@/lib/db";
import { calculateReliabilityScore, summarizeVerdicts } from "@/lib/evals/scoring";
import { generateTestCases, evaluateAgentResponse } from "@/lib/llm/groq";
import { reviewPolicyContext } from "@/lib/llm/gemini";
import { finalJudge } from "@/lib/llm/openai";
import type { AgentDefinition } from "@/lib/llm/types";
import { buildLaunchReadinessReport } from "@/lib/services/report-service";
import { recordModelCall } from "@/lib/services/model-calls";

export async function generateTestSuiteForAgent(agentId: string) {
  const prisma = getPrisma();
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });

  if (!agent) {
    throw new Error("Agent not found.");
  }

  const agentDefinition = toAgentDefinition(agent);
  const [policyReview, generated] = await Promise.all([
    reviewPolicyContext(agent.policyText),
    generateTestCases(agentDefinition),
  ]);

  await recordModelCall(policyReview.call);
  await recordModelCall(generated.call);

  const suite = await prisma.testSuite.create({
    data: {
      agentId: agent.id,
      name: `${agent.name} launch suite ${new Date().toLocaleDateString("en-US")}`,
      testCases: {
        create: generated.data.map((testCase) => ({
          type: testCase.type,
          userInput: testCase.userInput,
          expectedBehavior: testCase.expectedBehavior,
          riskLevel: testCase.riskLevel,
        })),
      },
    },
    include: {
      testCases: true,
    },
  });

  revalidatePath(`/agents/${agentId}`);
  revalidatePath("/dashboard");

  return suite;
}

export async function runEvaluation(agentId: string, suiteId?: string) {
  const prisma = getPrisma();
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      testSuites: {
        where: suiteId ? { id: suiteId } : undefined,
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          testCases: {
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!agent) {
    throw new Error("Agent not found.");
  }

  let suite = agent.testSuites[0];
  if (!suite) {
    suite = await generateTestSuiteForAgent(agentId);
  }

  const run = await prisma.testRun.create({
    data: {
      agentId: agent.id,
      testSuiteId: suite.id,
      status: "running",
      totalTests: suite.testCases.length,
    },
  });

  try {
    const agentDefinition = toAgentDefinition(agent);
    const persistedResults = [];

    for (const testCase of suite.testCases) {
      const targetResponse = await runMockTargetAgent({
        agent: agentDefinition,
        testCase,
      });
      await recordModelCall(targetResponse.call, run.id);

      const evaluation = await evaluateAgentResponse({
        agent: agentDefinition,
        testCase,
        actualOutput: targetResponse.data,
      });
      await recordModelCall(evaluation.call, run.id);

      const result = await prisma.testResult.create({
        data: {
          testRunId: run.id,
          testCaseId: testCase.id,
          actualOutput: targetResponse.data,
          verdict: evaluation.data.verdict,
          severity: evaluation.data.severity,
          failureCategory: evaluation.data.failureCategory,
          explanation: evaluation.data.explanation,
        },
      });

      if (result.verdict === "fail" && result.failureCategory !== "none") {
        await prisma.failure.create({
          data: {
            testRunId: run.id,
            testResultId: result.id,
            category: result.failureCategory,
            severity: result.severity,
            details: result.explanation,
          },
        });
      }

      persistedResults.push(result);
    }

    const verdictSummary = summarizeVerdicts(persistedResults);
    const reliabilityScore = calculateReliabilityScore(persistedResults);
    const highRiskResults = persistedResults
      .filter((result) => result.verdict !== "pass" && ["high", "critical"].includes(result.severity))
      .slice(0, 6)
      .map((result) => {
        const testCase = suite.testCases.find((candidate) => candidate.id === result.testCaseId);
        return {
          userInput: testCase?.userInput ?? "",
          expectedBehavior: testCase?.expectedBehavior ?? "",
          actualOutput: result.actualOutput,
          verdict: result.verdict,
          severity: result.severity,
          failureCategory: result.failureCategory,
          explanation: result.explanation,
        };
      });
    const judge = await finalJudge({ agentName: agent.name, highRiskResults });
    await recordModelCall(judge.call, run.id);

    const report = buildLaunchReadinessReport({
      reliabilityScore,
      results: persistedResults,
      finalJudgeRationale: judge.data.rationale,
    });

    await prisma.report.create({
      data: {
        testRunId: run.id,
        summary: report.summary,
        strengths: report.strengths,
        weaknesses: report.weaknesses,
        recommendations: report.recommendations,
        launchReadiness: report.launchReadiness,
      },
    });

    const updatedRun = await prisma.testRun.update({
      where: { id: run.id },
      data: {
        status: "completed",
        reliabilityScore,
        totalTests: verdictSummary.totalTests,
        passedTests: verdictSummary.passedTests,
        failedTests: verdictSummary.failedTests,
        completedAt: new Date(),
      },
    });

    revalidatePath(`/agents/${agentId}`);
    revalidatePath(`/runs/${run.id}`);
    revalidatePath("/dashboard");

    return updatedRun;
  } catch (error) {
    await prisma.testRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        completedAt: new Date(),
      },
    });

    throw error;
  }
}

export async function getRunDetail(id: string) {
  const prisma = getPrisma();

  return prisma.testRun.findUnique({
    where: { id },
    include: {
      agent: true,
      testSuite: true,
      results: {
        orderBy: [{ severity: "desc" }, { createdAt: "asc" }],
        include: {
          testCase: true,
        },
      },
      failures: {
        orderBy: [{ severity: "desc" }, { createdAt: "asc" }],
      },
      modelCalls: {
        orderBy: { createdAt: "asc" },
      },
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
}): AgentDefinition {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    systemPrompt: agent.systemPrompt,
    toolsText: agent.toolsText,
    policyText: agent.policyText,
    sampleTasksText: agent.sampleTasksText,
  };
}
