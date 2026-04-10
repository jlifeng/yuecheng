import { type PassengerDemandPayload } from '@/types/demand'
import {
  type PassengerOrderDetail,
  type PassengerTimelineItem,
  type PassengerFeeSummary
} from '@/types/order'
import { httpRequest } from './http'

export interface PassengerBid {
  id: string
  providerName: string
  price: number
  carModel: string
  seats: number
  rating: number
  carImage: string
}

const mockBids: PassengerBid[] = [
  {
    id: '1',
    providerName: '尊享出行车队',
    price: 800,
    carModel: '别克 GL8 陆尊',
    seats: 7,
    rating: 4.9,
    carImage: 'https://img.yzcdn.cn/vant/cat.jpeg'
  },
  {
    id: '2',
    providerName: '星际商旅',
    price: 1200,
    carModel: '奔驰 V-Class',
    seats: 7,
    rating: 5.0,
    carImage: 'https://img.yzcdn.cn/vant/cat.jpeg'
  },
  {
    id: '3',
    providerName: '老张包车',
    price: 650,
    carModel: '大通 G10',
    seats: 7,
    rating: 4.5,
    carImage: 'https://img.yzcdn.cn/vant/cat.jpeg'
  }
]

const createMockTimeline = (): PassengerTimelineItem[] => [
  {
    code: 'PENDING_ASSIGN',
    title: '等待司机接单',
    description: '系统正在匹配可用司机'
  },
  {
    code: 'ASSIGNED',
    title: '司机已接单',
    description: '司机正在赶往起点'
  },
  {
    code: 'ON_THE_WAY',
    title: '司机接近中',
    description: '司机即将到达上车点'
  },
  {
    code: 'ARRIVED_PICKUP',
    title: '司机已到达',
    description: '司机已在接客点等待'
  },
  {
    code: 'WAITING_PASSENGER',
    title: '司机等待中',
    description: '等待费用将在免费时长后开始'
  },
  {
    code: 'PASSENGER_BOARDED',
    title: '乘客已上车',
    description: '即将驶往目的地'
  },
  {
    code: 'ARRIVING_DESTINATION',
    title: '即将抵达',
    description: '目的地在前方，请确认行李'
  },
  {
    code: 'ARRIVED_DESTINATION',
    title: '已到达目的地',
    description: '结束行程，祝您愉快'
  }
]

const createMockFeeSummary = (): PassengerFeeSummary => ({
  baseFare: 450,
  waitingFee: 12,
  tollFee: 30,
  parkingFee: 8,
  otherFee: 6,
  totalAmount: 506
})

export const submitDemand = async (payload: PassengerDemandPayload) => {
  return httpRequest<{ demandId: string }>('/passenger/demand', {
    method: 'POST',
    body: payload,
    mockResponse: {
      demandId: `d-${Date.now()}`
    }
  })
}

export const fetchBidList = () => {
  return httpRequest<PassengerBid[]>('/passenger/bids', {
    mockResponse: mockBids
  })
}

export const fetchOrderDetail = (orderId: string) => {
  return httpRequest<PassengerOrderDetail>(`/passenger/orders/${orderId}`, {
    mockResponse: {
      id: orderId,
      status: 'PENDING_FEE_CONFIRM',
      driverName: '李师傅',
      driverPhone: '13800138000',
      carModel: '别克 GL8 黑色',
      plateNumber: '京A·88888',
      timeline: createMockTimeline(),
      feeSummary: createMockFeeSummary(),
      hasInvoice: true
    }
  })
}
