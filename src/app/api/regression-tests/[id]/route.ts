import { NextResponse } from "next/server";

import { deleteRegressionTest } from "@/lib/services/management-service";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await deleteRegressionTest(id);
  return NextResponse.json({ deleted: true });
}
