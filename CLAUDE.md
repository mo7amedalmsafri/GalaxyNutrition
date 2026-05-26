# Galaxy Nutrition — تغذية المجرة

## ما هو التطبيق؟

**Galaxy Nutrition** هو تطبيق ويب ذكي لتتبع التغذية وإدارة الوزن، مبني كـ PWA (Progressive Web App) يعمل على الجوال والحاسوب. واجهته باللغتين العربية والإنجليزية مع دعم RTL كامل، وتصميمه مستوحى من عالم الفضاء والمجرات.

---

## التقنيات المستخدمة

| الطبقة | التقنية |
|--------|---------|
| Framework | Next.js 16 (App Router، Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS + CSS Variables مخصصة |
| Animation | Framer Motion |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Email/Password) |
| AI Vision | OpenRouter → Gemini 2.0 Flash (تحليل صور الطعام) |
| AI Plans | OpenRouter → GPT-4o-mini (توليد الخطط الغذائية، Streaming) |
| Charts | Recharts |
| Icons | Lucide React |
| Fonts | Cairo + Tajawal (Google Fonts) |

---

## هيكل المشروع

```
GalaxyNutrition/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout (RTL، خلفية المجرة، الخطوط)
│   ├── page.tsx                # لوحة التحكم الرئيسية (Dashboard)
│   ├── onboarding/page.tsx     # معالج الإعداد الأولي (7 خطوات)
│   ├── login/page.tsx          # تسجيل الدخول
│   ├── register/page.tsx       # إنشاء حساب جديد
│   ├── analytics/page.tsx      # تحليلات ورسوم بيانية
│   ├── log/page.tsx            # سجل الطعام اليومي
│   ├── plan/page.tsx           # توليد خطة غذائية بالذكاء الاصطناعي
│   ├── plans/page.tsx          # عرض الخطط المحفوظة
│   ├── scan/page.tsx           # مسح الطعام بالكاميرا (AI Vision)
│   ├── settings/page.tsx       # إعدادات الملف الشخصي
│   ├── workout/page.tsx        # خطط التمرين
│   └── api/
│       ├── analyze-food/       # POST: تحليل صور الطعام بـ Gemini
│       ├── generate-plan/      # POST: توليد خطة غذائية (Streaming SSE)
│       ├── parse-macros/       # POST: استخراج الماكرو من نص
│       ├── diet-info/          # POST: معلومات النظام الغذائي
│       ├── calc-burn/          # POST: حساب السعرات المحروقة
│       └── delete-account/     # DELETE: حذف الحساب
│
├── components/
│   ├── GalaxyBackground.tsx    # خلفية الجسيمات المتحركة (Canvas)
│   ├── ConditionalLayout.tsx   # يُخفي التنقل في صفحات Auth/Onboarding
│   ├── BottomNav.tsx           # شريط التنقل السفلي (5 أيقونات)
│   ├── ThemeProvider.tsx       # مزود السمة (dark/light)
│   ├── GlassCard.tsx           # بطاقة زجاجية قابلة للإضاءة
│   ├── CalorieRing.tsx         # حلقة السعرات الدائرية (SVG)
│   ├── MacroBar.tsx            # أشرطة الماكرو (بروتين/كارب/دهون)
│   ├── BMICircle.tsx           # مقياس BMI الدائري
│   ├── WeightMiniChart.tsx     # رسم بياني مصغر للوزن
│   ├── AICoachCard.tsx         # بطاقة المدرب الذكي
│   ├── FoodEntryModal.tsx      # نافذة إضافة طعام يدوياً
│   ├── FoodSearchBar.tsx       # بحث عن طعام مع autocomplete
│   └── Logo.tsx                # شعار التطبيق
│
├── lib/
│   ├── types.ts                # تعريفات TypeScript (UserProfile، FoodItem، إلخ)
│   ├── db.ts                   # كل عمليات Supabase (CRUD)
│   ├── store.ts                # useLocalStorage hook + StoredProfile
│   ├── utils.ts                # حسابات BMI، السعرات، التواريخ
│   ├── foodDatabase.ts         # قاعدة بيانات أطعمة محلية (offline)
│   ├── supabase.ts             # إعداد Supabase client
│   └── supabase/
│       ├── client.ts           # Browser Supabase client
│       └── server.ts           # Server Supabase client (SSR)
│
├── supabase-schema.sql         # هيكل قاعدة البيانات
├── .env.local                  # متغيرات البيئة (مُخفاة)
└── proxy.ts                    # بروكسي مساعد
```

