import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Coins, Gauge, MessageSquareWarning, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { DatabaseError } from "@/components/database-error";
import { DeleteRunButton } from "@/components/delete-run-button";
import { ResultReviewActions } from "@/components/result-review-actions";
import { RunProgressPanel } from "@/components/run-progress-panel";
import { CategoryBadge, SeverityBadge, VerdictBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getRunDetail } from "@/lib/services/evaluation-service";
import {
  formatCallStatus,
  formatCostEstimate,
  summarizeModelCallDiagnostics,
} from "@/lib/services/model-call-diagnostics";

export const dynamic = "force-dynamic";

type ReportDetails = {
  counts: { total: number; pass: number; fail: number; needsReview: number };
  reliabilityScore: number;
  criticalBlockers: number;
  topCategories: Array<{ name: string; value: number }>;
  owaspRisks: Array<{ name: string; value: number }>;
  humanReview: {
    reviewedResults: number;
    agreementRate: number;
    falsePositives: number;
    falseNegatives: number;
    unresolvedReviews: number;
  };
  regression: { total: number; passed: number; failed: number; needsReview: number };
  policyCoverage: {
    score: number;
    coveredRules: number;
    totalRules: number;
    warnings: string[];
  };
  averageConfidence: number;
  evidence: Array<{
    test: string;
    category: string;
    owaspRisk: string;
    severity: string;
    evidence: string;
    recommendedFix: string;
  }>;
};

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let run: Awaited<ReturnType<typeof getRunDetail>> | null = null;
  let error: string | undefined;

  try {
    run = await getRunDetail(id);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Unknown database error";
  }

  if (error) {
    return <AppShell><section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><DatabaseError message={error} /></section></AppShell>;
  }
  if (!run) notFound();

  const active = ["pending", "running"].includes(run.status);
  const criticalFailures = run.results.filter(
    (result) => result.verdict === "fail" && result.severity === "critical",
  );
  const reviewQueue = run.results.filter((result) => result.verdict !== "pass");
  const totalLatency = run.modelCalls.reduce((total, call) => total + call.latencyMs, 0);
  const tokenUsage = run.modelCalls.reduce(
    (total, call) => ({
      input: total.input + call.inputTokens,
      output: total.output + call.outputTokens,
      cost: total.cost + Number(call.estimatedCostUsd),
    }),
    { input: 0, output: 0, cost: 0 },
  );
  const diagnostics = summarizeModelCallDiagnostics(run.modelCalls);
  const reportDetails = run.report?.details as unknown as ReportDetails | null;

  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/agents/${run.agentId}`}><ArrowLeft className="size-4" />Back to agent</Link>
          </Button>
          <DeleteRunButton runId={run.id} redirectTo={`/agents/${run.agentId}`} />
        </div>

        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{run.status}</Badge>
              <Badge variant="secondary">{run.testSuite.name}</Badge>
              <Badge variant="outline">Prompt v{run.promptVersion?.versionNumber ?? 1}</Badge>
              <Badge variant="outline">{run.simulatedMode.replaceAll("_", " ")}</Badge>
              <Badge variant="outline">{run.scanLevel} scan</Badge>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal">{run.agent.name} evaluation</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Started {formatDate(run.startedAt)}{run.completedAt ? ` and completed ${formatDate(run.completedAt)}` : ""}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-5">
            <p className="text-xs text-muted-foreground">Reliability score</p>
            <p className="mt-2 font-mono text-5xl font-semibold text-cyan-200">
              {run.reliabilityScore == null ? "-" : `${Math.round(run.reliabilityScore)}%`}
            </p>
          </div>
        </div>

        {active ? (
          <div className="mb-6">
            <RunProgressPanel runId={run.id} initial={{
              status: run.status,
              phase: run.phase,
              totalTests: run.totalTests,
              completedTests: run.completedTests,
              passedTests: run.passedTests,
              failedTests: run.failedTests,
              needsReviewTests: run.needsReviewTests,
              currentTestLabel: run.currentTestLabel,
              currentAttackCategory: run.currentAttackCategory,
              evaluatorStatus: run.evaluatorStatus,
              simulatedMode: run.simulatedMode,
              reliabilityScore: run.reliabilityScore,
            }} />
          </div>
        ) : null}

        {run.status === "failed" ? (
          <Alert variant="destructive" className="mb-6">
            <TriangleAlert /><AlertTitle>Run stopped</AlertTitle>
            <AlertDescription>The persisted progress and completed results remain available for debugging.</AlertDescription>
          </Alert>
        ) : null}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <RunStat icon={<Gauge />} label="Total tests" value={run.totalTests} />
          <RunStat icon={<TriangleAlert />} label="Failed" value={run.failedTests} />
          <RunStat icon={<MessageSquareWarning />} label="Needs review" value={run.needsReviewTests} />
          <RunStat icon={<Clock />} label="Model latency" value={`${totalLatency}ms`} />
          <RunStat icon={<Coins />} label="Estimated cost" value={`$${tokenUsage.cost.toFixed(4)}`} />
        </div>

        {diagnostics.hasEvaluatorFallbackWarning ? (
          <Alert className="mb-6 border-yellow-400/30 bg-yellow-950/20">
            <TriangleAlert /><AlertTitle>Evaluator fallback used</AlertTitle>
            <AlertDescription>Some Gemini evaluator calls used Groq or deterministic fallback due to model errors; reliability may need human review. Exact errors are shown below.</AlertDescription>
          </Alert>
        ) : null}

        {criticalFailures.length > 0 ? (
          <Card className="mb-6 border-red-400/30 bg-red-950/20">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base text-red-100"><TriangleAlert className="size-4" />Critical blockers</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {criticalFailures.map((failure) => (
                <div key={failure.id} className="rounded-md border bg-background/60 p-4">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <CategoryBadge category={failure.failureCategory} />
                    <SeverityBadge severity={failure.severity} />
                    <Badge variant="destructive">{failure.owaspRisk}</Badge>
                  </div>
                  <p className="text-sm font-medium">{failure.testCase.userInput}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{failure.evidence || failure.explanation}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
          <Card>
            <CardHeader><CardTitle>Test results</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Case</TableHead><TableHead>Actual response</TableHead><TableHead>Verdict</TableHead><TableHead>Risk</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {run.results.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="min-w-72 align-top">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{result.testCase.attackCategory ?? result.testCase.type}</Badge>
                            <SeverityBadge severity={result.severity} />
                            {result.testCase.regressionTestId ? <Badge variant="secondary">regression</Badge> : null}
                          </div>
                          <p className="mt-2 text-sm font-medium">{result.testCase.userInput}</p>
                          <p className="mt-2 text-xs text-muted-foreground">Expected: {result.testCase.expectedBehavior}</p>
                        </TableCell>
                        <TableCell className="min-w-80 align-top text-sm text-muted-foreground">
                          <p className="line-clamp-6 whitespace-pre-wrap">{result.actualOutput}</p>
                          {result.evidence ? <p className="mt-3 border-l-2 pl-3 text-xs text-foreground">Evidence: {result.evidence}</p> : null}
                        </TableCell>
                        <TableCell className="min-w-64 align-top">
                          <div className="flex flex-wrap gap-2">
                            <VerdictBadge verdict={result.verdict} />
                            <EvaluationSourceBadge provider={result.evaluatorProvider} usedFallback={result.usedFallback} />
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">{result.explanation}</p>
                          <p className="mt-2 text-xs">Confidence {Math.round((result.confidenceScore ?? 0) * 100)}%</p>
                        </TableCell>
                        <TableCell className="min-w-60 align-top">
                          <CategoryBadge category={result.failureCategory} />
                          <Badge variant="outline" className="mt-2 whitespace-normal text-left">{result.owaspRisk}</Badge>
                          {result.recommendedFix ? <p className="mt-3 text-xs text-muted-foreground">Fix: {result.recommendedFix}</p> : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {run.report ? (
              <Card>
                <CardHeader><CardTitle>Launch-readiness report</CardTitle></CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <Badge variant={run.report.launchReadiness === "ready" ? "default" : run.report.launchReadiness === "not_ready" ? "destructive" : "secondary"}>
                    {readinessLabel(run.report.launchReadiness)}
                  </Badge>
                  <p className="leading-6 text-muted-foreground">{run.report.summary}</p>
                  <ReportList title="Strengths" items={run.report.strengths} />
                  <ReportList title="Weaknesses" items={run.report.weaknesses} />
                  <ReportList title="Recommended fixes" items={run.report.recommendations} />
                  {reportDetails ? <ReportEvidence details={reportDetails} /> : null}
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader><CardTitle>Model call diagnostics</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <MiniUsage label="Input tokens" value={tokenUsage.input} />
                  <MiniUsage label="Output tokens" value={tokenUsage.output} />
                  <MiniUsage label="Failed calls" value={diagnostics.failedCalls.length} />
                  <MiniUsage label="Trace cost" value={formatCostEstimate(diagnostics.totalEstimatedCostUsd)} />
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Provider</TableHead><TableHead>Status</TableHead><TableHead>Usage</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {run.modelCalls.map((call) => (
                        <TableRow key={call.id}>
                          <TableCell><Badge variant="outline">{call.provider}</Badge><p className="mt-1 font-mono text-xs text-muted-foreground">{call.model}</p></TableCell>
                          <TableCell className="min-w-52 text-xs">
                            <div className="flex flex-wrap items-center gap-2"><Badge variant={call.success ? "default" : "destructive"}>{formatCallStatus(call.success)}</Badge><span className="font-mono text-muted-foreground">{call.latencyMs}ms</span></div>
                            <p className="mt-2">{call.purpose}</p>
                            {call.error ? <p className="mt-2 max-w-72 whitespace-pre-wrap text-red-200">{call.error}</p> : null}
                          </TableCell>
                          <TableCell className="min-w-40 font-mono text-xs"><p>{call.inputTokens} in</p><p>{call.outputTokens} out</p><p>{formatCostEstimate(call.estimatedCostUsd)}</p></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {reviewQueue.length > 0 ? (
          <section className="mt-6">
            <h2 className="text-xl font-semibold">Human review queue</h2>
            <p className="mt-2 text-sm text-muted-foreground">Confirm evaluator decisions, flag disagreements, and save durable regression tests.</p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {reviewQueue.map((result) => (
                <Card key={result.id}>
                  <CardContent className="p-5">
                    <div className="flex flex-wrap gap-2"><VerdictBadge verdict={result.verdict} /><Badge variant="outline">{result.owaspRisk}</Badge></div>
                    <p className="mt-3 text-sm font-medium">{result.testCase.userInput}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{result.explanation}</p>
                    <ResultReviewActions
                      resultId={result.id}
                      initialDecision={result.humanReview?.decision}
                      initialNotes={result.humanReview?.notes ?? ""}
                      regressionSaved={Boolean(result.savedRegression)}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </AppShell>
  );
}

function EvaluationSourceBadge({ provider, usedFallback }: { provider: string; usedFallback: boolean }) {
  return <Badge variant={usedFallback ? "secondary" : "outline"}>{usedFallback ? `${provider} fallback` : `${provider} judge`}</Badge>;
}

function ReportEvidence({ details }: { details: ReportDetails }) {
  return (
    <div className="space-y-4 border-t pt-4">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <MiniUsage label="Avg confidence" value={`${Math.round(details.averageConfidence * 100)}%`} />
        <MiniUsage label="Policy coverage" value={`${details.policyCoverage.score}%`} />
        <MiniUsage label="Review agreement" value={`${details.humanReview.agreementRate}%`} />
        <MiniUsage label="Unresolved reviews" value={details.humanReview.unresolvedReviews} />
        <MiniUsage label="Regression pass" value={`${details.regression.passed}/${details.regression.total}`} />
        <MiniUsage label="Critical blockers" value={details.criticalBlockers} />
      </div>
      <div><p className="font-medium">OWASP risk summary</p><div className="mt-2 flex flex-wrap gap-2">{details.owaspRisks.map((risk) => <Badge key={risk.name} variant="outline" className="whitespace-normal">{risk.name} ({risk.value})</Badge>)}</div></div>
      {details.evidence.length > 0 ? (
        <div><p className="font-medium">Evidence snippets</p><div className="mt-2 space-y-2">{details.evidence.slice(0, 3).map((item) => <div key={`${item.test}-${item.category}`} className="rounded-md border p-3"><p className="text-xs font-medium">{item.test}</p><p className="mt-1 text-xs text-muted-foreground">{item.evidence}</p></div>)}</div></div>
      ) : null}
    </div>
  );
}

function RunStat({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return <Card><CardContent className="flex items-center gap-3 p-5"><span className="flex size-9 items-center justify-center rounded-md border text-cyan-200 [&_svg]:size-4">{icon}</span><div><p className="text-xs text-muted-foreground">{label}</p><p className="font-mono text-xl font-semibold">{value}</p></div></CardContent></Card>;
}

function ReportList({ title, items }: { title: string; items: string[] }) {
  return <div><p className="font-medium">{title}</p><ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">{items.map((item) => <li key={item}>{item}</li>)}</ul></div>;
}

function MiniUsage({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-md border bg-background/40 p-3"><p className="text-muted-foreground">{label}</p><p className="mt-1 font-mono text-base font-semibold">{value}</p></div>;
}

function readinessLabel(readiness: string) {
  if (readiness === "ready") return "Launch-ready";
  if (readiness === "not_ready") return "Not ready";
  return "Needs review";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
