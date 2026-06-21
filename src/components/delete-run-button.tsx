"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function DeleteRunButton({ runId, redirectTo }: { runId: string; redirectTo?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm("Delete this run and all related results, reviews, failures, traces, and report?")) return;
    setBusy(true);
    const response = await fetch(`/api/runs/${runId}`, { method: "DELETE" });
    if (response.ok) {
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
      return;
    }
    setBusy(false);
  }

  return (
    <Button size="icon-sm" variant="ghost" title="Delete run" disabled={busy} onClick={remove}>
      <Trash2 className="size-4" />
    </Button>
  );
}