---

## قاعدة البيانات (Supabase)

جميع الجداول محمية بـ **Row Level Security (RLS)** — كل مستخدم لا يرى إلا بياناته الخاصة.

### الجداول بالتفصيل

#### `profiles`
| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | UUID (PK) | نفس `auth.users.id` |
| `name` | TEXT | اسم المستخدم |
| `age` | INTEGER | العمر |
| `height` | NUMERIC | الطول بالسنتيمتر |
| `weight` | NUMERIC | الوزن الحالي بالكيلو |
| `target_weight` | NUMERIC | الوزن المستهدف |
| `gender` | TEXT | `male` أو `female` |
| `activity_level` | TEXT | `sedentary/light/moderate/active/veryActive` |
| `goal` | TEXT | `lose/maintain/gain` |
| `daily_calories` | INTEGER | الهدف اليومي من السعرات |
| `target_protein/carbs/fat` | INTEGER | أهداف الماكرو بالجرام |
| `target_water` | INTEGER | هدف الماء بالمليلتر |
| `completed_onboarding` | BOOLEAN | هل أكمل الإعداد |
| `theme` | TEXT | `dark/light` |
| `updated_at` | TIMESTAMPTZ | آخر تحديث |

#### `food_logs`
| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | UUID (PK) | معرف فريد |
| `user_id` | UUID (FK) | ربط بالمستخدم |
| `date` | DATE | تاريخ الوجبة |
| `name` | TEXT | اسم الطعام |
| `quantity` | NUMERIC | الكمية بالجرام |
| `meal_type` | TEXT | `breakfast/lunch/dinner/snack` |
| `calories/protein/carbs/fat` | NUMERIC | القيم الغذائية الأساسية |
| `fiber/sugars/saturated_fat/sodium/potassium` | NUMERIC | قيم غذائية إضافية |
| `logged_at` | TIMESTAMPTZ | وقت التسجيل |

#### `weight_entries`
| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | UUID (PK) | معرف |
| `user_id` | UUID (FK) | ربط بالمستخدم |
| `weight` | NUMERIC | الوزن المسجل |
| `date` | DATE | تاريخ القياس |
| `note` | TEXT | ملاحظة اختيارية |

#### `water_logs`
| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | UUID (PK) | معرف |
| `user_id` | UUID (FK) | ربط بالمستخدم |
| `date` | DATE | التاريخ |
| `amount_ml` | INTEGER | الكمية بالمليلتر |
| UNIQUE | `(user_id, date)` | سجل واحد فقط لكل يوم (upsert) |

#### `workout_plans` *(مُولَّد من AI — محفوظ في Supabase)*
| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | UUID (PK) | معرف |
| `user_id` | UUID (FK) | ربط بالمستخدم |
| `goal` | TEXT | هدف الخطة |
| `equipment` | TEXT[] | [gender, activityLevel, diet] |
| `age/weight` | NUMERIC | بيانات التوليد |
| `plan_content` | TEXT | نص الخطة الكامل (Markdown) |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |

### عمليات DB الرئيسية (`lib/db.ts`)

- `getFoodLogs(date)` / `addFoodLog(date, item)` / `deleteFoodLog(id)`
- `getWeightEntries()` / `addWeightEntry(weight, date)`
- `getWaterLog(date)` / `setWaterLog(date, amount_ml)`
- `savePlan(plan)` / `getPlans()` / `deletePlan(id)`
- `getProfile()` / `upsertProfile(profile)` / `deleteAccount()`

---

## إدارة الحالة

### localStorage (بدون Redux)
الملف الشخصي يُحفظ في `localStorage` تحت مفتاح `galaxy-profile` عبر `useLocalStorage<StoredProfile>`.

