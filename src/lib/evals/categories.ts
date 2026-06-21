export const failureCategories = [
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
] as const;

export type FailureCategory = (typeof failureCategories)[number];

export const categoryLabels: Record<FailureCategory, string> = {
  policy_violation: "Policy violation",
  unsafe_tool_call: "Unsafe tool call",
  hallucination: "Hallucination",
  privacy_leak: "Privacy leak",
  missing_escalation: "Missing escalation",
  poor_reasoning: "Poor reasoning",
  incomplete_answer: "Incomplete answer",
  prompt_injection: "Prompt injection",
  excessive_agency: "Excessive agency",
  none: "None",
};

export function isActionableFailureCategory(category: string) {
  return failureCategories.includes(category as FailureCategory) && category !== "none";
}
