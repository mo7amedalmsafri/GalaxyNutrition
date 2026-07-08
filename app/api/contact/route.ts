import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// POST { type: 'problem' | 'suggestion', message } → يحفظ رسالة تواصل تصل المشرف
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const type = body.type === 'suggestion' ? 'suggestion' : 'problem'
    const message = String(body.message ?? '').trim()

    if (message.length < 3) {
      return NextResponse.json({ error: 'اكتب رسالتك أولاً' }, { status: 400 })
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: 'الرسالة طويلة جداً' }, { status: 400 })
    }

    // نحتاج اسم مستخدم مسجّل قبل الإرسال
    const { data: profile } = await supabase
      .from('profiles').select('username').eq('id', user.id).single()
    if (!profile?.username) {
      return NextResponse.json({ error: 'no-username' }, { status: 428 })
    }

    const { error } = await supabase.from('contact_messages').insert({
      user_id:  user.id,
      username: profile.username,
      email:    user.email ?? null,
      type,
      message,
    })
    if (error) {
      console.error('[contact] insert error:', error)
      return NextResponse.json({ error: 'تعذّر الإرسال' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
