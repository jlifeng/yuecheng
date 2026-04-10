export const DemandStatus = {
  PENDING_BID: 'PENDING_BID',
  ORDER_CREATED: 'ORDER_CREATED',
  CLOSED: 'CLOSED',
} as const

export type DemandStatus = (typeof DemandStatus)[keyof typeof DemandStatus]
