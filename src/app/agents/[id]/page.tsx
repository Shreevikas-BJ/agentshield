import Link from "next/link";
import { notFound } from "next/navigation";
import { FlaskConical, Play, ShieldCheck } from "lucide-react";

import {
  generateTestSuiteAction,
  runEvaluationAction,
} from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { DatabaseError } from "@/components/database-error";
import { EmptyState } from "@/components/empty-state";
import { SubmitButton } from "@/components/submit-button";
import { CategoryBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const latestVersion = agent.promptVersions[0]?.versionNumber ?? 1;

  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Prompt v{latestVersion}</Badge>
              <Badge variant="secondary">{latestSuite?.testCases.length ?? 0} tests</Badge>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal">{agent.name}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              {agent.description}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <form action={generateTestSuiteAction.bind(null, agent.id)}>
              <SubmitButton pendingText="Generating..." variant="outline">
                <FlaskConical className="size-4" />
                Generate Test Suite
              </SubmitButton>
            </form>
            <form action={runEvaluationAction.bind(null, agent.id, latestSuite?.id)}>
              <SubmitButton pendingText="Running...">
                <Play className="size-4" />
                Run Evaluation
              </SubmitButton>
            </form>
          </div>
        </div>

        <Tabs defaultValue="overview" className="gap-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="suite">Test suite</TabsTrigger>
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
            </div>
          </TabsContent>

          <TabsContent value="suite" className="space-y-4">
            {!latestSuite ? (
              <EmptyState
                title="No generated suite yet"
                description="Generate a suite to create normal, edge, adversarial, privacy, policy, and tool-safety cases."
              />
            ) : (
              latestSuite.testCases.map((testCase, index) => (
                <Card key={testCase.id}>
                  <CardContent className="grid gap-4 p-5 lg:grid-cols-[160px_1fr]">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">TC-{index + 1}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <CategoryBadge category={testCase.type} />
                        <Badge variant="outline">{testCase.riskLevel}</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{testCase.userInput}</p>
                      <Separator className="my-3" />
                      <p className="text-sm text-muted-foreground">
                        {testCase.expectedBehavior}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
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
                    </div>
                    <Button asChild variant="outline">
                      <Link href={`/runs/${run.id}`}>View run</Link>
                    </Button>
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
