/**
 * Supabase 客户端配置
 * 用于 LuxeWay Web 管理后台
 */

import { createClient } from '@supabase/supabase-js'

// Supabase 项目配置
const SUPABASE_URL = 'https://qcsmavxqjofrhrdwgkpt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjc21hdnhxam9mcmhyZHdna3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3OTU2OTUsImV4cCI6MjA5MTM3MTY5NX0.zM4mVvvZAylQIXZFrnzaSAy_MGqTvR3hrSWfSSP8xRQ'

// 创建 Supabase 客户端
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})

// 用户角色类型
export type UserRole = 'passenger' | 'merchant_owner' | 'merchant_dispatcher' | 'merchant_driver' | 'admin'

// 商家审核状态类型
export type MerchantReviewStatus = 'pending' | 'approved' | 'rejected'

// 商家类型
export type MerchantType = 'individual' | 'company'

// 订单状态类型
export type DemandStatus = 'PENDING' | 'BIDDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

// 报价状态类型
export type BidStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'

// 车辆状态类型
export type VehicleStatus = 'active' | 'inactive' | 'maintenance'

// 司机状态类型
export type DriverStatus = 'pending' | 'active' | 'inactive'

// 用户资料接口
export interface UserProfile {
  id: string
  role: UserRole
  name: string | null
  nickname: string | null
  phone: string | null
  merchant_id: string | null
  avatar_url: string | null
  disabled?: boolean
  disabled_at?: string | null
  created_at: string
  updated_at: string
}

// 商家接口
export interface Merchant {
  id: string
  owner_user_id: string
  type: MerchantType
  company_name: string | null
  contact_name: string
  contact_phone: string
  description: string | null
  license_number: string | null
  license_image_url: string | null
  review_status: MerchantReviewStatus
  review_note: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  disabled?: boolean
  disabled_at?: string | null
  rating_avg: number
  order_count: number
  created_at: string
  updated_at: string
}

// 车辆接口
export interface Vehicle {
  id: string
  merchant_id: string
  plate_number: string
  model: string
  seats: number
  color: string | null
  front_image_url: string | null
  side_image_url: string | null
  interior_image_url: string | null
  driver_license_url: string | null
  driver_license_no: string | null
  status: VehicleStatus
  created_at: string
  updated_at: string
}

// 司机接口
export interface Driver {
  id: string
  merchant_id: string
  user_id: string | null
  phone: string
  name: string | null
  role: string
  status: DriverStatus
  created_at: string
  updated_at: string
}

// 订单/需求接口
export interface Demand {
  id: string
  passenger_id: string
  type: string
  start_address: string
  end_address: string
  start_location: any | null
  end_location: any | null
  earliest_departure: string
  latest_departure: string
  passenger_count: number
  requirements: string | null
  status: DemandStatus
  created_at: string
  updated_at: string
}

// 报价接口
export interface Bid {
  id: string
  demand_id: string
  provider_id: string
  merchant_id: string
  price: number
  car_model: string | null
  car_image: string | null
  message: string | null
  status: BidStatus
  created_at: string
  expires_at: string
}