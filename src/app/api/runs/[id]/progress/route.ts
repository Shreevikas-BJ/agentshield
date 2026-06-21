import { NextResponse } from "next/server";

import { getRunProgress } from "@/lib/services/evaluation-service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const progress = await getRunProgress(id);
  if (!progress) return NextResponse.json({ error: "Run not found." }, { status: 404 });
  return NextResponse.json({ progress }, { headers: { "Cache-Control": "no-store" } });
}
