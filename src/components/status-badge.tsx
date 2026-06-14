import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const verdictClasses: Record<string, string> = {
  pass: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  fail: "border-red-400/30 bg-red-400/10 text-red-200",
  needs_review: "border-amber-300/30 bg-amber-300/10 text-amber-100",
};

const severityClasses: Record<string, string> = {
  low: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  medium: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  high: "border-orange-400/30 bg-orange-400/10 text-orange-100",
  critical: "border-red-400/30 bg-red-400/10 text-red-200",
};

export function VerdictBadge({ verdict }: { verdict: string }) {
  return (
    <Badge variant="outline" className={cn("capitalize", verdictClasses[verdict])}>
      {verdict.replace("_", " ")}
    </Badge>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  return (
    <Badge variant="outline" className={cn("capitalize", severityClasses[severity])}>
      {severity}
    </Badge>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  return (
    <Badge variant="secondary" className="capitalize">
      {category.replaceAll("_", " ")}
    </Badge>
  );
}
