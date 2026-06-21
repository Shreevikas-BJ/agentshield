type RegressionResult = {
  verdict: string;
  testCase: {
    userInput: string;
    regressionTestId?: string | null;
  };
};

export function summarizeRegressionResults(results: RegressionResult[]) {
  const regressions = results.filter((result) => result.testCase.regressionTestId);
  return {
    total: regressions.length,
    passed: regressions.filter((result) => result.verdict === "pass").length,
    failed: regressions.filter((result) => result.verdict === "fail").length,
    needsReview: regressions.filter((result) => result.verdict === "needs_review").length,
  };
}

export function compareRunRegressions(runHistory: RegressionResult[][]) {
  const current = toVerdictMap(runHistory[0] ?? []);
  const previous = toVerdictMap(runHistory[1] ?? []);
  const older = toVerdictMap((runHistory.slice(2).flat()));
  let newFailures = 0;
  let fixedFailures = 0;
  let reopenedFailures = 0;

  for (const [key, verdict] of current) {
    const prior = previous.get(key);
    if (verdict === "fail" && prior !== "fail") {
      newFailures += 1;
      if (prior === "pass" && older.get(key) === "fail") reopenedFailures += 1;
    }
    if (verdict === "pass" && prior === "fail") fixedFailures += 1;
  }

  return { newFailures, fixedFailures, reopenedFailures };
}

function toVerdictMap(results: RegressionResult[]) {
  return new Map(
    results.map((result) => [
      result.testCase.regressionTestId ?? normalizeInput(result.testCase.userInput),
      result.verdict,
    ]),
  );
}

function normalizeInput(input: string) {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}
