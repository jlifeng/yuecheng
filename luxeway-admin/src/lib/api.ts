/**
 * LuxeWay 管理后台 API 封装
 */

import { supabase, type MerchantReviewStatus, type UserRole, type DemandStatus } from './supabase'
import {
  setAccessToken,
  setRefreshToken,
  clearTokens,
  fetchWithAuthRefresh,
  getAccessToken
} from './token-refresh'

const SUPABASE_URL = 'https://qcsmavxqjofrhrdwgkpt.supabase.co'

/**
 * 使用 REST API 查询 Supabase（带认证和自动刷新）
 */
async function supabaseQuery(table: string, options: {
  select?: string
  filter?: string
  order?: string
  limit?: number
  offset?: number
  count?: 'exact'
  head?: boolean
}) {
  let url = `${SUPABASE_URL}/rest/v1/${table}?`

  if (options.select) {
    url += `select=${options.select}`
  } else if (options.head) {
    url += 'select=*'
  } else {
    url += 'select=*'
  }

  if (options.filter) {
    url += `&${options.filter}`
  }

  if (options.order) {
    url += `&order=${options.order}`
  }

  if (options.limit) {
    url += `&limit=${options.limit}`
  }

  if (options.offset) {
    url += `&offset=${options.offset}`
  }

  const headers: Record<string, string> = {}
  if (options.count || options.head) {
    headers['Prefer'] = 'count=exact'
  }

  const response = await fetchWithAuthRefresh(url, { headers })

  if (!response.ok) {
    // 如果是 401，说明刷新失败，已经跳转到登录页
    if (response.status === 401) {
      // 双重保险：确保跳转到登录页
      if (typeof window !== 'undefined') {
        window.location.href = '/sign-in'
      }
      throw new Error('认证已过期，请重新登录')
    }
    const error = await response.text()
    throw new Error(`Database error: ${error}`)
  }

  const data = options.head ? null : await response.json()
  const count = response.headers.get('content-range')?.split('/')[1]

  return { data, count: count ? parseInt(count) : 0 }
}

/**
 * 使用 REST API 执行写入操作（带认证和自动刷新）
 */
async function supabaseMutation(
  table: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  options: {
    filter?: string
    body?: any
    returnRepresentation?: boolean
  }
) {
  let url = `${SUPABASE_URL}/rest/v1/${table}`
  if (options.filter) {
    url += `?${options.filter}`
  }

  const headers: Record<string, string> = {}
  if (options.returnRepresentation) {
    headers['Prefer'] = 'return=representation'
  }

  const requestOptions: RequestInit = {
    method,
    headers,
  }

  if (options.body) {
    requestOptions.body = JSON.stringify(options.body)
  }

  const response = await fetchWithAuthRefresh(url, requestOptions)

  if (!response.ok) {
    if (response.status === 401) {
      // 双重保险：确保跳转到登录页
      if (typeof window !== 'undefined') {
        window.location.href = '/sign-in'
      }
      throw new Error('认证已过期，请重新登录')
    }
    const error = await response.text()
    throw new Error(`操作失败: ${error}`)
  }

  const result = await response.json()
  return result
}

// ==================== 认证相关 ====================

/**
 * 管理员登录（使用 Supabase Auth）
 * 注意：管理员账号需要预先在 Supabase 中创建
 */
export async function adminLogin(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) throw error

  // 验证是否为管理员
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  if (profileError || profile?.role !== 'admin') {
    await supabase.auth.signOut()
    throw new Error('非管理员账号')
  }

  // 保存 tokens
  if (data.session?.access_token) {
    setAccessToken(data.session.access_token)
  }
  if (data.session?.refresh_token) {
    setRefreshToken(data.session.refresh_token)
  }

  return { user: data.user, session: data.session, profile }
}

/**
 * 获取当前登录用户信息
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return { user, profile }
}

/**
 * 登出
 */
export async function adminLogout() {
  const { error } = await supabase.auth.signOut()
  clearTokens()
  if (error) throw error
}

// ==================== 商家管理 ====================

/**
 * 获取商家列表
 */
