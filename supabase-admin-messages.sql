-- ══════════════════════════════════════════════
--  Dietak — رسائل الأدمن (رد / بث / توجيه لشخص)
--  شغّلها في: Supabase → SQL Editor → New Query
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.admin_messages (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- NULL = بث للجميع
  title      TEXT,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_messages_user_idx ON public.admin_messages (user_id);
CREATE INDEX IF NOT EXISTS admin_messages_created_idx ON public.admin_messages (created_at DESC);

ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

-- المستخدم يقرأ رسائله الموجّهة له + رسائل البث (user_id IS NULL)
DROP POLICY IF EXISTS "read own or broadcast" ON public.admin_messages;
CREATE POLICY "read own or broadcast" ON public.admin_messages
  FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

-- لا إدراج/حذف للمستخدم العادي — الأدمن يرسل عبر مفتاح الخدمة (API)
