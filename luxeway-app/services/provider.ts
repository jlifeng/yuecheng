import { type ProviderSession, type MerchantReviewStatus, type ProviderRole } from '@/types/provider'

const SUPABASE_URL = 'https://qcsmavxqjofrhrdwgkpt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjc21hdnhxam9mcmhyZHdna3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3OTU2OTUsImV4cCI6MjA5MTM3MTY5NX0.zM4mVvvZAylQIXZFrnzaSAy_MGqTvR3hrSWfSSP8xRQ'

// Tab 类型定义
export type WorkbenchTab = 'pending' | 'quoted' | 'ongoing'

export interface ProviderBidPayload {
  demandId: string
  price: number
  carModel?: string
  carImage?: string
  message?: string
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

// 获取待报价的需求列表（支持分页）
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

  if (res.statusCode === 200 && res.data) {
    return {
      data: res.data as any[],
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

  if (bidRes.statusCode !== 200 || !(bidRes.data as any[])?.length) {
    throw new Error('订单不存在或无权操作')
  }

  // 更新需求状态为 CANCELLED
  const res = await uni.request({
    url: `${SUPABASE_URL}/rest/v1/demands?id=eq.${demandId}`,
    method: 'PATCH',
    data: {
      status: 'CANCELLED',
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

  if (res.statusCode !== 204) {
    throw new Error('取消订单失败')
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
  merchantCancelOrder
}
