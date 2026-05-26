import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function DELETE() {
  try {
    // 1. Verify the current session
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id

    // 2. Delete all user data from every table
    await Promise.all([
      supabase.from('food_logs').delete().eq('user_id', userId),
      supabase.from('weight_entries').delete().eq('user_id', userId),
      supabase.from('water_logs').delete().eq('user_id', userId),
      supabase.from('workout_plans').delete().eq('user_id', userId),
    ])
    await supabase.from('profiles').delete().eq('id', userId)

    // 3. Delete the auth user — requires service role key
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json({ error: 'Server config error' }, { status: 500 })
    }

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error: deleteErr } = await admin.auth.admin.deleteUser(userId)
    if (deleteErr) {
      console.error('[delete-account] deleteUser error:', deleteErr)
      return NextResponse.json({ error: deleteErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[delete-account] unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
