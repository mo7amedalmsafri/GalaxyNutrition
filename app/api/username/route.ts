import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// قواعد اسم المستخدم: 4–20 حرفاً، أحرف/أرقام/شرطة سفلية/عربية، بلا مسافات
const USERNAME_RE = /^[a-z0-9_؀-ۿ]{4,20}$/

// GET → اسم المستخدم الحالي لصاحب الجلسة
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase.from('profiles').select('username').eq('id', user.id).single()
  return NextResponse.json({ username: data?.username ?? null })
}

// POST { username } → يحفظ الاسم. التفرّد مضمون بالفهرس الفريد في قاعدة البيانات
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const name = String(body.username ?? '').trim().toLowerCase()

    if (!USERNAME_RE.test(name)) {
      return NextResponse.json(
        { error: 'اسم غير صالح — من ٤ إلى ٢٠ حرفاً، بلا مسافات أو رموز' },
        { status: 400 }
      )
    }

    const { error } = await supabase.from('profiles').update({ username: name }).eq('id', user.id)

    if (error) {
      const code = (error as { code?: string }).code
      // 23505 = تعارض الفهرس الفريد → الاسم مأخوذ
      if (code === '23505') {
        return NextResponse.json({ error: 'الاسم مستخدم بالفعل، جرّب اسماً آخر' }, { status: 409 })
      }
      // 42703 / PGRST204 = عمود username غير موجود → لم يُشغّل كود قاعدة البيانات بعد
      if (code === '42703' || code === 'PGRST204') {
        return NextResponse.json(
          { error: 'الميزة غير مُفعّلة على الخادم بعد — شغّل كود قاعدة البيانات' },
          { status: 500 }
        )
      }
      console.error('[username] update error:', error)
      return NextResponse.json({ error: 'تعذّر الحفظ' }, { status: 500 })
    }

    return NextResponse.json({ success: true, username: name })
  } catch (e) {
    console.error('[username] unexpected:', e)
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
