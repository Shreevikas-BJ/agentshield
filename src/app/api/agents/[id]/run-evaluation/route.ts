import { after, NextResponse } from "next/server";

import { createEvaluationRun, executeEvaluationRun } from "@/lib/services/evaluation-service";
import { scanOptionsSchema } from "@/lib/validation/schemas";

export const maxDuration = 300;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = scanOptionsSchema.parse(await request.json().catch(() => ({})));
  const run = await createEvaluationRun(id, body.testSuiteId, body);
  after(async () => {
    await executeEvaluationRun(run.id).catch(() => undefined);
  });
  return NextResponse.json({ run }, { status: 202 });
}
