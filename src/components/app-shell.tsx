import Link from "next/link";
import type { ReactNode } from "react";
import { Activity, Gauge, Plus, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/agents", label: "Agents" },
  { href: "/dashboard", label: "Dashboard" },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-md border bg-card">
              <ShieldCheck className="size-4 text-cyan-300" />
            </span>
            <span>AgentShield</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Button asChild key={item.href} variant="ghost" size="sm">
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon-sm" className="md:hidden">
              <Link href="/dashboard" aria-label="Dashboard">
                <Gauge className="size-4" />
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/agents/new">
                <Plus className="size-4" />
                New agent
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <span>AgentShield MVP: QA traces, model calls, and launch-readiness evidence.</span>
          <span className="inline-flex items-center gap-1">
            <Activity className="size-3" />
            Mock mode works without LLM API keys.
          </span>
        </div>
      </footer>
    </div>
  );
}
