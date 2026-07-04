<template>
  <view class="container">
    <!-- 管理员视图 -->
    <template v-if="isAdmin">
      <view class="admin-header">
        <view class="admin-avatar">
          <text class="admin-avatar-text">管</text>
        </view>
        <view class="admin-info">
          <text class="admin-name">平台管理员</text>
          <text class="admin-role">管理商家审核、用户投诉等</text>
        </view>
      </view>

      <!-- 管理员快捷操作 -->
      <view class="menu-section">
        <text class="section-title">快捷操作</text>
        <view class="menu-list">
          <view class="menu-item" @click="goToAdminHome">
            <text>商家审核</text>
            <text class="arrow">›</text>
          </view>
          <view class="menu-item" @click="showTip">
            <text>用户管理</text>
            <text class="arrow">›</text>
          </view>
          <view class="menu-item" @click="showTip">
            <text>订单管理</text>
            <text class="arrow">›</text>
          </view>
          <view class="menu-item" @click="showTip">
            <text>数据统计</text>
            <text class="arrow">›</text>
          </view>
        </view>
      </view>

      <!-- 模式切换 -->
      <view class="menu-section">
        <text class="section-title">模式切换</text>
        <view class="menu-list">
          <view class="menu-item" @click="switchToPassenger">
            <text>切换到乘客模式</text>
            <text class="arrow">›</text>
          </view>
          <view class="menu-item" @click="switchToProvider">
            <text>切换到商家模式</text>
            <text class="arrow">›</text>
          </view>
        </view>
      </view>

      <!-- 其他 -->
      <view class="menu-section">
        <text class="section-title">其他</text>
        <view class="menu-list">
          <view class="menu-item logout" @click="handleLogout">
            <text class="logout-text">退出登录</text>
          </view>
        </view>
      </view>
    </template>

    <!-- 普通用户视图 -->
    <template v-else>
      <!-- 用户头部信息 -->
      <view class="user-header">
        <button class="avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
          <view class="avatar">
            <image v-if="userInfo.avatar_url" :src="userInfo.avatar_url" class="avatar-img" mode="aspectFill" />
            <text v-else class="avatar-text">{{ userInfo.nickname?.charAt(0) || 'U' }}</text>
          </view>
        </button>
        <view class="info">
          <input
            v-if="editingNickname"
            type="nickname"
            class="nickname-input"
            :value="userInfo.nickname"
            @blur="onNicknameBlur"
            @confirm="onNicknameConfirm"
            @input="onNicknameInput"
            placeholder="点击设置昵称"
            focus
          />
          <text v-else class="nickname" @click="startEditNickname">{{ userInfo.nickname || '点击设置昵称' }}</text>
          <text class="phone">{{ userInfo.phone || '未绑定手机' }}</text>
        </view>
      </view>

      <!-- 车队管理区域（所有商家角色可见，或在商家模式下显示） -->
      <view class="fleet-section" v-if="isFleetMember || isProviderMode">
        <text class="section-title">车队服务</text>
        <view class="fleet-grid">
          <view class="fleet-grid-item" @click="goToWorkbench">
            <uni-icons type="hand-up" size="24" color="#000"></uni-icons>
            <text class="fleet-grid-text">接单工作台</text>
          </view>
          <view class="fleet-grid-item" @click="goToProviderOrders">
            <uni-icons type="list" size="24" color="#000"></uni-icons>
            <text class="fleet-grid-text">我的订单</text>
          </view>
          <view class="fleet-grid-item" v-if="isFleetManager" @click="goToFleetManage">
            <uni-icons type="settings" size="24" color="#000"></uni-icons>
            <text class="fleet-grid-text">我的车队</text>
          </view>
        </view>
      </view>

      <!-- 车主身份卡片（仅司机显示） -->
      <view class="driver-card" v-if="driverInfo && !isFleetManager">
        <view class="driver-header">
          <view class="driver-badge">
            <uni-icons type="person-filled" size="20" color="#000"></uni-icons>
            <text class="driver-badge-text">车主身份</text>
          </view>
          <text class="driver-status" :class="{ active: driverInfo.status === 'active' }">{{ driverInfo.status === 'active' ? '已绑定' : '待确认' }}</text>
        </view>
        <view class="driver-body">
          <text class="driver-company">{{ driverInfo.merchant_name }}</text>
          <text class="driver-desc">您已被添加到该车队</text>
        </view>
        <view class="driver-footer">
          <button class="unbind-btn" @click="handleUnbind">解除绑定</button>
        </view>
      </view>

      <!-- 绑定手机号提示 -->
      <view class="bind-card" v-if="!userInfo.phone && !driverInfo">
        <view class="bind-header">
          <text class="bind-title">绑定手机号</text>
          <text class="bind-desc">绑定后可接收车队邀请通知</text>
        </view>
        <view class="bind-form">
          <input
            class="bind-input"
            v-model="bindPhone"
            type="number"
            placeholder="请输入手机号"
            maxlength="11"
          />
          <button class="bind-btn" :disabled="!isPhoneValid" @click="handleBindPhone">绑定手机号</button>
        </view>
      </view>

      <!-- 我的菜单 -->
      <view class="menu-section">
        <text class="section-title">我的服务</text>
        <view class="menu-list">
          <view class="menu-item" @click="goToOrders">
            <text>我的订单</text>
            <text class="arrow">›</text>
          </view>
          <view class="menu-item" @click="goToTrips" v-if="!isProviderMode">
            <text>我的行程</text>
            <text class="arrow">›</text>
          </view>
          <view class="menu-item">
            <text>常用地址</text>
            <text class="arrow">›</text>
          </view>
          <view class="menu-item">
            <text>优惠券</text>
            <text class="arrow">›</text>
          </view>
        </view>
      </view>

      <!-- 模式切换（多角色用户可见） -->
      <view class="menu-section" v-if="isFleetMember && !isProviderMode">
        <text class="section-title">模式切换</text>
        <view class="menu-list">
          <view class="menu-item" @click="switchToProvider">
            <text>切换到商家模式</text>
            <text class="arrow">›</text>
          </view>
        </view>
      </view>

      <view class="menu-section" v-if="isProviderMode && isFleetMember">
        <text class="section-title">模式切换</text>
        <view class="menu-list">
          <view class="menu-item" @click="switchToPassenger">
            <text>切换到乘客模式</text>
            <text class="arrow">›</text>
          </view>
        </view>
      </view>

      <!-- 其他菜单 -->
      <view class="menu-section">
        <text class="section-title">其他</text>
        <view class="menu-list">
          <!-- 管理员返回入口 -->
          <view class="menu-item admin-return" v-if="isAdminViewingAsUser" @click="returnToAdminMode">
            <uni-icons type="eye" size="18" color="#000"></uni-icons>
            <text class="admin-return-text">返回管理员模式</text>
            <text class="arrow">›</text>
          </view>
          <view class="menu-item" @click="goToAgreement('user')">
            <text>用户协议</text>
            <text class="arrow">›</text>
          </view>
          <view class="menu-item" @click="goToAgreement('privacy')">
            <text>隐私政策</text>
            <text class="arrow">›</text>
          </view>
          <view class="menu-item">
            <text>联系客服</text>
            <text class="arrow">›</text>
          </view>
          <view class="menu-item">
            <text>设置</text>
            <text class="arrow">›</text>
          </view>
          <view class="menu-item logout" @click="handleLogout">
            <text class="logout-text">退出登录</text>
          </view>
        </view>
      </view>

      <CustomTabBar :current="1" />
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import CustomTabBar from '@/components/CustomTabBar.vue'
import { getCurrentProfile } from '@/services/wechatAuth'

