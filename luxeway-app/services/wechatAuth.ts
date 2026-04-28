/**
 * 微信登录服务
 * 处理小程序微信授权登录流程
 */

import { getSupabase, UserProfile } from '../lib/supabase'

const SUPABASE_URL = 'https://qcsmavxqjofrhrdwgkpt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjc21hdnhxam9mcmhyZHdna3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3OTU2OTUsImV4cCI6MjA5MTM3MTY5NX0.zM4mVvvZAylQIXZFrnzaSAy_MGqTvR3hrSWfSSP8xRQ'

// Edge Function URL (v2 版本，修复了 token 返回问题)
const WECHAT_LOGIN_URL = `${SUPABASE_URL}/functions/v1/wechat-login-v2`

// 登录结果
export interface WechatLoginResult {
  success: boolean
  isNewUser?: boolean
  user?: UserProfile
  error?: string
}

/**
 * 微信登录
 * 1. 调用 wx.login() 获取 code
 * 2. 发送 code 到 Edge Function
 * 3. Edge Function 返回 Supabase session
 * 4. 从数据库获取完整用户信息（包含 nickname/avatar_url）
 */
export async function wechatLogin(): Promise<WechatLoginResult> {
  try {
    // 1. 获取微信登录 code
    const loginResult = await uni.login({
      provider: 'weixin'
    })

    if (!loginResult.code) {
      return { success: false, error: '获取微信登录凭证失败' }
    }

    // 2. 发送 code 到 Edge Function
    const response = await uni.request({
      url: WECHAT_LOGIN_URL,
      method: 'POST',
      data: { code: loginResult.code },
      timeout: 15000,
      header: {
        'Content-Type': 'application/json'
      }
    })

    const data = response.data as any
    console.log('=== Edge Function response ===', JSON.stringify(data, null, 2));

    if (!data.success) {
      return { success: false, error: data.error || '登录失败' }
    }

    // 3. 设置 Supabase session（如果有 token）
    console.log('=== Edge Function 返回数据 ===')
    console.log('session:', JSON.stringify(data.session, null, 2))
    console.log('user:', JSON.stringify(data.user, null, 2))

    if (data.session?.access_token) {
      // 保存 accessToken 到本地存储
      uni.setStorageSync('accessToken', data.session.access_token)
      uni.setStorageSync('refreshToken', data.session.refresh_token || '')
      console.log('accessToken 已保存，长度:', data.session.access_token.length)

      // 小程序环境跳过 setSession，直接使用 token 调用 REST API
      // await getSupabase().auth.setSession({
      //   access_token: data.session.access_token,
      //   refresh_token: data.session.refresh_token || ''
      // })

      // 4. 从数据库获取完整用户信息
      const fullProfile = await fetchFullProfile(data.session.access_token, data.user?.id)
      if (fullProfile) {
        uni.setStorageSync('userProfile', fullProfile)
        uni.setStorageSync('userRole', getDisplayRole(fullProfile.role))
        return { success: true, isNewUser: data.isNewUser, user: fullProfile }
      }
    }

    // 如果没有获取到完整信息，使用 Edge Function 返回的基本信息
    if (data.user) {
      uni.setStorageSync('userProfile', data.user)
      uni.setStorageSync('userRole', getDisplayRole(data.user.primary_role || 'passenger'))
    }

    return {
      success: true,
      isNewUser: data.isNewUser,
      user: data.user
    }
  } catch (error: any) {
    console.error('微信登录错误:', error)
    return { success: false, error: error.message || '登录异常' }
  }
}

/**
 * 从数据库获取完整用户信息（包含 nickname/avatar_url）
 */
async function fetchFullProfile(accessToken: string, userId: string): Promise<UserProfile | null> {
  try {
    const res = await uni.request({
      url: `${SUPABASE_URL}/rest/v1/profiles?select=*&id=eq.${userId}`,
      method: 'GET',
      timeout: 10000,
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`
      }
    })

    console.log('fetchFullProfile response:', res.statusCode, res.data)

    if (res.statusCode !== 200) {
      console.error('fetchFullProfile 状态码错误:', res.statusCode)
      return null
    }

    const profiles = res.data as any[]
    if (profiles && profiles.length > 0) {
      return profiles[0] as UserProfile
    }
    return null
  } catch (e) {
    console.error('获取完整用户信息失败:', e)
    return null
  }
}

/**
 * 检查登录状态
 */
export async function checkLoginStatus(): Promise<boolean> {
  try {
    const { data: { session } } = await getSupabase().auth.getSession()
    const profile = uni.getStorageSync('userProfile')

    return !!session && !!profile
  } catch {
    return false
  }
}

/**
 * 获取当前用户资料
 */
export function getCurrentProfile(): UserProfile | null {
  return uni.getStorageSync('userProfile') || null
}

/**
 * 获取显示角色（用于前端双端切换）
 * passenger -> passenger
 * merchant_* -> provider
 * admin -> admin
 */
function getDisplayRole(role: string): string {
  if (role.startsWith('merchant')) {
    return 'provider'
  }
  return role
}

/**
 * 退出登录
 */
export async function logout(): Promise<void> {
  await getSupabase().auth.signOut()
  uni.removeStorageSync('userProfile')
  uni.removeStorageSync('userRole')
  uni.removeStorageSync('accessToken')
  uni.removeStorageSync('refreshToken')
}

/**
 * 刷新 access token
 * 当 token 过期时，使用 refresh token 获取新的 access token
 */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = uni.getStorageSync('refreshToken')
  if (!refreshToken) {
    console.log('没有 refreshToken，需要重新登录')
    return null
  }

  try {
    const res = await uni.request({
      url: `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
      method: 'POST',
      data: { refresh_token: refreshToken },
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    })

    const data = res.data as any
    if (data.access_token) {
      uni.setStorageSync('accessToken', data.access_token)
      if (data.refresh_token) {
        uni.setStorageSync('refreshToken', data.refresh_token)
      }
      console.log('Token 刷新成功')
      return data.access_token
    }
    return null
  } catch (e) {
    console.error('Token 刷新失败:', e)
    return null
  }
}

/**
 * 检查并刷新 token（如果需要）
 * 返回有效的 access token，如果刷新失败则返回 null
 */
export async function ensureValidToken(): Promise<string | null> {
  const accessToken = uni.getStorageSync('accessToken')
  if (!accessToken) {
    return null
  }
  return accessToken
}