import Link from "next/link";
import { ArrowRight, Bot, Plus } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { DatabaseError } from "@/components/database-error";
import { EmptyState } from "@/components/empty-state";
import { VerdictBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAgents } from "@/lib/services/agent-service";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  let agents: Awaited<ReturnType<typeof getAgents>> = [];
  let error: string | undefined;

  try {
    agents = await getAgents();
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Unknown database error";
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-cyan-200">Evaluation targets</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">Agents</h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              Saved launch candidates with prompt versions, generated test suites, and reliability history.
            </p>
          </div>
          <Button asChild>
            <Link href="/agents/new">
              <Plus className="size-4" />
              Create new agent
            </Link>
          </Button>
        </div>

        {error ? <DatabaseError message={error} /> : null}

        {!error && agents.length === 0 ? (
          <EmptyState
            title="No agents yet"
            description="Create the first target agent, then generate a red-team suite and run a launch readiness evaluation."
            actionHref="/agents/new"
            actionLabel="Create agent"
          />
        ) : null}

        {!error && agents.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent) => {
              const latestRun = agent.testRuns[0];
              const latestPromptVersion = agent.promptVersions[0]?.versionNumber ?? 1;
              return (
                <Card key={agent.id}>
                  <CardHeader>
                    <CardTitle className="flex items-start justify-between gap-4">
                      <span className="flex items-center gap-2 text-base">
                        <Bot className="size-4 text-cyan-300" />
                        {agent.name}
                      </span>
                      <Badge variant="outline">v{latestPromptVersion}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {agent.description}
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <MiniStat label="Suites" value={agent._count.testSuites} />
                      <MiniStat label="Runs" value={agent._count.testRuns} />
                      <MiniStat
                        label="Score"
                        value={
                          latestRun?.reliabilityScore != null
                            ? `${Math.round(latestRun.reliabilityScore)}%`
                            : "-"
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      {latestRun ? (
                        <VerdictBadge
                          verdict={latestRun.failedTests > 0 ? "needs_review" : "pass"}
                        />
                      ) : (
                        <Badge variant="secondary">Not evaluated</Badge>
                      )}
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/agents/${agent.id}`}>
                          Open
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border bg-background/40 p-3">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
    </div>
  );
}
