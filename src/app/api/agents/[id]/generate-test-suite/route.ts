import { NextResponse } from "next/server";

import { generateTestSuiteForAgent } from "@/lib/services/evaluation-service";
import { scanOptionsSchema } from "@/lib/validation/schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = scanOptionsSchema.parse(await request.json().catch(() => ({})));
  const suite = await generateTestSuiteForAgent(id, body);
  return NextResponse.json({ suite });
}
