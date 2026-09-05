<template>
  <view class="admin-container">
    <!-- Header -->
    <view class="admin-header">
      <text class="admin-title">平台管理</text>
      <text class="admin-name">{{ userProfile?.name || '管理员' }}</text>
    </view>

    <!-- Stats Overview -->
    <view class="stats-section">
      <view class="stats-card">
        <text class="stats-value">{{ pendingMerchants }}</text>
        <text class="stats-label">待审核商家</text>
      </view>
      <view class="stats-card">
        <text class="stats-value">{{ totalMerchants }}</text>
        <text class="stats-label">商家总数</text>
      </view>
      <view class="stats-card">
        <text class="stats-value">{{ totalUsers }}</text>
        <text class="stats-label">用户总数</text>
      </view>
      <view class="stats-card">
        <text class="stats-value">{{ totalOrders }}</text>
        <text class="stats-label">订单总数</text>
      </view>
    </view>

    <!-- Pending Reviews -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">商家入驻审核</text>
        <view class="section-badge" v-if="pendingMerchants > 0">
          <text class="badge-text">{{ pendingMerchants }}</text>
        </view>
      </view>

      <view class="merchant-card" v-for="merchant in pendingMerchantList" :key="merchant.id" @click="goToReview(merchant)">
        <view class="merchant-info">
          <text class="merchant-name">{{ merchant.company_name || merchant.contact_name }}</text>
          <text class="merchant-type">{{ merchant.type === 'company' ? '企业车队' : '个人司机' }}</text>
          <text class="merchant-time">申请时间：{{ formatTime(merchant.created_at) }}</text>
        </view>
        <view class="merchant-status pending">
          <text class="status-text">待审核</text>
        </view>
      </view>

      <view class="empty-tip" v-if="pendingMerchantList.length === 0">
        <text>暂无待审核商家</text>
      </view>
    </view>

    <!-- Account Actions -->
    <view class="section">
      <text class="section-title">账号操作</text>
      <view class="account-actions">
        <view class="account-item" @click="switchToPassenger">
          <text class="account-text">切换到乘客模式</text>
          <uni-icons type="right" size="16" color="#666"></uni-icons>
        </view>
        <view class="account-item" @click="switchToProvider">
          <text class="account-text">切换到商家模式</text>
          <uni-icons type="right" size="16" color="#666"></uni-icons>
        </view>
        <view class="account-item logout" @click="handleLogout">
          <text class="logout-text">退出登录</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase'

const userProfile = ref<any>(null)
const userRoles = ref<any[]>([])
const userPermissions = ref<string[]>([])
const pendingMerchants = ref(0)
const totalMerchants = ref(0)
const totalUsers = ref(0)
const totalOrders = ref(0)
const pendingMerchantList = ref<any[]>([])

// 权限检查函数
const hasPermission = (permission: string): boolean => {
  return userPermissions.value.includes(permission)
}

const hasRole = (roleName: string): boolean => {
  return userRoles.value.some(r => r.name === roleName)
}

const canApproveMerchant = (): boolean => {
  return hasPermission('merchant:approve') || hasRole('admin')
}

onMounted(() => {
  userProfile.value = uni.getStorageSync('userProfile')
  userRoles.value = uni.getStorageSync('userRoles') || []
  userPermissions.value = uni.getStorageSync('userPermissions') || []

  // 检查是否有管理员权限
  if (!hasRole('admin') && !hasPermission('merchant:approve')) {
    uni.showModal({
      title: '权限不足',
      content: '您没有管理后台访问权限',
      showCancel: false,
      success: () => {
        uni.reLaunch({ url: '/pages/index/index' })
      }
    })
    return
  }

  loadStats()
  loadPendingMerchants()
})