export async function getMerchants(params: {
  status?: MerchantReviewStatus
  search?: string
  page?: number
  pageSize?: number
}) {
  const { status, search, page = 1, pageSize = 10 } = params
  const offset = (page - 1) * pageSize

  try {
    let filter = 'order=created_at.desc'
    if (status) {
      filter += `&review_status=eq.${status}`
    }
    if (search) {
      filter += `&or=(company_name.ilike.%${search}%,contact_name.ilike.%${search}%,contact_phone.ilike.%${search}%)`
    }

    const result = await supabaseQuery('merchants', {
      select: '*,vehicles(count),drivers(count)',
      filter,
      limit: pageSize,
      offset
    })

    return { data: result.data || [], count: result.count, page, pageSize }
  } catch (error) {
    console.error('获取商家列表失败:', error)
    return { data: [], count: 0, page, pageSize }
  }
}

/**
 * 获取商家详情
 */
export async function getMerchantDetail(merchantId: string) {
  const { data: merchant, error: merchantError } = await supabase
    .from('merchants')
    .select(`
      *,
      owner:profiles!merchants_owner_user_id_fkey(id, name, phone, role)
    `)
    .eq('id', merchantId)
    .single()

  if (merchantError) throw merchantError

  // 获取车辆列表
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .eq('merchant_id', merchantId)

  // 获取司机列表
  const { data: drivers } = await supabase
    .from('drivers')
    .select(`
      *,
      user:profiles(id, name, phone)
    `)
    .eq('merchant_id', merchantId)

  return { merchant, vehicles, drivers }
}

/**
 * 更新商家审核状态
 */
export async function updateMerchantStatus(merchantId: string, data: {
  review_status: MerchantReviewStatus
  review_note?: string
}) {
  const result = await supabaseMutation('merchants', 'PATCH', {
    filter: `id=eq.${merchantId}`,
    body: {
      review_status: data.review_status,
      review_note: data.review_note,
      reviewed_at: new Date().toISOString()
    },
    returnRepresentation: true
  })
  return result[0]
}

/**
 * 商家审核通过 - 更新商家状态并给用户分配车队负责人角色
 */
export async function approveMerchantWithRole(merchantId: string) {
  console.log('=== 开始审核商家流程 ===')
  console.log('merchantId:', merchantId)

  // 1. 获取商家信息（包含 owner_user_id）
  const merchantResult = await supabaseQuery('merchants', {
    select: 'id,owner_user_id,company_name',
    filter: `id=eq.${merchantId}`
  })

  console.log('商家查询结果:', merchantResult.data)

  const merchant = merchantResult.data?.[0]
  if (!merchant || !merchant.owner_user_id) {
    throw new Error('商家信息不存在或没有关联用户')
  }

  // 2. 更新商家审核状态
  console.log('更新商家审核状态...')
  await supabaseMutation('merchants', 'PATCH', {
    filter: `id=eq.${merchantId}`,
    body: {
      review_status: 'approved',
      reviewed_at: new Date().toISOString()
    },
    returnRepresentation: false
  })

  // 3. 更新用户的 merchant_id 和 display_role
  console.log('更新用户 merchant_id:', merchant.owner_user_id, '->', merchantId)
  const updateResult = await supabaseMutation('profiles', 'PATCH', {
    filter: `id=eq.${merchant.owner_user_id}`,
    body: {
      merchant_id: merchantId,
      display_role: 'provider',
      updated_at: new Date().toISOString()
    },
    returnRepresentation: true
  })

  console.log('用户更新结果:', updateResult)
  console.log(`商家 ${merchant.company_name} 审核通过，用户 ${merchant.owner_user_id} 已分配车队负责人角色`)

  return merchant
}

// ==================== 用户管理 ====================

/**
 * 获取用户列表
 */
export async function getUsers(params: {
  role?: UserRole
  search?: string
  page?: number
  pageSize?: number
}) {
  const { role, search, page = 1, pageSize = 10 } = params
  const offset = (page - 1) * pageSize

  try {
    let filter = 'order=created_at.desc'
    if (role) {
      filter += `&role=eq.${role}`
    }
    if (search) {
      filter += `&or=(name.ilike.%${search}%,phone.ilike.%${search}%,nickname.ilike.%${search}%)`
    }

    const result = await supabaseQuery('profiles', {
      select: '*',
      filter,
      limit: pageSize,
      offset
    })

    return { data: result.data || [], count: result.count, page, pageSize }
  } catch (error) {
    console.error('获取用户列表失败:', error)
    return { data: [], count: 0, page, pageSize }
  }
}

/**
 * 获取用户详情
 */
