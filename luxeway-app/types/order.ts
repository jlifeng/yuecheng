export type DemandStatus =
  | 'PENDING'    // 待发布
  | 'BIDDING'    // 等待报价
  | 'ACCEPTED'   // 已确认（乘客选择了报价）
  | 'IN_PROGRESS' // 进行中
  | 'COMPLETED'  // 已完成
  | 'CANCELLED'  // 已取消

export interface PassengerTimelineItem {
  time?: string
  title: string
  desc?: string
  status: 'completed' | 'active' | 'pending'
}

export interface PassengerFeeSummary {
  baseFare: number
  tollFee: number
  parkingFee: number
  otherFee: number
  discount: number
  total: number
}

export interface PassengerOrderDetail {
  id: string
  status: string
  statusDesc?: string
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
  feeSummary?: PassengerFeeSummary
}
