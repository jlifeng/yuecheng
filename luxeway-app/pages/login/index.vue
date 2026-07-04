<template>
  <view class="login-container">
    <!-- Logo 区域 -->
    <view class="logo-section">
      <view class="logo">
        <text class="logo-text">LW</text>
      </view>
      <text class="app-name">LuxeWay</text>
      <text class="app-slogan">高端出行服务平台</text>
    </view>

    <!-- 登录模式切换 -->
    <view class="login-tabs">
      <view class="tab" :class="{ active: loginMode === 'wechat' }" @click="loginMode = 'wechat'">
        <text class="tab-text">微信登录</text>
      </view>
      <view class="tab" :class="{ active: loginMode === 'phone' }" @click="loginMode = 'phone'">
        <text class="tab-text">手机号登录</text>
      </view>
    </view>

    <!-- 微信登录 -->
    <view class="login-content" v-if="loginMode === 'wechat'">
      <view class="wechat-section">
        <text class="wechat-desc">使用微信账号快速登录</text>
        <button class="wechat-btn" @click="handleWechatLogin">
          <uni-icons type="weixin" size="24" color="#fff"></uni-icons>
          <text class="wechat-btn-text">微信一键登录</text>
        </button>
      </view>
    </view>

    <!-- 手机号登录 -->
    <view class="login-content" v-if="loginMode === 'phone'">
      <view class="form-section">
        <view class="form-item">
          <text class="form-label">手机号</text>
          <input class="form-input" v-model="phoneForm.phone" type="number" placeholder="请输入手机号" maxlength="11" />
        </view>
        <view class="form-item">
          <text class="form-label">密码</text>
          <input class="form-input" v-model="phoneForm.password" type="password" placeholder="请输入密码" />
        </view>
        <button class="submit-btn" :disabled="!canPhoneLogin" @click="handlePhoneLogin">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </view>
    </view>

    <!-- 协议 -->
    <view class="agreement">
      <view class="agreement-check" @click="agreed = !agreed">
        <view class="checkbox" :class="{ checked: agreed }">
          <uni-icons v-if="agreed" type="checkmarkempty" size="12" color="#fff"></uni-icons>
        </view>
        <text class="agreement-text">我已阅读并同意</text>
      </view>
      <text class="agreement-link" @click="showAgreement('user')">《用户协议》</text>
      <text class="agreement-text">和</text>
      <text class="agreement-link" @click="showAgreement('privacy')">《隐私政策》</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const SUPABASE_URL = 'https://qcsmavxqjofrhrdwgkpt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjc21hdnhxam9mcmhyZHdna3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3OTU2OTUsImV4cCI6MjA5MTM3MTY5NX0.zM4mVvvZAylQIXZFrnzaSAy_MGqTvR3hrSWfSSP8xRQ'

const loginMode = ref<'wechat' | 'phone'>('wechat')
const loading = ref(false)
const agreed = ref(false)

const phoneForm = ref({
  phone: '',
  password: ''
})

const canPhoneLogin = computed(() => {
  const result = phoneForm.value.phone.length === 11 &&
         phoneForm.value.password.length >= 6 &&
         agreed.value &&
         !loading.value
  console.log('canPhoneLogin:', result, {
    phone: phoneForm.value.phone.length,
    password: phoneForm.value.password.length,
    agreed: agreed.value,
    loading: loading.value
  })
  return result
})

onMounted(() => {
  // 检查是否已登录
  const userProfile = uni.getStorageSync('userProfile')
  const userRole = uni.getStorageSync('userRole')
  if (userProfile && userRole) {
    navigateToHome(userRole)
  }
})

