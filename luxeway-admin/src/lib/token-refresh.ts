/**
 * Token 刷新服务
 * 处理 access token 过期时的自动刷新
 */

import { getCookie, setCookie, removeCookie } from '@/lib/cookies'

const SUPABASE_URL = 'https://qcsmavxqjofrhrdwgkpt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjc21hdnhxam9mcmhyZHdna3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3OTU2OTUsImV4cCI6MjA5MTM3MTY5NX0.zM4mVvvZAylQIXZFrnzaSAy_MGqTvR3hrSWfSSP8xRQ'

const ACCESS_TOKEN_KEY = 'luxeway_admin_token'
const REFRESH_TOKEN_KEY = 'luxeway_refresh_token'

// 刷新状态管理，防止并发刷新
let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

/**
 * 获取当前 refresh token
 */
export function getRefreshToken(): string | null {
  const tokenData = getCookie(REFRESH_TOKEN_KEY)
  if (tokenData) {
    try {
      return JSON.parse(tokenData)
    } catch {
      return null
    }
  }
  return null
}

/**
 * 获取当前 access token
 */
export function getAccessToken(): string | null {
  const tokenData = getCookie(ACCESS_TOKEN_KEY)
  if (tokenData) {
    try {
      return JSON.parse(tokenData)
    } catch {
      return null
    }
  }
  return null
}

/**
 * 设置新的 access token
 */
export function setAccessToken(token: string): void {
  setCookie(ACCESS_TOKEN_KEY, JSON.stringify(token))
}

/**
 * 设置新的 refresh token
 */
export function setRefreshToken(token: string): void {
  setCookie(REFRESH_TOKEN_KEY, JSON.stringify(token))
}

/**
 * 清除所有 token
 */
export function clearTokens(): void {
  removeCookie(ACCESS_TOKEN_KEY)
  removeCookie(REFRESH_TOKEN_KEY)
}

/**
 * 使用 refresh token 刷新 access token
 * 返回是否刷新成功
 */
export async function refreshAccessToken(): Promise<boolean> {
  // 如果正在刷新，返回现有的 promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    console.error('没有 refresh token，无法刷新')
    return false
  }

  isRefreshing = true
  refreshPromise = performRefresh(refreshToken)

  try {
    const result = await refreshPromise
    return result
  } finally {
    isRefreshing = false
    refreshPromise = null
  }
}

/**
 * 执行实际的刷新请求
 */
async function performRefresh(refreshToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Token 刷新失败:', error)

      // 如果 refresh token 也过期了，清除所有 token
      if (response.status === 401 || error.error?.message?.includes('refresh token')) {
        clearTokens()
      }
      return false
    }

    const data = await response.json()

    // 更新 tokens
    if (data.access_token) {
      setAccessToken(data.access_token)
    }
    if (data.refresh_token) {
      setRefreshToken(data.refresh_token)
    }

    console.log('Token 刷新成功')
    return true
  } catch (error) {
    console.error('Token 刷新请求异常:', error)
    return false
  }
}

/**
 * 带自动刷新的 fetch 包装器
 * 当遇到 401 错误时，自动尝试刷新 token 并重试请求
 */
export async function fetchWithAuthRefresh(
  url: string,
  options: RequestInit = {},
  retryCount = 0
): Promise<Response> {
  const token = getAccessToken()

  const headers = new Headers(options.headers || {})
  headers.set('apikey', SUPABASE_ANON_KEY)
  headers.set('Authorization', token ? `Bearer ${token}` : `Bearer ${SUPABASE_ANON_KEY}`)
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  // 如果是 401 且还有 refresh token，尝试刷新
  if (response.status === 401 && retryCount < 1) {
    const refreshToken = getRefreshToken()

    if (refreshToken) {
      const refreshed = await refreshAccessToken()

      if (refreshed) {
        // 使用新 token 重试请求
        const newToken = getAccessToken()
        headers.set('Authorization', newToken ? `Bearer ${newToken}` : `Bearer ${SUPABASE_ANON_KEY}`)

        return fetch(url, {
          ...options,
          headers,
        })
      }
    }

    // 刷新失败或没有 refresh token，跳转到登录页
    if (typeof window !== 'undefined') {
      window.location.href = '/sign-in'
    }
  }

  return response
}