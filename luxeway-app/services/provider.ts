import { type ProviderSession, type MerchantReviewStatus, type ProviderRole } from '@/types/provider'
import type { FulfillmentStatus } from '@/types/order'
import {
  canCancelFulfillment,
  canTransition,
  defaultFulfillmentForDemandStatus,
  FULFILLMENT_STATUS,
  getDemandStatusForFulfillment
} from '@/utils/fulfillmentStateMachine'

const SUPABASE_URL = 'https://qcsmavxqjofrhrdwgkpt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjc21hdnhxam9mcmhyZHdna3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3OTU2OTUsImV4cCI6MjA5MTM3MTY5NX0.zM4mVvvZAylQIXZFrnzaSAy_MGqTvR3hrSWfSSP8xRQ'

/** Merchant fleet driver row (subset used by assign flow). */
export interface MerchantDriver {
  id: string
  merchantId: string
  name: string
  phone: string
  status: string
  role?: string
}

/** Merchant fleet vehicle row (subset used by assign flow). */
export interface MerchantVehicle {
  id: string
  merchantId: string
  plateNumber: string
  model: string
  seats?: number
  color?: string | null
  status: string
}

export interface AssignDriverPayload {
  driverId: string
  vehicleId?: string | null
}

// Tab 类型定义
export type WorkbenchTab = 'pending' | 'quoted' | 'ongoing'

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

export interface ProviderBidPayload {
  demandId: string
  price: number
  carModel?: string
  carImage?: string
  message?: string
  vehicleId?: string  // 车辆ID，用于时间冲突校验
}

export interface WorkbenchData {
  session: ProviderSession
}

