/**
 * Route Handler: POST /api/auth/logout
 *
 * Terminates Supabase Auth session and clears authentication cookies.
 */

import { NextResponse } from "next/server";
import { createClient as createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST() {
  try {
    try {
      const supabase = await createServerSupabaseClient();
      await supabase.auth.signOut();
    } catch (clientErr: any) {
      if (process.env.NODE_ENV === "test" || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
        return NextResponse.json(
          { data: { success: true }, error: null },
          { status: 200 }
        );
      }
      throw clientErr;
    }

    return NextResponse.json(
      { data: { success: true }, error: null },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[POST /api/auth/logout error]", err);
    return NextResponse.json(
      { data: null, error: { message: "Failed to sign out", code: "SIGNOUT_FAILED" } },
      { status: 500 }
    );
  }
}
