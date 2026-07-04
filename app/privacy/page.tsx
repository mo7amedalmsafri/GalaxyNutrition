import Logo from '@/components/Logo'

export const metadata = {
  title: 'سياسة الخصوصية | Dietak دايتك',
  description: 'Privacy Policy for Dietak',
}

const SECTIONS = [
  {
    icon: '📋',
    titleAr: 'البيانات التي نجمعها',
    titleEn: 'Data We Collect',
    ar: 'عند إنشاء حساب نجمع بريدك الإلكتروني واسمك. لاستخدام مزايا التطبيق نخزّن بياناتك الصحية التي تدخلها بنفسك: العمر، الطول، الوزن، الهدف، مستوى النشاط، سجل الوجبات والماء والتمارين، وصور الطعام التي تلتقطها للتحليل.',
    en: 'When you create an account we collect your email and name. To provide app features we store the health data you enter yourself: age, height, weight, goal, activity level, food/water/workout logs, and the meal photos you take for analysis.',
  },
  {
    icon: '🎯',
    titleAr: 'كيف نستخدم بياناتك',
    titleEn: 'How We Use Your Data',
    ar: 'تُستخدم بياناتك فقط لتقديم مزايا التطبيق: حساب أهدافك الغذائية، عرض تقدمك، وتحليل وجباتك بالذكاء الاصطناعي. لا نبيع بياناتك ولا نشاركها مع أي طرف ثالث لأغراض تسويقية.',
    en: 'Your data is used only to provide app features: calculating your nutrition targets, showing your progress, and analyzing your meals with AI. We never sell your data or share it with third parties for marketing.',
  },
  {
    icon: '📷',
    titleAr: 'صور الطعام',
    titleEn: 'Meal Photos',
    ar: 'صور الوجبات تُرسل لخدمة الذكاء الاصطناعي لتحليلها لحظياً ولا يتم تخزينها على خوادمنا بعد التحليل.',
    en: 'Meal photos are sent to the AI service for instant analysis and are not stored on our servers after analysis.',
  },
  {
    icon: '🔒',
    titleAr: 'تخزين البيانات وحمايتها',
    titleEn: 'Data Storage & Security',
    ar: 'تُخزّن بياناتك بأمان لدى Supabase (قاعدة بيانات مشفّرة) وتُحمى بعزل كامل — لا يمكن لأي مستخدم آخر الوصول لبياناتك. المدفوعات تُعالج عبر مزوّد دفع مرخّص ولا نخزّن أي أرقام بطاقات.',
    en: 'Your data is stored securely with Supabase (encrypted database) and protected with full isolation — no other user can access your data. Payments are processed by a licensed payment provider; we never store card numbers.',
  },
  {
    icon: '🗑️',
    titleAr: 'حذف بياناتك',
    titleEn: 'Deleting Your Data',
    ar: 'يمكنك حذف حسابك وجميع بياناتك نهائياً في أي وقت من داخل التطبيق: الإعدادات ← حذف الحساب. الحذف فوري ولا يمكن التراجع عنه.',
    en: 'You can permanently delete your account and all data anytime from within the app: Settings → Delete Account. Deletion is immediate and irreversible.',
  },
  {
    icon: '👶',
    titleAr: 'الأعمار',
    titleEn: 'Age Requirement',
    ar: 'التطبيق غير موجّه لمن هم دون 13 عاماً، ولا نجمع بيانات أطفال عن قصد.',
    en: 'The app is not directed at children under 13, and we do not knowingly collect children’s data.',
  },
  {
    icon: '✉️',
    titleAr: 'تواصل معنا',
    titleEn: 'Contact Us',
    ar: 'لأي استفسار عن خصوصيتك راسلنا على: mo7amedalmsafri@gmail.com',
    en: 'For any privacy questions, contact us at: mo7amedalmsafri@gmail.com',
  },
]

export default function PrivacyPage() {
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
            سياسة الخصوصية <span className="text-white/40 text-lg font-bold">· Privacy Policy</span>
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