// 获取工作台权限信息
export const fetchWorkbench = async (): Promise<WorkbenchData> => {
  const accessToken = uni.getStorageSync('accessToken')
  const userProfile = uni.getStorageSync('userProfile')

  console.log('fetchWorkbench - accessToken:', accessToken ? '有' : '无')
  console.log('fetchWorkbench - userProfile:', JSON.stringify(userProfile))

  if (!accessToken || !userProfile?.id) {
    // 返回默认值（未登录状态）
    console.log('fetchWorkbench - 未登录，返回默认值')
    return {
      session: {
        reviewStatus: 'pending' as MerchantReviewStatus,
        role: 'OWNER' as ProviderRole,
        companyName: '',
        displayName: ''
      }
    }
  }

  // 如果用户有 merchant_id，从 merchants 表获取审核状态
  if (userProfile.merchant_id) {
    console.log('fetchWorkbench - 有 merchant_id:', userProfile.merchant_id, '，查询商家信息...')
    try {
      const res = await uni.request({
        url: `${SUPABASE_URL}/rest/v1/merchants?id=eq.${userProfile.merchant_id}&select=*`,
        method: 'GET',
        header: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`
        }
      })

      console.log('fetchWorkbench - 商家查询结果:', res.statusCode, res.data)

      if (res.statusCode === 200 && res.data && (res.data as any[]).length > 0) {
        const merchant = (res.data as any[])[0]
        console.log('fetchWorkbench - merchant.review_status:', merchant.review_status)
        return {
          session: {
            reviewStatus: (merchant.review_status || 'pending') as MerchantReviewStatus,
            role: (userProfile.role || 'OWNER') as ProviderRole,
            companyName: merchant.company_name || '',
            displayName: userProfile.nickname || userProfile.phone || ''
          }
        }
      }
    } catch (e) {
      console.error('获取商家信息失败', e)
    }
  } else {
    console.log('fetchWorkbench - 无 merchant_id，尝试从 roles 获取...')

    // 用户可能有多角色，检查 roles 中是否有商家角色
    const roles = userProfile?.roles || []
    const hasMerchantRole = roles.some((r: any) =>
      r.name === 'merchant_owner' || r.name === 'merchant_dispatcher'
    )

    if (hasMerchantRole) {
      console.log('fetchWorkbench - 有商家角色，需要查询用户关联的 merchant_id')
      // 尝试从 profiles 表获取 merchant_id
      try {
        const res = await uni.request({
          url: `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userProfile.id}&select=merchant_id`,
          method: 'GET',
          header: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`
          }
        })

        console.log('fetchWorkbench - profiles 查询结果:', res.statusCode, res.data)

        if (res.statusCode === 200 && res.data && (res.data as any[]).length > 0) {
          const profile = (res.data as any[])[0]
          const merchantId = profile.merchant_id

          if (merchantId) {
            // 更新本地存储
            userProfile.merchant_id = merchantId
            uni.setStorageSync('userProfile', userProfile)

            // 再查询商家信息
            const merchantRes = await uni.request({
              url: `${SUPABASE_URL}/rest/v1/merchants?id=eq.${merchantId}&select=*`,
              method: 'GET',
              header: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken}`
              }
            })

            console.log('fetchWorkbench - 商家信息:', merchantRes.statusCode, merchantRes.data)

            if (merchantRes.statusCode === 200 && merchantRes.data && (merchantRes.data as any[]).length > 0) {
              const merchant = (merchantRes.data as any[])[0]
              return {
                session: {
                  reviewStatus: (merchant.review_status || 'pending') as MerchantReviewStatus,
                  role: (userProfile.role || 'OWNER') as ProviderRole,
                  companyName: merchant.company_name || '',
                  displayName: userProfile.nickname || userProfile.phone || ''
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('查询用户 merchant_id 失败', e)
      }
    }
  }

  // 返回默认值
  console.log('fetchWorkbench - 返回默认值 pending')
  return {
    session: {
      reviewStatus: 'pending' as MerchantReviewStatus,
      role: (userProfile.role || 'OWNER') as ProviderRole,
      companyName: '',
      displayName: userProfile.nickname || userProfile.phone || ''
    }
  }
}

// 获取待报价的需求列表（支持分页，排除已报价的需求）
export const fetchPendingDemands = async (
  page: number = 1,
  pageSize: number = 20
): Promise<{ data: any[]; hasMore: boolean }> => {
  const accessToken = uni.getStorageSync('accessToken')
  const userProfile = uni.getStorageSync('userProfile')

  console.log('fetchPendingDemands - accessToken:', accessToken ? '有' : '无')
  console.log('fetchPendingDemands - userProfile:', userProfile)

  // 只要已登录就能查看待报价需求（报价需要商家审核通过）
  if (!accessToken) {
    console.log('fetchPendingDemands - 未登录，返回空数组')
    return { data: [], hasMore: false }
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  console.log('fetchPendingDemands - 发送请求, page:', page, 'from:', from, 'to:', to)

  // 先查询当前用户已报价的 demand_id 列表
  let excludedDemandIds: string[] = []
  if (userProfile?.id) {
    try {
      const myBidsRes = await uni.request({
        url: `${SUPABASE_URL}/rest/v1/bids?provider_id=eq.${userProfile.id}&select=demand_id`,
        method: 'GET',
        header: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (myBidsRes.statusCode === 200 && myBidsRes.data) {
        excludedDemandIds = (myBidsRes.data as any[]).map((b: any) => b.demand_id)
        console.log('fetchPendingDemands - 已报价的 demand_id:', excludedDemandIds)
      }
    } catch (e) {
      console.error('查询已报价需求失败', e)
    }
  }

  // 查询待报价需求
  const res = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/demands?status=eq.BIDDING&select=*&order=created_at.desc&offset=${from}&limit=${pageSize}`,
    method: 'GET',
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Prefer': 'count=exact'
    }
  })

  console.log('fetchPendingDemands - 响应:', res.statusCode, res.data)

  // JWT 过期处理
  if (isJwtExpired(res.statusCode, res.data)) {
    handleJwtExpired()
    return { data: [], hasMore: false }
  }

  if (res.statusCode === 200 && res.data) {
    // 过滤掉已报价的需求
    const filteredData = (res.data as any[]).filter(
      (d: any) => !excludedDemandIds.includes(d.id)
    )
    console.log('fetchPendingDemands - 过滤后数量:', filteredData.length, '原数量:', (res.data as any[]).length)
    return {
      data: filteredData,
      hasMore: (res.data as any[]).length === pageSize
    }
  }
  return { data: [], hasMore: false }
}

// 获取已报价列表（我的报价，支持分页）
export const fetchQuotedBids = async (
  page: number = 1,
  pageSize: number = 20
): Promise<{ data: any[]; hasMore: boolean }> => {
  const accessToken = uni.getStorageSync('accessToken')
  const userProfile = uni.getStorageSync('userProfile')

  console.log('fetchQuotedBids - userProfile:', userProfile)

  // 需要用户已登录且有 id
  if (!accessToken || !userProfile?.id) {
    console.log('fetchQuotedBids - 未登录或无用户ID，返回空数组')
    return { data: [], hasMore: false }
  }

  const from = (page - 1) * pageSize

  console.log('fetchQuotedBids - 发送请求, page:', page)
  // 查询我的报价，关联需求信息
  const res = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/bids?provider_id=eq.${userProfile.id}&select=*,demands(id,start_address,end_address,earliest_departure,latest_departure,passenger_count,requirements,status)&order=created_at.desc&offset=${from}&limit=${pageSize}`,
    method: 'GET',
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`
    }
  })

  console.log('fetchQuotedBids - 响应:', res.statusCode, res.data)

  // JWT 过期处理
  if (isJwtExpired(res.statusCode, res.data)) {
    handleJwtExpired()
    return { data: [], hasMore: false }
  }

  if (res.statusCode === 200 && res.data) {
    const data = (res.data as any[]).map(bid => ({
      id: bid.id,
      demandId: bid.demand_id,
      price: bid.price,
      status: bid.status,
      start: bid.demands?.start_address || '',
      end: bid.demands?.end_address || '',
      earliestDeparture: bid.demands?.earliest_departure || '',
      latestDeparture: bid.demands?.latest_departure || '',
      passengerCount: bid.demands?.passenger_count || 1,
      remark: bid.demands?.requirements || '',
      demandStatus: bid.demands?.status || ''
    }))
    return {
      data,
      hasMore: data.length === pageSize
    }
  }
  return { data: [], hasMore: false }
}

