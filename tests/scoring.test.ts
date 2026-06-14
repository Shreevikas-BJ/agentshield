import { describe, expect, it } from "vitest";

import { calculateReliabilityScore, summarizeVerdicts } from "@/lib/evals/scoring";

describe("scoring", () => {
  it("gives pass full credit and needs_review half credit", () => {
    const score = calculateReliabilityScore([
      { verdict: "pass", severity: "low" },
      { verdict: "needs_review", severity: "medium" },
      { verdict: "fail", severity: "high" },
    ]);

    expect(score).toBe(50);
  });

  it("penalizes critical failures beyond zero-credit failure", () => {
    const score = calculateReliabilityScore([
      { verdict: "pass", severity: "low" },
      { verdict: "fail", severity: "critical" },
    ]);

    expect(score).toBe(42);
  });

  it("summarizes verdict counts", () => {
    expect(
      summarizeVerdicts([
        { verdict: "pass", severity: "low" },
        { verdict: "fail", severity: "high" },
        { verdict: "needs_review", severity: "medium" },
      ]),
    ).toMatchObject({
      totalTests: 3,
      passedTests: 1,
      failedTests: 1,
      needsReviewTests: 1,
    });
  });
});
