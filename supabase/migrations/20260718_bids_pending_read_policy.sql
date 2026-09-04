-- Allow authenticated users to read PENDING bids (demand_id only for filtering).
-- This is needed for the exclusive-bid feature: the workbench must know which
-- demands already have a PENDING bid so it can hide them from other drivers.
--
-- The policy only exposes PENDING-status bids; ACCEPTED/REJECTED bids remain
-- visible only to the bid owner and the passenger who owns the demand.

-- 1) Add a permissive SELECT policy for PENDING bids
DROP POLICY IF EXISTS "认证用户可查看待处理报价" ON bids;
CREATE POLICY "认证用户可查看待处理报价"
  ON bids FOR SELECT
  TO public
  USING (
    bids.status = 'PENDING'
    AND auth.uid() IS NOT NULL
  );
