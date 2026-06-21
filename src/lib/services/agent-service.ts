import { revalidatePath } from "next/cache";

import { getPrisma } from "@/lib/db";
import {
  agentInputSchema,
  promptVersionInputSchema,
  type AgentInput,
  type PromptVersionInput,
} from "@/lib/validation/schemas";

export async function createAgent(input: AgentInput) {
  const data = agentInputSchema.parse(input);
  const prisma = getPrisma();

  const agent = await prisma.agent.create({
    data: {
      name: data.name,
      description: data.description,
      systemPrompt: data.systemPrompt,
      toolsText: data.toolsText,
      policyText: data.policyText,
      sampleTasksText: data.sampleTasksText || null,
      simulationMode: data.simulationMode,
      scanLevel: data.scanLevel,
      promptVersions: {
        create: {
          versionNumber: 1,
          systemPrompt: data.systemPrompt,
          toolsText: data.toolsText,
          policyText: data.policyText,
          sampleTasksText: data.sampleTasksText || null,
        },
      },
    },
  });

  revalidatePath("/agents");
  revalidatePath("/dashboard");

  return agent;
}

export async function createPromptVersion(agentId: string, input: PromptVersionInput) {
  const data = promptVersionInputSchema.parse(input);
  const prisma = getPrisma();
  const latest = await prisma.promptVersion.findFirst({
    where: { agentId },
    orderBy: { versionNumber: "desc" },
  });

  const [, version] = await prisma.$transaction([
    prisma.agent.update({
      where: { id: agentId },
      data: {
        systemPrompt: data.systemPrompt,
        toolsText: data.toolsText,
        policyText: data.policyText,
        sampleTasksText: data.sampleTasksText || null,
      },
    }),
    prisma.promptVersion.create({
      data: {
        agentId,
        versionNumber: (latest?.versionNumber ?? 0) + 1,
        systemPrompt: data.systemPrompt,
        toolsText: data.toolsText,
        policyText: data.policyText,
        sampleTasksText: data.sampleTasksText || null,
      },
    }),
  ]);

  revalidatePath(`/agents/${agentId}`);
  revalidatePath("/dashboard");
  return version;
}

export async function getAgents() {
  const prisma = getPrisma();

  return prisma.agent.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      promptVersions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
      testRuns: {
        orderBy: { startedAt: "desc" },
        take: 1,
      },
      _count: {
        select: {
          testSuites: true,
          testRuns: true,
        },
      },
    },
  });
}

export async function getAgentDetail(id: string) {
  const prisma = getPrisma();

  return prisma.agent.findUnique({
    where: { id },
    include: {
      promptVersions: {
        orderBy: { versionNumber: "desc" },
      },
      testSuites: {
        orderBy: { createdAt: "desc" },
        include: {
          testCases: {
            orderBy: { createdAt: "asc" },
          },
          testRuns: {
            orderBy: { startedAt: "desc" },
            take: 3,
          },
        },
      },
      testRuns: {
        orderBy: { startedAt: "desc" },
        take: 20,
        include: {
          testSuite: true,
          promptVersion: true,
          results: {
            include: {
              testCase: true,
              humanReview: true,
            },
          },
        },
      },
      regressionTests: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}
