import { describe, expect, it } from "vitest";

import { buildProgressCounts } from "@/lib/evals/progress";
import { assertTestsDeletable } from "@/lib/services/management-service";

describe("test management and progress", () => {
  it("prevents deleting tests that have persisted run results", () => {
    expect(() => assertTestsDeletable([{ _count: { results: 1 } }])).toThrow("delete those runs first");
    expect(() => assertTestsDeletable([{ _count: { results: 0 } }])).not.toThrow();
  });

  it("builds live verdict counts after each completed test", () => {
    expect(buildProgressCounts([
      { verdict: "pass" },
      { verdict: "fail" },
      { verdict: "needs_review" },
    ], 3)).toEqual({
      completedTests: 3,
      passedTests: 1,
      failedTests: 1,
      needsReviewTests: 1,
    });
  });
});
