/* TEMPORARY — checks whether the existing Resend key can send to real users. */
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ ok: false, why: "no key on server" });
  try {
    const r = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
    });
    const j = await r.json();
    return NextResponse.json({
      status: r.status,
      domains: (j?.data ?? []).map((d: { name: string; status: string }) => ({ name: d.name, status: d.status })),
      raw: r.status !== 200 ? j : undefined,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, err: String(e) });
  }
}
