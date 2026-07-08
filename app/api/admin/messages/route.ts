import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/limits'

// عميل الخدمة (يتجاوز RLS) — يتطلب SUPABASE_SERVICE_ROLE_KEY
function admin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return null
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// يتأكد أن صاحب الجلسة مشرف
async function requireAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) return null
  return user
}

// GET → كل رسائل التواصل (الأحدث أولاً) — للمشرف فقط
export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'غير مصرّح — تأكد أن بريدك في NEXT_PUBLIC_ADMIN_EMAILS' }, { status: 403 })
    }
    const db = admin()
    if (!db) {
      return NextResponse.json(
        { error: 'مفتاح الخدمة غير مضبوط على الخادم (SUPABASE_SERVICE_ROLE_KEY)' },
        { status: 500 }
      )
    }
    const { data, error } = await db
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('[admin/messages] select error:', error)
      const code = (error as { code?: string }).code
      if (code === '42P01') {
        return NextResponse.json({ error: 'جدول الرسائل غير موجود — شغّل كود قاعدة البيانات' }, { status: 500 })
      }
      return NextResponse.json({ error: 'تعذّر جلب الرسائل' }, { status: 500 })
    }
    return NextResponse.json({ messages: data ?? [] })
  } catch (e) {
    console.error('[admin/messages] unexpected:', e)
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}

// PATCH { id, is_read } → تعليم الرسالة مقروءة/غير مقروءة
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const db = admin()
  if (!db) return NextResponse.json({ error: 'service key missing' }, { status: 500 })
  const { id, is_read } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await db.from('contact_messages').update({ is_read: !!is_read }).eq('id', id)
  return NextResponse.json({ success: true })
}

// DELETE ?id= → حذف رسالة
export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const db = admin()
  if (!db) return NextResponse.json({ error: 'service key missing' }, { status: 500 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await db.from('contact_messages').delete().eq('id', id)
  return NextResponse.json({ success: true })
}
