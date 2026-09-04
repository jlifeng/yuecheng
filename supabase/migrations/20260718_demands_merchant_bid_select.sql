-- Fix: merchants with an ACCEPTED bid on a demand must be able to see that demand,
-- even if accepted_provider_id was not written (historical data gap).
--
-- Current demands SELECT policies:
--   1) passenger_id = auth.uid()          → passenger sees own
--   2) accepted_provider_id = auth.uid()  → merchant sees won (only if field is set)
--   3) status = 'BIDDING'                 → anyone sees open demands
--
-- Gap: if accepted_provider_id is NULL (acceptBid failed to write it),
-- the merchant who has an ACCEPTED bid on that demand cannot see it.
-- This breaks fetchOngoingOrders (bids path returns bids but demands embed is null).

DROP POLICY IF EXISTS "商家可查看已报价的行程" ON demands;
CREATE POLICY "商家可查看已报价的行程"
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