const SUPABASE_URL = 'https://qcsmavxqjofrhrdwgkpt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjc21hdnhxam9mcmhyZHdna3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3OTU2OTUsImV4cCI6MjA5MTM3MTY5NX0.zM4mVvvZAylQIXZFrnzaSAy_MGqTvR3hrSWfSSP8xRQ'

const userInfo = ref({
  nickname: '',
  phone: '',
  avatar_url: ''
})

const editingNickname = ref(false)
const driverInfo = ref<any>(null)
const bindPhone = ref('')

// 手机号正则表达式
const PHONE_REGEX = /^(?:\+?86)?1(?:3\d{3}|5[^4\D]\d{2}|8\d{3}|7(?:[235-8]\d{2}|4(?:0\d|1[0-2]|9\d))|9[0-35-9]\d{2}|66\d{2})\d{6}$/

// 手机号校验
const isPhoneValid = computed(() => {
  return PHONE_REGEX.test(bindPhone.value)
})

const isAdmin = computed(() => {
  const userProfile = uni.getStorageSync('userProfile')
  const userRole = uni.getStorageSync('userRole')
  // 检查 roles 数组中是否有 admin 角色，或 display_role 为 admin
  const roles = userProfile?.roles || []
  const hasAdminRole = roles.some((r: any) => r.name === 'admin') || userProfile?.display_role === 'admin'
  return hasAdminRole && userRole === 'admin'
})

