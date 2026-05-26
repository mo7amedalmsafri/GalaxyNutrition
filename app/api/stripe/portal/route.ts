import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe  = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder')
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://galaxy-nutrition.vercel.app'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401 })
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (!sub?.stripe_customer_id) {
      return NextResponse.json({ error: 'لا يوجد اشتراك مرتبط' }, { status: 404 })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer:   sub.stripe_customer_id,
      return_url: `${APP_URL}/settings`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('portal error:', err)
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
