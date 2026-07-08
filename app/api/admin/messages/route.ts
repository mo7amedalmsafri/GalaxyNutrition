import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/limits'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// يتأكد أن صاحب الجلسة مشرف، ويعيد بريده
async function requireAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) return null
  return user
}

// GET → كل رسائل التواصل (الأحدث أولاً) — للمشرف فقط
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { data, error } = await admin()
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'تعذّر الجلب' }, { status: 500 })
  return NextResponse.json({ messages: data ?? [] })
}

// PATCH { id, is_read } → تعليم الرسالة مقروءة/غير مقروءة
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id, is_read } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await admin().from('contact_messages').update({ is_read: !!is_read }).eq('id', id)
  return NextResponse.json({ success: true })
}

// DELETE ?id= → حذف رسالة
export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await admin().from('contact_messages').delete().eq('id', id)
  return NextResponse.json({ success: true })
}
