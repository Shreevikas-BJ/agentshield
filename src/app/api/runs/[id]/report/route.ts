import { NextResponse } from "next/server";

import { getRunDetail } from "@/lib/services/evaluation-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const run = await getRunDetail(id);

  if (!run?.report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  return NextResponse.json({ report: run.report });
}
