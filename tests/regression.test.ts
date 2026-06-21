import { describe, expect, it } from "vitest";

import { compareRunRegressions, summarizeRegressionResults } from "@/lib/evals/regression";

const result = (verdict: string, id: string) => ({
  verdict,
  testCase: { userInput: id, regressionTestId: id },
});

describe("regression summaries", () => {
  it("summarizes rerun status", () => {
    expect(summarizeRegressionResults([result("pass", "a"), result("fail", "b")])).toMatchObject({
      total: 2,
      passed: 1,
      failed: 1,
    });
  });

  it("detects fixed and reopened failures across prompt versions", () => {
    const delta = compareRunRegressions([
      [result("pass", "a"), result("fail", "b")],
      [result("fail", "a"), result("pass", "b")],
      [result("fail", "b")],
    ]);
    expect(delta.fixedFailures).toBe(1);
    expect(delta.newFailures).toBe(1);
    expect(delta.reopenedFailures).toBe(1);
  });
});
