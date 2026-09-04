import { type PassengerDemandPayload } from '@/types/demand'
import {
  type PassengerOrderDetail,
  type PassengerTimelineItem,
  type OrderEvent,
  type OrderFee,
  type FulfillmentStatus,
  mapOrderFeeToSummary
} from '@/types/order'
import { refreshAccessToken } from '@/services/wechatAuth'
import {
  FULFILLMENT_MAIN_PATH,
  FULFILLMENT_STATUS,
  canCancelFulfillment,
  canTransition,
  defaultFulfillmentForDemandStatus,
  getDemandStatusForFulfillment
} from '@/utils/fulfillmentStateMachine'
import { getFulfillmentStatusCopy } from '@/utils/fulfillmentStatusCopy'

const SUPABASE_URL = 'https://qcsmavxqjofrhrdwgkpt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjc21hdnhxam9mcmhyZHdna3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3OTU2OTUsImV4cCI6MjA5MTM3MTY5NX0.zM4mVvvZAylQIXZFrnzaSAy_MGqTvR3hrSWfSSP8xRQ'

// JWT 过期处理：清除登录状态并跳转到登录页
const handleJwtExpired = () => {
  console.log('JWT 已过期，跳转到登录页')
  uni.removeStorageSync('accessToken')
  uni.removeStorageSync('refreshToken')
  uni.removeStorageSync('userProfile')
  uni.removeStorageSync('userRoles')
  uni.removeStorageSync('userRole')
  uni.removeStorageSync('userPermissions')
  uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
  setTimeout(() => {
    uni.reLaunch({ url: '/pages/login/index' })
  }, 1500)
}

