-- ============================================================
-- Complete RLS policies for demands, bids, profiles
-- Run this in Supabase SQL Editor to fix all RLS issues at once.
-- Idempotent: drops existing policies before recreating.
-- ============================================================

-- ═══════════════════════════════════════════════════════════
-- DEMANDS
-- ═══════════════════════════════════════════════════════════

-- Ensure RLS is on
ALTER TABLE demands ENABLE ROW LEVEL SECURITY;

-- Drop all existing SELECT policies on demands (to avoid conflicts)
DROP POLICY IF EXISTS "乘客可查看自己的行程" ON demands;
DROP POLICY IF EXISTS "商家可读取已接单的行程" ON demands;
DROP POLICY IF EXISTS "认证用户可查看待报价行程" ON demands;
DROP POLICY IF EXISTS "平台管理员可管理行程" ON demands;

-- 1) Passenger: can see own demands
CREATE POLICY "乘客可查看自己的行程"
  ON demands FOR SELECT
  TO public
  USING (passenger_id = auth.uid());

-- 2) Merchant/Driver: can see demands they won (accepted_provider_id)
CREATE POLICY "商家可读取已接单的行程"
  ON demands FOR SELECT
  TO public
  USING (accepted_provider_id = auth.uid());

-- 3) Any authenticated user: can see BIDDING demands (workbench needs this)
CREATE POLICY "认证用户可查看待报价行程"
  ON demands FOR SELECT
  TO public
  USING (status = 'BIDDING' AND auth.uid() IS NOT NULL);

-- 4) Admin: full access (use auth.jwt() to avoid profiles self-reference recursion)
CREATE POLICY "平台管理员可管理行程"
  ON demands FOR ALL
  TO public
  USING ((auth.jwt()->'raw_app_metadata'->>'role') = 'admin')
  WITH CHECK ((auth.jwt()->'raw_app_metadata'->>'role') = 'admin');

-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "乘客可创建行程" ON demands;
DROP POLICY IF EXISTS "乘客可更新自己的行程" ON demands;
DROP POLICY IF EXISTS "商家可更新已接单的行程履约" ON demands;

-- 5) Passenger: can INSERT own demands
CREATE POLICY "乘客可创建行程"
  ON demands FOR INSERT
  TO public
  WITH CHECK (passenger_id = auth.uid());

-- 6) Passenger: can UPDATE own demands (accept bid writes accepted_provider_id, etc.)
CREATE POLICY "乘客可更新自己的行程"
  ON demands FOR UPDATE
  TO public
  USING (passenger_id = auth.uid())
  WITH CHECK (passenger_id = auth.uid());

-- 7) Merchant/Driver: can UPDATE demands they won (fulfillment, assigned_driver, etc.)
CREATE POLICY "商家可更新已接单的行程履约"
  ON demands FOR UPDATE
  TO public
  USING (accepted_provider_id = auth.uid())
  WITH CHECK (accepted_provider_id = auth.uid());


-- ═══════════════════════════════════════════════════════════
-- BIDS
-- ═══════════════════════════════════════════════════════════

ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "乘客可查看自己行程的报价" ON bids;
DROP POLICY IF EXISTS "商家可查看自己的报价" ON bids;
DROP POLICY IF EXISTS "商家可提交报价" ON bids;
DROP POLICY IF EXISTS "认证用户可查看待处理报价" ON bids;
DROP POLICY IF EXISTS "平台管理员可管理报价" ON bids;

-- 1) Passenger: can see bids on own demands
CREATE POLICY "乘客可查看自己行程的报价"
  ON bids FOR SELECT
  TO public
  USING (
    EXISTS (SELECT 1 FROM demands WHERE demands.id = bids.demand_id AND demands.passenger_id = auth.uid())
  );

-- 2) Merchant/Driver: can see own bids (any status)
CREATE POLICY "商家可查看自己的报价"
  ON bids FOR SELECT
  TO public
  USING (provider_id = auth.uid());

-- 3) Any authenticated user: can see PENDING bids (for exclusive-bid filtering)
CREATE POLICY "认证用户可查看待处理报价"
  ON bids FOR SELECT
  TO public
  USING (bids.status = 'PENDING' AND auth.uid() IS NOT NULL);

-- 4) Merchant/Driver: can INSERT bids
CREATE POLICY "商家可提交报价"
  ON bids FOR INSERT
  TO public
  WITH CHECK (provider_id = auth.uid());

-- 5) Passenger: can UPDATE bids on own demands (accept/reject)
DROP POLICY IF EXISTS "乘客可更新自己行程的报价" ON bids;
CREATE POLICY "乘客可更新自己行程的报价"
  ON bids FOR UPDATE
  TO public
  USING (
    EXISTS (SELECT 1 FROM demands WHERE demands.id = bids.demand_id AND demands.passenger_id = auth.uid())
  );

-- 6) Admin: full access (use auth.jwt() to avoid profiles self-reference recursion)
CREATE POLICY "平台管理员可管理报价"
  ON bids FOR ALL
  TO public
  USING ((auth.jwt()->'raw_app_metadata'->>'role') = 'admin')
  WITH CHECK ((auth.jwt()->'raw_app_metadata'->>'role') = 'admin');


-- ═══════════════════════════════════════════════════════════
-- PROFILES
-- ═══════════════════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "用户可查看自己的资料" ON profiles;
DROP POLICY IF EXISTS "用户可更新自己的资料" ON profiles;
DROP POLICY IF EXISTS "认证用户可查看资料" ON profiles;
DROP POLICY IF EXISTS "平台管理员可管理资料" ON profiles;

-- 1) Any authenticated user: can read profiles (needed for driver lookup, display names, etc.)
CREATE POLICY "认证用户可查看资料"
  ON profiles FOR SELECT
  TO public
  USING (auth.uid() IS NOT NULL);

-- 2) User: can UPDATE own profile (nickname, avatar, phone)
CREATE POLICY "用户可更新自己的资料"
  ON profiles FOR UPDATE
  TO public
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 3) Admin: no self-referencing policy needed.
--    SELECT is open to all auth users, UPDATE is self-only.
--    Admin operations use service_role key (cloud functions) which bypasses RLS.
