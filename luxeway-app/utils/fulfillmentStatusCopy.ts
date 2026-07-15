/**
 * Passenger / merchant facing copy for fine-grained fulfillment nodes.
 * Shared by timeline UI, order detail headers, and timeline builders.
 */

import type { PassengerOrderStatus } from '@/types/order'

export type FulfillmentStatusCopy = {
  title: string
  subText: string
}

export const FULFILLMENT_STATUS_COPY: Record<PassengerOrderStatus, FulfillmentStatusCopy> = {
  PENDING_ASSIGN: {
    title: '等待司机接单',
    subText: '商家确认中，正在指派执行司机'
  },
  ASSIGNED: {
    title: '司机已接单',
    subText: '司机已指派，将按时前往上车点'
  },
  ON_THE_WAY: {
    title: '司机去接驾',
    subText: '司机已出发，正在前往上车点'
  },
  ARRIVED_PICKUP: {
    title: '司机已到达',
    subText: '请尽快上车'
  },
  WAITING_PASSENGER: {
    title: '司机等待中',
    subText: '司机正在上车点等待'
  },
  PASSENGER_BOARDED: {
    title: '行程进行中',
    subText: '乘客已上车，正在前往目的地'
  },
  ARRIVING_DESTINATION: {
    title: '即将到达',
    subText: '请确认随身物品'
  },
  ARRIVED_DESTINATION: {
    title: '已到达目的地',
    subText: '行程结束，等待费用确认'
  },
  PENDING_FEE_CONFIRM: {
    title: '待确认费用',
    subText: '请确认费用明细（线下结算）'
  },
  COMPLETED: {
    title: '已完成',
    subText: '感谢您使用悦途出行'
  },
  CANCELLED: {
    title: '已取消',
    subText: '如有疑问请联系客服'
  },
  ABNORMAL_PROCESSING: {
    title: '异常处理中',
    subText: '客服正在协助处理，请耐心等待'
  }
}

export function getFulfillmentStatusCopy(
  status: PassengerOrderStatus | string | null | undefined
): FulfillmentStatusCopy | null {
  if (!status) return null
  return FULFILLMENT_STATUS_COPY[status as PassengerOrderStatus] ?? null
}
