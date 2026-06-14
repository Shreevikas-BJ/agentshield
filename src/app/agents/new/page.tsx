import { AppShell } from "@/components/app-shell";
import { AgentForm } from "@/components/agent-form";

export default function NewAgentPage() {
  return (
    <AppShell>
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm text-cyan-200">New evaluation target</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">Create agent test</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            AgentShield needs the agent prompt, available tools, policy boundaries, and optional
            sample tasks to generate a realistic red-team suite.
          </p>
        </div>
        <AgentForm />
      </section>
    </AppShell>
  );
}
