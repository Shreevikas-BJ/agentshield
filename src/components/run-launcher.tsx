"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, Play, RotateCcw } from "lucide-react";

import { simulatedModeConfig } from "@/lib/agent/simulation-modes";
import type { ScanLevel, SimulatedAgentMode } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";

type RunLauncherProps = {
  agentId: string;
  latestSuiteId?: string;
  defaultMode: SimulatedAgentMode;
  defaultScanLevel: ScanLevel;
  regressionCount: number;
};

const scanLevels: Array<{ value: ScanLevel; label: string }> = [
  { value: "basic", label: "Basic" },
  { value: "strict", label: "Strict" },
  { value: "aggressive", label: "Aggressive Red-Team" },
];

export function RunLauncher({
  agentId,
  latestSuiteId,
  defaultMode,
  defaultScanLevel,
  regressionCount,
}: RunLauncherProps) {
  const router = useRouter();
  const [mode, setMode] = useState<SimulatedAgentMode>(defaultMode);
  const [scanLevel, setScanLevel] = useState<ScanLevel>(defaultScanLevel);
  const [busy, setBusy] = useState<"generate" | "run" | "regression" | null>(null);
  const [error, setError] = useState<string>();

  async function generateSuite() {
    setBusy("generate");
    setError(undefined);
    try {
      await request(`/api/agents/${agentId}/generate-test-suite`, {
        simulationMode: mode,
        scanLevel,
      });
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to generate suite.");
    } finally {
      setBusy(null);
    }
  }

  async function startRun(regression = false) {
    setBusy(regression ? "regression" : "run");
    setError(undefined);
    try {
      const payload = await request(
        regression
          ? `/api/agents/${agentId}/regression-run`
          : `/api/agents/${agentId}/run-evaluation`,
        {
          simulationMode: mode,
          scanLevel,
          testSuiteId: regression ? undefined : latestSuiteId,
        },
      );
      router.push(`/runs/${payload.run.id}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to start run.");
      setBusy(null);
    }
  }

  return (
    <div className="w-full border-y bg-card/40 py-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(190px,1fr)_minmax(190px,1fr)_auto] lg:items-end">
        <label className="grid gap-2 text-xs text-muted-foreground">
          Simulated agent mode
          <select
            aria-label="Simulated agent mode"
            value={mode}
            onChange={(event) => setMode(event.target.value as SimulatedAgentMode)}
            className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
          >
            {Object.entries(simulatedModeConfig).map(([value, config]) => (
              <option key={value} value={value}>{config.label}</option>
            ))}
          </select>
          <span>{simulatedModeConfig[mode].description}</span>
        </label>

        <label className="grid gap-2 text-xs text-muted-foreground">
          Scan level
          <select
            aria-label="Scan level"
            value={scanLevel}
            onChange={(event) => setScanLevel(event.target.value as ScanLevel)}
            className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
          >
            {scanLevels.map((level) => (
              <option key={level.value} value={level.value}>{level.label}</option>
            ))}
          </select>
          <span>Local deterministic attacks plus Groq-generated coverage.</span>
        </label>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={generateSuite} disabled={busy !== null}>
            <FlaskConical className="size-4" />
            {busy === "generate" ? "Generating..." : "Generate suite"}
          </Button>
          <Button onClick={() => startRun(false)} disabled={busy !== null}>
            <Play className="size-4" />
            {busy === "run" ? "Starting..." : "Run scan"}
          </Button>
          {regressionCount > 0 ? (
            <Button variant="secondary" onClick={() => startRun(true)} disabled={busy !== null}>
              <RotateCcw className="size-4" />
              {busy === "regression" ? "Starting..." : `Run ${regressionCount} regressions`}
            </Button>
          ) : null}
        </div>
      </div>
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
    </div>
  );
}

async function request(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "Request failed.");
  return payload;
}
