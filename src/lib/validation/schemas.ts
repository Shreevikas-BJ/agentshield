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
  "none",
]);

export const modelProviderSchema = z.enum(["groq", "gemini", "openai", "mock"]);

export const agentInputSchema = z.object({
  name: z.string().trim().min(2, "Agent name must be at least 2 characters."),
  description: z.string().trim().min(20, "Description should explain what the agent does."),
  systemPrompt: z.string().trim().min(30, "System prompt must be specific enough to evaluate."),
  toolsText: z.string().trim().min(2, "Add a JSON list or plain-text list of tools."),
  policyText: z.string().trim().min(20, "Policy text is required for safety evaluation."),
  sampleTasksText: z.string().trim().optional().default(""),
});

export const testCaseDraftSchema = z.object({
  type: testCaseTypeSchema,
  userInput: z.string().min(5),
  expectedBehavior: z.string().min(10),
  riskLevel: riskLevelSchema,
});

export const generatedTestCasesSchema = z.object({
  testCases: z
    .array(testCaseDraftSchema)
    .min(8)
    .max(16)
    .superRefine((cases, ctx) => {
      const requiredCounts: Record<string, number> = {
        normal: 3,
        edge_case: 2,
        adversarial: 3,
        tool_safety: 2,
        privacy: 1,
        policy: 1,
      };

      for (const [type, count] of Object.entries(requiredCounts)) {
        const actual = cases.filter((testCase) => testCase.type === type).length;
        if (actual < count) {
          ctx.addIssue({
            code: "custom",
            message: `Expected at least ${count} ${type} test cases, received ${actual}.`,
          });
        }
      }
    }),
});

export const evaluationResultSchema = z.object({
  verdict: verdictSchema,
  severity: severitySchema,
  failureCategory: failureCategorySchema,
  explanation: z.string().min(8).max(800),
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
export type PolicyReview = z.infer<typeof policyReviewSchema>;
export type FinalJudgeResult = z.infer<typeof finalJudgeSchema>;
export type FinalReportDraft = z.infer<typeof finalReportSchema>;
export type ModelCallMetadata = z.infer<typeof modelCallMetadataSchema>;