### `StoredProfile` — البنية الكاملة
```typescript
{
  name, age, height, weight, targetWeight,
  gender: 'male' | 'female',
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive',
  goal: 'lose' | 'maintain' | 'gain',
  dailyCalories, targetProtein, targetCarbs, targetFat, targetWater,
  diet: 'balanced' | 'keto' | 'mediterranean' | 'intermittent' | 'lowcarb',
  completedOnboarding: boolean,
  theme: 'dark' | 'light',
  notifications: boolean,
  language: 'ar' | 'en'
}
```

---

## صفحات التطبيق بالتفصيل

### 1. `/` — لوحة التحكم (Dashboard)
الصفحة الرئيسية بعد تسجيل الدخول. تعرض:
- **تاريخ اليوم** + اسم المستخدم
- **شريط بحث الطعام** (FoodSearchBar)
- **حلقة السعرات** (Goal / Eaten / Left)
- **أشرطة الماكرو** (بروتين، كارب، دهون)
- **مؤشر BMI** مع التصنيف والنصيحة
- **رسم بياني للوزن** مع إضافة قياس جديد
- **متتبع الماء** (8 قطرات بصرية + أزرار +150/250/330/500ml)
- **بطاقة المدرب الذكي** (AI Coach)
- **قائمة وجبات اليوم** مع حذف كل وجبة
- **زر FAB** لإضافة طعام

### 2. `/onboarding` — الإعداد الأولي
معالج من **7 خطوات** يجمع:
- الاسم + العمر + الجنس
- الطول + الوزن الحالي + الوزن المستهدف
- مستوى النشاط (5 خيارات)
- الهدف (إنقاص/ثبات/زيادة)
- نوع النظام الغذائي (5 أنواع)
- ملخص الخطة المحسوبة

يحسب الماكرو تلقائياً ويحفظه في localStorage + Supabase.

### 3. `/scan` — مسح الطعام بالذكاء الاصطناعي
المستخدم يرفع/يلتقط صورة → ترسل كـ Base64 لـ `/api/analyze-food` → يحللها Gemini 2.0 Flash → يعرض قائمة الأطعمة مع الماكرو → المستخدم يضيفها لسجله.

### 4. `/plan` — توليد الخطة الغذائية
يرسل بيانات المستخدم لـ `/api/generate-plan` → GPT-4o-mini يولد خطة مفصلة مع جداول الوجبات → **يصل بـ Streaming** حرفاً بحرف.

### 5. `/analytics` — التحليلات
رسوم بيانية لـ:
- تطور الوزن عبر الزمن
- معدل السعرات اليومية
- توزيع الماكرو

### 6. `/settings` — الإعدادات
تعديل: الاسم، الوزن، الهدف، النظام الغذائي، اللغة، السمة (dark/light).

### 7. `/log` — سجل الوجبات
صفحة مخصصة لعرض وإدارة وجبات اليوم الحالي:
- **شريط ملخص** بالأعلى يعرض 4 أرقام: إجمالي السعرات / البروتين / الكارب / الدهون لليوم
- **الوجبات مجمّعة** حسب النوع (إفطار 🌅 / غداء ☀️ / عشاء 🌙 / وجبة خفيفة 🍎)
- لكل وجبة: الاسم، الكمية (جرام)، السعرات، البروتين، زر حذف
- **Optimistic UI**: يُضاف الطعام فوراً محلياً ثم يُحفظ في Supabase (يُستبدل المؤقت بالحقيقي)
- **حالة فارغة** مع زر "ابدأ التسجيل" إذا لم توجد وجبات
- **زر + أضف** في الأعلى يفتح `FoodEntryModal`

### 8. `/plans` — توليد الخطط الغذائية وعرضها
صفحة مدمجة للتوليد والحفظ والعرض:
- **ملخص الملف الشخصي**: بطاقة تعرض الهدف، نوع الدايت، السعرات، البروتين، الوزن، العمر — كلها مأخوذة من localStorage
- **زر توليد الخطة**: يرسل طلب POST لـ `/api/generate-plan` ويستقبل الرد بـ **Streaming** حرفاً بحرف عبر ReadableStream
- **عرض النص المتدفق**: نافذة قابلة للتمرير تعرض الخطة تدريجياً مع مؤشر نبض أخضر
- **استخراج الماكرو**: بعد اكتمال التوليد، زر "عرض كمعطيات يومية" يرسل النص لـ `/api/parse-macros` ويُعيد جدولاً بالوجبات والماكرو
- **الخطط المحفوظة**: قائمة بكل الخطط السابقة من Supabase (تُحفظ تلقائياً عند كل توليد ناجح)، قابلة للتوسيع (عرض/إخفاء) والحذف

