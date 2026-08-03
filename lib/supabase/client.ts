import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        /* implicit لا pkce — وهذا هو إصلاح استعادة كلمة المرور الحقيقي.
         *
         * pkce يحفظ «مفتاح تحقق» في المتصفح الذي طلب الاستعادة، ولا يقبل
         * الرابط إلا في المتصفح نفسه. ومستخدمنا يطلبها من داخل التطبيق
         * (WKWebView) بينما رابط الإيميل يفتح في Safari — سياقان منفصلان لا
         * يتشاركان شيئًا، فيفشل التبادل ويرتد المستخدم إلى صفحة الدخول يُسأل
         * عن كلمة المرور التي نسيها للتو. ثلاثة إصلاحات توجيه متتالية لم
         * تلمس المشكلة لأن العطل لم يكن في التوجيه قط.
         *
         * implicit يضع الجلسة كاملة في الرابط نفسه (#access_token=…)، فيعمل
         * في أي متصفح يُفتح فيه — وهو ما يفعله كل مستخدم يقرأ بريده خارج
         * التطبيق. RecoveryCatcher و/reset-password يلتقطان الـhash، والجلسة
         * تُكتب في الكوكي فيراها الخادم من الطلب التالي. */
        flowType: 'implicit',
      },
    }
  )
}
