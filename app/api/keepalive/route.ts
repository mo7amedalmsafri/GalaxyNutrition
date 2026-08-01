/* The heartbeat that keeps the database alive.
 *
 * Supabase's free tier pauses a project after ~7 days without traffic, and a
 * paused project's domain stops resolving entirely — which is exactly how
 * "the app opens but login does nothing" happened: three quiet weeks, frozen
 * database, every sign-in dead on web and iOS alike. Found the day the owner
 * was preparing to resubmit to App Review; had it frozen DURING review, the
 * reviewer would have hit the same dead login and rejected the app without
 * anyone knowing why.
 *
 * So Vercel cron calls this daily (vercel.json), and the route performs one
 * real query — auth-only traffic does not count as database activity, an
 * actual table read does. Six pings a week of margin against a seven-day
 * fuse. */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = createAdminClient();
    /* head:true fetches no rows — the point is the touch, not the data */
    const { error } = await db.from("profiles").select("id", { count: "exact", head: true });
    if (error) throw error;
    return NextResponse.json({ ok: true, at: new Date().toISOString() });
  } catch (e) {
    /* a failing heartbeat must say so loudly in the logs — silence here is
       how the next freeze arrives unannounced */
    console.error("[keepalive] FAILED:", (e as Error).message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
