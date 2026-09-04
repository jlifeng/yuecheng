-- ============================================================
-- Fix: remove self-referencing admin policies that cause
-- infinite recursion (42P17) on profiles table.
--
-- The recursion chain:
--   profiles SELECT policy → evaluates admin policy →
--   admin policy does EXISTS (SELECT 1 FROM profiles ...) →
--   triggers profiles SELECT policy again → infinite loop
--
-- Fix: admin policies on profiles/demands/bids must NOT
-- reference the profiles table. Instead use auth.jwt() claims
-- or simply rely on service_role key for admin operations.
-- ============================================================

-- ═══════════════════════════════════════════════════════════
-- PROFILES: remove self-referencing admin policy
-- ═══════════════════════════════════════════════════════════

-- Drop the recursive admin policy
DROP POLICY IF EXISTS "平台管理员可管理资料" ON profiles;

-- No replacement needed: SELECT is open to all auth users,
-- UPDATE is self-only. Admin uses service_role key (cloud functions)
-- which bypasses RLS entirely.


-- ═══════════════════════════════════════════════════════════
-- DEMANDS: fix admin policy to avoid profiles reference
-- ═══════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "平台管理员可管理行程" ON demands;

-- Use auth.jwt() custom claim instead of querying profiles table.
-- The wechat-login-v2 cloud function sets app_metadata.role = 'admin'
-- for admin users, which appears in auth.jwt().raw_app_metadata.
CREATE POLICY "平台管理员可管理行程"
  ON demands FOR ALL
  TO public
  USING (
    (auth.jwt()->'raw_app_metadata'->>'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt()->'raw_app_metadata'->>'role') = 'admin'
  );


-- ═══════════════════════════════════════════════════════════
-- BIDS: fix admin policy to avoid profiles reference
-- ═══════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "平台管理员可管理报价" ON bids;

CREATE POLICY "平台管理员可管理报价"
  ON bids FOR ALL
  TO public
  USING (
    (auth.jwt()->'raw_app_metadata'->>'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt()->'raw_app_metadata'->>'role') = 'admin'
  );