// 微信登录（直接调用，无弹窗）
const handleWechatLogin = async () => {
  if (!agreed.value) {
    uni.showToast({ title: '请先同意用户协议', icon: 'none' })
    return
  }

  loading.value = true
  uni.showLoading({ title: '登录中...' })

  try {
    // 获取微信登录 code
    const loginRes = await uni.login()
    if (!loginRes.code) {
      throw new Error('获取微信登录凭证失败')
    }

    console.log('微信登录 code:', loginRes.code)

    // 调用后端进行微信登录
    const res = await uni.request({
      url: `${SUPABASE_URL}/functions/v1/wechat-login-v2`,
      method: 'POST',
      data: { code: loginRes.code },
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    })

    console.log('=== 微信登录响应 ===')
    console.log('success:', (res.data as any).success)

    const result = res.data as any

    if (result.success && result.user) {
      const accessToken = result.session?.access_token || result.accessToken || ''
      const refreshToken = result.session?.refresh_token || result.refreshToken || ''

      console.log('保存 accessToken:', accessToken.length, '字符')

      uni.setStorageSync('accessToken', accessToken)
      uni.setStorageSync('refreshToken', refreshToken)
      uni.setStorageSync('userProfile', result.user)

      // 多角色用户默认乘客模式
      const roles = result.user.roles || []
      uni.setStorageSync('userRoles', roles)
      uni.setStorageSync('userRole', 'passenger')  // 默认乘客模式
      uni.setStorageSync('userPermissions', result.user.permissions || [])

      uni.hideLoading()
      uni.showToast({ title: result.isNewUser ? '注册成功' : '登录成功', icon: 'success' })
      setTimeout(() => navigateToHome(roles, result.user.display_role), 500)
    } else {
      uni.hideLoading()
      uni.showToast({ title: result.error || '登录失败', icon: 'none' })
    }
  } catch (error: any) {
    uni.hideLoading()
    console.error('微信登录异常:', error)
    uni.showToast({ title: '登录失败，请重试', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// 手机号密码登录
const handlePhoneLogin = async () => {
  console.log('handlePhoneLogin called, canPhoneLogin:', canPhoneLogin.value, 'loading:', loading.value)
  if (!canPhoneLogin.value) return

  loading.value = true
  uni.showLoading({ title: '登录中...' })

  try {
    // 调用 phone-login 云函数（与 Web 端共用）
    const res = await uni.request({
      url: `${SUPABASE_URL}/functions/v1/phone-login`,
      method: 'POST',
      data: {
        phone: phoneForm.value.phone,
        password: phoneForm.value.password
      },
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    })

    const result = res.data as any

    if (result.success && result.user) {
      // 保存 token
      const accessToken = result.session?.access_token || ''
      const refreshToken = result.session?.refresh_token || ''
      uni.setStorageSync('accessToken', accessToken)
      uni.setStorageSync('refreshToken', refreshToken)

      // 保存用户信息
      uni.setStorageSync('userProfile', result.user)
      const roles = result.user.roles || []
      uni.setStorageSync('userRoles', roles)
      uni.setStorageSync('userRole', 'passenger')  // 默认乘客模式
      uni.setStorageSync('userPermissions', result.user.permissions || [])

      uni.hideLoading()
      loading.value = false  // 重置状态
      uni.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => navigateToHome(roles, result.user.display_role), 500)
    } else {
      uni.hideLoading()
      uni.showToast({ title: result.error || '登录失败', icon: 'none' })
      loading.value = false  // 确保重置
    }
  } catch (error) {
    uni.hideLoading()
    console.error('手机号登录失败:', error)
    uni.showToast({ title: '登录失败，请重试', icon: 'none' })
    loading.value = false  // 确保重置
  }
}

// 显示协议
const showAgreement = (type: 'user' | 'privacy') => {
  uni.navigateTo({ url: `/pages/common/agreement?type=${type}` })
}

// 根据角色跳转到对应首页（多角色用户默认乘客首页）
const navigateToHome = (roles: any[], displayRole: string) => {
  // 管理员角色优先
  const hasAdminRole = roles.some((r: any) => r.name === 'admin')
  if (hasAdminRole && displayRole === 'admin') {
    uni.reLaunch({ url: '/pages/admin/index' })
    return
  }

  // 多角色用户或有商家角色，默认跳转到乘客首页
  // 用户可以在"我的"页面切换到商家模式
  uni.reLaunch({ url: '/pages/index/index' })
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: #fff;
  padding: 80rpx 48rpx;
}

/* Logo 区域 */
.logo-section {
  text-align: center;
  margin-bottom: 80rpx;
}

.logo {
  width: 120rpx;
  height: 120rpx;
  background: #000;
  border-radius: 24rpx;
  margin: 0 auto 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-text {
  font-size: 48rpx;
  color: #fff;
  font-weight: 700;
}

.app-name {
  display: block;
  font-size: 44rpx;
  font-weight: 600;
  color: #000;
  margin-bottom: 12rpx;
}

.app-slogan {
  display: block;
  font-size: 28rpx;
  color: #666;
}

/* 登录模式切换 */
.login-tabs {
  display: flex;
  background: #f5f5f5;
  border-radius: 16rpx;
  padding: 8rpx;
  margin-bottom: 48rpx;
}

.tab {
  flex: 1;
  padding: 24rpx;
  text-align: center;
  border-radius: 12rpx;
  transition: all 0.2s;
}

.tab.active {
  background: #000;
}

.tab-text {
  font-size: 28rpx;
  color: #666;
}

.tab.active .tab-text {
  color: #fff;
  font-weight: 500;
}

/* 登录内容 */
.login-content {
  min-height: 400rpx;
}

/* 微信登录 */
.wechat-section {
  text-align: center;
  padding: 48rpx 0;
}

.wechat-desc {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 32rpx;
  display: block;
}

.wechat-btn {
  width: 100%;
  height: 96rpx;
  background: #07c160;
  color: #fff;
  font-size: 32rpx;
  font-weight: 500;
  border-radius: 48rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}

.wechat-btn::after {
  border: none;
}

.wechat-btn-text {
  font-size: 32rpx;
}

/* 表单 */
.form-section {
  padding: 0;
}

.form-item {
  margin-bottom: 32rpx;
}

.form-label {
  font-size: 28rpx;
  color: #666;
  display: block;
  margin-bottom: 16rpx;
}

.form-input {
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 28rpx 32rpx;
  font-size: 32rpx;
  color: #000;
  width: 100%;
}

.submit-btn {
  width: 100%;
  height: 96rpx;
  background: #000;
  color: #fff;
  font-size: 32rpx;
  font-weight: 500;
  border-radius: 48rpx;
  border: none;
  margin-top: 16rpx;
}

.submit-btn::after {
  border: none;
}

.submit-btn[disabled] {
  background: #ccc;
}

/* 协议 */
.agreement {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  margin-top: 48rpx;
  padding-top: 32rpx;
  border-top: 2rpx solid #f0f0f0;
}

.agreement-check {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.checkbox {
  width: 32rpx;
  height: 32rpx;
  border-radius: 6rpx;
  border: 2rpx solid #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkbox.checked {
  background: #000;
  border-color: #000;
}

.agreement-text {
  font-size: 26rpx;
  color: #666;
}

.agreement-link {
  font-size: 26rpx;
  color: #000;
}
</style>