const isAdminViewingAsUser = computed(() => {
  const userProfile = uni.getStorageSync('userProfile')
  const userRole = uni.getStorageSync('userRole')
  // 检查 roles 数组中是否有 admin 角色，但当前模式不是 admin
  const roles = userProfile?.roles || []
  const hasAdminRole = roles.some((r: any) => r.name === 'admin') || userProfile?.display_role === 'admin'
  return hasAdminRole && userRole !== 'admin'
})

const isFleetManager = computed(() => {
  const userProfile = uni.getStorageSync('userProfile')
  // 检查 roles 数组中是否有车队管理角色
  const roles = userProfile?.roles || []
  const hasFleetRole = roles.some((r: any) => r.name === 'merchant_owner' || r.name === 'merchant_dispatcher')
  // 或者 merchant_id 存在（兼容旧数据）
  return hasFleetRole || userProfile?.merchant_id
})

// 车队成员（包含管理员、调度员、司机）
const isFleetMember = computed(() => {
  const userProfile = uni.getStorageSync('userProfile')
  const roles = userProfile?.roles || []
  // 检查是否有任何商家相关角色
  const hasMerchantRole = roles.some((r: any) =>
    r.name === 'merchant_owner' ||
    r.name === 'merchant_dispatcher' ||
    r.name === 'merchant_driver'
  )
  return hasMerchantRole || userProfile?.merchant_id
})

// 是否在商家模式
const isProviderMode = computed(() => {
  return uni.getStorageSync('userRole') === 'provider'
})

const fleetRoleName = computed(() => {
  const userProfile = uni.getStorageSync('userProfile')
  const roles = userProfile?.roles || []

  // 从 roles 数组中找到商家角色
  const merchantRole = roles.find((r: any) =>
    r.name === 'merchant_owner' || r.name === 'merchant_dispatcher' || r.name === 'merchant_driver'
  )

  if (merchantRole?.name === 'merchant_owner') return '管理员'
  if (merchantRole?.name === 'merchant_dispatcher') return '调度员'
  return '司机'
})

onMounted(() => {
  loadUserInfo()
  loadDriverInfo()
})

const loadUserInfo = () => {
  const userProfile = uni.getStorageSync('userProfile')
  if (userProfile) {
    userInfo.value = {
      // 优先使用 nickname，如果没有则使用 name
      nickname: userProfile.nickname || userProfile.name || '',
      phone: userProfile.phone || '',
      avatar_url: userProfile.avatar_url || ''
    }
  }
}

const loadDriverInfo = async () => {
  const userProfile = uni.getStorageSync('userProfile')
  const accessToken = uni.getStorageSync('accessToken')

  if (!userProfile?.id || userProfile.role === 'admin') return

  // 检查是否被企业添加为司机
  try {
    const res = await uni.request({
      url: `${SUPABASE_URL}/rest/v1/drivers?user_id=eq.${userProfile.id}&select=*,merchants(company_name)`,
      method: 'GET',
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (res.statusCode === 200 && (res.data as any[]).length > 0) {
      const driver = (res.data as any[])[0]
      driverInfo.value = {
        status: driver.status,
        merchant_name: driver.merchants?.company_name || '车队'
      }
    }
  } catch (e) {
    console.error('加载司机信息失败', e)
  }
}

const onChooseAvatar = (e: any) => {
  userInfo.value.avatar_url = e.detail.avatarUrl
  saveProfile()
}

const startEditNickname = () => {
  editingNickname.value = true
}

const onNicknameInput = (e: any) => {
  userInfo.value.nickname = e.detail.value
}

const onNicknameBlur = () => {
  editingNickname.value = false
  if (userInfo.value.nickname) {
    saveProfile()
  }
}

const onNicknameConfirm = (e: any) => {
  userInfo.value.nickname = e.detail.value
  editingNickname.value = false
  if (userInfo.value.nickname) {
    saveProfile()
  }
}

const saveProfile = async () => {
  const accessToken = uni.getStorageSync('accessToken')
  const userProfile = uni.getStorageSync('userProfile')

  if (!accessToken || !userProfile?.id) return

  try {
    await uni.request({
      url: `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userProfile.id}`,
      method: 'PATCH',
      data: {
        nickname: userInfo.value.nickname,
        name: userInfo.value.nickname,
        avatar_url: userInfo.value.avatar_url
      },
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      }
    })

    // 更新本地存储
    uni.setStorageSync('userProfile', {
      ...userProfile,
      nickname: userInfo.value.nickname,
      name: userInfo.value.nickname,
      avatar_url: userInfo.value.avatar_url
    })
  } catch (e) {
    console.error('保存用户信息失败', e)
  }
}

// 手动绑定手机号
const handleBindPhone = async () => {
  if (!isPhoneValid.value) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }

  const accessToken = uni.getStorageSync('accessToken')
  const userProfile = uni.getStorageSync('userProfile')

  if (!accessToken || !userProfile?.id) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }

  try {
    uni.showLoading({ title: '绑定中...' })

    // 直接更新 profiles 表
    const res = await uni.request({
      url: `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userProfile.id}`,
      method: 'PATCH',
      data: { phone: bindPhone.value },
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    })

    if (res.statusCode === 200) {
      userInfo.value.phone = bindPhone.value
      uni.setStorageSync('userProfile', { ...userProfile, phone: bindPhone.value })
      bindPhone.value = ''

      uni.hideLoading()
      uni.showToast({ title: '绑定成功', icon: 'success' })
    } else {
      uni.hideLoading()
      uni.showToast({ title: '绑定失败', icon: 'none' })
    }
  } catch (e) {
    uni.hideLoading()
    console.error('绑定手机号失败', e)
    uni.showToast({ title: '绑定失败', icon: 'none' })
  }
}

