import { NextRequest, NextResponse } from 'next/server'

// جلب منتج معلّب من رقم الباركود عبر قاعدة Open Food Facts المجانية المفتوحة
export const maxDuration = 20

const num = (v: unknown) => {
  const n = parseFloat(String(v))
  return isNaN(n) ? 0 : Math.round(n * 10) / 10
}

export async function POST(req: NextRequest) {
  try {
    const { barcode } = await req.json()
    const code = String(barcode ?? '').trim()

    if (!/^\d{6,14}$/.test(code)) {
      return NextResponse.json({ error: 'باركود غير صالح' }, { status: 400 })
    }

    const fields =
      'product_name,product_name_ar,generic_name_ar,brands,serving_quantity,nutriments,image_front_small_url'
    const url = `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${fields}`

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Dietak/1.0 (dietak.vercel.app)' },
      signal: AbortSignal.timeout(12000),
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'تعذّر الاتصال بقاعدة المنتجات' }, { status: 502 })
    }

    const data = await res.json()
    if (data.status !== 1 || !data.product) {
      // المنتج غير مسجّل في القاعدة
      return NextResponse.json({ found: false, barcode: code })
    }

    const p = data.product
    const nm = p.nutriments || {}

    // السعرات: نفضّل kcal، وإلا نحوّل من الكيلوجول (÷4.184)
    const kcal100 = num(
      nm['energy-kcal_100g'] ?? (nm['energy_100g'] ? Number(nm['energy_100g']) / 4.184 : 0)
    )

    // الصوديوم بالجرام في القاعدة → نحوّله لمليجرام. إن غاب نشتقّه من الملح (ملح≈صوديوم×2.5)
    const sodiumMg = nm['sodium_100g'] != null
      ? num(Number(nm['sodium_100g']) * 1000)
      : (nm['salt_100g'] != null ? num((Number(nm['salt_100g']) / 2.5) * 1000) : 0)

    const per100 = {
      calories: kcal100,
      protein: num(nm['proteins_100g']),
      carbs: num(nm['carbohydrates_100g']),
      fiber: num(nm['fiber_100g']),
      sugars: num(nm['sugars_100g']),
      fat: num(nm['fat_100g']),
      saturatedFat: num(nm['saturated-fat_100g']),
      unsaturatedFat: 0,
      sodium: sodiumMg,
      potassium: nm['potassium_100g'] != null ? num(Number(nm['potassium_100g']) * 1000) : 0,
    }

    const rawName = p.product_name_ar || p.generic_name_ar || p.product_name || ''
    const brand = String(p.brands || '').split(',')[0]?.trim()
    const name = [brand, rawName].filter(Boolean).join(' - ') || `منتج ${code}`

    // حجم الحصة إن وُجد، وإلا 100 جرام
    const serving = parseFloat(p.serving_quantity)
    const grams = !isNaN(serving) && serving > 0 && serving < 2000 ? Math.round(serving) : 100

    return NextResponse.json({
      found: true,
      barcode: code,
      name,
      grams,
      per100,
      image: p.image_front_small_url || null,
    })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
