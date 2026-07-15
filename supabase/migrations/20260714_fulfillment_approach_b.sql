-- Approach B: coarse demand status + fine-grained fulfillment_status
-- + assignment fields + order_events + order_fees
-- Idempotent / re-runnable migration.

-- ---------------------------------------------------------------------------
-- 1) demands: fulfillment + assignment columns
-- ---------------------------------------------------------------------------
ALTER TABLE demands
  ADD COLUMN IF NOT EXISTS fulfillment_status VARCHAR(40);

ALTER TABLE demands
  ADD COLUMN IF NOT EXISTS assigned_driver_id UUID;

ALTER TABLE demands
  ADD COLUMN IF NOT EXISTS assigned_vehicle_id UUID;

-- FK: assigned_driver_id → drivers(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'demands_assigned_driver_id_fkey'
  ) THEN
    ALTER TABLE demands
      ADD CONSTRAINT demands_assigned_driver_id_fkey
      FOREIGN KEY (assigned_driver_id)
      REFERENCES drivers(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- FK: assigned_vehicle_id → vehicles(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'demands_assigned_vehicle_id_fkey'
  ) THEN
    ALTER TABLE demands
      ADD CONSTRAINT demands_assigned_vehicle_id_fkey
      FOREIGN KEY (assigned_vehicle_id)
      REFERENCES vehicles(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_demands_fulfillment_status
  ON demands(fulfillment_status);

CREATE INDEX IF NOT EXISTS idx_demands_assigned_driver_id
  ON demands(assigned_driver_id);

CREATE INDEX IF NOT EXISTS idx_demands_assigned_vehicle_id
  ON demands(assigned_vehicle_id);

-- Allowed fulfillment_status values (NULL allowed for pre-accept / unset)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'demands_fulfillment_status_check'
  ) THEN
    ALTER TABLE demands
      ADD CONSTRAINT demands_fulfillment_status_check
      CHECK (
        fulfillment_status IS NULL
        OR fulfillment_status IN (
          'PENDING_ASSIGN',
          'ASSIGNED',
          'ON_THE_WAY',
          'ARRIVED_PICKUP',
          'WAITING_PASSENGER',
          'PASSENGER_BOARDED',
          'ARRIVING_DESTINATION',
          'ARRIVED_DESTINATION',
          'PENDING_FEE_CONFIRM',
          'COMPLETED',
          'CANCELLED',
          'ABNORMAL_PROCESSING'
        )
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2) order_events: node advance audit log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id UUID NOT NULL REFERENCES demands(id) ON DELETE CASCADE,
  event_type VARCHAR(60) NOT NULL,
  actor_id UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_events_demand_id
  ON order_events(demand_id);

CREATE INDEX IF NOT EXISTS idx_order_events_demand_created
  ON order_events(demand_id, created_at);

CREATE INDEX IF NOT EXISTS idx_order_events_event_type
  ON order_events(event_type);

-- ---------------------------------------------------------------------------
-- 3) order_fees: one fee row per demand (offline settlement archive)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id UUID NOT NULL UNIQUE REFERENCES demands(id) ON DELETE CASCADE,
  base_fare NUMERIC(12, 2) NOT NULL DEFAULT 0,
  waiting_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  toll_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  parking_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  other_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(8) NOT NULL DEFAULT 'CNY',
  submitted_by UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ NULL,
  confirmed_at TIMESTAMPTZ NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- demand_id already has UNIQUE index; no extra single-column index needed.

-- updated_at trigger (function may already exist from drivers/vehicles migration)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_order_fees_updated_at ON order_fees;
CREATE TRIGGER update_order_fees_updated_at
  BEFORE UPDATE ON order_fees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 4) Historical backfill of fulfillment_status from coarse demands.status
--    Only fill rows where fulfillment_status IS NULL.
--
-- Mapping:
--   ACCEPTED    → PENDING_ASSIGN
--   IN_PROGRESS → PASSENGER_BOARDED  (approx)
--   COMPLETED   → COMPLETED
--   CANCELLED   → CANCELLED
--   BIDDING / PENDING / others → leave NULL
-- ---------------------------------------------------------------------------
UPDATE demands
SET fulfillment_status = 'PENDING_ASSIGN'
WHERE fulfillment_status IS NULL
  AND status = 'ACCEPTED';

UPDATE demands
SET fulfillment_status = 'PASSENGER_BOARDED'
WHERE fulfillment_status IS NULL
  AND status = 'IN_PROGRESS';

UPDATE demands
SET fulfillment_status = 'COMPLETED'
WHERE fulfillment_status IS NULL
  AND status = 'COMPLETED';

UPDATE demands
SET fulfillment_status = 'CANCELLED'
WHERE fulfillment_status IS NULL
  AND status = 'CANCELLED';

-- Optional comment for operators
COMMENT ON COLUMN demands.fulfillment_status IS
  'Fine-grained fulfillment node (Approach B). Coarse lifecycle remains demands.status.';
COMMENT ON COLUMN demands.assigned_driver_id IS
  'Assigned driver from drivers table after merchant assignment.';
COMMENT ON COLUMN demands.assigned_vehicle_id IS
  'Optional vehicle from vehicles table linked at assignment.';
COMMENT ON TABLE order_events IS
  'Audit log of fulfillment node advances and related order events.';
COMMENT ON TABLE order_fees IS
  'Offline fee archive: merchant submit + passenger confirm (no online payment).';
