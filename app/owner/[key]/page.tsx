/* The owner's private dashboard — Dietak from the operator's chair.
 *
 * Reached only through a key derived from the server's own secret
 * (lib/owner.ts): nothing links here, a wrong key is a plain 404, and the
 * comparison is constant-time. The service role reads everything directly,
 * so this page never depends on being logged in as any app user.
 *
 * Every read is wrapped in safe(): the pending SQL upgrades mean some tables
 * (subscriptions, admin messages) may not exist yet, and a dashboard that
 * 500s over a missing optional table tells the owner nothing. Absent data
 * renders as zero, and the page says which upgrade would fill it in.
 *
 * WHAT THIS CAN AND CANNOT SHOW. Food, water and weight DO sync to Supabase,
 * so engagement here is real. But meal COUNTERS, ad state and some Pro flags
 * live in localStorage on each phone by design — those numbers do not exist
 * server-side and are deliberately not faked here. */

import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerKey } from "@/lib/owner";

export const dynamic = "force-dynamic";

/* one failed/missing table must never blank the whole page */
async function safe<T>(q: PromiseLike<{ data: T | null; error: unknown }>): Promise<T | null> {
  try {
    const { data } = await q;
    return data ?? null;
  } catch {
    return null;
  }
}

const DAY = 86_400_000;
const fmt = (n: number) => n.toLocaleString("en-US");
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export default async function OwnerPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!isOwnerKey(key)) notFound();

  const db = createAdminClient();
  const now = Date.now();
  const since30 = new Date(now - 30 * DAY).toISOString();
  const since7 = new Date(now - 7 * DAY).toISOString();

  /* auth users — the ground truth for accounts. Paged API, 1000 covers the
     current scale; the count banner below goes honest if it overflows. */
  const usersRes = await db.auth.admin.listUsers({ page: 1, perPage: 1000 }).catch(() => null);
  const users = usersRes?.data?.users ?? [];

  const [profiles, foods30, water30, weights30, subs, contacts] = await Promise.all([
    safe(db.from("profiles").select("id, name, goal, xp_locked, updated_at")),
    safe(db.from("food_logs").select("user_id, date, calories").gte("date", since30.slice(0, 10))),
    safe(db.from("water_logs").select("user_id, date").gte("date", since30.slice(0, 10))),
    safe(db.from("weight_entries").select("user_id, date").gte("date", since30.slice(0, 10))),
    safe(db.from("subscriptions").select("user_id, status, current_period_end")),
    safe(db.from("contact_messages").select("id, created_at, is_read")),
  ]);

  /* ---- derived numbers, all plain arithmetic ---- */
  const newUsers7 = users.filter((u) => u.created_at && u.created_at >= since7).length;
  const seen7 = users.filter((u) => u.last_sign_in_at && u.last_sign_in_at >= since7).length;

  const logsByUser = new Map<string, number>();
  for (const f of foods30 ?? []) logsByUser.set(f.user_id, (logsByUser.get(f.user_id) ?? 0) + 1);
  const activeLoggers30 = logsByUser.size;

  const activeSubs = (subs ?? []).filter((s) => s.status === "active" || s.status === "trialing");
  const xpByUser = new Map((profiles ?? []).map((p) => [p.id, p.xp_locked ?? 0]));

  /* signups per day, last 30 — the growth curve */
  const perDay = new Map<string, number>();
  for (let i = 29; i >= 0; i--) perDay.set(dayKey(new Date(now - i * DAY)), 0);
  for (const u of users) {
    const k = (u.created_at ?? "").slice(0, 10);
    if (perDay.has(k)) perDay.set(k, (perDay.get(k) ?? 0) + 1);
  }
  const days = [...perDay.entries()];
  const peak = Math.max(1, ...days.map(([, v]) => v));

  /* the people table: newest first, with their real engagement */
  const rows = [...users]
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .slice(0, 30)
    .map((u) => ({
      email: u.email ?? "—",
      joined: (u.created_at ?? "").slice(0, 10),
      lastSeen: (u.last_sign_in_at ?? "").slice(0, 10) || "—",
      meals30: logsByUser.get(u.id) ?? 0,
      xp: xpByUser.get(u.id) ?? 0,
      pro: activeSubs.some((s) => s.user_id === u.id),
    }));

  const unread = (contacts ?? []).filter((c) => !c.is_read).length;

  const kpis: { label: string; value: string; note?: string }[] = [
    { label: "المستخدمون", value: fmt(users.length), note: users.length >= 1000 ? "أول ١٠٠٠ فقط" : undefined },
    { label: "جدد آخر ٧ أيام", value: fmt(newUsers7) },
    { label: "دخلوا آخر ٧ أيام", value: fmt(seen7) },
    { label: "يسجّلون وجبات (٣٠ يوم)", value: fmt(activeLoggers30) },
    { label: "وجبات مسجّلة (٣٠ يوم)", value: fmt((foods30 ?? []).length) },
    { label: "مشتركو Pro", value: subs === null ? "—" : fmt(activeSubs.length), note: subs === null ? "شغّل supabase-updates.sql" : undefined },
    { label: "رسائل غير مقروءة", value: contacts === null ? "—" : fmt(unread) },
    { label: "قياسات وزن (٣٠ يوم)", value: fmt((weights30 ?? []).length) },
    { label: "أيام ماء مسجّلة (٣٠ يوم)", value: fmt((water30 ?? []).length) },
  ];

  const S = {
    card: {
      background: "#12141c", border: "1px solid #ffffff14", borderRadius: 16, padding: 18,
    } as React.CSSProperties,
    h: { fontSize: 13, fontWeight: 700, color: "#8b8fa3", margin: "0 0 12px" } as React.CSSProperties,
  };

  return (
    <div dir="rtl" style={{
      minHeight: "100vh", background: "#0b0d13", color: "#eef0f6", padding: "28px 18px 60px",
      fontFamily: "'Segoe UI', Tahoma, sans-serif",
    }}>
      <div style={{ maxWidth: 1060, margin: "0 auto", display: "grid", gap: 16 }}>
        <header style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>🍏 دايتك — لوحة المالك</h1>
          <span style={{ color: "#8b8fa3", fontSize: 12.5 }}>
            تتحدث مع كل تحميل · هذا الرابط سري — لا تشاركه
          </span>
        </header>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12 }}>
          {kpis.map((k) => (
            <div key={k.label} style={S.card}>
              <div style={{ fontSize: 12, color: "#8b8fa3" }}>{k.label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{k.value}</div>
              {k.note && <div style={{ fontSize: 11, color: "#e2a03a", marginTop: 4 }}>{k.note}</div>}
            </div>
          ))}
        </div>

        {/* growth: signups per day */}
        <div style={S.card}>
          <h2 style={S.h}>مستخدمون جدد — آخر ٣٠ يومًا</h2>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 110 }}>
            {days.map(([d, v]) => (
              <div key={d} title={`${d}: ${v}`} style={{
                flex: 1, minWidth: 4, borderRadius: "3px 3px 0 0",
                height: `${Math.max(3, (v / peak) * 100)}%`,
                background: v ? "#4ade80" : "#ffffff12",
              }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#6f7385", fontSize: 11, marginTop: 6 }}>
            <span>{days[0]?.[0]}</span><span>{days.at(-1)?.[0]}</span>
          </div>
        </div>

        {/* the people */}
        <div style={{ ...S.card, overflowX: "auto" }}>
          <h2 style={S.h}>آخر ٣٠ مستخدمًا</h2>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13, whiteSpace: "nowrap" }}>
            <thead>
              <tr style={{ color: "#8b8fa3", textAlign: "right" }}>
                {["البريد", "انضم", "آخر دخول", "وجبات ٣٠ يوم", "XP", "Pro"].map((h) => (
                  <th key={h} style={{ padding: "8px 10px", borderBottom: "1px solid #ffffff14", fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.email + r.joined}>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid #ffffff0a" }}>{r.email}</td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid #ffffff0a", color: "#8b8fa3" }}>{r.joined}</td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid #ffffff0a", color: "#8b8fa3" }}>{r.lastSeen}</td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid #ffffff0a" }}>{fmt(r.meals30)}</td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid #ffffff0a" }}>{fmt(r.xp)}</td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid #ffffff0a" }}>{r.pro ? "⭐" : "—"}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={6} style={{ padding: 14, color: "#8b8fa3" }}>لا مستخدمين بعد.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <footer style={{ color: "#6f7385", fontSize: 11.5, lineHeight: 1.9 }}>
          الوجبات والماء والوزن تُقرأ من القاعدة مباشرة. عدّادات الوجبات اليومية وحالة الإعلانات
          تعيش على جهاز كل مستخدم (localStorage) فلا تظهر هنا — هذا تصميم مقصود، لا نقص بيانات.
        </footer>
      </div>
    </div>
  );
}
