import { z } from "zod";

export const testCaseTypeSchema = z.enum([
  "normal",
  "edge_case",
  "adversarial",
  "tool_safety",
  "privacy",
  "policy",
]);

export const riskLevelSchema = z.enum(["low", "medium", "high"]);
export const verdictSchema = z.enum(["pass", "fail", "needs_review"]);
export const severitySchema = z.enum(["low", "medium", "high", "critical"]);

export const failureCategorySchema = z.enum([
  "policy_violation",
  "unsafe_tool_call",
  "hallucination",
  "privacy_leak",
  "missing_escalation",
  "poor_reasoning",
  "incomplete_answer",
  "prompt_injection",
  "excessive_agency",
  "none",
]);

export const simulatedAgentModeSchema = z.enum([
  "safe",
  "leaky",
  "overhelpful",
  "tool_happy",
  "hallucinating",
  "prompt_injection_vulnerable",
]);

export const scanLevelSchema = z.enum(["basic", "strict", "aggressive"]);
export const scanOptionsSchema = z.object({
  scanLevel: scanLevelSchema.optional(),
  simulationMode: simulatedAgentModeSchema.optional(),
  testSuiteId: z.string().min(1).optional(),
});

export const attackCategorySchema = z.enum([
  "prompt_injection",
  "privacy_leak",
  "unauthorized_tool_use",
  "policy_bypass",
  "fraud_escalation",
  "hallucinated_policy",
  "sensitive_data_extraction",
  "jailbreak_attempt",
  "excessive_agency",
  "missing_escalation",
  "normal",
  "edge_case",
]);

export const modelProviderSchema = z.enum(["groq", "gemini", "openai", "mock"]);

export const agentInputSchema = z.object({
  name: z.string().trim().min(2, "Agent name must be at least 2 characters."),
  description: z.string().trim().min(20, "Description should explain what the agent does."),
  systemPrompt: z.string().trim().min(30, "System prompt must be specific enough to evaluate."),
  toolsText: z.string().trim().min(2, "Add a JSON list or plain-text list of tools."),
  policyText: z.string().trim().min(20, "Policy text is required for safety evaluation."),
  sampleTasksText: z.string().trim().optional().default(""),
  simulationMode: simulatedAgentModeSchema.optional().default("safe"),
  scanLevel: scanLevelSchema.optional().default("strict"),
});

export const testCaseDraftSchema = z.object({
  type: testCaseTypeSchema,
  userInput: z.string().min(5),
  expectedBehavior: z.string().min(10),
  riskLevel: riskLevelSchema,
  attackCategory: attackCategorySchema.optional(),
  source: z.enum(["local_template", "groq", "regression", "mock"]).optional(),
});

export const generatedTestCasesSchema = z.object({
  testCases: z
    .array(testCaseDraftSchema)
    .min(4)
    .max(14),
});

export const evaluationResultSchema = z.object({
  verdict: verdictSchema,
  severity: severitySchema,
  failureCategory: failureCategorySchema,
  explanation: z.string().min(8).max(800),
});

export const geminiEvaluationSchema = z.object({
  verdict: verdictSchema,
  severity: severitySchema,
  category: failureCategorySchema,
  owaspRisk: z.string().min(5).max(120),
  reason: z.string().min(8).max(1200),
  evidence: z.string().min(2).max(1200),
  recommendedFix: z.string().min(5).max(1200),
  confidenceScore: z.number().min(0).max(1),
});

export const humanReviewInputSchema = z.object({
  decision: z.enum(["agree", "disagree", "needs_further_review"]),
  notes: z.string().trim().max(2000).optional().default(""),
});

export const promptVersionInputSchema = z.object({
  systemPrompt: z.string().trim().min(30),
  toolsText: z.string().trim().min(2),
  policyText: z.string().trim().min(20),
  sampleTasksText: z.string().trim().optional().default(""),
});

export const policyReviewSchema = z.object({
  status: z.enum(["reviewed", "skipped"]),
  summary: z.string(),
  gaps: z.array(z.string()).default([]),
  recommendedTestFocus: z.array(z.string()).default([]),
});

export const finalJudgeSchema = z.object({
  shouldOverride: z.boolean(),
  verdict: verdictSchema.optional(),
  severity: severitySchema.optional(),
  failureCategory: failureCategorySchema.optional(),
  rationale: z.string(),
});

export const finalReportSchema = z.object({
  summary: z.string().min(20),
  strengths: z.array(z.string()).min(1),
  weaknesses: z.array(z.string()).min(1),
  recommendations: z.array(z.string()).min(1),
  launchReadiness: z.enum(["not_ready", "needs_review", "ready"]),
});

export const modelCallMetadataSchema = z.object({
  provider: modelProviderSchema,
  model: z.string().min(1),
  purpose: z.string().min(1),
  inputTokens: z.number().int().nonnegative().default(0),
  outputTokens: z.number().int().nonnegative().default(0),
  latencyMs: z.number().int().nonnegative().default(0),
  estimatedCostUsd: z.number().nonnegative().default(0),
  success: z.boolean().default(true),
  error: z.string().optional(),
});

export type AgentInput = z.infer<typeof agentInputSchema>;
export type TestCaseDraft = z.infer<typeof testCaseDraftSchema>;
export type GeneratedTestCases = z.infer<typeof generatedTestCasesSchema>;
export type EvaluationResultDraft = z.infer<typeof evaluationResultSchema>;
export type GeminiEvaluationDraft = z.infer<typeof geminiEvaluationSchema>;
export type SimulatedAgentMode = z.infer<typeof simulatedAgentModeSchema>;
export type ScanLevel = z.infer<typeof scanLevelSchema>;
export type AttackCategory = z.infer<typeof attackCategorySchema>;
export type HumanReviewInput = z.infer<typeof humanReviewInputSchema>;
export type PromptVersionInput = z.infer<typeof promptVersionInputSchema>;
export type PolicyReview = z.infer<typeof policyReviewSchema>;
export type FinalJudgeResult = z.infer<typeof finalJudgeSchema>;
export type FinalReportDraft = z.infer<typeof finalReportSchema>;
export type ModelCallMetadata = z.infer<typeof modelCallMetadataSchema>;
