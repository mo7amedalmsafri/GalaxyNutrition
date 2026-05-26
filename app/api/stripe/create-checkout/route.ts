import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder')
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://galaxy-nutrition.vercel.app'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401 })
    }

    // Check if user already has an active subscription
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('status, stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (existing?.status === 'active') {
      return NextResponse.json({ error: 'لديك اشتراك نشط بالفعل' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: process.env.STRIPE_PRO_PRICE_ID!,
        quantity: 1,
      }],
      success_url: `${APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${APP_URL}/settings`,
      customer_email: user.email ?? undefined,
      ...(existing?.stripe_customer_id
        ? { customer: existing.stripe_customer_id }
        : {}),
      metadata: { userId: user.id },
      locale: 'auto',
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('create-checkout error:', err)
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
