-- ══════════════════════════════════════════════════════════════
--  دايتك — إصلاح تسجيل الوزن
--  شغّله مرة واحدة: Supabase ← SQL Editor ← New Query ← لصق ← Run
-- ══════════════════════════════════════════════════════════════

-- ── 1. احذف التكرارات القديمة (وزنان في نفس اليوم) ──────────────
--    نُبقي الأحدث لكل يوم — هو ما قصده المستخدم فعلاً.
DELETE FROM public.weight_entries a
USING public.weight_entries b
WHERE a.user_id = b.user_id
  AND a.date    = b.date
  AND a.created_at < b.created_at;

-- ── 2. قيد فريد: قياس واحد لكل يوم لكل مستخدم ──────────────────
--    بدونه لا يعمل upsert، ويعيد التسجيل المكرر رسم نقطتين فوق بعض.
--    (نفس القيد الموجود أصلاً في جدول water_logs)
DO $$ BEGIN
  ALTER TABLE public.weight_entries
    ADD CONSTRAINT weight_entries_user_date_key UNIQUE (user_id, date);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 3. زامن الوزن الحالي مع آخر قياس مسجّل ─────────────────────
--    المستخدمون الحاليون سجّلوا أوزانهم في weight_entries بينما بقي
--    profiles.weight على القيمة القديمة — وكل السعرات والأهداف تُحسب
--    منه. هذا يصحّح حساباتهم بأثر رجعي.
UPDATE public.profiles p
SET    weight = w.weight
FROM (
  SELECT DISTINCT ON (user_id) user_id, weight
  FROM   public.weight_entries
  ORDER  BY user_id, date DESC, created_at DESC
) w
WHERE p.id = w.user_id
  AND p.weight IS DISTINCT FROM w.weight;
