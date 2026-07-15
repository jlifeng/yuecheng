-- RLS policies for Approach B fulfillment flow.
-- Run AFTER 20260714_fulfillment_approach_b.sql (schema must exist).
-- Idempotent: drops existing policies (IF EXISTS) before recreating.
--
-- Convention (matches existing demands/bids/drivers/vehicles policies):
-- - Passenger owns a demand via demands.passenger_id = auth.uid()
-- - Merchant owns a demand via an ACCEPTED bid: provider_id = auth.uid()
-- - Merchant manager gate via is_merchant_manager() (defined in DB)
-- - Platform admin via profiles.role = 'admin'

-- ===========================================================================
-- demands: merchant needs to READ + UPDATE demands they won (ACCEPTED bid)
--          so they can assign driver, advance fulfillment, submit fees.
--          Existing passenger policies stay untouched.
-- ===========================================================================

-- helper expression: "this demand has an ACCEPTED bid by the current merchant"
-- kept inline (Postgres RLS can't reference a stored function returning bool
-- without marking it; inline subquery is the pattern already used by bids).

-- DROP existing merchant-fulfillment policies (if re-run)
DROP POLICY IF EXISTS "商家可读取已接单的行程" ON demands;
DROP POLICY IF EXISTS "商家可更新已接单的行程履约" ON demands;

-- Merchant SELECT: own ACCEPTED-bid demands (assign / advance / fee needs to load detail)
CREATE POLICY "商家可读取已接单的行程"
  ON demands FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM bids
      WHERE bids.demand_id = demands.id
        AND bids.provider_id = auth.uid()
        AND bids.status = 'ACCEPTED'
    )
  );

-- Merchant UPDATE: own ACCEPTED-bid demands (fulfillment_status, assigned_*, status)
CREATE POLICY "商家可更新已接单的行程履约"
  ON demands FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM bids
      WHERE bids.demand_id = demands.id
        AND bids.provider_id = auth.uid()
        AND bids.status = 'ACCEPTED'
    )
  );

-- ===========================================================================
-- order_events: audit log
--   - passenger: SELECT own demand's events
--   - merchant:  SELECT + INSERT on own ACCEPTED-bid demand's events
-- ===========================================================================
ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "乘客可查看订单事件" ON order_events;
DROP POLICY IF EXISTS "商家可查看订单事件" ON order_events;
DROP POLICY IF EXISTS "商家可写入订单事件" ON order_events;
DROP POLICY IF EXISTS "平台管理员可管理订单事件" ON order_events;

-- passenger SELECT
CREATE POLICY "乘客可查看订单事件"
  ON order_events FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM demands
      WHERE demands.id = order_events.demand_id
        AND demands.passenger_id = auth.uid()
    )
  );

-- merchant SELECT
CREATE POLICY "商家可查看订单事件"
  ON order_events FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM bids
      WHERE bids.demand_id = order_events.demand_id
        AND bids.provider_id = auth.uid()
        AND bids.status = 'ACCEPTED'
    )
  );

-- merchant INSERT (audit row on assign / advance / cancel)
CREATE POLICY "商家可写入订单事件"
  ON order_events FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bids
      WHERE bids.demand_id = order_events.demand_id
        AND bids.provider_id = auth.uid()
        AND bids.status = 'ACCEPTED'
    )
  );

-- passenger INSERT (confirm-fee COMPLETED event; passenger owns the demand)
DROP POLICY IF EXISTS "乘客可写入订单事件" ON order_events;
CREATE POLICY "乘客可写入订单事件"
  ON order_events FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM demands
      WHERE demands.id = order_events.demand_id
        AND demands.passenger_id = auth.uid()
    )
  );

-- platform admin full access
CREATE POLICY "平台管理员可管理订单事件"
  ON order_events FOR ALL
  TO public
  USING (
    EXISTS (SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- ===========================================================================
-- order_fees: one row per demand
--   - merchant: SELECT + INSERT(UPSERT) + UPDATE on own ACCEPTED-bid demand
--   - passenger: SELECT (view) + UPDATE (confirm -> confirmed_at) on own demand
-- ===========================================================================
ALTER TABLE order_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "乘客可查看订单费用" ON order_fees;
DROP POLICY IF EXISTS "商家可查看订单费用" ON order_fees;
DROP POLICY IF EXISTS "商家可提交订单费用" ON order_fees;
DROP POLICY IF EXISTS "商家可更新订单费用" ON order_fees;
DROP POLICY IF EXISTS "乘客可确认订单费用" ON order_fees;
DROP POLICY IF EXISTS "平台管理员可管理订单费用" ON order_fees;

-- passenger SELECT
CREATE POLICY "乘客可查看订单费用"
  ON order_fees FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM demands
      WHERE demands.id = order_fees.demand_id
        AND demands.passenger_id = auth.uid()
    )
  );

-- merchant SELECT
CREATE POLICY "商家可查看订单费用"
  ON order_fees FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM bids
      WHERE bids.demand_id = order_fees.demand_id
        AND bids.provider_id = auth.uid()
        AND bids.status = 'ACCEPTED'
    )
  );

-- merchant INSERT (upsert submit) — must be on own won demand
CREATE POLICY "商家可提交订单费用"
  ON order_fees FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bids
      WHERE bids.demand_id = order_fees.demand_id
        AND bids.provider_id = auth.uid()
        AND bids.status = 'ACCEPTED'
    )
  );

-- merchant UPDATE (re-submit before passenger confirm)
CREATE POLICY "商家可更新订单费用"
  ON order_fees FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM bids
      WHERE bids.demand_id = order_fees.demand_id
        AND bids.provider_id = auth.uid()
        AND bids.status = 'ACCEPTED'
    )
  );

-- passenger UPDATE (confirm -> confirmed_at only; RLS can't restrict columns,
-- but service layer only PATCHes confirmed_at)
CREATE POLICY "乘客可确认订单费用"
  ON order_fees FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM demands
      WHERE demands.id = order_fees.demand_id
        AND demands.passenger_id = auth.uid()
    )
  );

-- platform admin full access
CREATE POLICY "平台管理员可管理订单费用"
  ON order_fees FOR ALL
  TO public
  USING (
    EXISTS (SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Note: drivers / vehicles already have "可公开查看" (qual=true) SELECT policies,
-- so passengers can read assigned driver/vehicle rows for order detail.