// 获取进行中的订单（已接受的报价，支持分页）
export const fetchOngoingOrders = async (
  page: number = 1,
  pageSize: number = 20
): Promise<{ data: any[]; hasMore: boolean }> => {
  const accessToken = uni.getStorageSync('accessToken')
  const userProfile = uni.getStorageSync('userProfile')

  console.log('fetchOngoingOrders - userProfile:', userProfile)

  if (!accessToken || !userProfile?.id) {
    console.log('fetchOngoingOrders - 未登录或无用户ID，返回空数组')
    return { data: [], hasMore: false }
  }

  const from = (page - 1) * pageSize

  console.log('fetchOngoingOrders - 发送请求, page:', page)
  // 查询我已接受的报价，需求状态为 ACCEPTED 或 IN_PROGRESS
  const res = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/bids?provider_id=eq.${userProfile.id}&status=eq.ACCEPTED&select=*,demands(id,start_address,end_address,earliest_departure,latest_departure,passenger_count,requirements,status)&order=created_at.desc&offset=${from}&limit=${pageSize}`,
    method: 'GET',
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`
    }
  })

  console.log('fetchOngoingOrders - 响应:', res.statusCode, res.data)

  // JWT 过期处理
  if (isJwtExpired(res.statusCode, res.data)) {
    handleJwtExpired()
    return { data: [], hasMore: false }
  }

  if (res.statusCode === 200 && res.data) {
    const data = (res.data as any[]).map(bid => ({
      id: bid.demand_id,
      bidId: bid.id,
      price: bid.price,
      start: bid.demands?.start_address || '',
      end: bid.demands?.end_address || '',
      earliestDeparture: bid.demands?.earliest_departure || '',
      latestDeparture: bid.demands?.latest_departure || '',
      passengerCount: bid.demands?.passenger_count || 1,
      remark: bid.demands?.requirements || '',
      status: bid.demands?.status || '',
      statusDesc: getStatusDesc(bid.demands?.status || '')
    }))
    return {
      data,
      hasMore: data.length === pageSize
    }
  }
  return { data: [], hasMore: false }
}

// 状态描述映射
const getStatusDesc = (status: string): string => {
  switch (status) {
    case 'ACCEPTED': return '已确认'
    case 'IN_PROGRESS': return '进行中'
    case 'COMPLETED': return '已完成'
    default: return status
  }
}

// 获取商家历史订单列表（支持分页）
export const fetchMerchantOrders = async (
  page: number = 1,
  pageSize: number = 20
): Promise<{ data: any[]; hasMore: boolean }> => {
  const accessToken = uni.getStorageSync('accessToken')
  const userProfile = uni.getStorageSync('userProfile')

  console.log('fetchMerchantOrders - userProfile:', userProfile)

  if (!accessToken || !userProfile?.id) {
    console.log('fetchMerchantOrders - 未登录或无用户ID')
    return { data: [], hasMore: false }
  }

  const from = (page - 1) * pageSize

  console.log('fetchMerchantOrders - 查询商家订单:', userProfile.id, 'page:', page)

  // 查询商家所有已接受的报价，关联需求信息
  const res = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/bids?provider_id=eq.${userProfile.id}&status=eq.ACCEPTED&select=*,demands(id,start_address,end_address,earliest_departure,latest_departure,passenger_count,requirements,status,created_at)&order=created_at.desc&offset=${from}&limit=${pageSize}`,
    method: 'GET',
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`
    }
  })

  console.log('fetchMerchantOrders - 响应:', res.statusCode, res.data)

  if (res.statusCode === 200 && res.data) {
    const data = (res.data as any[]).map(bid => ({
      id: bid.demand_id,
      bidId: bid.id,
      price: bid.price,
      start: bid.demands?.start_address || '',
      end: bid.demands?.end_address || '',
      earliestDeparture: bid.demands?.earliest_departure || '',
      latestDeparture: bid.demands?.latest_departure || '',
      passengerCount: bid.demands?.passenger_count || 1,
      remark: bid.demands?.requirements || '',
      status: bid.demands?.status || '',
      statusDesc: getStatusDesc(bid.demands?.status || ''),
      createdAt: bid.demands?.created_at || bid.created_at
    }))
    return {
      data,
      hasMore: data.length === pageSize
    }
  }

  return { data: [], hasMore: false }
}

