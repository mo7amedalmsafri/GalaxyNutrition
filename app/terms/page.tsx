import Logo from '@/components/Logo'

export const metadata = {
  title: 'الشروط والأحكام | Dietak دايتك',
  description: 'Terms & Conditions for Dietak',
}

const SECTIONS = [
  {
    icon: '✅',
    titleAr: 'قبول الشروط',
    titleEn: 'Acceptance of Terms',
    ar: 'باستخدامك تطبيق دايتك فإنك توافق على هذه الشروط والأحكام وعلى سياسة الخصوصية. إذا لم توافق عليها، يُرجى عدم استخدام التطبيق.',
    en: 'By using Dietak you agree to these Terms & Conditions and to our Privacy Policy. If you do not agree, please do not use the app.',
  },
  {
    icon: '🥗',
    titleAr: 'ما يقدّمه التطبيق',
    titleEn: 'What the App Provides',
    ar: 'دايتك أداة لتتبّع التغذية والوزن: تسجيل الوجبات والماء والتمارين، حساب الأهداف الغذائية، تحليل صور الطعام، وتوليد خطط استرشادية بالذكاء الاصطناعي. جميع الأرقام تقديرية لأغراض المتابعة الشخصية.',
    en: 'Dietak is a nutrition and weight tracking tool: logging meals, water and workouts, calculating targets, analyzing food photos, and generating guidance plans with AI. All figures are estimates for personal tracking.',
  },
  {
    icon: '⚕️',
    titleAr: 'إخلاء مسؤولية طبية',
    titleEn: 'Medical Disclaimer',
    ar: 'دايتك ليس بديلاً عن الاستشارة الطبية أو التغذوية المتخصصة. المعلومات والخطط لأغراض تعليمية وإرشادية فقط. استشر طبيباً أو أخصائي تغذية قبل تغيير نظامك الغذائي، خاصة إن كان لديك حالة صحية أو حمل أو تتناول أدوية. أنت وحدك المسؤول عن قراراتك الصحية.',
    en: 'Dietak is not a substitute for professional medical or nutritional advice. Information and plans are for educational and guidance purposes only. Consult a doctor or dietitian before changing your diet, especially if you have a medical condition, are pregnant, or take medication. You are solely responsible for your health decisions.',
  },
  {
    icon: '🤖',
    titleAr: 'دقة الذكاء الاصطناعي',
    titleEn: 'AI Accuracy',
    ar: 'نتائج تحليل الصور وحساب السعرات والخطط تُنتَج بالذكاء الاصطناعي وقد تحتوي على أخطاء أو تقديرات غير دقيقة. راجع القيم دائماً وعدّلها عند الحاجة، ولا تعتمد عليها اعتماداً كاملاً في قرارات حسّاسة.',
    en: 'Photo analysis, calorie calculations and plans are AI-generated and may contain errors or inaccurate estimates. Always review and adjust the values, and do not rely on them entirely for sensitive decisions.',
  },
  {
    icon: '👤',
    titleAr: 'حسابك ومسؤوليتك',
    titleEn: 'Your Account & Responsibility',
    ar: 'أنت مسؤول عن دقة بياناتك وعن الحفاظ على سرّية حسابك. اسم المستخدم يجب أن يكون لائقاً وغير منتحل لهوية غيرك. نحتفظ بحق تعليق أو إنهاء الحسابات التي تُساء استخدامها.',
    en: 'You are responsible for the accuracy of your data and for keeping your account secure. Your username must be appropriate and not impersonate others. We may suspend or terminate accounts that are misused.',
  },
  {
    icon: '🚫',
    titleAr: 'الاستخدام المحظور',
    titleEn: 'Prohibited Use',
    ar: 'يُمنع استخدام التطبيق لأي غرض غير قانوني، أو محاولة اختراقه أو إساءة استخدام خدماته، أو إرسال محتوى مسيء عبر نموذج التواصل، أو انتهاك حقوق الآخرين.',
    en: 'You may not use the app for any unlawful purpose, attempt to hack or abuse its services, send abusive content through the contact form, or violate the rights of others.',
  },
  {
    icon: '💳',
    titleAr: 'الاشتراكات والمدفوعات',
    titleEn: 'Subscriptions & Payments',
    ar: 'قد تتوفّر مزايا مدفوعة (Dietak Pro). تُعالَج المدفوعات عبر مزوّد دفع مرخّص، وتخضع الاشتراكات لشروط المتجر (App Store) الذي تشترك عبره. يمكنك إدارة الاشتراك أو إلغاؤه من إعدادات المتجر.',
    en: 'Paid features (Dietak Pro) may be offered. Payments are processed by a licensed provider, and subscriptions are subject to the terms of the store (App Store) you subscribe through. You can manage or cancel from your store settings.',
  },
  {
    icon: '🔒',
    titleAr: 'الخصوصية والبيانات',
    titleEn: 'Privacy & Data',
    ar: 'نحترم خصوصيتك ولا نبيع بياناتك. تفاصيل ما نجمعه وكيف نستخدمه موضّحة في سياسة الخصوصية. يمكنك حذف حسابك وكل بياناتك في أي وقت من الإعدادات.',
    en: 'We respect your privacy and never sell your data. What we collect and how we use it is explained in the Privacy Policy. You can delete your account and all data anytime from Settings.',
  },
  {
    icon: '⚠️',
    titleAr: 'حدود المسؤولية',
    titleEn: 'Limitation of Liability',
    ar: 'يُقدَّم التطبيق «كما هو» دون ضمانات. لا نتحمّل مسؤولية أي أضرار مباشرة أو غير مباشرة ناتجة عن استخدام التطبيق أو الاعتماد على معلوماته.',
    en: 'The app is provided "as is" without warranties. We are not liable for any direct or indirect damages arising from using the app or relying on its information.',
  },
  {
    icon: '🔄',
    titleAr: 'تعديل الشروط',
    titleEn: 'Changes to Terms',
    ar: 'قد نُحدّث هذه الشروط من وقت لآخر. استمرارك في استخدام التطبيق بعد التحديث يعني موافقتك على النسخة الجديدة.',
    en: 'We may update these Terms from time to time. Continuing to use the app after an update means you accept the new version.',
  },
  {
    icon: '✉️',
    titleAr: 'تواصل معنا',
    titleEn: 'Contact Us',
    ar: 'لأي سؤال عن الشروط، راسلنا من داخل التطبيق (الإعدادات ← تواصل معنا) أو على: mo7amedalmsafri@gmail.com',
    en: 'For any question about these Terms, contact us from within the app (Settings → Contact Us) or at: mo7amedalmsafri@gmail.com',
  },
]