### 9. `/workout` — تتبع التمارين الرياضية
صفحة لتسجيل التمارين اليومية وحساب السعرات المحروقة:
- **حلقتان SVG** (Ring component):
  - 🟠 **تناولت اليوم**: سعرات مأخوذة مباشرة من Supabase food_logs
  - 🟢 **حرقت اليوم**: مجموع التمارين المُسجَّلة
- **شريط Net Calories**: يحسب `الهدف + المحروق − المتناول` ويلوّن بالأخضر أو الأحمر
- **كتالوج 18 تمريناً** بقيم MET: ركض، مشي، دراجة، سباحة، HIIT، رفع أثقال... إلخ
- **حساب السعرات المحروقة**:
  - للتمارين من الكتالوج: `MET × وزن_المستخدم × (الدقائق / 60)` — حساب فوري محلي
  - للتمارين المخصصة (بحث حر): يُرسل لـ `/api/calc-burn` → يحسب بالذكاء الاصطناعي
- **تعديل القيمة**: المستخدم يعدل السعرات المحسوبة يدوياً قبل الإضافة
- **سجل التمارين**: يُحفظ في localStorage تحت `galaxy-workout-today` ويُعاد تعيينه عند بداية يوم جديد

### 10. `/login` — تسجيل الدخول
- نموذج بريد إلكتروني + كلمة مرور مع إخفاء/إظهار
- Supabase Auth: `signInWithPassword`
- معالجة الأخطاء: بريد غير مؤكد / بيانات خاطئة / طلبات كثيرة
- **إعادة إرسال رابط التأكيد** إذا كان البريد غير مؤكد
- بعد النجاح: `window.location.href = '/'`

### 11. `/register` — إنشاء حساب
- نموذج الاسم + البريد + كلمة المرور + تأكيد كلمة المرور
- Supabase Auth: `signUp`
- تحقق من تطابق كلمتي المرور محلياً
- بعد النجاح: توجيه لـ `/onboarding`

---

## الكومبوننتس بالتفصيل

### `GalaxyBackground.tsx`
خلفية Canvas بجسيمات متحركة تحاكي النجوم والمجرة. تعمل على كامل الشاشة كـ `position: fixed` خلف كل المحتوى.

### `GlassCard.tsx`
بطاقة زجاجية قابلة لإعادة الاستخدام:
- `glow`: `'green' | 'cyan | 'purple' | 'none'` — تُضيف توهجاً ملوناً للبطاقة
- `animate`: boolean — تفعيل/تعطيل animation الدخول
- `className`: لتخصيص إضافي

### `CalorieRing.tsx`
حلقة SVG دائرية تعرض:
- **Goal** (الهدف اليومي)
- **Eaten** (المتناول)
- **Left** (المتبقي)
مع gradient أخضر/سماوي وتحريك ناعم للقوس.

### `MacroBar.tsx`
أشرطة تقدم أفقية للبروتين والكارب والدهون. تعرض القيمة الحالية / الهدف ونسبة مئوية ملونة.

### `BMICircle.tsx`
مقياس BMI نصف دائري يعرض:
- القيمة المحسوبة
- التصنيف (نحيف / طبيعي / زيادة وزن / سمنة)
- نصيحة نصية مخصصة

### `WeightMiniChart.tsx`
رسم بياني صغير (Recharts LineChart) يعرض تطور الوزن خلال آخر 7 أو 30 يوم. يتضمن نموذج إدخال لإضافة وزن جديد.

### `AICoachCard.tsx`
بطاقة تحليل يومي ذكي:
- 5 نصائح غذائية تتناوب كل 8 ثوانٍ (protein, water, fiber, sleep, breakfast)
- **تحليل ديناميكي** حسب بيانات اليوم:
  - إذا اقترب من الهدف اليومي (>95%) → تحذير
  - إذا كان استهلاكه منخفضاً بعد الساعة 2 ظهراً (<30%) → تنبيه
  - إذا كان البروتين منخفضاً (<40%) → تذكير