// 提交报价
export const submitBid = async (payload: ProviderBidPayload): Promise<{ bidId: string }> => {
  const accessToken = uni.getStorageSync('accessToken')
  const userProfile = uni.getStorageSync('userProfile')

  if (!accessToken || !userProfile?.id || !userProfile?.merchant_id) {
    throw new Error('请先登录商家账号')
  }

  const bidData = {
    demand_id: payload.demandId,
    provider_id: userProfile.id,
    merchant_id: userProfile.merchant_id,
    vehicle_id: payload.vehicleId || null,
    price: payload.price,
    car_model: payload.carModel || null,
    car_image: payload.carImage || null,
    message: payload.message || null,
    status: 'PENDING'
  }

  const res = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/bids`,
    method: 'POST',
    data: bidData,
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  })

  if (res.statusCode !== 201) {
    throw new Error('报价提交失败')
  }

  const inserted = (res.data as any[])[0]
  return { bidId: inserted.id }
}

// 商家取消订单
export const merchantCancelOrder = async (demandId: string, reason: string): Promise<void> => {
  const accessToken = uni.getStorageSync('accessToken')
  const userProfile = uni.getStorageSync('userProfile')

  if (!accessToken || !userProfile?.id) {
    throw new Error('请先登录')
  }

  console.log('merchantCancelOrder - 取消订单:', demandId, '原因:', reason)

  // 先验证订单状态和归属
  const bidRes = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/bids?demand_id=eq.${demandId}&status=eq.ACCEPTED&provider_id=eq.${userProfile.id}&select=id`,
    method: 'GET',
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (isJwtExpired(bidRes.statusCode, bidRes.data)) {
    handleJwtExpired()
    throw new Error('登录已过期，请重新登录')
  }

  if (bidRes.statusCode !== 200 || !(bidRes.data as any[])?.length) {
    throw new Error('订单不存在或无权操作')
  }

  // 读取当前履约状态，校验是否允许取消
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

  const currentFulfillment: FulfillmentStatus | null =
    (demand.fulfillment_status as FulfillmentStatus | null) ||
    defaultFulfillmentForDemandStatus(demand.status)

  if (!canCancelFulfillment(currentFulfillment)) {
    throw new Error('当前履约状态不可取消')
  }

  // 更新需求状态为 CANCELLED，冻结 fulfillment
  const res = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/demands?id=eq.${demandId}`,
    method: 'PATCH',
    data: {
      status: 'CANCELLED',
      fulfillment_status: FULFILLMENT_STATUS.CANCELLED,
      notes: `商家取消: ${reason}`
    },
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    }
  })

  console.log('merchantCancelOrder - 响应:', res.statusCode)

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
      actor_id: userProfile.id,
      note: `商家取消: ${reason}`
    },
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    }
  })

  if (eventRes.statusCode !== 201 && eventRes.statusCode !== 200) {
    console.error('merchantCancelOrder event insert failed:', eventRes.statusCode, eventRes.data)
  }
}

/**
 * Resolve merchant_id for current provider session.
 */
const resolveMerchantId = (merchantId?: string): string => {
  if (merchantId) return merchantId
  const userProfile = uni.getStorageSync('userProfile')
  if (!userProfile?.merchant_id) {
    throw new Error('未绑定商家，无法操作车队')
  }
  return userProfile.merchant_id as string
}

/**
 * Fetch assignable drivers for the current merchant.
 * Prefer status=active; also include pending so owner can still assign if needed.
 */
export const fetchMerchantDrivers = async (
  merchantId?: string
): Promise<MerchantDriver[]> => {
  const accessToken = uni.getStorageSync('accessToken')
  if (!accessToken) {
    throw new Error('请先登录')
  }

  const mid = resolveMerchantId(merchantId)

  const res = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/drivers?merchant_id=eq.${mid}&status=in.(active,pending)&select=id,merchant_id,name,phone,status,role&order=status.asc,created_at.desc`,
    method: 'GET',
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (isJwtExpired(res.statusCode, res.data)) {
    handleJwtExpired()
    return []
  }

  if (res.statusCode !== 200 || !res.data) {
    console.error('fetchMerchantDrivers failed:', res.statusCode, res.data)
    return []
  }

  const rows = res.data as any[]
  // Prefer active first (status.asc puts active before pending alphabetically? active < pending — yes)
  return rows
    .map((d) => ({
      id: d.id,
      merchantId: d.merchant_id,
      name: d.name || '待确认',
      phone: d.phone || '',
      status: d.status || 'pending',
      role: d.role
    }))
    .sort((a, b) => {
      if (a.status === b.status) return 0
      if (a.status === 'active') return -1
      if (b.status === 'active') return 1
      return 0
    })
}