export default function TermsPage() {
  return (
    <div
      className="min-h-screen px-5 py-10"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(107,33,168,0.15) 0%, transparent 55%), #0a0014', direction: 'rtl' }}
    >
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-3 mb-2">
          <Logo size={64} />
          <h1 className="text-2xl font-black text-white">
            الشروط والأحكام <span className="text-white/40 text-lg font-bold">· Terms &amp; Conditions</span>
          </h1>
          <p className="text-white/40 text-sm">Dietak دايتك — آخر تحديث: يوليو 2026 · Last updated: July 2026</p>
        </div>

        {/* Sections */}
        {SECTIONS.map(s => (
          <section
            key={s.titleEn}
            className="rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <h2 className="font-black text-white text-base mb-2">
              {s.icon} {s.titleAr} <span className="text-white/35 font-bold text-sm">· {s.titleEn}</span>
            </h2>
            <p className="text-white/60 text-sm leading-relaxed mb-2">{s.ar}</p>
            <p className="text-white/40 text-sm leading-relaxed" style={{ direction: 'ltr', textAlign: 'left' }}>{s.en}</p>
          </section>
        ))}

        <p className="text-center text-white/25 text-xs pb-6">
          Dietak دايتك · dietak.vercel.app
        </p>
      </div>
    </div>
  )
}
