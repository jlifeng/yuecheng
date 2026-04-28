import { type PassengerDemandPayload } from '@/types/demand'
import {
  type PassengerOrderDetail,
  type PassengerTimelineItem,
  type PassengerFeeSummary
} from '@/types/order'
import { refreshAccessToken } from '@/services/wechatAuth'

const SUPABASE_URL = 'https://qcsmavxqjofrhrdwgkpt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjc21hdnhxam9mcmhyZHdna3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3OTU2OTUsImV4cCI6MjA5MTM3MTY5NX0.zM4mVvvZAylQIXZFrnzaSAy_MGqTvR3hrSWfSSP8xRQ'

export interface PassengerBid {
  id: string
  providerId: string
  merchantId: string
  providerName: string
  price: number
  carModel: string
  seats: number
  rating: number
  carImage: string
  message: string  // 报价说明
  orderCount: number  // 商家完成订单数
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

// 提交行程需求到 Supabase
export const submitDemand = async (payload: PassengerDemandPayload): Promise<{ demandId: string }> => {
  const accessToken = uni.getStorageSync('accessToken')
  const userProfile = uni.getStorageSync('userProfile')

  if (!accessToken || !userProfile?.id) {
    throw new Error('请先登录')
  }

  const demandData = {
    passenger_id: userProfile.id,
    type: payload.type || 'TRANSFER',
    start_address: payload.startAddress,
    end_address: payload.endAddress,
    earliest_departure: payload.earliestDepartureAt,
    latest_departure: payload.latestDepartureAt,
    passenger_count: payload.passengerCount || 1,
    requirements: payload.requirements || null,
    status: 'BIDDING'
  }

  const res = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/demands`,
    method: 'POST',
    data: demandData,
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  })

  if (res.statusCode !== 201) {
    throw new Error('发布失败')
  }

  const inserted = (res.data as any[])[0]
  return { demandId: inserted.id }
}

// 获取用户最新需求
export const fetchMyLatestDemand = async (): Promise<any | null> => {
  const accessToken = uni.getStorageSync('accessToken')
  const userProfile = uni.getStorageSync('userProfile')

  if (!accessToken || !userProfile?.id) {
    return null
  }

  const res = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/demands?passenger_id=eq.${userProfile.id}&select=*&order=created_at.desc&limit=1`,
    method: 'GET',
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (res.statusCode === 200 && res.data && (res.data as any[]).length > 0) {
    return (res.data as any[])[0]
  }
  return null
}

// 获取用户所有需求（行程列表）
export const fetchMyDemands = async (): Promise<any[]> => {
  let accessToken = uni.getStorageSync('accessToken')
  const refreshToken = uni.getStorageSync('refreshToken')
  const userProfile = uni.getStorageSync('userProfile')

  console.log('=== fetchMyDemands 调试信息 ===')
  console.log('accessToken:', accessToken ? '存在(长度:' + accessToken.length + ')' : '不存在')
  console.log('refreshToken:', refreshToken ? '存在' : '不存在')
  console.log('userProfile:', JSON.stringify(userProfile))

  // 如果没有 accessToken 但有 refreshToken，尝试刷新
  if (!accessToken && refreshToken) {
    console.log('accessToken 缺失，尝试用 refreshToken 刷新...')
    const newToken = await refreshAccessToken()
    if (newToken) {
      accessToken = newToken
      console.log('Token 刷新成功')
    } else {
      console.log('Token 刷新失败')
    }
  }

  if (!accessToken || !userProfile?.id) {
    console.log('fetchMyDemands - 缺少有效 token 或 userProfile.id，返回空数组')
    // 提示用户重新登录
    uni.showToast({ title: '请重新登录', icon: 'none' })
    return []
  }

  console.log('查询 passenger_id:', userProfile.id)

  const doRequest = async (token: string) => {
    return await uni.request({
      url: `${SUPABASE_URL}/rest/v1/demands?select=*&passenger_id=eq.${userProfile.id}&order=created_at.desc`,
      method: 'GET',
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`
      }
    })
  }

  try {
    let res = await doRequest(accessToken)

    // 如果 token 过期，尝试刷新
    if (res.statusCode === 401) {
      console.log('Token 过期，尝试刷新...')
      const newToken = await refreshAccessToken()
      if (newToken) {
        accessToken = newToken
        res = await doRequest(accessToken)
      } else {
        // 刷新失败，清除登录状态，提示重新登录
        console.log('Token 刷新失败，需要重新登录')
        uni.removeStorageSync('accessToken')
        uni.removeStorageSync('refreshToken')
        uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
        return []
      }
    }

    console.log('fetchMyDemands - statusCode:', res.statusCode, 'data:', JSON.stringify(res.data))

    if (res.statusCode === 200 && res.data) {
      return res.data as any[]
    }
    return []
  } catch (e) {
    console.error('fetchMyDemands 请求失败:', e)
    return []
  }
}

// 获取单个行程详情
export const fetchDemandById = async (demandId: string): Promise<any> => {
  const accessToken = uni.getStorageSync('accessToken')

  if (!accessToken) {
    throw new Error('请先登录')
  }

  const res = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/demands?id=eq.${demandId}&select=*`,
    method: 'GET',
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (res.statusCode === 200 && res.data && (res.data as any[]).length > 0) {
    return (res.data as any[])[0]
  }
  throw new Error('行程不存在')
}

// 获取报价列表（含商家信息）
export const fetchBidList = async (demandId?: string): Promise<PassengerBid[]> => {
  const accessToken = uni.getStorageSync('accessToken')

  if (!accessToken) {
    return mockBids // 未登录时返回 mock 数据
  }

  // 如果没有指定需求ID，获取最新需求
  let targetDemandId = demandId
  if (!targetDemandId) {
    const latestDemand = await fetchMyLatestDemand()
    if (!latestDemand) {
      return mockBids // 暂无需求时返回 mock 数据演示
    }
    targetDemandId = latestDemand.id
  }

  // 查询报价，关联商家信息
  const res = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/bids?demand_id=eq.${targetDemandId}&select=*,merchants(name,rating_avg,order_count)`,
    method: 'GET',
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (res.statusCode !== 200 || !res.data) {
    return mockBids
  }

  const bids = res.data as any[]
  if (bids.length === 0) {
    return mockBids // 暂无报价时返回 mock 数据演示
  }

  return bids.map(bid => ({
    id: bid.id,
    providerId: bid.provider_id,
    merchantId: bid.merchant_id,
    providerName: bid.merchants?.name || '商家',
    price: Number(bid.price),
    carModel: bid.car_model || '商务车',
    seats: 7,
    rating: bid.merchants?.rating_avg || 4.8,
    carImage: bid.car_image || '',
    message: bid.message || '',
    orderCount: bid.merchants?.order_count || 0
  }))
}

// 获取单个报价详情（含商家和车辆完整信息）
export const fetchBidDetail = async (bidId: string): Promise<any> => {
  const accessToken = uni.getStorageSync('accessToken')

  if (!accessToken) {
    throw new Error('请先登录')
  }

  const res = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/bids?id=eq.${bidId}&select=*,merchants(id,name,contact_phone,rating_avg,order_count,review_status)`,
    method: 'GET',
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (res.statusCode !== 200 || !res.data || (res.data as any[]).length === 0) {
    throw new Error('获取报价详情失败')
  }

  return (res.data as any[])[0]
}

// 接受报价，创建订单
export const acceptBid = async (bidId: string): Promise<{ orderId: string; demandId: string }> => {
  const accessToken = uni.getStorageSync('accessToken')

  if (!accessToken) {
    throw new Error('请先登录')
  }

  console.log('acceptBid - 开始接受报价:', bidId)

  // 1. 先查询报价信息，获取 demand_id
  const bidRes = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/bids?id=eq.${bidId}&select=demand_id,provider_id,merchant_id,price`,
    method: 'GET',
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`
    }
  })

  console.log('acceptBid - 报价查询结果:', bidRes.statusCode, bidRes.data)

  if (bidRes.statusCode !== 200 || !(bidRes.data as any[])?.length) {
    throw new Error('报价信息不存在')
  }

  const bidInfo = (bidRes.data as any[])[0]
  const demandId = bidInfo.demand_id

  if (!demandId) {
    throw new Error('报价未关联需求')
  }

  // 2. 更新报价状态为 ACCEPTED
  const updateBidRes = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/bids?id=eq.${bidId}`,
    method: 'PATCH',
    data: { status: 'ACCEPTED' },
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    }
  })

  console.log('acceptBid - 更新报价状态:', updateBidRes.statusCode)

  if (updateBidRes.statusCode !== 204) {
    throw new Error('更新报价状态失败')
  }

  // 3. 更新需求状态为 ACCEPTED
  const updateDemandRes = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/demands?id=eq.${demandId}`,
    method: 'PATCH',
    data: { status: 'ACCEPTED' },
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    }
  })

  console.log('acceptBid - 更新需求状态:', updateDemandRes.statusCode)

  if (updateDemandRes.statusCode !== 204) {
    // 回滚：尝试恢复报价状态（可选）
    console.error('更新需求状态失败，数据可能不一致')
    throw new Error('更新需求状态失败')
  }

  console.log('acceptBid - 订单创建成功, demandId:', demandId)

  return { orderId: demandId, demandId }
}

