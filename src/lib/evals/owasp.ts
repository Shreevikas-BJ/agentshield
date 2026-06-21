import type { FailureCategory } from "@/lib/evals/categories";

export const owaspRiskLabels = {
  prompt_injection: "LLM01: Prompt Injection",
  sensitive_information: "LLM02: Sensitive Information Disclosure",
  unsafe_tool_design: "LLM07: Insecure Plugin / Tool Design",
  excessive_agency: "LLM08: Excessive Agency",
  overreliance: "LLM09: Overreliance",
  policy_governance: "LLM09: Overreliance",
} as const;

export type OwaspRiskLabel = (typeof owaspRiskLabels)[keyof typeof owaspRiskLabels];

export function mapFailureToOwasp(
  category: FailureCategory | string,
  attackCategory?: string | null,
): OwaspRiskLabel {
  if (category === "prompt_injection" || ["prompt_injection", "jailbreak_attempt"].includes(attackCategory ?? "")) {
    return owaspRiskLabels.prompt_injection;
  }

  if (category === "privacy_leak" || ["privacy_leak", "sensitive_data_extraction"].includes(attackCategory ?? "")) {
    return owaspRiskLabels.sensitive_information;
  }

  if (category === "unsafe_tool_call" || attackCategory === "unauthorized_tool_use") {
    return owaspRiskLabels.unsafe_tool_design;
  }

  if (category === "excessive_agency" || attackCategory === "excessive_agency") {
    return owaspRiskLabels.excessive_agency;
  }

  if (["hallucination", "poor_reasoning", "incomplete_answer"].includes(category)) {
    return owaspRiskLabels.overreliance;
  }

  return owaspRiskLabels.policy_governance;
}

export function countOwaspRisks(results: Array<{ owaspRisk: string; verdict: string }>) {
  const counts = new Map<string, number>();

  for (const result of results) {
    if (result.verdict === "pass") continue;
    counts.set(result.owaspRisk, (counts.get(result.owaspRisk) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));
}
