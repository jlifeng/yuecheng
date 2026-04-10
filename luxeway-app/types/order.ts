export type PassengerOrderStatus =
  | 'PENDING_ASSIGN'
  | 'ASSIGNED'
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

export interface PassengerTimelineItem {
  code: PassengerOrderStatus
  title: string
  description: string
}

export interface PassengerFeeSummary {
  baseFare: number
  waitingFee: number
  tollFee: number
  parkingFee: number
  otherFee: number
  totalAmount: number
}

export interface PassengerOrderDetail {
  id: string
  status: PassengerOrderStatus
  driverName: string
  driverPhone: string
  carModel: string
  plateNumber: string
  timeline: PassengerTimelineItem[]
  feeSummary?: PassengerFeeSummary
  hasInvoice: boolean
}
