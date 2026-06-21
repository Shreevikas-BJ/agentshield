"use client";

import { useActionState } from "react";
import { ShieldPlus } from "lucide-react";

import { createAgentAction, type AgentFormState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { simulatedModeConfig } from "@/lib/agent/simulation-modes";

const initialState: AgentFormState = {};

export function AgentForm() {
  const [state, formAction] = useActionState(createAgentAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>{state.error}</AlertTitle>
          <AlertDescription>AgentShield validates prompts, tools, and policy before saving.</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldPlus className="size-4 text-cyan-300" />
            Agent definition
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <FieldError errors={state.fieldErrors?.name} />
          <div className="grid gap-2">
            <Label htmlFor="name">Agent name</Label>
            <Input id="name" name="name" placeholder="AI Sales Assistant" required />
          </div>

          <FieldError errors={state.fieldErrors?.description} />
          <div className="grid gap-2">
            <Label htmlFor="description">Agent description</Label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              placeholder="Handles outbound sales workflows, CRM lookups, and approval-aware email drafting."
              required
            />
          </div>

          <FieldError errors={state.fieldErrors?.systemPrompt} />
          <div className="grid gap-2">
            <Label htmlFor="systemPrompt">System prompt</Label>
            <Textarea
              id="systemPrompt"
              name="systemPrompt"
              rows={7}
              placeholder="You are a careful sales assistant. Follow policy, ask for approval before sending email..."
              required
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="toolsText">Tool list</Label>
              <Textarea
                id="toolsText"
                name="toolsText"
                rows={8}
                placeholder='["send_email", "search_crm", "update_lead_status"]'
                required
              />
              <FieldError errors={state.fieldErrors?.toolsText} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="policyText">Company policy / safety rules</Label>
              <Textarea
                id="policyText"
                name="policyText"
                rows={8}
                placeholder="Never promise discounts. Never send email without approval. Never expose internal CRM notes."
                required
              />
              <FieldError errors={state.fieldErrors?.policyText} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sampleTasksText">Optional sample user tasks</Label>
            <Textarea
              id="sampleTasksText"
              name="sampleTasksText"
              rows={4}
              placeholder="Draft a follow-up email. Search CRM for lead status. Ask manager approval for discounts."
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="simulationMode">Default simulated agent mode</Label>
              <select
                id="simulationMode"
                name="simulationMode"
                defaultValue="safe"
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                {Object.entries(simulatedModeConfig).map(([value, config]) => (
                  <option key={value} value={value}>{config.label}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="scanLevel">Default scan level</Label>
              <select
                id="scanLevel"
                name="scanLevel"
                defaultValue="strict"
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value="basic">Basic</option>
                <option value="strict">Strict</option>
                <option value="aggressive">Aggressive Red-Team</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <SubmitButton pendingText="Creating agent..." size="lg">
        <ShieldPlus className="size-4" />
        Create agent
      </SubmitButton>
    </form>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-sm text-red-300">{errors[0]}</p>;
}
