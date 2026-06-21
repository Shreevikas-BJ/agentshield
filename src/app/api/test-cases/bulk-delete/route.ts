import { NextResponse } from "next/server";
import { z } from "zod";

import { bulkDeleteTestCases } from "@/lib/services/management-service";

const inputSchema = z.object({ ids: z.array(z.string().min(1)).min(1).max(100) });

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Select at least one test." }, { status: 400 });

  try {
    return NextResponse.json(await bulkDeleteTestCases(parsed.data.ids));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete tests." },
      { status: 409 },
    );
  }
}
