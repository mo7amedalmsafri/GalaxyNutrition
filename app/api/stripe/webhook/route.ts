import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder')

// Next.js: disable body parsing so we get the raw body for signature verification
export const config = { api: { bodyParser: false } }

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature error:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  try {
    // ── Payment completed → activate Pro ─────────────────────────────
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const userId  = session.metadata?.userId
      if (!userId) return NextResponse.json({ received: true })

      await supabase.from('subscriptions').upsert({
        user_id:                userId,
        stripe_customer_id:     session.customer as string,
        stripe_subscription_id: session.subscription as string,
        status:                 'active',
        updated_at:             now,
      }, { onConflict: 'user_id' })
    }

    // ── Subscription updated (renewal, cancellation scheduled…) ──────
    if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object as Stripe.Subscription
      await supabase
        .from('subscriptions')
        .update({
          status:               sub.status,
          current_period_end:   new Date((sub as any).current_period_end * 1000).toISOString(),
          updated_at:           now,
        })
        .eq('stripe_subscription_id', sub.id)
    }

    // ── Subscription deleted → cancel Pro ────────────────────────────
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription
      await supabase
        .from('subscriptions')
        .update({ status: 'canceled', updated_at: now })
        .eq('stripe_subscription_id', sub.id)
    }
  } catch (err) {
    console.error('Webhook DB error:', err)
  }

  return NextResponse.json({ received: true })
}
