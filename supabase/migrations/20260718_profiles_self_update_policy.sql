-- Allow users to update their own profile (nickname, name, avatar_url, phone).
-- Without this policy, the frontend PATCH to profiles fails silently under RLS.

DROP POLICY IF EXISTS "用户可更新自己的资料" ON profiles;
CREATE POLICY "用户可更新自己的资料"
  ON profiles FOR UPDATE
  TO public
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Also ensure users can read their own profile (may already exist from Supabase default)
DROP POLICY IF EXISTS "用户可查看自己的资料" ON profiles;
CREATE POLICY "用户可查看自己的资料"
  ON profiles FOR SELECT
  TO public
  USING (id = auth.uid());
