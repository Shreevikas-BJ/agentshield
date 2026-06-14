import { NextResponse } from "next/server";

import { getDashboardMetrics } from "@/lib/services/dashboard-service";

export async function GET() {
  const metrics = await getDashboardMetrics();
  return NextResponse.json(metrics);
}
