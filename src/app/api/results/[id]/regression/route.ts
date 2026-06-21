import { NextResponse } from "next/server";

import { saveRegressionTest } from "@/lib/services/management-service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    return NextResponse.json({ regression: await saveRegressionTest(id) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save regression test." },
      { status: 409 },
    );
  }
}
