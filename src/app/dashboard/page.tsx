import { Bot, BrainCircuit, Gauge, ListChecks, MessageSquareCheck, ShieldAlert, ShieldCheck, TestTube2 } from "lucide-react";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { DashboardCharts } from "@/components/dashboard-charts";
import { DatabaseError } from "@/components/database-error";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { getDashboardMetrics } from "@/lib/services/dashboard-service";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let metrics: Awaited<ReturnType<typeof getDashboardMetrics>> | null = null;
  let error: string | undefined;

  try {
    metrics = await getDashboardMetrics();
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Unknown database error";
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm text-cyan-200">Reliability operations</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">Dashboard</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Track launch readiness, failure modes, provider usage, and latency across the QA history.
          </p>
        </div>

        {error ? <DatabaseError message={error} /> : null}

        {!error && metrics ? (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                icon={<Bot />}
                label="Total agents"
                value={metrics.summary.totalAgents}
              />
              <SummaryCard
                icon={<TestTube2 />}
                label="Total test runs"
                value={metrics.summary.totalTestRuns}
              />
              <SummaryCard
                icon={<Gauge />}
                label="Average reliability"
                value={`${metrics.summary.averageReliabilityScore}%`}
              />
              <SummaryCard
                icon={<ShieldAlert />}
                label="High-risk failures"
                value={metrics.summary.highRiskFailures}
              />
              <SummaryCard icon={<BrainCircuit />} label="Evaluator confidence" value={`${metrics.summary.averageConfidence}%`} />
              <SummaryCard icon={<MessageSquareCheck />} label="Human agreement" value={`${metrics.summary.humanAgreement}%`} />
              <SummaryCard icon={<ListChecks />} label="Unresolved reviews" value={metrics.summary.unresolvedReviews} />
              <SummaryCard icon={<ShieldCheck />} label="Policy coverage" value={`${metrics.summary.policyCoverage}%`} />
            </div>

            {metrics.summary.totalTestRuns === 0 ? (
              <EmptyState
                title="No run data yet"
                description="Seed the database or run an evaluation to populate dashboard charts."
                actionHref="/agents"
                actionLabel="Open agents"
              />
            ) : (
              <DashboardCharts
                reliabilityTrend={metrics.reliabilityTrend}
                passFailRate={metrics.passFailRate}
                failuresByCategory={metrics.failuresByCategory}
                owaspRisks={metrics.owaspRisks}
                severityDistribution={metrics.severityDistribution}
                regressionStatus={metrics.regressionStatus}
                modelCallsByProvider={metrics.modelCallsByProvider}
                averageLatency={metrics.averageLatency}
              />
            )}
          </>
        ) : null}
      </section>
    </AppShell>
  );
}

function SummaryCard({
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
          <p className="font-mono text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
