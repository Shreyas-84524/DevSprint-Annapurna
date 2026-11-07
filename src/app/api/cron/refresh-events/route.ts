/**
 * Vercel Cron Endpoint: Daily Rolling Events Date Refresh
 *
 * Invokes the privileged internal.refresh_rolling_events() function via service_role
 * to advance rolling demo event dates by their configured day offset (1-10 days),
 * preserving their intended local times and keeping them permanently upcoming.
 *
 * Protected by CRON_SECRET bearer token.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      { status: 401 }
    );
  }

  try {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.rpc("refresh_rolling_events");

    if (error) {
      console.error("[CRON refresh-events error]", error);
      return NextResponse.json(
        { data: null, error: { message: "Failed to refresh rolling events", code: "REFRESH_FAILED" } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        updatedCount: data ?? 0,
        refreshedAt: new Date().toISOString(),
      },
      error: null,
    });
  } catch (err: any) {
    console.error("[CRON refresh-events exception]", err);
    return NextResponse.json(
      { data: null, error: { message: "Internal server error", code: "INTERNAL_ERROR" } },
      { status: 500 }
    );
  }
}
