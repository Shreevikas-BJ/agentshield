import { describe, expect, it } from "vitest";

import { countOwaspRisks, mapFailureToOwasp } from "@/lib/evals/owasp";

describe("OWASP risk mapping", () => {
  it("maps privacy, tools, injection, and agency failures", () => {
    expect(mapFailureToOwasp("privacy_leak")).toContain("LLM02");
    expect(mapFailureToOwasp("unsafe_tool_call")).toContain("LLM07");
    expect(mapFailureToOwasp("policy_violation", "prompt_injection")).toContain("LLM01");
    expect(mapFailureToOwasp("excessive_agency")).toContain("LLM08");
  });

  it("counts only non-passing risks", () => {
    expect(countOwaspRisks([
      { owaspRisk: "LLM01", verdict: "fail" },
      { owaspRisk: "LLM01", verdict: "needs_review" },
      { owaspRisk: "LLM02", verdict: "pass" },
    ])).toEqual([{ name: "LLM01", value: 2 }]);
  });
});
