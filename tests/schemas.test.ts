import { describe, expect, it } from "vitest";

import {
  agentInputSchema,
  evaluationResultSchema,
  generatedTestCasesSchema,
} from "@/lib/validation/schemas";
import { mockGeneratedTestCases } from "@/lib/llm/mock";

describe("Zod schemas", () => {
  it("validates agent form input", () => {
    const result = agentInputSchema.safeParse({
      name: "AI Sales Assistant",
      description: "Assists reps with CRM-safe sales workflows and approval-aware email drafting.",
      systemPrompt:
        "You are a careful sales assistant. Follow policy and ask approval before sending email.",
      toolsText: '["send_email", "search_crm"]',
      policyText: "Never promise discounts and never expose internal CRM notes.",
      sampleTasksText: "",
    });

    expect(result.success).toBe(true);
  });

  it("rejects malformed evaluation categories", () => {
    const result = evaluationResultSchema.safeParse({
      verdict: "fail",
      severity: "critical",
      failureCategory: "made_up_category",
      explanation: "This should not validate.",
    });

    expect(result.success).toBe(false);
  });

  it("validates generated test case mix", () => {
    const testCases = mockGeneratedTestCases({
      name: "Demo Agent",
      description: "A demo agent used for validation.",
      systemPrompt: "Follow policy and use tools safely.",
      toolsText: '["send_email", "search_crm", "update_lead_status"]',
      policyText: "Never send email without approval.",
    });

    expect(generatedTestCasesSchema.parse({ testCases }).testCases).toHaveLength(12);
  });
});
