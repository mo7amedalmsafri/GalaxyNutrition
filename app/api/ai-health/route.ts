import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/limits'

// تشخيص مزوّدات الذكاء الاصطناعي — للمشرف فقط. يكشف أي مفتاح/نموذج يعمل
export const maxDuration = 60

async function ping(url: string, headers: Record<string, string>, model: string) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, messages: [{ role: 'user', content: 'ping' }], max_tokens: 5 }),
      signal: AbortSignal.timeout(20000),
    })
    const text = await res.text()
    return { model, status: res.status, ok: res.ok, body: text.slice(0, 160) }
  } catch (e) {
    return { model, status: 0, ok: false, body: (e as Error).message?.slice(0, 120) }
  }
}

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const geminiKey = process.env.GEMINI_API_KEY
  const orKey = process.env.OPENROUTER_API_KEY
  const rcKey = process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY
  const results: Record<string, unknown> = {
    hasGeminiKey: !!geminiKey,
    hasOpenRouterKey: !!orKey,
    openRouterKeyPreview: orKey ? `${orKey.slice(0, 10)}…${orKey.slice(-4)}` : null,
    hasRevenueCatKey: !!rcKey,
    revenueCatKeyPreview: rcKey ? `${rcKey.slice(0, 8)}…${rcKey.slice(-4)}` : null,
  }

  const orHeaders = orKey
    ? {
        Authorization: `Bearer ${orKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://dietak.vercel.app',
        'X-Title': 'Dietak',
      }
    : null

  if (geminiKey) {
    results.gemini = await ping(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      { Authorization: `Bearer ${geminiKey}`, 'Content-Type': 'application/json' },
      process.env.GEMINI_MODEL ?? 'gemini-flash-lite-latest'
    )
  }

  if (orHeaders) {
    results.openrouterPaid = await ping('https://openrouter.ai/api/v1/chat/completions', orHeaders, 'google/gemini-2.5-flash-lite')
    // فحص الرصيد
    try {
      const k = await fetch('https://openrouter.ai/api/v1/key', { headers: { Authorization: `Bearer ${orKey}` } })
      results.keyInfo = (await k.json())?.data ?? null
    } catch { /* ignore */ }
  }

  return NextResponse.json(results)
}
