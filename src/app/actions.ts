"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createAgent, createPromptVersion } from "@/lib/services/agent-service";
import {
  generateTestSuiteForAgent,
  runEvaluation,
} from "@/lib/services/evaluation-service";
import { agentInputSchema, promptVersionInputSchema } from "@/lib/validation/schemas";

export type AgentFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createAgentAction(
  _previousState: AgentFormState,
  formData: FormData,
): Promise<AgentFormState> {
  const parsed = agentInputSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    systemPrompt: formData.get("systemPrompt"),
    toolsText: formData.get("toolsText"),
    policyText: formData.get("policyText"),
    sampleTasksText: formData.get("sampleTasksText"),
    simulationMode: formData.get("simulationMode"),
    scanLevel: formData.get("scanLevel"),
  });

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const agent = await createAgent(parsed.data);
  redirect(`/agents/${agent.id}`);
}

export async function createPromptVersionAction(agentId: string, formData: FormData) {
  const parsed = promptVersionInputSchema.safeParse({
    systemPrompt: formData.get("systemPrompt"),
    toolsText: formData.get("toolsText"),
    policyText: formData.get("policyText"),
    sampleTasksText: formData.get("sampleTasksText"),
  });

  if (!parsed.success) {
    throw new Error("Prompt version fields are incomplete.");
  }

  await createPromptVersion(agentId, parsed.data);
  revalidatePath(`/agents/${agentId}`);
  redirect(`/agents/${agentId}`);
}

export async function generateTestSuiteAction(agentId: string) {
  await generateTestSuiteForAgent(agentId);
  revalidatePath(`/agents/${agentId}`);
  redirect(`/agents/${agentId}`);
}

export async function runEvaluationAction(agentId: string, suiteId?: string) {
  const run = await runEvaluation(agentId, suiteId);
  redirect(`/runs/${run.id}`);
}
