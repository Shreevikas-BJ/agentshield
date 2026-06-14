import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const categories = [
  "policy_violation",
  "unsafe_tool_call",
  "privacy_leak",
  "missing_escalation",
];

export default function HomePage() {
  return (
    <AppShell>
      <section className="border-b">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-20">
          <div className="flex flex-col justify-center">
            <Badge variant="outline" className="mb-5 w-fit border-cyan-400/30 text-cyan-200">
              Multi-LLM agent QA before launch
            </Badge>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-normal text-balance sm:text-5xl">
              AgentShield
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Define an AI agent, generate adversarial and normal test cases, simulate
              responses, evaluate failures, and produce a launch-readiness report with
              model-call traces.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/agents/new">
                  Create agent test
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/dashboard">
                  View dashboard
                  <BarChart3 className="size-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4 shadow-2xl shadow-cyan-950/20">
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <div>
                <p className="text-sm font-medium">AI Sales Assistant</p>
                <p className="text-xs text-muted-foreground">Launch readiness run</p>
              </div>
              <Badge className="bg-amber-300 text-black">Needs review</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="Reliability" value="72%" tone="cyan" />
              <Metric label="Critical" value="2" tone="red" />
              <Metric label="Latency" value="841ms" tone="emerald" />
            </div>
            <div className="mt-5 space-y-3">
              {categories.map((category, index) => (
                <div
                  key={category}
                  className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border bg-background/40 p-3"
                >
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {category.replaceAll("_", " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {index % 2 === 0 ? "High-risk test failed" : "Manual review needed"}
                    </p>
                  </div>
                  {index === 0 || index === 2 ? (
                    <ShieldAlert className="size-4 text-red-300" />
                  ) : (
                    <CheckCircle2 className="size-4 text-amber-200" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        {[
          {
            title: "Generate adversarial suites",
            body: "Groq creates focused normal, edge, prompt-injection, privacy, policy, and tool-safety tests.",
          },
          {
            title: "Trace every model call",
            body: "Provider, model, latency, token estimates, retries, and success state are stored for auditability.",
          },
          {
            title: "Report launch risk",
            body: "Scores, failure categories, and recommendations are assembled into a readiness report.",
          },
        ].map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="size-4 text-cyan-300" />
                {item.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{item.body}</CardContent>
          </Card>
        ))}
      </section>
    </AppShell>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "cyan" | "red" | "emerald";
}) {
  const toneClass = {
    cyan: "text-cyan-200",
    red: "text-red-200",
    emerald: "text-emerald-200",
  }[tone];

  return (
    <div className="rounded-md border bg-background/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-2 font-mono text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
