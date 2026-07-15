# Fulfillment State Machine & Fee Archive

> The V1 order lifecycle after a bid is accepted (Approach B). Read before touching anything in the assign → trip → fee flow.

---

## Why two status layers

After bid acceptance the order needs both **list/filter visibility** (coarse) and **fine-grained driver progress** (fine). We model these as two columns, not one exploding enum.

| Layer | Column | Values | Used by |
|-------|--------|--------|---------|
| Coarse | `demands.status` | BIDDING / ACCEPTED / IN_PROGRESS / COMPLETED / CANCELLED | order lists, workbench tabs, existing filters |
| Fine | `demands.fulfillment_status` | PENDING_ASSIGN → ASSIGNED → ON_THE_WAY → ARRIVED_PICKUP → (WAITING_PASSENGER?) → PASSENGER_BOARDED → (ARRIVING_DESTINATION?) → ARRIVED_DESTINATION → PENDING_FEE_CONFIRM → COMPLETED | order detail, timeline, primary CTA |

### Coarse ← fine mapping (`getDemandStatusForFulfillment`)

- `PENDING_ASSIGN`, `ASSIGNED` → `ACCEPTED` (assignment does NOT start the trip)
- `ON_THE_WAY` … `ARRIVED_DESTINATION`, `PENDING_FEE_CONFIRM` → `IN_PROGRESS`
- `COMPLETED` → `COMPLETED`
- `CANCELLED` → `CANCELLED`

Key rule: **the first `ON_THE_WAY` is what flips coarse `ACCEPTED → IN_PROGRESS`.** Assignment alone keeps the order as `ACCEPTED`.

## Transitions

- Forward edges live in `fulfillmentStateMachine.ts` (`FORWARD_TRANSITIONS`). Enforce with `canTransition(from, to)` before any PATCH.
- `CANCEL` is allowed only before `PENDING_FEE_CONFIRM` (`canCancelFulfillment`); once fees are submitted, the order must be confirmed, not cancelled.
- `PENDING_FEE_CONFIRM` and `COMPLETED` are reached only through dedicated APIs (`submitOrderFees` / `confirmOrderFees`), **never** via the generic `advanceFulfillment`. This prevents skipping the fee record.

## Assignment

- After `acceptBid`: write `fulfillment_status = PENDING_ASSIGN` together with `status = ACCEPTED` (one PATCH).
- Assignment: `assigned_driver_id` (+ optional `assigned_vehicle_id`), `fulfillment_status = ASSIGNED`, coarse stays `ACCEPTED`. Must verify the driver/vehicle belong to the same merchant as the accepted bid.
- Passenger detail must show the **real assigned driver**; if none assigned, show "待指派" — never fall back to the merchant contact as if it were the driver.

## Fee archive (offline settlement)

- `order_fees` is one row per demand (`UNIQUE(demand_id)`), written via upsert when the merchant submits fees from `ARRIVED_DESTINATION`.
- Submitting fees advances `fulfillment_status → PENDING_FEE_CONFIRM` (coarse stays `IN_PROGRESS`).
- Passenger confirm writes `confirmed_at`, then sets **both** layers to `COMPLETED`.
- Fees are for the record only — no payment API, no settlement. Display a confirm action, not a pay action.

## Audit log

- Every transition writes an `order_events` row (`demand_id, event_type, actor_id, note, created_at`).
- The passenger timeline is built from `order_events` ordered by `created_at`, with the main-path nodes marked completed/active/pending. Optional nodes (`WAITING_PASSENGER`, `ARRIVING_DESTINATION`) map onto the nearest main-path node so the timeline doesn't collapse to all-pending.
- A failed event insert must NOT roll back the transition it audits (log + continue).

## Pitfalls

- Writing a fine node to `demands.status` or vice versa — always go through the mapper.
- Letting `advanceFulfillment` reach `COMPLETED` directly — fees must be recorded first.
- Showing fee data from the old in-service mock summary instead of the `order_fees` row — use `mapOrderFeeToSummary`.
- Forgetting RLS on `order_events` / `order_fees` / the new `demands` columns — see database-guidelines.
