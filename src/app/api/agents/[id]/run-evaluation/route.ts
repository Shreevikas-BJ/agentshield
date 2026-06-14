import { NextResponse } from "next/server";

import { runEvaluation } from "@/lib/services/evaluation-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const run = await runEvaluation(id, body.testSuiteId);
  return NextResponse.json({ run });
}
