/**
 * Order / demand status types (Approach B, no driver assignment).
 *
 * Coarse lifecycle lives on `demands.status` (DemandStatus).
 * Fine-grained fulfillment lives on `demands.fulfillment_status` (FulfillmentStatus).
 *
 * Mapping (see utils/fulfillmentStateMachine.ts):
 * - PENDING_ASSIGN → ACCEPTED
 * - ON_THE_WAY … PENDING_FEE_CONFIRM → IN_PROGRESS
 * - COMPLETED → COMPLETED
 * - CANCELLED → CANCELLED
 */

/** Coarse demand lifecycle (lists / filters / existing APIs). */
export type DemandStatus =
  | 'PENDING' // 待发布
  | 'BIDDING' // 等待报价
  | 'ACCEPTED' // 已确认（乘客选择了报价，司机待出发）
  | 'IN_PROGRESS' // 进行中（去接驾～待费用确认）
  | 'COMPLETED' // 已完成
  | 'CANCELLED' // 已取消

/**
 * Fine-grained fulfillment node on demands.fulfillment_status.
 * Main path: PENDING_ASSIGN → ON_THE_WAY → ARRIVED_PICKUP
 *   → (WAITING_PASSENGER?) → PASSENGER_BOARDED → ARRIVED_DESTINATION
 *   → PENDING_FEE_CONFIRM → COMPLETED
 * Optional / extended: ARRIVING_DESTINATION, ABNORMAL_PROCESSING
 *
 * PENDING_ASSIGN means "driver assigned, waiting to start pickup" (not "waiting for assignment").
 * The bid creator IS the executing driver — no separate assignment step.
 */
export type FulfillmentStatus =
  | 'PENDING_ASSIGN'
  | 'ON_THE_WAY'
  | 'ARRIVED_PICKUP'
  | 'WAITING_PASSENGER'
  | 'PASSENGER_BOARDED'
  | 'ARRIVING_DESTINATION'
  | 'ARRIVED_DESTINATION'
  | 'PENDING_FEE_CONFIRM'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ABNORMAL_PROCESSING'

/**
 * Passenger-facing order status used by timeline UI.
 * Alias of FulfillmentStatus (Approach B fine-grained nodes).
 */
export type PassengerOrderStatus = FulfillmentStatus

export interface PassengerTimelineItem {
  /** Fine status code when available (preferred for fulfillment timeline). */
  code?: FulfillmentStatus | string
  time?: string
  title: string
  /** Prefer `desc`; `description` kept for legacy mock/timeline builders. */
  desc?: string
  description?: string
  status?: 'completed' | 'active' | 'pending'
}

/**
 * Passenger fee summary for UI.
 *
 * DB `order_fees` uses snake_case total_amount; UI historically used `total`.
 * Prefer reading via mapOrderFeeToSummary() when loading from Supabase.
 * - totalAmount: canonical total from order_fees.total_amount
 * - total: legacy alias (same meaning as totalAmount when both present)
 * - discount: UI-only legacy field (not stored on order_fees V1)
 */
export interface PassengerFeeSummary {
  baseFare: number
  waitingFee?: number
  tollFee: number
  parkingFee: number
  otherFee: number
  /** Legacy UI field; default 0 when mapping from order_fees. */
  discount?: number
  /** Legacy total field. */
  total?: number
  /** Canonical total aligned with order_fees.total_amount. */
  totalAmount?: number
}

/** order_events row (camelCase client shape). */
export interface OrderEvent {
  id: string
  demandId: string
  eventType: string
  actorId?: string | null
  note?: string | null
  createdAt: string
}

/** order_fees row (camelCase client shape). */
export interface OrderFee {
  id: string
  demandId: string
  baseFare: number
  waitingFee: number
  tollFee: number
  parkingFee: number
  otherFee: number
  /** Maps from order_fees.total_amount */
  totalAmount: number
  currency?: string
  submittedBy?: string | null
  submittedAt?: string | null
  confirmedAt?: string | null
  notes?: string | null
  createdAt?: string
  updatedAt?: string
}

/**
 * Map OrderFee (DB/client) → PassengerFeeSummary for existing UI.
 * total and totalAmount are both set for dual compatibility.
 */
export function mapOrderFeeToSummary(fee: OrderFee): PassengerFeeSummary {
  return {
    baseFare: fee.baseFare,
    waitingFee: fee.waitingFee,
    tollFee: fee.tollFee,
    parkingFee: fee.parkingFee,
    otherFee: fee.otherFee,
    discount: 0,
    total: fee.totalAmount,
    totalAmount: fee.totalAmount
  }
}

export interface PassengerOrderDetail {
  id: string
  /**
   * Display / timeline status.
   * Prefer fine-grained FulfillmentStatus when available;
   * may still be coarse DemandStatus on older payloads.
   */
  status: string
  statusDesc?: string
  /** Explicit fine-grained fulfillment node (Approach B). */
  fulfillmentStatus?: FulfillmentStatus | null
  assignedDriverId?: string | null
  assignedVehicleId?: string | null
  startAddress?: string
  endAddress?: string
  earliestDeparture?: string
  latestDeparture?: string
  passengerCount?: number
  requirements?: string
  price: number
  carModel: string
  carImage?: string
  message?: string
  providerName: string
  driverName: string
  driverPhone: string
  plateNumber: string
  hasInvoice: boolean
  timeline: PassengerTimelineItem[]
  events?: OrderEvent[]
  /** Canonical fee row when loaded from order_fees. */
  orderFee?: OrderFee | null
  /** UI fee summary (mapped from orderFee or built by service). */
  feeSummary?: PassengerFeeSummary
}