- نقاط تنقل بين النصائح يدوياً

### `FoodEntryModal.tsx`
نافذة modal لإضافة طعام يدوياً:
- حقول: اسم الطعام، الكمية (جرام)، نوع الوجبة، السعرات، البروتين، الكارب، الدهون
- يحسب تلقائياً أو يقبل قيم يدوية

### `FoodSearchBar.tsx`
شريط بحث عن طعام مع autocomplete:
- يبحث في `foodDatabase.ts` المحلية (offline)
- يعرض اقتراحات فورية مع الماكرو
- عند الاختيار: يفتح `FoodEntryModal` بالبيانات مُعبأة

### `BottomNav.tsx`
شريط تنقل سفلي ثابت بـ 5 أيقونات:
- 🏠 الرئيسية (`/`)
- 📋 السجل (`/log`)
- 📊 التحليلات (`/analytics`)
- 🏋️ التمارين (`/workout`)
- ✨ الخطط (`/plans`)

### `ConditionalLayout.tsx`
يُخفي `BottomNav` في صفحات: `/login`، `/register`، `/onboarding` — لأنها صفحات full-screen بدون تنقل.

### `ThemeProvider.tsx`
مزود السمة الداكنة/الفاتحة. يقرأ من `localStorage` ويُطبق class على `<html>`.

### `Logo.tsx`
شعار التطبيق — أيقونة كوكب/مجرة SVG مخصصة مع اسم "Galaxy Nutrition".

---

## API Endpoints

| Endpoint | Method | الوصف | AI Model |
|----------|--------|-------|----------|
| `/api/analyze-food` | POST | تحليل صورة طعام | Gemini 2.0 Flash (OpenRouter) |
| `/api/generate-plan` | POST | توليد خطة غذائية (Streaming SSE) | GPT-4o-mini (OpenRouter) |
| `/api/parse-macros` | POST | استخراج الماكرو من نص الخطة | GPT-4o-mini (OpenRouter) |
| `/api/diet-info` | POST | معلومات النظام الغذائي | GPT-4o-mini (OpenRouter) |
| `/api/calc-burn` | POST | حساب السعرات المحروقة لتمرين مخصص | GPT-4o-mini (OpenRouter) |
| `/api/delete-account` | DELETE | حذف حساب المستخدم وكل بياناته | - |

### تفاصيل كل Endpoint

#### `POST /api/analyze-food`
```json
// Request
{ "imageBase64": "...", "mimeType": "image/jpeg" }

// Response
{
  "success": true,
  "detectedFoods": [
    {
      "name": "Grilled Chicken",
      "nameAr": "دجاج مشوي",
      "estimatedWeight": 150,
      "confidence": 0.9,
      "nutrition": {
        "calories": 200, "protein": 30, "carbs": 0,
        "fat": 7, "fiber": 0, "sodium": 300
      }
    }
  ],
  "totalCalories": 200,
  "mealDescription": "وصف الوجبة"
}
```
النموذج: `google/gemini-2.0-flash-exp:free` — يستقبل الصورة كـ Base64 مع prompt يطلب JSON مباشرة.

#### `POST /api/generate-plan`
```json
// Request
{
  "goal": "lose", "gender": "male", "activity": "moderate",
  "diet": "keto", "age": 28, "weight": 85, "height": 175,
  "language": "ar",
  "targets": { "calories": 1800, "protein": 140, "carbs": 50, "fat": 90, "water": 2.5 }
}
// Response: text/plain stream (ReadableStream — حرف بحرف)
```

#### `POST /api/calc-burn`
```json
// Request
{ "exercise": "ركض 30 دقيقة", "weight": 80, "language": "ar" }

// Response
{ "name": "ركض", "minutes": 30, "calories": 320 }
```
للتمارين من الكتالوج: الحساب يتم محلياً بـ `MET × وزن × ساعات`. للتمارين المخصصة فقط يُستخدم AI.

---