const loadStats = async () => {
  try {
    // 加载统计数据
    const accessToken = uni.getStorageSync('accessToken')

    // 商家总数
    const merchantsRes = await uni.request({
      url: `${SUPABASE_URL}/rest/v1/merchants?select=count`,
      method: 'GET',
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken || 'dummy'}`,
        'Prefer': 'count=exact'
      }
    })
    totalMerchants.value = parseInt(merchantsRes.header?.['content-range']?.split('/')?.[1] || '0')

    // 用户总数
    const usersRes = await uni.request({
      url: `${SUPABASE_URL}/rest/v1/profiles?select=count`,
      method: 'GET',
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken || 'dummy'}`,
        'Prefer': 'count=exact'
      }
    })
    totalUsers.value = parseInt(usersRes.header?.['content-range']?.split('/')?.[1] || '0')

    // 订单总数（demands）
    const ordersRes = await uni.request({
      url: `${SUPABASE_URL}/rest/v1/demands?select=count`,
      method: 'GET',
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken || 'dummy'}`,
        'Prefer': 'count=exact'
      }
    })
    totalOrders.value = parseInt(ordersRes.header?.['content-range']?.split('/')?.[1] || '0')

    // 待审核商家数量
    const pendingRes = await uni.request({
      url: `${SUPABASE_URL}/rest/v1/merchants?review_status=eq.pending&select=count`,
      method: 'GET',
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken || 'dummy'}`,
        'Prefer': 'count=exact'
      }
    })
    pendingMerchants.value = parseInt(pendingRes.header?.['content-range']?.split('/')?.[1] || '0')
  } catch (e) {
    console.error('加载统计失败', e instanceof Error ? e.message : 'unknown error')
  }
}

const loadPendingMerchants = async () => {
  try {
    const accessToken = uni.getStorageSync('accessToken')

    const res = await uni.request({
      url: `${SUPABASE_URL}/rest/v1/merchants?review_status=eq.pending&select=*&order=created_at.desc&limit=10`,
      method: 'GET',
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken || 'dummy'}`
      }
    })

    if (res.statusCode === 200) {
      pendingMerchantList.value = res.data as any[]
    }
  } catch (e) {
    console.error('加载待审核商家失败', e instanceof Error ? e.message : 'unknown error')
  }
}

const formatTime = (time: string) => {
  if (!time) return ''
  const date = new Date(time)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
}

const goToReview = (merchant: any) => {
  uni.navigateTo({ url: `/pages/admin/review?id=${merchant.id}` })
}

const switchToPassenger = () => {
  uni.setStorageSync('userRole', 'passenger')
  uni.reLaunch({ url: '/pages/index/index' })
}

const switchToProvider = () => {
  uni.setStorageSync('userRole', 'provider')
  uni.reLaunch({ url: '/pages/provider/workbench' })
}

const handleLogout = () => {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        uni.clearStorageSync()
        uni.reLaunch({ url: '/pages/login/index' })
      }
    }
  })
}
</script>

<style scoped>
.admin-container {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 24rpx 32rpx;
}

/* Header */
.admin-header {
  background: #000;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
}

.admin-title {
  font-size: 36rpx;
  color: #fff;
  font-weight: 600;
  display: block;
  margin-bottom: 8rpx;
}

.admin-name {
  font-size: 28rpx;
  color: rgba(255,255,255,0.8);
}

/* Stats */
.stats-section {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.stats-card {
  flex: 1;
  background: #fff;
  border-radius: 12rpx;
  padding: 20rpx;
  text-align: center;
}

.stats-value {
  font-size: 32rpx;
  color: #000;
  font-weight: 600;
  display: block;
  margin-bottom: 8rpx;
}

.stats-label {
  font-size: 24rpx;
  color: #666;
}

/* Section */
.section {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 28rpx;
  color: #000;
  font-weight: 600;
}

.section-badge {
  background: #ef4444;
  border-radius: 20rpx;
  padding: 4rpx 12rpx;
}

.badge-text {
  font-size: 24rpx;
  color: #fff;
}

/* Merchant Card */
.merchant-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 2rpx solid #f0f0f0;
}

.merchant-card:last-child {
  border-bottom: none;
}

.merchant-info {
  flex: 1;
}

.merchant-name {
  font-size: 28rpx;
  color: #000;
  font-weight: 500;
  display: block;
  margin-bottom: 8rpx;
}

.merchant-type {
  font-size: 24rpx;
  color: #666;
  display: block;
  margin-bottom: 4rpx;
}

.merchant-time {
  font-size: 22rpx;
  color: #999;
}

.merchant-status {
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
}

.merchant-status.pending {
  background: #fef3c7;
}

.status-text {
  font-size: 24rpx;
  color: #92400e;
}

.empty-tip {
  text-align: center;
  padding: 32rpx;
}

.empty-tip text {
  font-size: 26rpx;
  color: #999;
}

/* Account Actions */
.account-actions {
  margin-top: 16rpx;
}

.account-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 2rpx solid #f0f0f0;
}

.account-item:last-child {
  border-bottom: none;
}

.account-text {
  font-size: 28rpx;
  color: #000;
}

.account-item.logout {
  justify-content: center;
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 20rpx;
  border-bottom: none;
  margin-top: 16rpx;
}

.logout-text {
  font-size: 28rpx;
  color: #ef4444;
}
</style>
