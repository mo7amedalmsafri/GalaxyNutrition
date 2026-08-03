import { createBrowserClient } from '@supabase/ssr'

/* نسخة واحدة للمتصفح كله — singleton، وهذا جزء من إصلاح الاستعادة لا تحسين.
 *
 * كانت كل صفحة تنشئ عميلها الخاص، وكل عميل يملك مستمعي أحداثه وحده. رابط
 * الاستعادة يهبط بجلسته في الـhash، فيلتقطها **أول** عميل يُنشأ ويمسح الـhash
 * — بينما المستمع الذي ينتظر حدث PASSWORD_RECOVERY يجلس على **نسخة أخرى** لا
 * يصلها الحدث أبدًا. فتُنشأ الجلسة فعلًا ويبقى المستخدم على صفحة الدخول، وهو
 * حرفيًا ما شاهدناه خمس مرات. نسخة واحدة = من يلتقط هو نفسه من يُبلّغ. */

function make() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        /* implicit لا pkce: pkce يربط رابط الإيميل بالمتصفح الذي طلبه عبر
         * مفتاح تحقق محلي — ومستخدمنا يطلب من داخل التطبيق (WKWebView) ويفتح
         * الرابط في Safari، سياقان لا يتشاركان تخزينًا فيفشل التبادل دائمًا.
         * implicit يضع الجلسة كاملة في الرابط نفسه فيعمل في أي متصفح. */
        flowType: 'implicit',
      },
    }
  )
}

/* ReturnType<typeof make> لا ReturnType<typeof createBrowserClient>: الثانية
   تُسقط الأنواع الجنيسة إلى any فتنهار أنواع كل استعلامات التطبيق دفعة واحدة
   — قِيست ككسر بناء فعلي في خمسة ملفات لا علاقة لها بهذا الملف. */
let browserClient: ReturnType<typeof make> | null = null

export function createClient() {
  if (!browserClient) browserClient = make()
  return browserClient
}
