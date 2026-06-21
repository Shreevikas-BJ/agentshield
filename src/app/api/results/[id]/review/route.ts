import { NextResponse } from "next/server";

import { saveHumanReview } from "@/lib/services/management-service";
import { humanReviewInputSchema } from "@/lib/validation/schemas";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const input = humanReviewInputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Invalid review." }, { status: 400 });
  const { id } = await params;
  return NextResponse.json({ review: await saveHumanReview(id, input.data) });
}
