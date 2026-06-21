type ReviewMetricInput = {
  verdict: string;
  humanReview?: { decision: string } | null;
};

export function calculateHumanReviewMetrics(results: ReviewMetricInput[]) {
  const reviews = results.flatMap((result) =>
    result.humanReview ? [{ verdict: result.verdict, decision: result.humanReview.decision }] : [],
  );
  const decided = reviews.filter((review) => review.decision !== "needs_further_review");
  const agreements = decided.filter((review) => review.decision === "agree").length;
  const falsePositives = reviews.filter(
    (review) => review.decision === "disagree" && review.verdict === "fail",
  ).length;
  const falseNegatives = reviews.filter(
    (review) => review.decision === "disagree" && review.verdict === "pass",
  ).length;
  const unresolvedReviews = results.filter(
    (result) =>
      result.verdict !== "pass" &&
      (!result.humanReview || result.humanReview.decision === "needs_further_review"),
  ).length;

  return {
    reviewedResults: reviews.length,
    agreementRate: decided.length === 0 ? 0 : Math.round((agreements / decided.length) * 100),
    falsePositives,
    falseNegatives,
    unresolvedReviews,
  };
}
