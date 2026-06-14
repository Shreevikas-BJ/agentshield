import { describe, expect, it } from "vitest";

import { categoryLabels, failureCategories, isActionableFailureCategory } from "@/lib/evals/categories";

describe("failure categories", () => {
  it("includes the required failure categories", () => {
    expect(failureCategories).toEqual([
      "policy_violation",
      "unsafe_tool_call",
      "hallucination",
      "privacy_leak",
      "missing_escalation",
      "poor_reasoning",
      "incomplete_answer",
      "none",
    ]);
  });

  it("treats none as non-actionable", () => {
    expect(isActionableFailureCategory("none")).toBe(false);
    expect(isActionableFailureCategory("privacy_leak")).toBe(true);
    expect(categoryLabels.unsafe_tool_call).toBe("Unsafe tool call");
  });
});