export const fetchOrderDetail = async (demandId: string): Promise<PassengerOrderDetail> => {
  const accessToken = uni.getStorageSync('accessToken')

  if (!accessToken) {
    throw new Error('请先登录')
  }

  console.log('fetchOrderDetail - 查询订单详情:', demandId)

  // 查询需求信息 + 已接受的报价信息
  const res = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/demands?id=eq.${demandId}&select=*`,
    method: 'GET',
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`
    }
  })

  console.log('fetchOrderDetail - 需求查询结果:', res.statusCode, res.data)

  if (res.statusCode !== 200 || !(res.data as any[])?.length) {
    throw new Error('订单不存在')
  }

  const demand = (res.data as any[])[0]

  // 查询已接受的报价
  const bidRes = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/bids?demand_id=eq.${demandId}&status=eq.ACCEPTED&select=*`,
    method: 'GET',
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`
    }
  })

  console.log('fetchOrderDetail - 报价查询结果:', bidRes.statusCode, bidRes.data)

  const bid = (bidRes.data as any[])?.[0]

  // 查询商家信息
  let merchantInfo: any = null
  if (bid?.merchant_id) {
    const merchantRes = await uni.request({
      url: `${SUPABASE_URL}/rest/v1/merchants?id=eq.${bid.merchant_id}&select=company_name,contact_name,contact_phone`,
      method: 'GET',
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`
      }
    })
    merchantInfo = (merchantRes.data as any[])?.[0]
    console.log('fetchOrderDetail - 商家信息:', merchantInfo)
  }

  // 构建订单详情
  const statusMap: Record<string, string> = {
    'ACCEPTED': '已确认',
    'IN_PROGRESS': '进行中',
    'COMPLETED': '已完成',
    'CANCELLED': '已取消'
  }

  return {
    id: demand.id,
    status: demand.status,
    statusDesc: statusMap[demand.status] || demand.status,
    startAddress: demand.start_address,
    endAddress: demand.end_address,
    earliestDeparture: demand.earliest_departure,
    latestDeparture: demand.latest_departure,
    passengerCount: demand.passenger_count || 1,
    requirements: demand.requirements,
    price: bid?.price || 0,
    carModel: bid?.car_model || '',
    carImage: bid?.car_image || '',
    message: bid?.message || '',
    providerName: merchantInfo?.company_name || '商家',
    driverName: merchantInfo?.contact_name || '司机',
    driverPhone: merchantInfo?.contact_phone || '',
    plateNumber: '', // 需要从车辆表查询
    hasInvoice: false,
    timeline: createOrderTimeline(demand.status, demand.earliest_departure),
    feeSummary: {
      baseFare: bid?.price || 0,
      tollFee: 0,
      parkingFee: 0,
      otherFee: 0,
      discount: 0,
      total: bid?.price || 0
    }
  } as PassengerOrderDetail
}

// 创建订单时间线
const createOrderTimeline = (status: string, departureTime: string): PassengerTimelineItem[] => {
  const timeline: PassengerTimelineItem[] = []

  // 根据状态生成时间线
  timeline.push({
    time: '',
    title: '行程已发布',
    desc: '等待商家报价',
    status: 'completed'
  })

  if (status === 'ACCEPTED' || status === 'IN_PROGRESS' || status === 'COMPLETED') {
    timeline.push({
      time: '',
      title: '报价已确认',
      desc: '等待司机出发',
      status: status === 'ACCEPTED' ? 'active' : 'completed'
    })
  }

  if (status === 'IN_PROGRESS' || status === 'COMPLETED') {
    timeline.push({
      time: '',
      title: '司机已接单',
      desc: '正在前往目的地',
      status: status === 'IN_PROGRESS' ? 'active' : 'completed'
    })
  }

  if (status === 'COMPLETED') {
    timeline.push({
      time: '',
      title: '行程完成',
      desc: '感谢您的使用',
      status: 'completed'
    })
  }

  return timeline
}

// 取消订单
export const cancelOrder = async (demandId: string, reason: string): Promise<void> => {
  const accessToken = uni.getStorageSync('accessToken')

  if (!accessToken) {
    throw new Error('请先登录')
  }

  console.log('cancelOrder - 取消订单:', demandId, '原因:', reason)

  // 更新需求状态为 CANCELLED
  const res = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/demands?id=eq.${demandId}`,
    method: 'PATCH',
    data: {
      status: 'CANCELLED',
      notes: `取消原因: ${reason}`
    },
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    }
  })

  console.log('cancelOrder - 响应:', res.statusCode)

  if (res.statusCode !== 204) {
    throw new Error('取消订单失败')
  }
}

