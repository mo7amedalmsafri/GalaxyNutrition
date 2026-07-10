import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/limits'

function admin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return null
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function requireAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) return null
  return user
}

// POST — يرسل رسالة من الأدمن.
//  mode 'all'  → بث للجميع (user_id = null)
//  mode 'user' → لشخص محدد عبر userId مباشرة أو username
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const db = admin()
  if (!db) return NextResponse.json({ error: 'مفتاح الخدمة غير مضبوط' }, { status: 500 })

  const body = await req.json().catch(() => ({}))
  const mode = body.mode === 'all' ? 'all' : 'user'
  const title = String(body.title ?? '').trim() || null
  const text = String(body.body ?? '').trim()

  if (text.length < 1) return NextResponse.json({ error: 'اكتب نص الرسالة' }, { status: 400 })

  let targetId: string | null = null

  if (mode === 'user') {
    if (body.userId) {
      targetId = String(body.userId)
    } else if (body.username) {
      const uname = String(body.username).trim().toLowerCase().replace(/^@/, '')
      const { data } = await db.from('profiles').select('id').ilike('username', uname).limit(1)
      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'لم يُعثر على مستخدم بهذا الاسم' }, { status: 404 })
      }
      targetId = data[0].id
    } else {
      return NextResponse.json({ error: 'حدّد المستخدم' }, { status: 400 })
    }
  }

  const { error } = await db.from('admin_messages').insert({
    user_id: targetId,   // null = للجميع
    title,
    body: text,
  })
  if (error) {
    console.error('[admin/send] insert error:', error)
    const code = (error as { code?: string }).code
    if (code === '42P01') return NextResponse.json({ error: 'جدول الرسائل غير موجود — شغّل كود قاعدة البيانات' }, { status: 500 })
    return NextResponse.json({ error: 'تعذّر الإرسال' }, { status: 500 })
  }

  return NextResponse.json({ success: true, broadcast: mode === 'all' })
}
