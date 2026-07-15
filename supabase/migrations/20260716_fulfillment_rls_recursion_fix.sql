-- Fix: break RLS infinite recursion between demands <-> bids policies.
--
-- Root cause: 20260715 policy "商家可读取已接单的行程" on demands did
--   EXISTS (SELECT 1 FROM bids WHERE bids.demand_id = demands.id ...)
-- but bids SELECT policy "Passengers can view bids on their demands" did
--   EXISTS (SELECT 1 FROM demands WHERE demands.id = bids.demand_id ...)
-- -> mutual recursion -> 42P17 infinite recursion.
--
-- Fix: denormalize the winning provider onto demands itself so the demands
-- merchant policy never needs to read bids. Set on acceptBid and via backfill.
-- Idempotent / re-runnable.

-- ===========================================================================
-- 1) demands: add accepted_provider_id (winning merchant's user id)
-- ===========================================================================
ALTER TABLE demands
  ADD COLUMN IF NOT EXISTS accepted_provider_id UUID;

CREATE INDEX IF NOT EXISTS idx_demands_accepted_provider_id
  ON demands(accepted_provider_id);

COMMENT ON COLUMN demands.accepted_provider_id IS
  'User id of the merchant whose bid was accepted (denormalized to break RLS recursion).';

-- Backfill from existing ACCEPTED bids (idempotent: only fills NULL).
UPDATE demands d
SET accepted_provider_id = b.provider_id
FROM bids b
WHERE b.demand_id = d.id
  AND b.status = 'ACCEPTED'
  AND d.accepted_provider_id IS NULL;

-- ===========================================================================
-- 2) Replace the two merchant-fulfillment policies on demands to use the
--    denormalized column (no bids subquery -> no recursion).
-- ===========================================================================
DROP POLICY IF EXISTS "商家可读取已接单的行程" ON demands;
DROP POLICY IF EXISTS "商家可更新已接单的行程履约" ON demands;

-- Merchant SELECT: demands they won
CREATE POLICY "商家可读取已接单的行程"
  ON demands FOR SELECT
  TO public
  USING (accepted_provider_id = auth.uid());

-- Merchant UPDATE: fulfillment_status, assigned_*, status on won demands
CREATE POLICY "商家可更新已接单的行程履约"
  ON demands FOR UPDATE
  TO public
  USING (accepted_provider_id = auth.uid());

-- ===========================================================================
-- 3) order_events / order_fees merchant policies also referenced bids ->
--    switch to the same denormalized ownership via demands.accepted_provider_id.
--    Passenger policies already keyed off demands.passenger_id (no recursion:
--    demands.passenger_id is a plain column, no subquery).
-- ===========================================================================

-- order_events: merchant SELECT
DROP POLICY IF EXISTS "商家可查看订单事件" ON order_events;
CREATE POLICY "商家可查看订单事件"
  ON order_events FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM demands
      WHERE demands.id = order_events.demand_id
        AND demands.accepted_provider_id = auth.uid()
    )
  );

-- order_events: merchant INSERT
DROP POLICY IF EXISTS "商家可写入订单事件" ON order_events;
CREATE POLICY "商家可写入订单事件"
  ON order_events FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM demands
      WHERE demands.id = order_events.demand_id
        AND demands.accepted_provider_id = auth.uid()
    )
  );

-- order_fees: merchant SELECT
DROP POLICY IF EXISTS "商家可查看订单费用" ON order_fees;
CREATE POLICY "商家可查看订单费用"
  ON order_fees FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM demands
      WHERE demands.id = order_fees.demand_id
        AND demands.accepted_provider_id = auth.uid()
    )
  );

-- order_fees: merchant INSERT (upsert submit)
DROP POLICY IF EXISTS "商家可提交订单费用" ON order_fees;
CREATE POLICY "商家可提交订单费用"
  ON order_fees FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM demands
      WHERE demands.id = order_fees.demand_id
        AND demands.accepted_provider_id = auth.uid()
    )
  );

-- order_fees: merchant UPDATE (re-submit before confirm)
DROP POLICY IF EXISTS "商家可更新订单费用" ON order_fees;
CREATE POLICY "商家可更新订单费用"
  ON order_fees FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM demands
      WHERE demands.id = order_fees.demand_id
        AND demands.accepted_provider_id = auth.uid()
    )
  );

-- NOTE on remaining recursion safety:
-- demands merchant policies now read NO other table (plain column compare),
-- so the demands<->bids cycle is broken. Passenger policies on demands/
-- order_events/order_fees read demands.passenger_id (plain column) — safe.
