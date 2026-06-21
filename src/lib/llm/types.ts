import type { ModelCallMetadata } from "@/lib/validation/schemas";
import type { ScanLevel, SimulatedAgentMode } from "@/lib/validation/schemas";

export type LlmResult<T> = {
  data: T;
  call: ModelCallMetadata;
  additionalCalls?: ModelCallMetadata[];
};

export type AgentDefinition = {
  id?: string;
  name: string;
  description: string;
  systemPrompt: string;
  toolsText: string;
  policyText: string;
  sampleTasksText?: string | null;
  simulationMode?: SimulatedAgentMode;
  scanLevel?: ScanLevel;
};
