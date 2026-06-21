import Link from "next/link";
import { notFound } from "next/navigation";
import { GitCompare, ShieldCheck } from "lucide-react";

import { createPromptVersionAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { DatabaseError } from "@/components/database-error";
import { DeleteRunButton } from "@/components/delete-run-button";
import { EmptyState } from "@/components/empty-state";
import { RegressionSuiteManager } from "@/components/regression-suite-manager";
import { RunLauncher } from "@/components/run-launcher";
import { SubmitButton } from "@/components/submit-button";
import { TestSuiteManager } from "@/components/test-suite-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { compareRunRegressions } from "@/lib/evals/regression";
import type { PolicyCoverageSummary } from "@/lib/evals/policy-coverage";
import { getAgentDetail } from "@/lib/services/agent-service";

export const dynamic = "force-dynamic";

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let agent: Awaited<ReturnType<typeof getAgentDetail>> | null = null;
  let error: string | undefined;

  try {
    agent = await getAgentDetail(id);
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

  if (!agent) {
    notFound();
  }

  const latestSuite = agent.testSuites[0];
  const latestVersion = agent.promptVersions[0];
  const priorVersion = agent.promptVersions[1];
  const policyCoverage = latestSuite?.policyCoverage as unknown as PolicyCoverageSummary | null;
  const versionRows = agent.promptVersions.map((version) => {
    const runs = agent.testRuns.filter((run) => run.promptVersionId === version.id);
    const latestRun = runs[0];
    return {
      version: version.versionNumber,
      runs: runs.length,
      reliability: latestRun?.reliabilityScore,
      passRate: latestRun?.totalTests
        ? Math.round((latestRun.passedTests / latestRun.totalTests) * 100)
        : null,
      critical: latestRun?.results.filter(
        (result) => result.verdict === "fail" && result.severity === "critical",
      ).length ?? 0,
    };
  });
  const regressionDelta = compareRunRegressions(agent.testRuns.map((run) => run.results));

  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Prompt v{latestVersion?.versionNumber ?? 1}</Badge>
              <Badge variant="secondary">{latestSuite?.testCases.length ?? 0} tests</Badge>
              <Badge variant="outline">{agent.simulationMode.replaceAll("_", " ")}</Badge>
              <Badge variant="outline">{agent.scanLevel} scan</Badge>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal">{agent.name}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              {agent.description}
            </p>
          </div>
        </div>

        <RunLauncher
          agentId={agent.id}
          latestSuiteId={latestSuite?.id}
          defaultMode={agent.simulationMode}
          defaultScanLevel={agent.scanLevel}
          regressionCount={agent.regressionTests.length}
        />

        <Tabs defaultValue="overview" className="mt-6 gap-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="suite">Test suite</TabsTrigger>
            <TabsTrigger value="regressions">Regressions</TabsTrigger>
            <TabsTrigger value="versions">Prompt versions</TabsTrigger>
            <TabsTrigger value="runs">Runs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="size-4 text-cyan-300" />
                  System prompt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="max-h-96 overflow-auto rounded-md border bg-background/60 p-4 text-sm leading-6 whitespace-pre-wrap">
                  {agent.systemPrompt}
                </pre>
              </CardContent>
            </Card>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tools</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="overflow-auto rounded-md border bg-background/60 p-4 text-xs leading-5 whitespace-pre-wrap">
                    {agent.toolsText}
                  </pre>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Policy</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground whitespace-pre-wrap">
                    {agent.policyText}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Policy coverage</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-mono text-3xl font-semibold text-cyan-200">
                    {policyCoverage?.score ?? 0}%
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {policyCoverage?.coveredRules ?? 0} of {policyCoverage?.totalRules ?? 0} inferred rules covered.
                  </p>
                </CardContent>
              </Card>
            </div>
            {policyCoverage ? (
              <Card className="lg:col-span-3">
                <CardHeader><CardTitle className="text-base">Policy rule coverage</CardTitle></CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Rule</TableHead><TableHead>Covered</TableHead><TableHead>Tests</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {policyCoverage.rules.map((rule) => (
                        <TableRow key={rule.rule}>
                          <TableCell className="max-w-3xl text-sm">{rule.rule}</TableCell>
                          <TableCell><Badge variant={rule.covered ? "default" : "destructive"}>{rule.covered ? "Yes" : "No"}</Badge></TableCell>
                          <TableCell className="font-mono">{rule.testCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>

          <TabsContent value="suite" className="space-y-4">
            {!latestSuite ? (
              <EmptyState
                title="No generated suite yet"
                description="Generate a suite to create normal, edge, adversarial, privacy, policy, and tool-safety cases."
              />
            ) : (
              <TestSuiteManager tests={latestSuite.testCases} />
            )}
          </TabsContent>

          <TabsContent value="regressions" className="space-y-4">
            {agent.regressionTests.length === 0 ? (
              <EmptyState
                title="No saved regression tests"
                description="Save failed or needs-review results from a run to create a durable regression suite."
              />
            ) : (
              <RegressionSuiteManager tests={agent.regressionTests} />
            )}
          </TabsContent>

          <TabsContent value="versions" className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><GitCompare className="size-4" />Version metrics</CardTitle></CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Version</TableHead><TableHead>Runs</TableHead><TableHead>Pass rate</TableHead><TableHead>Reliability</TableHead><TableHead>Critical</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {versionRows.map((row) => (
                        <TableRow key={row.version}>
                          <TableCell>Prompt v{row.version}</TableCell>
                          <TableCell>{row.runs}</TableCell>
                          <TableCell>{row.passRate == null ? "-" : `${row.passRate}%`}</TableCell>
                          <TableCell>{row.reliability == null ? "-" : `${Math.round(row.reliability)}%`}</TableCell>
                          <TableCell>{row.critical}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">{regressionDelta.newFailures} new failures</Badge>
                    <Badge variant="outline">{regressionDelta.fixedFailures} fixed</Badge>
                    <Badge variant="outline">{regressionDelta.reopenedFailures} reopened</Badge>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Create prompt version</CardTitle></CardHeader>
                <CardContent>
                  <form action={createPromptVersionAction.bind(null, agent.id)} className="space-y-3">
                    <Label htmlFor="versionSystemPrompt">System prompt</Label>
                    <Textarea id="versionSystemPrompt" name="systemPrompt" defaultValue={agent.systemPrompt} rows={8} required />
                    <Label htmlFor="versionTools">Tools</Label>
                    <Textarea id="versionTools" name="toolsText" defaultValue={agent.toolsText} rows={3} required />
                    <Label htmlFor="versionPolicy">Policy</Label>
                    <Textarea id="versionPolicy" name="policyText" defaultValue={agent.policyText} rows={5} required />
                    <input type="hidden" name="sampleTasksText" value={agent.sampleTasksText ?? ""} />
                    <SubmitButton pendingText="Saving version...">Save new version</SubmitButton>
                  </form>
                </CardContent>
              </Card>
            </div>
            {latestVersion && priorVersion ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card><CardHeader><CardTitle className="text-base">Prompt v{priorVersion.versionNumber}</CardTitle></CardHeader><CardContent><pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">{priorVersion.systemPrompt}</pre></CardContent></Card>
                <Card><CardHeader><CardTitle className="text-base">Prompt v{latestVersion.versionNumber}</CardTitle></CardHeader><CardContent><pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">{latestVersion.systemPrompt}</pre></CardContent></Card>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="runs" className="space-y-4">
            {agent.testRuns.length === 0 ? (
              <EmptyState
                title="No evaluation runs yet"
                description="Run an evaluation to create results, failures, model-call traces, and a launch-readiness report."
              />
            ) : (
              agent.testRuns.map((run) => (
                <Card key={run.id}>
                  <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium">{run.testSuite.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {run.totalTests} tests, {run.failedTests} failed, score{" "}
                        {run.reliabilityScore == null ? "-" : `${Math.round(run.reliabilityScore)}%`}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline">Prompt v{run.promptVersion?.versionNumber ?? 1}</Badge>
                        <Badge variant="outline">{run.simulatedMode.replaceAll("_", " ")}</Badge>
                        <Badge variant="secondary">{run.status}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button asChild variant="outline"><Link href={`/runs/${run.id}`}>View run</Link></Button>
                      <DeleteRunButton runId={run.id} />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </section>
    </AppShell>
  );
}
