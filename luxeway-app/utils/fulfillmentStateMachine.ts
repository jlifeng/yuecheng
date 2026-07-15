/**
 * Fulfillment state machine (Approach B).
 *
 * Two layers:
 * - DemandStatus (coarse): BIDDING / ACCEPTED / IN_PROGRESS / COMPLETED / CANCELLED
 * - FulfillmentStatus (fine): node-level progress for assign → trip → fee confirm
 *
 * Coarse ← fine mapping:
 * | fulfillment_status                         | demands.status |
 * |--------------------------------------------|----------------|
 * | PENDING_ASSIGN, ASSIGNED                   | ACCEPTED       |
 * | ON_THE_WAY … ARRIVED_DESTINATION,
 *   PENDING_FEE_CONFIRM                        | IN_PROGRESS    |
 * | COMPLETED                                  | COMPLETED      |
 * | CANCELLED                                  | CANCELLED      |
 *
 * First ON_THE_WAY moves coarse status from ACCEPTED → IN_PROGRESS.
 * Passenger fee confirm moves both layers to COMPLETED.
 */

import type { DemandStatus, FulfillmentStatus } from '@/types/order'

/** Constant map of fulfillment status codes. */
export const FULFILLMENT_STATUS = {
  PENDING_ASSIGN: 'PENDING_ASSIGN',
  ASSIGNED: 'ASSIGNED',
  ON_THE_WAY: 'ON_THE_WAY',
  ARRIVED_PICKUP: 'ARRIVED_PICKUP',
  WAITING_PASSENGER: 'WAITING_PASSENGER',
  PASSENGER_BOARDED: 'PASSENGER_BOARDED',
  ARRIVING_DESTINATION: 'ARRIVING_DESTINATION',
  ARRIVED_DESTINATION: 'ARRIVED_DESTINATION',
  PENDING_FEE_CONFIRM: 'PENDING_FEE_CONFIRM',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  ABNORMAL_PROCESSING: 'ABNORMAL_PROCESSING'
} as const satisfies Record<string, FulfillmentStatus>

/** Ordered main path (optional WAITING / ARRIVING excluded). */
export const FULFILLMENT_MAIN_PATH: FulfillmentStatus[] = [
  FULFILLMENT_STATUS.PENDING_ASSIGN,
  FULFILLMENT_STATUS.ASSIGNED,
  FULFILLMENT_STATUS.ON_THE_WAY,
  FULFILLMENT_STATUS.ARRIVED_PICKUP,
  FULFILLMENT_STATUS.PASSENGER_BOARDED,
  FULFILLMENT_STATUS.ARRIVED_DESTINATION,
  FULFILLMENT_STATUS.PENDING_FEE_CONFIRM,
  FULFILLMENT_STATUS.COMPLETED
]

export type FulfillmentActionCode =
  | 'ASSIGN_DRIVER'
  | 'START_PICKUP'
  | 'ARRIVE_PICKUP'
  | 'START_WAITING'
  | 'BOARD_PASSENGER'
  | 'APPROACH_DESTINATION'
  | 'ARRIVE_DESTINATION'
  | 'SUBMIT_FEES'
  | 'CONFIRM_FEES'
  | 'CANCEL'

export interface FulfillmentAction {
  /** Target fulfillment status after the action. */
  to: FulfillmentStatus
  /** Stable action code for UI / analytics. */
  code: FulfillmentActionCode
  /** Short Uber-style label (zh). */
  label: string
  /** Whether this is the primary CTA for the current node. */
  primary?: boolean
}

/** Terminal fulfillment nodes (no forward progress). */
export const TERMINAL_FULFILLMENT_STATUSES: ReadonlySet<FulfillmentStatus> = new Set([
  FULFILLMENT_STATUS.COMPLETED,
  FULFILLMENT_STATUS.CANCELLED
])

/**
 * Allowed forward edges (excluding cancel).
 * CANCEL is handled separately via canCancel / canTransition.
 */