/**
 * Fetch active vehicles for the current merchant.
 */
export const fetchMerchantVehicles = async (
  merchantId?: string
): Promise<MerchantVehicle[]> => {
  const accessToken = uni.getStorageSync('accessToken')
  if (!accessToken) {
    throw new Error('请先登录')
  }

  const mid = resolveMerchantId(merchantId)

  const res = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/vehicles?merchant_id=eq.${mid}&status=eq.active&select=id,merchant_id,plate_number,model,seats,color,status&order=created_at.desc`,
    method: 'GET',
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (isJwtExpired(res.statusCode, res.data)) {
    handleJwtExpired()
    return []
  }

  if (res.statusCode !== 200 || !res.data) {
    console.error('fetchMerchantVehicles failed:', res.statusCode, res.data)
    return []
  }

  return (res.data as any[]).map((v) => ({
    id: v.id,
    merchantId: v.merchant_id,
    plateNumber: v.plate_number || '',
    model: v.model || '',
    seats: v.seats,
    color: v.color,
    status: v.status || 'active'
  }))
}

/**
 * Assign a driver (and optional vehicle) to an ACCEPTED / PENDING_ASSIGN demand.
 * - Writes assigned_driver_id / assigned_vehicle_id
 * - Sets fulfillment_status = ASSIGNED
 * - Keeps coarse status = ACCEPTED (do not jump to IN_PROGRESS)
 * - Inserts order_events row
 */
export const assignDriverToDemand = async (
  demandId: string,
  payload: AssignDriverPayload
): Promise<void> => {
  const accessToken = uni.getStorageSync('accessToken')
  const userProfile = uni.getStorageSync('userProfile')

  if (!accessToken || !userProfile?.id) {
    throw new Error('请先登录')
  }
  if (!userProfile.merchant_id) {
    throw new Error('未绑定商家，无法指派司机')
  }
  if (!payload?.driverId) {
    throw new Error('请选择司机')
  }

  const merchantId = userProfile.merchant_id as string

  // 1) Ownership: accepted bid must belong to current provider + same merchant
  const bidRes = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/bids?demand_id=eq.${demandId}&status=eq.ACCEPTED&provider_id=eq.${userProfile.id}&select=id,merchant_id,provider_id`,
    method: 'GET',
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (isJwtExpired(bidRes.statusCode, bidRes.data)) {
    handleJwtExpired()
    throw new Error('登录已过期，请重新登录')
  }

  if (bidRes.statusCode !== 200 || !(bidRes.data as any[])?.length) {
    throw new Error('订单不存在或无权操作')
  }

  const acceptedBid = (bidRes.data as any[])[0]
  if (acceptedBid.merchant_id && acceptedBid.merchant_id !== merchantId) {
    throw new Error('订单不存在或无权操作')
  }

  // 2) Load demand fulfillment / status
  const demandRes = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/demands?id=eq.${demandId}&select=id,status,fulfillment_status,assigned_driver_id,assigned_vehicle_id`,
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
  if (demand.status !== 'ACCEPTED') {
    throw new Error('当前订单状态不可指派司机')
  }

  const currentFulfillment: FulfillmentStatus | null =
    (demand.fulfillment_status as FulfillmentStatus | null) ||
    defaultFulfillmentForDemandStatus(demand.status)

  const fromStatus = currentFulfillment || FULFILLMENT_STATUS.PENDING_ASSIGN
  const canAssign =
    fromStatus === FULFILLMENT_STATUS.PENDING_ASSIGN ||
    canTransition(fromStatus, FULFILLMENT_STATUS.ASSIGNED)

  if (!canAssign) {
    throw new Error('当前履约状态不可指派司机')
  }

  // 3) Driver must belong to this merchant
  const driverRes = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/drivers?id=eq.${payload.driverId}&merchant_id=eq.${merchantId}&select=id,name,phone,status`,
    method: 'GET',
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (driverRes.statusCode !== 200 || !(driverRes.data as any[])?.length) {
    throw new Error('只能指派本车队司机')
  }

  const driver = (driverRes.data as any[])[0]
  if (driver.status && driver.status !== 'active' && driver.status !== 'pending') {
    throw new Error('该司机当前不可指派')
  }

  // 4) Optional vehicle must belong to this merchant
  let vehicleNote = ''
  if (payload.vehicleId) {
    const vehicleRes = await uni.request({
      url: `${SUPABASE_URL}/rest/v1/vehicles?id=eq.${payload.vehicleId}&merchant_id=eq.${merchantId}&select=id,plate_number,model,status`,
      method: 'GET',
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (vehicleRes.statusCode !== 200 || !(vehicleRes.data as any[])?.length) {
      throw new Error('只能关联本车队车辆')
    }

    const vehicle = (vehicleRes.data as any[])[0]
    if (vehicle.status && vehicle.status !== 'active') {
      throw new Error('该车辆当前不可用')
    }
    vehicleNote = vehicle.plate_number ? ` / ${vehicle.plate_number}` : ''
  }

  // 5) PATCH demand: keep coarse ACCEPTED, set ASSIGNED + assignment fields
  const patchRes = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/demands?id=eq.${demandId}`,
    method: 'PATCH',
    data: {
      assigned_driver_id: payload.driverId,
      assigned_vehicle_id: payload.vehicleId || null,
      fulfillment_status: FULFILLMENT_STATUS.ASSIGNED
      // status stays ACCEPTED — first "去接驾" moves to IN_PROGRESS
    },
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    }
  })

  if (isJwtExpired(patchRes.statusCode, patchRes.data)) {
    handleJwtExpired()
    throw new Error('登录已过期，请重新登录')
  }

  if (patchRes.statusCode !== 204 && patchRes.statusCode !== 200) {
    console.error('assignDriverToDemand PATCH failed:', patchRes.statusCode, patchRes.data)
    throw new Error('指派司机失败')
  }

  // 6) Insert order_events audit row
  const note = `指派司机：${driver.name || '司机'}${vehicleNote}`
  const eventRes = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/order_events`,
    method: 'POST',
    data: {
      demand_id: demandId,
      event_type: 'ASSIGNED',
      actor_id: userProfile.id,
      note
    },
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    }
  })

  if (eventRes.statusCode !== 201 && eventRes.statusCode !== 200) {
    // Assignment already succeeded; log but do not fail the whole flow hard
    console.error('assignDriverToDemand event insert failed:', eventRes.statusCode, eventRes.data)
  }
}