const handleUnbind = async () => {
  uni.showModal({
    title: '确认解绑',
    content: '解绑后将无法接单，确定要解绑吗？',
    success: async (res) => {
      if (res.confirm) {
        const accessToken = uni.getStorageSync('accessToken')
        const userProfile = uni.getStorageSync('userProfile')

        try {
          // 更新 drivers 表状态
          await uni.request({
            url: `${SUPABASE_URL}/rest/v1/drivers?user_id=eq.${userProfile.id}`,
            method: 'PATCH',
            data: { status: 'unbound', user_id: null },
            header: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            }
          })

          // 更新 profiles 表
          await uni.request({
            url: `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userProfile.id}`,
            method: 'PATCH',
            data: { merchant_id: null, role: 'passenger' },
            header: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            }
          })

          driverInfo.value = null
          uni.setStorageSync('userProfile', { ...userProfile, merchant_id: null, role: 'passenger' })
          uni.setStorageSync('userRole', 'passenger')

          uni.showToast({ title: '已解绑', icon: 'success' })
        } catch (e) {
          console.error('解绑失败', e)
          uni.showToast({ title: '解绑失败', icon: 'none' })
        }
      }
    }
  })
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

const goToOrders = () => {
  uni.navigateTo({ url: '/pages/passenger/orders' })
}

const goToTrips = () => {
  uni.navigateTo({ url: '/pages/passenger/bid_list' })
}

const goToAgreement = (type: 'user' | 'privacy') => {
  uni.navigateTo({ url: `/pages/common/agreement?type=${type}` })
}

const goToFleetManage = () => {
  uni.navigateTo({ url: '/pages/provider/fleet_manage' })
}

// 车主服务方法
const goToWorkbench = () => {
  uni.navigateTo({ url: '/pages/provider/workbench' })
}
const goToProviderOrders = () => {
  uni.navigateTo({ url: '/pages/provider/orders' })
}

// 管理员专用方法
const goToAdminHome = () => {
  uni.navigateTo({ url: '/pages/admin/index' })
}

const showTip = () => {
  uni.showToast({ title: '功能待开发', icon: 'none' })
}

const switchToPassenger = () => {
  uni.setStorageSync('userRole', 'passenger')
  uni.reLaunch({ url: '/pages/index/index' })
}

const switchToProvider = () => {
  uni.setStorageSync('userRole', 'provider')
  uni.reLaunch({ url: '/pages/provider/workbench' })
}

const returnToAdminMode = () => {
  uni.setStorageSync('userRole', 'admin')
  uni.reLaunch({ url: '/pages/admin/index' })
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 24rpx 32rpx;
}

/* 管理员头部 */
.admin-header {
  background: #000;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.admin-avatar {
  width: 80rpx;
  height: 80rpx;
  background: #fff;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.admin-avatar-text {
  font-size: 36rpx;
  color: #000;
  font-weight: 600;
}

.admin-info {
  flex: 1;
}

