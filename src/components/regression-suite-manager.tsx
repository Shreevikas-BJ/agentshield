"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type RegressionTest = {
  id: string;
  attackCategory: string | null;
  riskLevel: string;
  userInput: string;
  expectedBehavior: string;
};

export function RegressionSuiteManager({ tests }: { tests: RegressionTest[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string>();

  async function remove(id: string) {
    if (!window.confirm("Delete this saved regression test?")) return;
    setDeleting(id);
    const response = await fetch(`/api/regression-tests/${id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
    else setDeleting(undefined);
  }

  return (
    <div className="space-y-3">
      {tests.map((test) => (
        <Card key={test.id}>
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{test.attackCategory?.replaceAll("_", " ") ?? "regression"}</Badge>
                <Badge variant="secondary">{test.riskLevel}</Badge>
              </div>
              <p className="mt-3 text-sm font-medium">{test.userInput}</p>
              <p className="mt-2 text-sm text-muted-foreground">{test.expectedBehavior}</p>
            </div>
            <Button
              size="icon-sm"
              variant="ghost"
              title="Delete regression test"
              disabled={deleting === test.id}
              onClick={() => remove(test.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
