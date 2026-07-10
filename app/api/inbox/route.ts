import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// GET — رسائل الأدمن الواصلة للمستخدم الحالي (الموجّهة له + البث).
// الـ RLS يتكفّل بالتصفية (user_id = auth.uid() OR user_id IS NULL)
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('admin_messages')
    .select('id, title, body, created_at, user_id')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    const code = (error as { code?: string }).code
    if (code === '42P01') return NextResponse.json({ messages: [] })  // الجدول غير موجود بعد
    return NextResponse.json({ error: 'تعذّر الجلب' }, { status: 500 })
  }
  return NextResponse.json({ messages: data ?? [] })
}
