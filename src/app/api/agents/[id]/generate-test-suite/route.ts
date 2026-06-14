import { NextResponse } from "next/server";

import { generateTestSuiteForAgent } from "@/lib/services/evaluation-service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const suite = await generateTestSuiteForAgent(id);
  return NextResponse.json({ suite });
}
