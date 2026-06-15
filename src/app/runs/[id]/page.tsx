import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Coins, Gauge, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { DatabaseError } from "@/components/database-error";
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

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let run: Awaited<ReturnType<typeof getRunDetail>> | null = null;
  let error: string | undefined;

  try {
    run = await getRunDetail(id);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Unknown database error";
  }

  if (error) {
    return (
      <AppShell>
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <DatabaseError message={error} />
        </section>
      </AppShell>
    );
  }

  if (!run) {
    notFound();
  }

  const criticalFailures = run.results.filter(
    (result) => result.verdict === "fail" && result.severity === "critical",
  );
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

  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Button asChild variant="ghost" size="sm" className="mb-6">
          <Link href={`/agents/${run.agentId}`}>
            <ArrowLeft className="size-4" />
            Back to agent
          </Link>
        </Button>

        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{run.status}</Badge>
              <Badge variant="secondary">{run.testSuite.name}</Badge>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal">
              {run.agent.name} evaluation
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Started {formatDate(run.startedAt)}
              {run.completedAt ? ` and completed ${formatDate(run.completedAt)}` : ""}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-5">
            <p className="text-xs text-muted-foreground">Reliability score</p>
            <p className="mt-2 font-mono text-5xl font-semibold text-cyan-200">
              {run.reliabilityScore == null ? "-" : `${Math.round(run.reliabilityScore)}%`}
            </p>
          </div>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <RunStat icon={<Gauge />} label="Total tests" value={run.totalTests} />
          <RunStat icon={<TriangleAlert />} label="Failed tests" value={run.failedTests} />
          <RunStat icon={<Clock />} label="Model latency" value={`${totalLatency}ms`} />
          <RunStat icon={<Coins />} label="Estimated cost" value={`$${tokenUsage.cost.toFixed(4)}`} />
        </div>

        {diagnostics.hasEvaluatorFallbackWarning ? (
          <Alert className="mb-6 border-yellow-400/30 bg-yellow-950/20">
            <TriangleAlert className="size-4" />
            <AlertTitle>Evaluator fallback used</AlertTitle>
            <AlertDescription>
              Some evaluator calls used fallback due to model errors; reliability score may need review.
              Failed Groq errors are listed in model-call diagnostics below.
            </AlertDescription>
          </Alert>
        ) : null}

        {criticalFailures.length > 0 ? (
          <Card className="mb-6 border-red-400/30 bg-red-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-red-100">
                <TriangleAlert className="size-4" />
                Critical failures
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {criticalFailures.map((failure) => (
                <div key={failure.id} className="rounded-md border bg-background/60 p-4">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <CategoryBadge category={failure.failureCategory} />
                    <SeverityBadge severity={failure.severity} />
                  </div>
                  <p className="text-sm font-medium">{failure.testCase.userInput}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{failure.explanation}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <CardTitle>Test results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Case</TableHead>
                      <TableHead>Expected</TableHead>
                      <TableHead>Actual</TableHead>
                      <TableHead>Verdict</TableHead>
                      <TableHead>Category</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {run.results.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="min-w-64 align-top">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{result.testCase.type}</Badge>
                            <SeverityBadge severity={result.severity} />
                          </div>
                          <p className="mt-2 text-sm">{result.testCase.userInput}</p>
                        </TableCell>
                        <TableCell className="min-w-72 align-top text-sm text-muted-foreground">
                          {result.testCase.expectedBehavior}
                        </TableCell>
                        <TableCell className="min-w-80 align-top text-sm text-muted-foreground">
                          <p className="line-clamp-6 whitespace-pre-wrap">{result.actualOutput}</p>
                        </TableCell>
                        <TableCell className="align-top">
                          <VerdictBadge verdict={result.verdict} />
                          <div className="mt-2">
                            <EvaluationSourceBadge explanation={result.explanation} />
                          </div>
                          <p className="mt-2 max-w-64 text-xs text-muted-foreground">
                            {result.explanation}
                          </p>
                        </TableCell>
                        <TableCell className="align-top">
                          <CategoryBadge category={result.failureCategory} />
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
                <CardHeader>
                  <CardTitle>Launch-readiness report</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <Badge variant={run.report.launchReadiness === "ready" ? "default" : "secondary"}>
                    {run.report.launchReadiness.replace("_", " ")}
                  </Badge>
                  <p className="leading-6 text-muted-foreground">{run.report.summary}</p>
                  <ReportList title="Strengths" items={run.report.strengths} />
                  <ReportList title="Weaknesses" items={run.report.weaknesses} />
                  <ReportList title="Recommendations" items={run.report.recommendations} />
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>Model call diagnostics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <MiniUsage label="Input tokens" value={tokenUsage.input} />
                  <MiniUsage label="Output tokens" value={tokenUsage.output} />
                  <MiniUsage label="Failed calls" value={diagnostics.failedCalls.length} />
                  <MiniUsage
                    label="Trace cost"
                    value={formatCostEstimate(diagnostics.totalEstimatedCostUsd)}
                  />
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Provider</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Usage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {run.modelCalls.map((call) => (
                        <TableRow key={call.id}>
                          <TableCell>
                            <Badge variant="outline">{call.provider}</Badge>
                            <p className="mt-1 font-mono text-xs text-muted-foreground">
                              {call.model}
                            </p>
                          </TableCell>
                          <TableCell className="min-w-52 text-xs">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={call.success ? "default" : "destructive"}>
                                {formatCallStatus(call.success)}
                              </Badge>
                              <span className="font-mono text-muted-foreground">
                                {call.latencyMs}ms
                              </span>
                            </div>
                            <p className="mt-2">{call.purpose}</p>
                            {call.error ? (
                              <p className="mt-2 max-w-72 whitespace-pre-wrap text-red-200">
                                {call.error}
                              </p>
                            ) : null}
                          </TableCell>
                          <TableCell className="min-w-40 font-mono text-xs">
                            <p>{call.inputTokens} in</p>
                            <p>{call.outputTokens} out</p>
                            <p>{formatCostEstimate(call.estimatedCostUsd)}</p>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function EvaluationSourceBadge({ explanation }: { explanation: string }) {
  const normalized = explanation.toLowerCase();

  if (normalized.includes("deterministic fallback used")) {
    return <Badge variant="secondary">Fallback review</Badge>;
  }

  if (normalized.includes("could not be validated")) {
    return <Badge variant="secondary">JSON repair review</Badge>;
  }

  return <Badge variant="outline">Groq review</Badge>;
}

function RunStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <span className="flex size-9 items-center justify-center rounded-md border text-cyan-200 [&_svg]:size-4">
          {icon}
        </span>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-mono text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ReportList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="font-medium">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function MiniUsage({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border bg-background/40 p-3">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-base font-semibold">{value}</p>
    </div>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
