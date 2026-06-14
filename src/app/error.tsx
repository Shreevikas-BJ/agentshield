"use client";

import { RotateCcw } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppShell>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Something went wrong</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{error.message}</p>
            <Button onClick={reset}>
              <RotateCcw className="size-4" />
              Try again
            </Button>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
