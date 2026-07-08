import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// قواعد اسم المستخدم: 4–20 حرفاً، أحرف/أرقام/شرطة سفلية/عربية، بلا مسافات
const USERNAME_RE = /^[a-z0-9_؀-ۿ]{4,20}$/

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET ?check=<name> → هل الاسم متاح؟   |   GET بلا بارامتر → اسم المستخدم الحالي
export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const check = req.nextUrl.searchParams.get('check')

  if (check == null) {
    const { data } = await supabase.from('profiles').select('username').eq('id', user.id).single()
    return NextResponse.json({ username: data?.username ?? null })
  }

  const name = check.trim().toLowerCase()
  if (!USERNAME_RE.test(name)) return NextResponse.json({ available: false, invalid: true })

  const { data } = await admin()
    .from('profiles')
    .select('id')
    .ilike('username', name)
    .neq('id', user.id)
    .limit(1)
  return NextResponse.json({ available: !data || data.length === 0 })
}

// POST { username } → يحفظ الاسم بعد التأكد من التفرّد
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const name = String(body.username ?? '').trim().toLowerCase()

    if (!USERNAME_RE.test(name)) {
      return NextResponse.json(
        { error: 'اسم غير صالح — من ٤ إلى ٢٠ حرفاً، بلا مسافات أو رموز' },
        { status: 400 }
      )
    }

    // تأكد أنه غير مأخوذ من مستخدم آخر
    const { data: taken } = await admin()
      .from('profiles')
      .select('id')
      .ilike('username', name)
      .neq('id', user.id)
      .limit(1)
    if (taken && taken.length > 0) {
      return NextResponse.json({ error: 'الاسم مستخدم بالفعل، جرّب اسماً آخر' }, { status: 409 })
    }

    const { error } = await supabase.from('profiles').update({ username: name }).eq('id', user.id)
    if (error) {
      // 23505 = تعارض الفهرس الفريد (سباق نادر)
      const code = (error as { code?: string }).code
      if (code === '23505') {
        return NextResponse.json({ error: 'الاسم مستخدم بالفعل، جرّب اسماً آخر' }, { status: 409 })
      }
      return NextResponse.json({ error: 'تعذّر الحفظ' }, { status: 500 })
    }

    return NextResponse.json({ success: true, username: name })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