const FORWARD_TRANSITIONS: Readonly<Record<FulfillmentStatus, readonly FulfillmentStatus[]>> = {
  PENDING_ASSIGN: [FULFILLMENT_STATUS.ASSIGNED],
  ASSIGNED: [FULFILLMENT_STATUS.ON_THE_WAY],
  ON_THE_WAY: [FULFILLMENT_STATUS.ARRIVED_PICKUP],
  ARRIVED_PICKUP: [
    FULFILLMENT_STATUS.PASSENGER_BOARDED,
    FULFILLMENT_STATUS.WAITING_PASSENGER
  ],
  WAITING_PASSENGER: [FULFILLMENT_STATUS.PASSENGER_BOARDED],
  PASSENGER_BOARDED: [
    FULFILLMENT_STATUS.ARRIVED_DESTINATION,
    FULFILLMENT_STATUS.ARRIVING_DESTINATION
  ],
  ARRIVING_DESTINATION: [FULFILLMENT_STATUS.ARRIVED_DESTINATION],
  ARRIVED_DESTINATION: [FULFILLMENT_STATUS.PENDING_FEE_CONFIRM],
  PENDING_FEE_CONFIRM: [FULFILLMENT_STATUS.COMPLETED],
  COMPLETED: [],
  CANCELLED: [],
  // V1: abnormal is out of product scope; no automatic edges.
  ABNORMAL_PROCESSING: []
}

const ACTION_META: Partial<
  Record<FulfillmentStatus, { code: FulfillmentActionCode; label: string }>
> = {
  ASSIGNED: { code: 'ASSIGN_DRIVER', label: '指派司机' },
  ON_THE_WAY: { code: 'START_PICKUP', label: '去接驾' },
  ARRIVED_PICKUP: { code: 'ARRIVE_PICKUP', label: '到达上车点' },
  WAITING_PASSENGER: { code: 'START_WAITING', label: '开始等待' },
  PASSENGER_BOARDED: { code: 'BOARD_PASSENGER', label: '乘客已上车' },
  ARRIVING_DESTINATION: { code: 'APPROACH_DESTINATION', label: '即将到达' },
  ARRIVED_DESTINATION: { code: 'ARRIVE_DESTINATION', label: '到达目的地' },
  PENDING_FEE_CONFIRM: { code: 'SUBMIT_FEES', label: '提交费用' },
  COMPLETED: { code: 'CONFIRM_FEES', label: '确认费用' }
}

/**
 * Map fine fulfillment status → coarse demands.status.
 * Returns null when fulfillment is unset / not mappable (e.g. pre-accept).
 */
export function getDemandStatusForFulfillment(
  fulfillmentStatus: FulfillmentStatus | null | undefined
): DemandStatus | null {
  if (!fulfillmentStatus) return null

  switch (fulfillmentStatus) {
    case FULFILLMENT_STATUS.PENDING_ASSIGN:
    case FULFILLMENT_STATUS.ASSIGNED:
      return 'ACCEPTED'
    case FULFILLMENT_STATUS.ON_THE_WAY:
    case FULFILLMENT_STATUS.ARRIVED_PICKUP:
    case FULFILLMENT_STATUS.WAITING_PASSENGER:
    case FULFILLMENT_STATUS.PASSENGER_BOARDED:
    case FULFILLMENT_STATUS.ARRIVING_DESTINATION:
    case FULFILLMENT_STATUS.ARRIVED_DESTINATION:
    case FULFILLMENT_STATUS.PENDING_FEE_CONFIRM:
    case FULFILLMENT_STATUS.ABNORMAL_PROCESSING:
      return 'IN_PROGRESS'
    case FULFILLMENT_STATUS.COMPLETED:
      return 'COMPLETED'
    case FULFILLMENT_STATUS.CANCELLED:
      return 'CANCELLED'
    default:
      return null
  }
}

/**
 * Default fulfillment_status when only coarse status is known (history / backfill).
 */