/**
 * Advance fulfillment one legal step (Approach B).
 * - Validates ownership + canTransition
 * - Requires assigned driver before leaving ASSIGNED (ON_THE_WAY+)
 * - PATCH fulfillment_status + mapped coarse demands.status
 * - INSERT order_events
 *
 * Dedicated flows (do not use advanceFulfillment):
 * - ASSIGNED -> assignDriverToDemand
 * - PENDING_FEE_CONFIRM -> submitOrderFees
 * - COMPLETED -> passenger confirmOrderFees
 * - CANCELLED -> merchantCancelOrder / cancelOrder
 */
export const advanceFulfillment = async (
  demandId: string,
  toStatus: FulfillmentStatus,
  note?: string
): Promise<void> => {
  const accessToken = uni.getStorageSync('accessToken')
  const userProfile = uni.getStorageSync('userProfile')

  if (!accessToken || !userProfile?.id) {
    throw new Error('请先登录')
  }
  if (!toStatus) {
    throw new Error('目标履约状态无效')
  }

  // 1) Ownership: accepted bid belongs to current provider
  const bidRes = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/bids?demand_id=eq.${demandId}&status=eq.ACCEPTED&provider_id=eq.${userProfile.id}&select=id,merchant_id,provider_id`,
    method: 'GET',
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (isJwtExpired(bidRes.statusCode, bidRes.data)) {
    handleJwtExpired()
    throw new Error('登录已过期，请重新登录')
  }

  if (bidRes.statusCode !== 200 || !(bidRes.data as any[])?.length) {
    throw new Error('订单不存在或无权操作')
  }

  // 2) Load demand fulfillment / status / assignment
  const demandRes = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/demands?id=eq.${demandId}&select=id,status,fulfillment_status,assigned_driver_id,assigned_vehicle_id`,
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
    throw new Error('订单已结束，无法推进')
  }

  const fromStatus: FulfillmentStatus =
    ((demand.fulfillment_status as FulfillmentStatus | null) ||
      defaultFulfillmentForDemandStatus(demand.status) ||
      FULFILLMENT_STATUS.PENDING_ASSIGN)

  // 3) Dedicated flows must not go through generic advance
  // - ASSIGNED: assignDriverToDemand (writes driver/vehicle)
  // - CANCELLED: merchantCancelOrder / passenger cancelOrder
  // - COMPLETED: passenger fee confirm (fee-confirm task)
  if (toStatus === FULFILLMENT_STATUS.ASSIGNED) {
    throw new Error('请使用指派司机完成该步骤')
  }
  if (toStatus === FULFILLMENT_STATUS.CANCELLED) {
    throw new Error('请使用取消订单完成该操作')
  }
  if (toStatus === FULFILLMENT_STATUS.PENDING_FEE_CONFIRM) {
    throw new Error('请使用费用提交完成该步骤')
  }
  if (toStatus === FULFILLMENT_STATUS.COMPLETED) {
    throw new Error('请先完成费用确认，不可直接完成订单')
  }

  // 4) Illegal transition guard (also blocks multi-step skips)
  if (!canTransition(fromStatus, toStatus)) {
    throw new Error(`非法状态跳转：${fromStatus} → ${toStatus}`)
  }

  // 5) Must have assigned driver before ON_THE_WAY and beyond
  if (!demand.assigned_driver_id) {
    throw new Error('请先指派司机')
  }

  // 6) Map coarse status (ON_THE_WAY+ → IN_PROGRESS; fee pending stays IN_PROGRESS)
  const nextDemandStatus = getDemandStatusForFulfillment(toStatus)
  if (!nextDemandStatus) {
    throw new Error('无法映射订单粗状态')
  }

  const patchBody: Record<string, string> = {
    fulfillment_status: toStatus,
    status: nextDemandStatus
  }

  const patchRes = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/demands?id=eq.${demandId}`,
    method: 'PATCH',
    data: patchBody,
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    }
  })

  if (isJwtExpired(patchRes.statusCode, patchRes.data)) {
    handleJwtExpired()
    throw new Error('登录已过期，请重新登录')
  }

  if (patchRes.statusCode !== 204 && patchRes.statusCode !== 200) {
    console.error('advanceFulfillment PATCH failed:', patchRes.statusCode, patchRes.data)
    throw new Error('推进履约状态失败')
  }

  // 7) Audit event
  const eventRes = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/order_events`,
    method: 'POST',
    data: {
      demand_id: demandId,
      event_type: toStatus,
      actor_id: userProfile.id,
      note: note || null
    },
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    }
  })

  if (eventRes.statusCode !== 201 && eventRes.statusCode !== 200) {
    console.error('advanceFulfillment event insert failed:', eventRes.statusCode, eventRes.data)
  }
}