// 检查响应是否为 JWT 过期
const isJwtExpired = (statusCode: number, data: any): boolean => {
  return statusCode === 401 && data?.code === 'PGRST303'
}

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

    // JWT 过期处理
    if (isJwtExpired(res.statusCode, res.data)) {
      handleJwtExpired()
      return []
    }

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
    console.log('fetchBidList: 未登录，返回空数组')
    return []
  }

  // 如果没有指定需求ID，获取最新需求
  let targetDemandId = demandId
  if (!targetDemandId) {
    const latestDemand = await fetchMyLatestDemand()
    if (!latestDemand) {
      console.log('fetchBidList: 暂无需求，返回空数组')
      return []
    }
    targetDemandId = latestDemand.id
  }

  console.log('fetchBidList: 查询 demandId =', targetDemandId)

  // 查询报价，关联商家信息（merchants 表使用 company_name 而不是 name）
  const res = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/bids?demand_id=eq.${targetDemandId}&select=*,merchants(company_name,contact_name,rating_avg,order_count)`,
    method: 'GET',
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`
    }
  })

  console.log('fetchBidList: API 响应 statusCode =', res.statusCode, 'data =', res.data)

  // JWT 过期处理
  if (isJwtExpired(res.statusCode, res.data)) {
    handleJwtExpired()
    return []
  }

  if (res.statusCode !== 200 || !res.data) {
    console.log('fetchBidList: API 请求失败，返回空数组')
    return []
  }

  const bids = res.data as any[]
  if (bids.length === 0) {
    console.log('fetchBidList: 暂无报价，返回空数组')
    return []
  }

  console.log('fetchBidList: 找到', bids.length, '个报价')
  return bids.map(bid => ({
    id: bid.id,
    providerId: bid.provider_id,
    merchantId: bid.merchant_id,
    providerName: bid.merchants?.company_name || bid.merchants?.contact_name || '商家',
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
    url: `${SUPABASE_URL}/rest/v1/bids?id=eq.${bidId}&select=*,merchants(id,company_name,contact_name,contact_phone,rating_avg,order_count,review_status)`,
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

  // 3. 查找报价人对应的 driver 记录（报价人 = 执行司机，无需指派）
  //    drivers.user_id = bidInfo.provider_id，该司机属于 bidInfo.merchant_id 车队
  let assignedDriverId: string | null = null
  try {
    const driverRes = await uni.request({
      url: `${SUPABASE_URL}/rest/v1/drivers?user_id=eq.${bidInfo.provider_id}&merchant_id=eq.${bidInfo.merchant_id}&status=eq.active&select=id`,
      method: 'GET',
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`
      }
    })
    if (driverRes.statusCode === 200 && (driverRes.data as any[])?.length) {
      assignedDriverId = (driverRes.data as any[])[0].id
    }
  } catch (e) {
    console.error('acceptBid - 查询司机记录失败:', e)
    // 非致命：即使查不到 driver 记录，订单仍可继续（司机后续仍可操作）
  }

  // 4. 更新需求状态为 ACCEPTED，写入履约待出发 + 执行司机
  //    PENDING_ASSIGN 含义从"待指派"变为"待出发"——报价人即为执行司机。
  //    accepted_provider_id 记录中标商家，用于 RLS 归属判定（避免 demands<->bids 递归）。
  const updateData: Record<string, any> = {
    status: 'ACCEPTED',
    fulfillment_status: 'PENDING_ASSIGN',
    accepted_provider_id: bidInfo.provider_id
  }
  if (assignedDriverId) {
    updateData.assigned_driver_id = assignedDriverId
  }

  const updateDemandRes = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/demands?id=eq.${demandId}`,
    method: 'PATCH',
    data: updateData,
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

/**
 * 拒绝报价：乘客拒绝某个 PENDING 报价。
 * 拒绝后该报价 status=REJECTED，其他司机可对该 demand 重新报价（独占报价机制）。
 */
export const rejectBid = async (bidId: string): Promise<void> => {
  const accessToken = uni.getStorageSync('accessToken')

  if (!accessToken) {
    throw new Error('请先登录')
  }

  // 1. 查询报价信息，确认是 PENDING 状态
  const bidRes = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/bids?id=eq.${bidId}&select=id,status`,
    method: 'GET',
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (bidRes.statusCode !== 200 || !(bidRes.data as any[])?.length) {
    throw new Error('报价不存在')
  }

  const bidInfo = (bidRes.data as any[])[0]
  if (bidInfo.status !== 'PENDING') {
    throw new Error('只能拒绝待处理的报价')
  }

  // 2. 更新报价状态为 REJECTED
  const updateRes = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/bids?id=eq.${bidId}`,
    method: 'PATCH',
    data: { status: 'REJECTED' },
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    }
  })

  if (updateRes.statusCode !== 204) {
    throw new Error('拒绝报价失败')
  }
}


/** Map Supabase order_fees snake_case row -> OrderFee client shape. */
function mapOrderFeeRow(row: any): OrderFee {
  return {
    id: row.id,
    demandId: row.demand_id,
    baseFare: Number(row.base_fare) || 0,
    waitingFee: Number(row.waiting_fee) || 0,
    tollFee: Number(row.toll_fee) || 0,
    parkingFee: Number(row.parking_fee) || 0,
    otherFee: Number(row.other_fee) || 0,
    totalAmount: Number(row.total_amount) || 0,
    currency: row.currency || 'CNY',
    submittedBy: row.submitted_by ?? null,
    submittedAt: row.submitted_at ?? null,
    confirmedAt: row.confirmed_at ?? null,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export const fetchOrderDetail = async (demandId: string): Promise<PassengerOrderDetail> => {
  const accessToken = uni.getStorageSync('accessToken')

  if (!accessToken) {
    throw new Error('请先登录')
  }

  console.log('fetchOrderDetail - 查询订单详情:', demandId)

  // 查询需求信息（含履约与指派字段）
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

  // 查询商家信息（指派前回退联系人）
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

  // 查询已指派司机
  let assignedDriver: { name?: string; phone?: string } | null = null
  if (demand.assigned_driver_id) {
    const driverRes = await uni.request({
      url: `${SUPABASE_URL}/rest/v1/drivers?id=eq.${demand.assigned_driver_id}&select=id,name,phone`,
      method: 'GET',
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`
      }
    })
    assignedDriver = (driverRes.data as any[])?.[0] || null
    console.log('fetchOrderDetail - 指派司机:', assignedDriver)
  }

  // 查询已指派车辆
  let assignedVehicle: { plate_number?: string; model?: string } | null = null
  if (demand.assigned_vehicle_id) {
    const vehicleRes = await uni.request({
      url: `${SUPABASE_URL}/rest/v1/vehicles?id=eq.${demand.assigned_vehicle_id}&select=id,plate_number,model`,
      method: 'GET',
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`
      }
    })
    assignedVehicle = (vehicleRes.data as any[])?.[0] || null
    console.log('fetchOrderDetail - 指派车辆:', assignedVehicle)
  }

  // 查询履约事件（按时间升序）
  const events: OrderEvent[] = []
  try {
    const eventsRes = await uni.request({
      url: `${SUPABASE_URL}/rest/v1/order_events?demand_id=eq.${demandId}&select=id,demand_id,event_type,actor_id,note,created_at&order=created_at.asc`,
      method: 'GET',
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (isJwtExpired(eventsRes.statusCode, eventsRes.data)) {
      handleJwtExpired()
      throw new Error('登录已过期，请重新登录')
    }

    if (eventsRes.statusCode === 200 && Array.isArray(eventsRes.data)) {
      for (const row of eventsRes.data as any[]) {
        events.push({
          id: row.id,
          demandId: row.demand_id,
          eventType: row.event_type,
          actorId: row.actor_id,
          note: row.note,
          createdAt: row.created_at
        })
      }
    }
  } catch (e) {
    console.error('fetchOrderDetail - 加载 order_events 失败', e)
  }

  const fulfillmentStatus: FulfillmentStatus | null =
    (demand.fulfillment_status as FulfillmentStatus | null) ||
    defaultFulfillmentForDemandStatus(demand.status)

  // 仅展示已指派的真实司机；未指派不回退为商家联系人，避免误导乘客
  const isDriverAssigned = Boolean(demand.assigned_driver_id && assignedDriver)
  const driverName = isDriverAssigned
    ? (assignedDriver?.name || '司机')
    : (demand.assigned_driver_id ? '司机' : '待指派')
  const driverPhone = isDriverAssigned ? (assignedDriver?.phone || '') : ''
  const plateNumber = assignedVehicle?.plate_number || ''
  const carModel = assignedVehicle?.model || bid?.car_model || ''

  const statusDesc = resolveStatusDesc(demand.status, fulfillmentStatus, isDriverAssigned)
  const timeline = buildFulfillmentTimeline(fulfillmentStatus, events)

  // Load real fee row from order_fees (no mock)
  let orderFee: OrderFee | null = null
  try {
    const feeRes = await uni.request({
      url: `${SUPABASE_URL}/rest/v1/order_fees?demand_id=eq.${demandId}&select=*&limit=1`,
      method: 'GET',
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`
      }
    })
    if (feeRes.statusCode === 200 && (feeRes.data as any[])?.length) {
      orderFee = mapOrderFeeRow((feeRes.data as any[])[0])
    }
  } catch (e) {
    console.error('fetchOrderDetail - 加载 order_fees 失败', e)
  }

  return {
    id: demand.id,
    // Prefer fine-grained status for timeline UI; keep coarse in statusDesc context via mapping helpers
    status: fulfillmentStatus || demand.status,
    statusDesc,
    fulfillmentStatus,
    assignedDriverId: demand.assigned_driver_id || null,
    assignedVehicleId: demand.assigned_vehicle_id || null,
    startAddress: demand.start_address,
    endAddress: demand.end_address,
    earliestDeparture: demand.earliest_departure,
    latestDeparture: demand.latest_departure,
    passengerCount: demand.passenger_count || 1,
    requirements: demand.requirements,
    price: bid?.price || 0,
    carModel,
    carImage: bid?.car_image || '',
    message: bid?.message || '',
    providerName: merchantInfo?.company_name || '商家',
    driverName,
    driverPhone,
    plateNumber,
    hasInvoice: false,
    timeline,
    events,
    orderFee,
    feeSummary: orderFee ? mapOrderFeeToSummary(orderFee) : undefined
  } as PassengerOrderDetail
}

const COARSE_STATUS_DESC: Record<string, string> = {
  ACCEPTED: '已确认',
  IN_PROGRESS: '进行中',
  COMPLETED: '已完成',
  CANCELLED: '已取消'
}

function resolveStatusDesc(
  coarseStatus: string,
  fulfillmentStatus: FulfillmentStatus | null,
  isDriverAssigned: boolean
): string {
  if (fulfillmentStatus) {
    const copy = getFulfillmentStatusCopy(fulfillmentStatus)
    if (copy?.title) return copy.title
  }
  if (coarseStatus === 'ACCEPTED') {
    if (isDriverAssigned) return '已指派司机'
    return '待指派司机'
  }
  return COARSE_STATUS_DESC[coarseStatus] || coarseStatus
}

/**
 * Map fine fulfillment (including optional branches) onto MAIN_PATH index.
 * WAITING_PASSENGER sits after ARRIVED_PICKUP; ARRIVING_DESTINATION after PASSENGER_BOARDED.
 */
function resolveMainPathIndex(
  status: FulfillmentStatus | string | null | undefined
): number {
  if (!status || status === FULFILLMENT_STATUS.CANCELLED) return -1
  if (status === FULFILLMENT_STATUS.WAITING_PASSENGER) {
    return FULFILLMENT_MAIN_PATH.indexOf(FULFILLMENT_STATUS.ARRIVED_PICKUP)
  }
  if (status === FULFILLMENT_STATUS.ARRIVING_DESTINATION) {
    return FULFILLMENT_MAIN_PATH.indexOf(FULFILLMENT_STATUS.PASSENGER_BOARDED)
  }
  return FULFILLMENT_MAIN_PATH.indexOf(status as FulfillmentStatus)
}

/**
 * Build passenger timeline from MAIN_PATH + order_events.
 * Marks nodes completed / active / pending relative to current fulfillment.
 */
export function buildFulfillmentTimeline(
  fulfillmentStatus: FulfillmentStatus | null | undefined,
  events: OrderEvent[] = []
): PassengerTimelineItem[] {
  const eventByType = new Map<string, OrderEvent>()
  for (const ev of events) {
    // keep first occurrence per type for display time
    if (!eventByType.has(ev.eventType)) {
      eventByType.set(ev.eventType, ev)
    }
  }

  const current =
    fulfillmentStatus === FULFILLMENT_STATUS.CANCELLED
      ? FULFILLMENT_STATUS.CANCELLED
      : fulfillmentStatus || null

  // If cancelled, show path up to last non-cancel event if possible
  let activeIndex = resolveMainPathIndex(current)
  if (current === FULFILLMENT_STATUS.CANCELLED) {
    const nonCancel = [...events].reverse().find((e) => e.eventType !== 'CANCELLED')
    if (nonCancel) {
      activeIndex = resolveMainPathIndex(nonCancel.eventType)
    }
  }

  const timeline: PassengerTimelineItem[] = FULFILLMENT_MAIN_PATH.map((code, index) => {
    const copy = getFulfillmentStatusCopy(code)
    const event = eventByType.get(code)
    let nodeStatus: 'completed' | 'active' | 'pending' = 'pending'

    if (current === FULFILLMENT_STATUS.COMPLETED) {
      nodeStatus = 'completed'
    } else if (current === FULFILLMENT_STATUS.CANCELLED) {
      if (activeIndex >= 0 && index <= activeIndex) nodeStatus = 'completed'
      else if (event) nodeStatus = 'completed'
    } else if (activeIndex >= 0) {
      if (index < activeIndex) nodeStatus = 'completed'
      else if (index === activeIndex) nodeStatus = 'active'
      else nodeStatus = 'pending'
    } else if (event) {
      nodeStatus = 'completed'
    }

    return {
      code,
      time: event?.createdAt || '',
      title: copy?.title || code,
      desc: event?.note || copy?.subText || '',
      status: nodeStatus
    }
  })

  if (current === FULFILLMENT_STATUS.CANCELLED) {
    const cancelEvent = eventByType.get('CANCELLED')
    const cancelCopy = getFulfillmentStatusCopy(FULFILLMENT_STATUS.CANCELLED)
    timeline.push({
      code: FULFILLMENT_STATUS.CANCELLED,
      time: cancelEvent?.createdAt || '',
      title: cancelCopy?.title || '已取消',
      desc: cancelEvent?.note || cancelCopy?.subText || '',
      status: 'active'
    })
  }

  return timeline
}


/**
 * Passenger confirms submitted fees (offline archive).
 * - Requires fulfillment_status = PENDING_FEE_CONFIRM
 * - PATCH order_fees.confirmed_at
 * - PATCH demand status=COMPLETED, fulfillment_status=COMPLETED
 * - INSERT order_events COMPLETED
 * No payment.
 */
export const confirmOrderFees = async (demandId: string): Promise<void> => {
  const accessToken = uni.getStorageSync('accessToken')
  const userProfile = uni.getStorageSync('userProfile')

  if (!accessToken || !userProfile?.id) {
    throw new Error('请先登录')
  }

  // 1) Load demand and verify ownership + status
  const demandRes = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/demands?id=eq.${demandId}&select=id,status,fulfillment_status,passenger_id`,
    method: 'GET',
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (isJwtExpired(demandRes.statusCode, demandRes.data)) {
    handleJwtExpired()
    throw new Error('登录已过期，请重新登录')
  }

  if (demandRes.statusCode !== 200 || !(demandRes.data as any[])?.length) {
    throw new Error('订单不存在')
  }

  const demand = (demandRes.data as any[])[0]
  if (demand.passenger_id && demand.passenger_id !== userProfile.id) {
    throw new Error('无权确认该订单费用')
  }

  if (demand.status === 'CANCELLED') {
    throw new Error('订单已取消')
  }
  if (demand.status === 'COMPLETED' || demand.fulfillment_status === FULFILLMENT_STATUS.COMPLETED) {
    throw new Error('订单已完成')
  }

  const fromStatus: FulfillmentStatus =
    ((demand.fulfillment_status as FulfillmentStatus | null) ||
      defaultFulfillmentForDemandStatus(demand.status) ||
      FULFILLMENT_STATUS.PENDING_ASSIGN)

  if (fromStatus !== FULFILLMENT_STATUS.PENDING_FEE_CONFIRM) {
    throw new Error('当前状态不可确认费用')
  }

  if (!canTransition(fromStatus, FULFILLMENT_STATUS.COMPLETED)) {
    throw new Error(`非法状态跳转：${fromStatus} → COMPLETED`)
  }

  // 2) Ensure fee row exists
  const feeGetRes = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/order_fees?demand_id=eq.${demandId}&select=id,confirmed_at&limit=1`,
    method: 'GET',
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (feeGetRes.statusCode !== 200 || !(feeGetRes.data as any[])?.length) {
    throw new Error('费用尚未提交')
  }

  const feeRow = (feeGetRes.data as any[])[0]
  if (feeRow.confirmed_at) {
    throw new Error('费用已确认')
  }

  const nowIso = new Date().toISOString()

  // 3) PATCH order_fees.confirmed_at
  const feePatchRes = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/order_fees?demand_id=eq.${demandId}`,
    method: 'PATCH',
    data: { confirmed_at: nowIso },
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    }
  })

  if (isJwtExpired(feePatchRes.statusCode, feePatchRes.data)) {
    handleJwtExpired()
    throw new Error('登录已过期，请重新登录')
  }

  if (feePatchRes.statusCode !== 204 && feePatchRes.statusCode !== 200) {
    console.error('confirmOrderFees fee PATCH failed:', feePatchRes.statusCode, feePatchRes.data)
    throw new Error('确认费用失败')
  }

  // 4) Complete demand
  const nextDemandStatus =
    getDemandStatusForFulfillment(FULFILLMENT_STATUS.COMPLETED) || 'COMPLETED'

  const demandPatchRes = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/demands?id=eq.${demandId}`,
    method: 'PATCH',
    data: {
      status: nextDemandStatus,
      fulfillment_status: FULFILLMENT_STATUS.COMPLETED
    },
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    }
  })

  if (isJwtExpired(demandPatchRes.statusCode, demandPatchRes.data)) {
    handleJwtExpired()
    throw new Error('登录已过期，请重新登录')
  }

  if (demandPatchRes.statusCode !== 204 && demandPatchRes.statusCode !== 200) {
    console.error('confirmOrderFees demand PATCH failed:', demandPatchRes.statusCode, demandPatchRes.data)
    throw new Error('更新订单状态失败')
  }

  // 5) Audit event
  const eventRes = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/order_events`,
    method: 'POST',
    data: {
      demand_id: demandId,
      event_type: FULFILLMENT_STATUS.COMPLETED,
      actor_id: userProfile.id,
      note: '乘客已确认费用'
    },
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    }
  })

  if (eventRes.statusCode !== 201 && eventRes.statusCode !== 200) {
    console.error('confirmOrderFees event insert failed:', eventRes.statusCode, eventRes.data)
  }
}

// 取消订单
export const cancelOrder = async (demandId: string, reason: string): Promise<void> => {
  const accessToken = uni.getStorageSync('accessToken')
  const userProfile = uni.getStorageSync('userProfile')

  if (!accessToken) {
    throw new Error('请先登录')
  }

  console.log('cancelOrder - 取消订单:', demandId, '原因:', reason)

  // 校验当前履约是否允许取消
  const demandRes = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/demands?id=eq.${demandId}&select=id,status,fulfillment_status`,
    method: 'GET',
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (isJwtExpired(demandRes.statusCode, demandRes.data)) {
    handleJwtExpired()
    throw new Error('登录已过期，请重新登录')
  }

  if (demandRes.statusCode !== 200 || !(demandRes.data as any[])?.length) {
    throw new Error('订单不存在')
  }

  const demand = (demandRes.data as any[])[0]
  if (demand.status === 'CANCELLED' || demand.status === 'COMPLETED') {
    throw new Error('当前订单状态不可取消')
  }

  const fulfillment =
    (demand.fulfillment_status as FulfillmentStatus | null) ||
    defaultFulfillmentForDemandStatus(demand.status)

  if (!canCancelFulfillment(fulfillment)) {
    throw new Error('当前履约状态不可取消')
  }

  // 更新需求状态为 CANCELLED
  const res = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/demands?id=eq.${demandId}`,
    method: 'PATCH',
    data: {
      status: 'CANCELLED',
      fulfillment_status: FULFILLMENT_STATUS.CANCELLED,
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

  if (isJwtExpired(res.statusCode, res.data)) {
    handleJwtExpired()
    throw new Error('登录已过期，请重新登录')
  }

  if (res.statusCode !== 204 && res.statusCode !== 200) {
    throw new Error('取消订单失败')
  }

  // 写入取消事件（失败不阻断）
  const eventRes = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/order_events`,
    method: 'POST',
    data: {
      demand_id: demandId,
      event_type: FULFILLMENT_STATUS.CANCELLED,
      actor_id: userProfile?.id || null,
      note: `取消原因: ${reason}`
    },
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    }
  })

  if (eventRes.statusCode !== 201 && eventRes.statusCode !== 200) {
    console.error('cancelOrder event insert failed:', eventRes.statusCode, eventRes.data)
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