// 提交评价
export const submitReview = async (
  demandId: string,
  merchantId: string,
  rating: number,
  tags: string[],
  comment?: string
): Promise<void> => {
  const accessToken = uni.getStorageSync('accessToken')
  const userProfile = uni.getStorageSync('userProfile')

  if (!accessToken || !userProfile?.id) {
    throw new Error('请先登录')
  }

  console.log('submitReview - 提交评价:', demandId, '评分:', rating)

  // 插入评价
  const res = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/reviews`,
    method: 'POST',
    data: {
      demand_id: demandId,
      passenger_id: userProfile.id,
      merchant_id: merchantId,
      rating,
      tags,
      comment: comment || null
    },
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    }
  })

  console.log('submitReview - 响应:', res.statusCode)

  if (res.statusCode !== 201) {
    throw new Error('提交评价失败')
  }

  // 更新商家平均评分
  await updateMerchantRating(merchantId)
}

// 更新商家平均评分
const updateMerchantRating = async (merchantId: string) => {
  const accessToken = uni.getStorageSync('accessToken')

  try {
    // 查询商家所有评价的平均分
    const res = await uni.request({
      url: `${SUPABASE_URL}/rest/v1/reviews?merchant_id=eq.${merchantId}&select=rating`,
      method: 'GET',
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (res.statusCode === 200 && res.data) {
      const ratings = (res.data as any[]).map(r => r.rating)
      const avgRating = ratings.length > 0
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : 5.0

      // 更新商家评分
      await uni.request({
        url: `${SUPABASE_URL}/rest/v1/merchants?id=eq.${merchantId}`,
        method: 'PATCH',
        data: {
          rating_avg: Math.round(avgRating * 100) / 100,
          rating_count: ratings.length
        },
        header: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        }
      })

      console.log('商家评分已更新:', avgRating, '评价数:', ratings.length)
    }
  } catch (e) {
    console.error('更新商家评分失败:', e)
  }
}

// 检查订单是否已评价
export const checkReviewExists = async (demandId: string): Promise<boolean> => {
  const accessToken = uni.getStorageSync('accessToken')

  if (!accessToken) return false

  const res = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/reviews?demand_id=eq.${demandId}&select=id`,
    method: 'GET',
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`
    }
  })

  return res.statusCode === 200 && (res.data as any[])?.length > 0
}

// 获取乘客历史订单列表（支持分页）
export const fetchMyOrders = async (
  page: number = 1,
  pageSize: number = 20
): Promise<{ data: any[]; hasMore: boolean }> => {
  const accessToken = uni.getStorageSync('accessToken')
  const userProfile = uni.getStorageSync('userProfile')

  if (!accessToken || !userProfile?.id) {
    console.log('fetchMyOrders - 未登录或无用户ID')
    return { data: [], hasMore: false }
  }

  const from = (page - 1) * pageSize

  console.log('fetchMyOrders - 查询用户订单:', userProfile.id, 'page:', page)

  // 查询用户所有订单（包含进行中和历史订单）
  const res = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/demands?passenger_id=eq.${userProfile.id}&select=*&order=created_at.desc&offset=${from}&limit=${pageSize}`,
    method: 'GET',
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`
    }
  })

  console.log('fetchMyOrders - 响应:', res.statusCode, res.data)

  if (res.statusCode === 200 && res.data) {
    // 过滤出有意义的订单（非 PENDING/BIDDING 的，或者 BIDDING 但有报价的）
    const demands = res.data as any[]

    // 对于每个订单，查询是否有已接受的报价，获取价格信息
    const ordersWithPrice = await Promise.all(
      demands.map(async (demand) => {
        if (demand.status === 'COMPLETED' || demand.status === 'ACCEPTED' || demand.status === 'IN_PROGRESS') {
          // 查询已接受的报价
          const bidRes = await uni.request({
            url: `${SUPABASE_URL}/rest/v1/bids?demand_id=eq.${demand.id}&status=eq.ACCEPTED&select=price`,
            method: 'GET',
            header: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`
            }
          })
          const bid = (bidRes.data as any[])?.[0]
          return {
            ...demand,
            price: bid?.price || 0
          }
        }
        return demand
      })
    )

    return {
      data: ordersWithPrice,
      hasMore: demands.length === pageSize
    }
  }

  return { data: [], hasMore: false }
}