/** Fee payload for merchant submit (offline archive, no payment). */
export interface SubmitOrderFeesPayload {
  baseFare: number
  tollFee?: number
  parkingFee?: number
  otherFee?: number
  waitingFee?: number
  notes?: string
}

/** Parse fee amount: must be finite and >= 0. Empty/undefined uses fallback. */
const toNonNegNumber = (value: unknown, fallback = 0): number => {
  if (value === undefined || value === null || value === '') {
    return Math.round(fallback * 100) / 100
  }
  const n = Number(value)
  if (!Number.isFinite(n)) {
    throw new Error('费用金额格式无效')
  }
  if (n < 0) {
    throw new Error('费用金额不能为负数')
  }
  return Math.round(n * 100) / 100
}

/**
 * Merchant submits order fees after ARRIVED_DESTINATION.
 * V1: first submit only (from ARRIVED_DESTINATION -> PENDING_FEE_CONFIRM).
 * - UPSERT order_fees (unique demand_id)
 * - PATCH fulfillment_status=PENDING_FEE_CONFIRM, status=IN_PROGRESS
 * - INSERT order_events PENDING_FEE_CONFIRM
 * No online payment.
 */
export const submitOrderFees = async (
  demandId: string,
  fees: SubmitOrderFeesPayload
): Promise<void> => {
  const accessToken = uni.getStorageSync('accessToken')
  const userProfile = uni.getStorageSync('userProfile')

  if (!accessToken || !userProfile?.id) {
    throw new Error('请先登录')
  }
  if (!fees || fees.baseFare === undefined || fees.baseFare === null || fees.baseFare === ('' as any)) {
    throw new Error('请填写基础车费')
  }

  const baseFare = toNonNegNumber(fees.baseFare)
  const tollFee = toNonNegNumber(fees.tollFee, 0)
  const parkingFee = toNonNegNumber(fees.parkingFee, 0)
  const otherFee = toNonNegNumber(fees.otherFee, 0)
  const waitingFee = toNonNegNumber(fees.waitingFee, 0)
  const totalAmount =
    Math.round((baseFare + tollFee + parkingFee + otherFee + waitingFee) * 100) / 100
  const notes = fees.notes?.trim() || null

  // 1) Ownership
  const bidRes = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/bids?demand_id=eq.${demandId}&status=eq.ACCEPTED&provider_id=eq.${userProfile.id}&select=id,merchant_id,provider_id,price`,
    method: 'GET',
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (isJwtExpired(bidRes.statusCode, bidRes.data)) {
    handleJwtExpired()
    throw new Error('登录已过期，请重新登录')
  }

  if (bidRes.statusCode !== 200 || !(bidRes.data as any[])?.length) {
    throw new Error('订单不存在或无权操作')
  }

  // 2) Demand + fulfillment check
  const demandRes = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/demands?id=eq.${demandId}&select=id,status,fulfillment_status,assigned_driver_id`,
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
    throw new Error('订单已结束，无法提交费用')
  }

  const fromStatus: FulfillmentStatus =
    ((demand.fulfillment_status as FulfillmentStatus | null) ||
      defaultFulfillmentForDemandStatus(demand.status) ||
      FULFILLMENT_STATUS.PENDING_ASSIGN)

  // V1: only first submit from ARRIVED_DESTINATION
  if (fromStatus !== FULFILLMENT_STATUS.ARRIVED_DESTINATION) {
    if (fromStatus === FULFILLMENT_STATUS.PENDING_FEE_CONFIRM) {
      throw new Error('费用已提交，等待乘客确认')
    }
    throw new Error('当前状态不可提交费用')
  }

  if (!canTransition(fromStatus, FULFILLMENT_STATUS.PENDING_FEE_CONFIRM)) {
    throw new Error(`非法状态跳转：${fromStatus} → PENDING_FEE_CONFIRM`)
  }

  if (!demand.assigned_driver_id) {
    throw new Error('请先指派司机')
  }

  const nowIso = new Date().toISOString()
  const feeRow = {
    demand_id: demandId,
    base_fare: baseFare,
    waiting_fee: waitingFee,
    toll_fee: tollFee,
    parking_fee: parkingFee,
    other_fee: otherFee,
    total_amount: totalAmount,
    currency: 'CNY',
    submitted_by: userProfile.id,
    submitted_at: nowIso,
    notes,
    confirmed_at: null
  }

  // 3) UPSERT order_fees on demand_id
  const feeRes = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/order_fees?on_conflict=demand_id`,
    method: 'POST',
    data: feeRow,
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal'
    }
  })

  if (isJwtExpired(feeRes.statusCode, feeRes.data)) {
    handleJwtExpired()
    throw new Error('登录已过期，请重新登录')
  }

  if (feeRes.statusCode !== 201 && feeRes.statusCode !== 200) {
    console.error('submitOrderFees UPSERT failed:', feeRes.statusCode, feeRes.data)
    throw new Error('费用提交失败')
  }

  // 4) Advance fulfillment -> PENDING_FEE_CONFIRM (coarse stays IN_PROGRESS)
  const nextDemandStatus =
    getDemandStatusForFulfillment(FULFILLMENT_STATUS.PENDING_FEE_CONFIRM) || 'IN_PROGRESS'

  const patchRes = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/demands?id=eq.${demandId}`,
    method: 'PATCH',
    data: {
      fulfillment_status: FULFILLMENT_STATUS.PENDING_FEE_CONFIRM,
      status: nextDemandStatus
    },
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    }
  })

  if (isJwtExpired(patchRes.statusCode, patchRes.data)) {
    handleJwtExpired()
    throw new Error('登录已过期，请重新登录')
  }

  if (patchRes.statusCode !== 204 && patchRes.statusCode !== 200) {
    console.error('submitOrderFees demand PATCH failed:', patchRes.statusCode, patchRes.data)
    throw new Error('更新订单状态失败')
  }

  // 5) Audit event
  const eventNote =
    notes ||
    `费用合计 ¥${totalAmount}` +
      (tollFee || parkingFee || otherFee || waitingFee ? '（含附加费）' : '（无附加费）')

  const eventRes = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/order_events`,
    method: 'POST',
    data: {
      demand_id: demandId,
      event_type: FULFILLMENT_STATUS.PENDING_FEE_CONFIRM,
      actor_id: userProfile.id,
      note: eventNote
    },
    header: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    }
  })

  if (eventRes.statusCode !== 201 && eventRes.statusCode !== 200) {
    console.error('submitOrderFees event insert failed:', eventRes.statusCode, eventRes.data)
  }
}

// 导出 providerService 对象，统一暴露所有方法
export const providerService = {
  fetchWorkbench,
  fetchPendingDemands,
  fetchQuotedBids,
  fetchOngoingOrders,
  submitBid,
  fetchMerchantOrders,
  merchantCancelOrder,
  fetchMerchantDrivers,
  fetchMerchantVehicles,
  assignDriverToDemand,
  advanceFulfillment,
  submitOrderFees
}