export async function getUserDetail(userId: string) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      *,
      merchant:merchants(id, company_name, type, review_status)
    `)
    .eq('id', userId)
    .single()

  if (error) throw error

  // 获取用户订单统计（如果是乘客）
  if (profile.role === 'passenger') {
    const { count: orderCount } = await supabase
      .from('demands')
      .select('*', { count: 'exact', head: true })
      .eq('passenger_id', userId)

    return { profile, orderCount }
  }

  // 获取报价统计（如果是商家）
  if (profile.role.startsWith('merchant')) {
    const { count: bidCount } = await supabase
      .from('bids')
      .select('*', { count: 'exact', head: true })
      .eq('provider_id', userId)

    return { profile, bidCount }
  }

  return { profile }
}

/**
 * 修改用户角色
 */
export async function updateUserRole(userId: string, role: UserRole) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ==================== 订单管理 ====================

/**
 * 获取订单列表
 */
export async function getDemands(params: {
  status?: DemandStatus
  search?: string
  page?: number
  pageSize?: number
}) {
  const { status, search, page = 1, pageSize = 10 } = params
  const offset = (page - 1) * pageSize

  try {
    let filter = 'order=created_at.desc'
    if (status) {
      filter += `&status=eq.${status}`
    }
    if (search) {
      filter += `&or=(start_address.ilike.%${search}%,end_address.ilike.%${search}%)`
    }

    // 关联查询乘客信息
    const result = await supabaseQuery('demands', {
      select: 'id,passenger_id,type,start_address,end_address,earliest_departure,latest_departure,passenger_count,requirements,status,created_at,updated_at,passenger:profiles!demands_passenger_id_fkey(id,name,nickname,phone)',
      filter,
      limit: pageSize,
      offset
    })

    return { data: result.data || [], count: result.count, page, pageSize }
  } catch (error) {
    console.error('获取订单列表失败:', error)
    return { data: [], count: 0, page, pageSize }
  }
}

/**
 * 获取订单详情
 */
export async function getDemandDetail(demandId: string) {
  const { data: demand, error } = await supabase
    .from('demands')
    .select(`
      *,
      passenger:profiles!demands_passenger_id_fkey(id, name, phone, avatar_url)
    `)
    .eq('id', demandId)
    .single()

  if (error) throw error

  // 获取报价列表
  const { data: bids } = await supabase
    .from('bids')
    .select(`
      *,
      provider:profiles!bids_provider_id_fkey(id, name, phone),
      merchant:merchants(id, company_name)
    `)
    .eq('demand_id', demandId)

  return { demand, bids }
}

/**
 * 更新订单状态
 */
export async function updateDemandStatus(demandId: string, status: DemandStatus) {
  const { data, error } = await supabase
    .from('demands')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', demandId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 删除订单
 */
export async function deleteDemand(demandId: string) {
  const { error } = await supabase
    .from('demands')
    .delete()
    .eq('id', demandId)

  if (error) throw error
}

/**
 * 更新用户信息
 */
export async function updateUser(userId: string, data: {
  name?: string
  phone?: string
  role?: UserRole
}) {
  const result = await supabaseMutation('profiles', 'PATCH', {
    filter: `id=eq.${userId}`,
    body: {
      ...data,
      updated_at: new Date().toISOString()
    },
    returnRepresentation: true
  })
  return result[0]
}

/**
 * 停用/启用用户
 */
export async function toggleUserStatus(userId: string, disabled: boolean) {
  const result = await supabaseMutation('profiles', 'PATCH', {
    filter: `id=eq.${userId}`,
    body: {
      disabled,
      disabled_at: disabled ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    },
    returnRepresentation: true
  })
  return result[0]
}

/**
 * 停用/启用商家
 */
export async function toggleMerchantStatus(merchantId: string, disabled: boolean) {
  const result = await supabaseMutation('merchants', 'PATCH', {
    filter: `id=eq.${merchantId}`,
    body: {
      disabled,
      disabled_at: disabled ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    },
    returnRepresentation: true
  })
  return result[0]
}

// ==================== 数据统计 ====================

/**
 * 获取核心统计数据
 */
export async function getStatistics() {
  try {
    // 商家总数
    const merchantsResult = await supabaseQuery('merchants', {
      filter: 'review_status=eq.approved',
      count: 'exact',
      head: true
    })

    // 用户总数
    const usersResult = await supabaseQuery('profiles', {
      count: 'exact',
      head: true
    })

    // 完成订单数
    const completedResult = await supabaseQuery('demands', {
      filter: 'status=eq.COMPLETED',
      count: 'exact',
      head: true
    })

    // 待处理订单数
    const pendingResult = await supabaseQuery('demands', {
      filter: 'status=in.(BIDDING,ACCEPTED,IN_PROGRESS)',
      count: 'exact',
      head: true
    })

    // 计算总收入（已接受的报价金额总和）
    const bidsResult = await supabaseQuery('bids', {
      select: 'price',
      filter: 'status=eq.ACCEPTED'
    })
    const totalRevenue = bidsResult.data?.reduce((sum: number, bid: any) => sum + (bid.price || 0), 0) || 0

    // 待审核商家数
    const pendingMerchantsResult = await supabaseQuery('merchants', {
      filter: 'review_status=eq.pending',
      count: 'exact',
      head: true
    })

    // 今日新增用户数
    const today = new Date().toISOString().split('T')[0]
    const todayUsersResult = await supabaseQuery('profiles', {
      filter: `created_at=gte.${today}`,
      count: 'exact',
      head: true
    })

    // 今日新增订单数
    const todayOrdersResult = await supabaseQuery('demands', {
      filter: `created_at=gte.${today}`,
      count: 'exact',
      head: true
    })

    return {
      merchantCount: merchantsResult.count || 0,
      userCount: usersResult.count || 0,
      completedOrders: completedResult.count || 0,
      pendingOrders: pendingResult.count || 0,
      totalRevenue,
      pendingMerchants: pendingMerchantsResult.count || 0,
      todayNewUsers: todayUsersResult.count || 0,
      todayNewOrders: todayOrdersResult.count || 0
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
    // 返回默认值，避免页面崩溃
    return {
      merchantCount: 0,
      userCount: 0,
      completedOrders: 0,
      pendingOrders: 0,
      totalRevenue: 0,
      pendingMerchants: 0,
      todayNewUsers: 0,
      todayNewOrders: 0
    }
  }
}

/**
 * 获取待审核商家数量
 */
export async function getPendingMerchantsCount() {
  try {
    const result = await supabaseQuery('merchants', {
      filter: 'review_status=eq.pending',
      count: 'exact',
      head: true
    })
    return result.count || 0
  } catch {
    return 0
  }
}

/**
 * 获取商家活跃度排行
 */
export async function getMerchantRanking(limit = 10) {
  try {
    const result = await supabaseQuery('merchants', {
      select: 'id,company_name,contact_name,order_count,rating_avg',
      filter: 'review_status=eq.approved',
      order: 'order_count.desc',
      limit
    })
    return result.data || []
  } catch {
    return []
  }
}

/**
 * 获取订单完成率统计
 */
export async function getOrderCompletionStats() {
  try {
    // 获取各状态订单数量
    const completedResult = await supabaseQuery('demands', {
      filter: 'status=eq.COMPLETED',
      count: 'exact',
      head: true
    })

    const cancelledResult = await supabaseQuery('demands', {
      filter: 'status=eq.CANCELLED',
      count: 'exact',
      head: true
    })

    const biddingResult = await supabaseQuery('demands', {
      filter: 'status=eq.BIDDING',
      count: 'exact',
      head: true
    })

    const acceptedResult = await supabaseQuery('demands', {
      filter: 'status=eq.ACCEPTED',
      count: 'exact',
      head: true
    })

    const inProgressResult = await supabaseQuery('demands', {
      filter: 'status=eq.IN_PROGRESS',
      count: 'exact',
      head: true
    })

    const pendingResult = await supabaseQuery('demands', {
      filter: 'status=eq.PENDING',
      count: 'exact',
      head: true
    })

    const totalResult = await supabaseQuery('demands', {
      count: 'exact',
      head: true
    })

    const total = totalResult.count || 0
    const completed = completedResult.count || 0

    return {
      COMPLETED: completed,
      CANCELLED: cancelledResult.count || 0,
      BIDDING: biddingResult.count || 0,
      ACCEPTED: acceptedResult.count || 0,
      IN_PROGRESS: inProgressResult.count || 0,
      PENDING: pendingResult.count || 0,
      total,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    }
  } catch (error) {
    console.error('获取订单完成率失败:', error)
    return {
      COMPLETED: 0,
      CANCELLED: 0,
      BIDDING: 0,
      ACCEPTED: 0,
      IN_PROGRESS: 0,
      PENDING: 0,
      total: 0,
      completionRate: 0
    }
  }
}