## متغيرات البيئة المطلوبة (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
OPENROUTER_API_KEY=...
```

---

## تشغيل المشروع

```bash
cd GalaxyNutrition
npm run dev       # تطوير على http://localhost:3000
npm run build     # بناء للإنتاج
npm run start     # تشغيل بناء الإنتاج
npm run lint      # فحص الكود
```

---

## تدفق المستخدم الرئيسي

```
فتح التطبيق
    ↓
هل أكمل Onboarding؟
    ↓ لا              ↓ نعم
/onboarding      هل مسجل دخول؟
                    ↓ لا         ↓ نعم
                /login          / (Dashboard)
                    ↓
                /register
```

---

## الميزات الذكية

1. **تحليل الصور** — Gemini يُعرّف الطعام من صورة ويحسب ماكروه تلقائياً
2. **توليد الخطط** — GPT-4o-mini يبني خطة غذائية مخصصة حسب الهدف والنظام الغذائي
3. **حساب الماكرو التلقائي** — معادلات Mifflin-St Jeor + Harris-Benedict لحساب السعرات والماكرو
4. **المدرب الذكي (AI Coach)** — تحليل يومي للتقدم ونصائح مخصصة
5. **ثنائي اللغة** — عربي/إنجليزي مع دعم RTL كامل

---

## الخطوط والألوان الرئيسية

```css
/* خطوط */
--font-primary: 'Cairo', 'Tajawal'

/* ألوان العلامة التجارية */
--color-green:  #97E325   /* أخضر كهربائي — اللون الرئيسي */
--color-cyan:   #00D4FF   /* أزرق سماوي */
--color-orange: #FF5F1F   /* برتقالي */
--color-bg:     #0a0014   /* خلفية بنفسجية داكنة جداً */

/* ألوان الماكرو */
--protein: #06b6d4   /* بروتين — سماوي */
--carbs:   #97E325   /* كارب — أخضر */
--fat:     #FF5F1F   /* دهون — برتقالي */
--water:   #3b82f6   /* ماء — أزرق */
```

---

## دوال المساعدة (`lib/utils.ts`)

| الدالة | الوصف |
|--------|-------|
| `calculateBMI(weight, height)` | يحسب BMI ويُعيد `BMIInfo` مع التصنيف والنصيحة |
| `calculateDailyCalories(weight, height, age, gender, activity, goal)` | معادلة Mifflin-St Jeor + TDEE + تعديل الهدف |
| `sumNutrition(items[])` | يجمع كل القيم الغذائية لقائمة أطعمة |
| `emptyNutrition()` | يُعيد كائن NutritionData بأصفار |
| `getTodayDate()` | `new Date().toISOString().split('T')[0]` |
| `getArabicDate(date)` | يُحوّل التاريخ لصيغة عربية باستخدام `Intl.DateTimeFormat` |
| `getMealTypeAr(type)` | يُحوّل `breakfast/lunch/dinner/snack` للعربية |
| `clamp(value, min, max)` | يُقيّد قيمة بين حدّين |

### معادلة حساب السعرات

```
// Mifflin-St Jeor
ذكر:  BMR = 10×وزن + 6.25×طول − 5×عمر + 5
أنثى: BMR = 10×وزن + 6.25×طول − 5×عمر − 161

// TDEE = BMR × معامل_النشاط
sedentary=1.2 / light=1.375 / moderate=1.55 / active=1.725 / veryActive=1.9

// الهدف
إنقاص = TDEE − 500
ثبات  = TDEE
زيادة = TDEE + 300
```

---

## قاعدة بيانات الطعام المحلية (`lib/foodDatabase.ts`)

قاعدة بيانات أطعمة offline مدمجة في التطبيق تُستخدم في `FoodSearchBar` للاقتراحات الفورية بدون اتصال إنترنت. تشمل أطعمة شائعة عربية وعالمية مع قيمها الغذائية لكل 100 جرام.

---

## ميزات PWA

- **manifest.json**: اسم التطبيق، الأيقونات، لون الخلفية، `display: standalone`
- **يعمل offline**: الصفحات الرئيسية والـ UI متاحة بدون إنترنت (البيانات من localStorage)
- **قابل للتثبيت**: يمكن إضافته لشاشة الجوال مباشرة
- **RTL كامل**: `dir="rtl"` على `<html>` والتخطيط يتعامل مع العربية والإنجليزية ديناميكياً
