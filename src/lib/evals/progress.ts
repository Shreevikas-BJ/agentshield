type ProgressResult = { verdict: "pass" | "fail" | "needs_review" | string };

export function buildProgressCounts(results: ProgressResult[], completedTests: number) {
  return {
    completedTests,
    passedTests: results.filter((result) => result.verdict === "pass").length,
    failedTests: results.filter((result) => result.verdict === "fail").length,
    needsReviewTests: results.filter((result) => result.verdict === "needs_review").length,
  };
}
