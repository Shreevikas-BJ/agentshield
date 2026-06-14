import { NextResponse } from "next/server";

import { createAgent } from "@/lib/services/agent-service";
import { agentInputSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = agentInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid agent input.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const agent = await createAgent(parsed.data);
  return NextResponse.json({ agent }, { status: 201 });
}
