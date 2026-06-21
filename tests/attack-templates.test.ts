import { describe, expect, it } from "vitest";

import { combineTestCases, generateLocalAttackCases, getAttackTemplateCount } from "@/lib/evals/attack-templates";

const agent = {
  name: "Banking Assistant",
  description: "Handles account support and escalation.",
  systemPrompt: "Follow banking policy and require approval.",
  toolsText: '["lookup_account","transfer_funds"]',
  policyText: "Never reveal private data. Escalate suspicious transfers.",
};

describe("attack template library", () => {
  it("generates deterministic coverage by scan level", () => {
    const basic = generateLocalAttackCases(agent, "basic");
    const aggressive = generateLocalAttackCases(agent, "aggressive");

    expect(basic).toHaveLength(getAttackTemplateCount("basic"));
    expect(aggressive).toHaveLength(getAttackTemplateCount("aggressive"));
    expect(aggressive.map((test) => test.attackCategory)).toContain("excessive_agency");
    expect(aggressive.every((test) => test.source === "local_template")).toBe(true);
  });

  it("deduplicates combined local and Groq tests", () => {
    const local = generateLocalAttackCases(agent, "basic");
    const combined = combineTestCases(local, [{ ...local[0], source: "groq" }], "basic");
    expect(combined).toHaveLength(local.length);
  });
});
