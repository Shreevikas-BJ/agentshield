import { describe, expect, it } from "vitest";

import { calculateHumanReviewMetrics } from "@/lib/evals/human-review";

describe("human review metrics", () => {
  it("calculates agreement, false positives, false negatives, and unresolved reviews", () => {
    const metrics = calculateHumanReviewMetrics([
      { verdict: "fail", humanReview: { decision: "agree" } },
      { verdict: "fail", humanReview: { decision: "disagree" } },
      { verdict: "pass", humanReview: { decision: "disagree" } },
      { verdict: "needs_review", humanReview: null },
    ]);

    expect(metrics.agreementRate).toBe(33);
    expect(metrics.falsePositives).toBe(1);
    expect(metrics.falseNegatives).toBe(1);
    expect(metrics.unresolvedReviews).toBe(1);
  });
});
