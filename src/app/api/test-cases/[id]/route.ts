import { NextResponse } from "next/server";

import { deleteTestCase } from "@/lib/services/management-service";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await deleteTestCase(id);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete test." },
      { status: 409 },
    );
  }
}
