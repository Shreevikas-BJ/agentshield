import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="space-y-4 p-5">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