export function defaultFulfillmentForDemandStatus(
  demandStatus: DemandStatus | string | null | undefined
): FulfillmentStatus | null {
  switch (demandStatus) {
    case 'ACCEPTED':
      return FULFILLMENT_STATUS.PENDING_ASSIGN
    case 'IN_PROGRESS':
      return FULFILLMENT_STATUS.PASSENGER_BOARDED
    case 'COMPLETED':
      return FULFILLMENT_STATUS.COMPLETED
    case 'CANCELLED':
      return FULFILLMENT_STATUS.CANCELLED
    case 'PENDING':
    case 'BIDDING':
    default:
      return null
  }
}

/**
 * Cancel is allowed only before fee confirmation (PRD: 费用确认前可取消).
 * Not allowed from PENDING_FEE_CONFIRM / COMPLETED / CANCELLED / ABNORMAL.
 */
export function canCancelFulfillment(
  from: FulfillmentStatus | null | undefined
): boolean {
  if (!from) return false
  if (TERMINAL_FULFILLMENT_STATUSES.has(from)) return false
  if (from === FULFILLMENT_STATUS.PENDING_FEE_CONFIRM) return false
  if (from === FULFILLMENT_STATUS.ABNORMAL_PROCESSING) return false
  return true
}

/**
 * Whether transition from → to is legal (forward edge or allowed cancel).
 */
export function canTransition(
  from: FulfillmentStatus | null | undefined,
  to: FulfillmentStatus | null | undefined
): boolean {
  if (!from || !to) return false
  if (from === to) return false

  if (to === FULFILLMENT_STATUS.CANCELLED) {
    return canCancelFulfillment(from)
  }

  const allowed = FORWARD_TRANSITIONS[from]
  return allowed?.includes(to) ?? false
}

/**
 * Next fulfillment statuses reachable in one step (forward only, no cancel).
 */
export function getNextFulfillmentStatuses(
  from: FulfillmentStatus | null | undefined
): FulfillmentStatus[] {
  if (!from) return []
  return [...(FORWARD_TRANSITIONS[from] ?? [])]
}

/**
 * Next actions (forward). Primary action is the main-path step when multiple exist.
 */
export function getNextActions(
  from: FulfillmentStatus | null | undefined
): FulfillmentAction[] {
  const next = getNextFulfillmentStatuses(from)
  if (next.length === 0) return []

  const primaryTarget = pickPrimaryTarget(from, next)

  return next.map((to) => {
    const meta = ACTION_META[to]
    if (!meta) {
      // All forward targets should be registered in ACTION_META; fail loud in dev.
      return {
        to,
        code: 'BOARD_PASSENGER' as FulfillmentActionCode,
        label: to,
        primary: to === primaryTarget
      }
    }
    return {
      to,
      code: meta.code,
      label: meta.label,
      primary: to === primaryTarget
    }
  })
}

/**
 * Single primary next action for merchant CTA (main path preferred).
 * Returns null when terminal / no forward edges.
 */
export function getPrimaryNextAction(
  from: FulfillmentStatus | null | undefined
): FulfillmentAction | null {
  const actions = getNextActions(from)
  if (actions.length === 0) return null
  return actions.find((a) => a.primary) ?? actions[0]
}

/**
 * Alias required by PRD naming: nextActions(from)
 */
export function nextActions(
  from: FulfillmentStatus | null | undefined
): FulfillmentAction[] {
  return getNextActions(from)
}

function pickPrimaryTarget(
  from: FulfillmentStatus | null | undefined,
  candidates: FulfillmentStatus[]
): FulfillmentStatus {
  // Prefer main-path continuation over optional waiting / approaching nodes.
  if (from === FULFILLMENT_STATUS.ARRIVED_PICKUP) {
    return FULFILLMENT_STATUS.PASSENGER_BOARDED
  }
  if (from === FULFILLMENT_STATUS.PASSENGER_BOARDED) {
    return FULFILLMENT_STATUS.ARRIVED_DESTINATION
  }
  return candidates[0]
}
