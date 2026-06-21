import { after, NextResponse } from "next/server";

import { createRegressionRun, executeEvaluationRun } from "@/lib/services/evaluation-service";
import { scanOptionsSchema } from "@/lib/validation/schemas";

export const maxDuration = 300;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const options = scanOptionsSchema.parse(await request.json().catch(() => ({})));
    const run = await createRegressionRun(id, options);
    after(async () => {
      await executeEvaluationRun(run.id).catch(() => undefined);
    });
    return NextResponse.json({ run }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to start regression run." },
      { status: 409 },
    );
  }
}