.admin-name {
  font-size: 32rpx;
  color: #fff;
  font-weight: 600;
  display: block;
  margin-bottom: 8rpx;
}

.admin-role {
  font-size: 26rpx;
  color: rgba(255,255,255,0.7);
}

/* 用户头部 */
.user-header {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.avatar-btn {
  background: transparent;
  border: none;
  padding: 0;
}

.avatar-btn::after {
  border: none;
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  background: #000;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-img {
  width: 80rpx;
  height: 80rpx;
  border-radius: 12rpx;
}

.avatar-text {
  font-size: 36rpx;
  color: #fff;
  font-weight: 600;
}

.info {
  flex: 1;
}

.nickname {
  font-size: 32rpx;
  color: #000;
  font-weight: 600;
  display: block;
  margin-bottom: 8rpx;
}

.nickname-input {
  font-size: 32rpx;
  color: #000;
  font-weight: 600;
  background: transparent;
  padding: 0;
  margin-bottom: 8rpx;
}

.phone {
  font-size: 26rpx;
  color: #666;
}

/* 车主卡片 */
.driver-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.driver-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.driver-badge {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.driver-badge-text {
  font-size: 26rpx;
  color: #000;
  font-weight: 500;
}

.driver-status {
  font-size: 24rpx;
  color: #999;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  background: #f5f5f5;
}

.driver-status.active {
  color: #fff;
  background: #000;
}

.driver-body {
  margin-bottom: 16rpx;
}

.driver-company {
  font-size: 28rpx;
  color: #000;
  display: block;
  margin-bottom: 8rpx;
}

.driver-desc {
  font-size: 26rpx;
  color: #666;
}

.driver-footer {
  display: flex;
  justify-content: flex-end;
}

.unbind-btn {
  background: #f5f5f5;
  color: #666;
  font-size: 26rpx;
  padding: 12rpx 24rpx;
  border-radius: 8rpx;
  border: none;
}

.unbind-btn::after {
  border: none;
}

/* 车队服务区域 */
.fleet-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.fleet-grid {
  display: flex;
  justify-content: space-around;
  padding: 16rpx 0;
}

.fleet-grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx;
}

.fleet-grid-text {
  font-size: 26rpx;
  color: #000;
  font-weight: 500;
}

/* 切换提示 */
.switch-tip {
  text-align: center;
  padding: 16rpx;
  margin-top: 16rpx;
  background: #f0f0f0;
  border-radius: 12rpx;
}

.switch-tip text {
  font-size: 26rpx;
  color: #666;
}

/* 车队管理卡片 */
.fleet-manage-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.fleet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.fleet-title {
  font-size: 28rpx;
  color: #000;
  font-weight: 600;
}

.fleet-role {
  font-size: 24rpx;
  color: #fff;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  background: #000;
}

.fleet-actions {
  display: flex;
  flex-direction: column;
}

.fleet-action-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 0;
  border-bottom: 2rpx solid #f0f0f0;
}

.fleet-action-item:last-child {
  border-bottom: none;
}

.fleet-action-text {
  font-size: 28rpx;
  color: #000;
}

/* 绑定手机号卡片 */
.bind-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.bind-header {
  margin-bottom: 16rpx;
}

.bind-title {
  font-size: 28rpx;
  color: #000;
  font-weight: 500;
  display: block;
  margin-bottom: 8rpx;
}

.bind-desc {
  font-size: 26rpx;
  color: #666;
}

.bind-form {
  display: flex;
  gap: 16rpx;
}

.bind-input {
  flex: 1;
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  color: #000;
}

.bind-btn {
  width: 200rpx;
  background: #000;
  color: #fff;
  font-size: 26rpx;
  border-radius: 12rpx;
  height: 80rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bind-btn::after {
  border: none;
}

.bind-btn[disabled] {
  background: #ccc;
  color: #fff;
}

/* 菜单区域 */
.menu-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 28rpx;
  color: #000;
  font-weight: 600;
  display: block;
  margin-bottom: 20rpx;
}

.menu-list {
  display: flex;
  flex-direction: column;
}

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 2rpx solid #f0f0f0;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item text:first-child {
  font-size: 28rpx;
  color: #000;
}

.arrow {
  font-size: 32rpx;
  color: #ccc;
}

.menu-item.logout {
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

/* 管理员返回入口 */
.menu-item.admin-return {
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: #f0f0f0;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
  border-bottom: none;
}

.admin-return-text {
  font-size: 28rpx;
  color: #000;
  font-weight: 500;
}
</style>