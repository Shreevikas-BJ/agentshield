"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Bot, CheckCircle2, Clock3, ShieldAlert } from "lucide-react";

import { simulatedModeConfig } from "@/lib/agent/simulation-modes";
import type { SimulatedAgentMode } from "@/lib/validation/schemas";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type ProgressState = {
  status: string;
  phase: string;
  totalTests: number;
  completedTests: number;
  passedTests: number;
  failedTests: number;
  needsReviewTests: number;
  currentTestLabel: string | null;
  currentAttackCategory: string | null;
  evaluatorStatus: string;
  simulatedMode: SimulatedAgentMode;
  reliabilityScore: number | null;
};

export function RunProgressPanel({ runId, initial }: { runId: string; initial: ProgressState }) {
  const router = useRouter();
  const [progress, setProgress] = useState(initial);
  const [pollError, setPollError] = useState<string>();

  useEffect(() => {
    let active = true;
    const timer = setInterval(async () => {
      try {
        const response = await fetch(`/api/runs/${runId}/progress`, { cache: "no-store" });
        if (!response.ok) throw new Error("Progress endpoint unavailable.");
        const payload = await response.json();
        if (!active) return;
        setProgress(payload.progress);
        setPollError(undefined);
        if (["completed", "failed"].includes(payload.progress.status)) {
          clearInterval(timer);
          router.refresh();
        }
      } catch (error) {
        if (active) setPollError(error instanceof Error ? error.message : "Progress update failed.");
      }
    }, 1000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [router, runId]);

  const percent = progress.totalTests === 0
    ? 0
    : Math.round((progress.completedTests / progress.totalTests) * 100);

  return (
    <Card className="border-cyan-400/20">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="size-4 text-cyan-300" />
            Scan in progress
          </CardTitle>
          <Badge variant="outline">{percent}%</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <Progress value={percent} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ProgressDatum icon={<Clock3 />} label="Phase" value={formatLabel(progress.phase)} />
          <ProgressDatum icon={<ShieldAlert />} label="Current attack" value={formatLabel(progress.currentAttackCategory ?? "preparing")} />
          <ProgressDatum icon={<Bot />} label="Simulated mode" value={simulatedModeConfig[progress.simulatedMode].label} />
          <ProgressDatum icon={<CheckCircle2 />} label="Evaluator" value={formatLabel(progress.evaluatorStatus)} />
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">{progress.completedTests}/{progress.totalTests} completed</Badge>
          <Badge variant="outline">{progress.passedTests} pass</Badge>
          <Badge variant="destructive">{progress.failedTests} fail</Badge>
          <Badge variant="secondary">{progress.needsReviewTests} needs review</Badge>
          {progress.currentTestLabel ? <Badge variant="outline">{progress.currentTestLabel}</Badge> : null}
        </div>
        {pollError ? <p className="text-xs text-yellow-200">{pollError} Retrying...</p> : null}
      </CardContent>
    </Card>
  );
}

function ProgressDatum({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-2 rounded-md border p-3">
      <span className="mt-0.5 text-cyan-200 [&_svg]:size-4">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
