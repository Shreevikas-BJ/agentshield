import { revalidatePath } from "next/cache";

import { getPrisma } from "@/lib/db";
import { agentInputSchema, type AgentInput } from "@/lib/validation/schemas";

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
        take: 5,
        include: {
          testSuite: true,
        },
      },
    },
  });
}
