type DiagnosticCall = {
  provider: string;
  purpose: string;
  success: boolean;
  estimatedCostUsd: unknown;
  error: string | null;
};

export function summarizeModelCallDiagnostics(calls: DiagnosticCall[]) {
  const failedCalls = calls.filter((call) => !call.success);
  const evaluatorFallbacks = failedCalls.filter((call) =>
    call.purpose.startsWith("first_pass_evaluation")
      || call.purpose.startsWith("primary_evaluation"),
  );

  return {
    totalCalls: calls.length,
    failedCalls,
    evaluatorFallbacks,
    hasEvaluatorFallbackWarning: evaluatorFallbacks.length > 0,
    totalEstimatedCostUsd: calls.reduce(
      (total, call) => total + Number(call.estimatedCostUsd ?? 0),
      0,
    ),
  };
}

export function formatCallStatus(success: boolean) {
  return success ? "succeeded" : "failed";
}

export function formatCostEstimate(value: unknown) {
  return `$${Number(value ?? 0).toFixed(6)}`;
}
