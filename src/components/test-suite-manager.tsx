"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { CategoryBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type ManagedTest = {
  id: string;
  type: string;
  riskLevel: string;
  attackCategory: string | null;
  source: string;
  userInput: string;
  expectedBehavior: string;
};

export function TestSuiteManager({ tests }: { tests: ManagedTest[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function remove(ids: string[]) {
    if (!window.confirm(`Delete ${ids.length} selected test${ids.length === 1 ? "" : "s"}?`)) return;
    setBusy(true);
    setError(undefined);
    try {
      const response = ids.length === 1
        ? await fetch(`/api/test-cases/${ids[0]}`, { method: "DELETE" })
        : await fetch("/api/test-cases/bulk-delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids }),
          });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Delete failed.");
      setSelected([]);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to delete tests.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={selected.length === tests.length && tests.length > 0}
            onChange={(event) => setSelected(event.target.checked ? tests.map((test) => test.id) : [])}
            className="size-4 accent-cyan-400"
          />
          Select all
        </label>
        <Button
          size="sm"
          variant="destructive"
          disabled={selected.length === 0 || busy}
          onClick={() => remove(selected)}
        >
          <Trash2 className="size-4" />
          Delete selected ({selected.length})
        </Button>
      </div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {tests.map((test, index) => (
        <Card key={test.id}>
          <CardContent className="grid gap-4 p-5 lg:grid-cols-[28px_160px_1fr_auto]">
            <input
              aria-label={`Select TC-${index + 1}`}
              type="checkbox"
              checked={selected.includes(test.id)}
              onChange={(event) => setSelected((current) =>
                event.target.checked ? [...current, test.id] : current.filter((id) => id !== test.id),
              )}
              className="mt-1 size-4 accent-cyan-400"
            />
            <div>
              <p className="font-mono text-xs text-muted-foreground">TC-{index + 1}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <CategoryBadge category={test.attackCategory ?? test.type} />
                <Badge variant="outline">{test.riskLevel}</Badge>
                <Badge variant="secondary">{test.source.replace("_", " ")}</Badge>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">{test.userInput}</p>
              <Separator className="my-3" />
              <p className="text-sm text-muted-foreground">{test.expectedBehavior}</p>
            </div>
            <Button
              size="icon-sm"
              variant="ghost"
              title="Delete test"
              disabled={busy}
              onClick={() => remove([test.id])}
            >
              <Trash2 className="size-4" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
