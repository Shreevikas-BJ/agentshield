import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-dashed bg-card/40 p-8 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {actionHref && actionLabel ? (
        <Button asChild className="mt-5">
          <Link href={actionHref}>
            <Plus className="size-4" />
            {actionLabel}
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
