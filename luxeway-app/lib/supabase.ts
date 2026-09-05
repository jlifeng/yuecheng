/**
 * Supabase 客户端配置
 * 用于小程序与 Supabase 后端通信
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Supabase 项目配置通过本地 .env 文件注入，不要把 service_role key 放入客户端。
const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {}
export const SUPABASE_URL = env.VITE_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY ?? ''

// 自定义存储适配器（适配小程序环境）
const customStorageAdapter = {
  getItem: (key: string) => {
    return uni.getStorageSync(key) || null
  },
  setItem: (key: string, value: string) => {
    uni.setStorageSync(key, value)
  },
  removeItem: (key: string) => {
    uni.removeStorageSync(key)
  }
}

// Supabase 客户端实例（延迟初始化）
let supabaseInstance: SupabaseClient | null = null

/**
 * 获取 Supabase 客户端（延迟初始化）
 * 避免模块加载时就初始化导致编译问题
 */
export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: customStorageAdapter as any,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      }
    })
  }
  return supabaseInstance
}

// 导出便捷访问（兼容旧代码）
export const supabase = {
  get auth() { return getSupabase().auth },
  get from() { return getSupabase().from }
} as SupabaseClient

// 用户角色类型
export type UserRole = 'passenger' | 'merchant_owner' | 'merchant_dispatcher' | 'merchant_driver' | 'admin'

// 用户资料类型
export interface UserProfile {
  id: string
  role: UserRole
  name: string | null
  nickname: string | null
  phone: string | null
  merchant_id: string | null
  avatar_url: string | null
  wechat_openid: string | null
}
