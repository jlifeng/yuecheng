<template>
  <view class="review-container">
    <!-- Merchant Header -->
    <view class="merchant-header">
      <text class="merchant-name">{{ merchant?.company_name || merchant?.contact_name }}</text>
      <text class="merchant-type">{{ merchant?.type === 'company' ? '企业车队入驻申请' : '个人司机入驻申请' }}</text>
      <text class="merchant-time">申请时间：{{ formatTime(merchant?.created_at) }}</text>
    </view>

    <!-- Basic Info -->
    <view class="section">
      <text class="section-title">基本信息</text>
      <view class="info-row">
        <text class="info-label">联系人</text>
        <text class="info-value">{{ merchant?.contact_name }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">联系电话</text>
        <text class="info-value">{{ merchant?.contact_phone }}</text>
      </view>
      <view class="info-row" v-if="merchant?.type === 'company'">
        <text class="info-label">公司名称</text>
        <text class="info-value">{{ merchant?.company_name }}</text>
      </view>
      <view class="info-row" v-if="merchant?.description">
        <text class="info-label">简介</text>
        <text class="info-value">{{ merchant?.description }}</text>
      </view>
    </view>

    <!-- License Info (Company) -->
    <view class="section" v-if="merchant?.type === 'company'">
      <text class="section-title">营业执照</text>
      <view class="info-row">
        <text class="info-label">营业执照号</text>
        <text class="info-value">{{ merchant?.license_number }}</text>
      </view>
      <view class="image-section" v-if="merchant?.license_image_url">
        <text class="image-label">营业执照照片</text>
        <image class="license-image" :src="merchant?.license_image_url" mode="aspectFit" @click="previewImage(merchant?.license_image_url)" />
      </view>
    </view>

    <!-- Vehicle Info (Individual) -->
    <view class="section" v-if="merchant?.type === 'individual' && vehicle">
      <text class="section-title">车辆信息</text>
      <view class="info-row">
        <text class="info-label">车牌号</text>
        <text class="info-value">{{ vehicle?.plate_number }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">车型</text>
        <text class="info-value">{{ vehicle?.model }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">座位数</text>
        <text class="info-value">{{ vehicle?.seats }}座</text>
      </view>
      <view class="info-row" v-if="vehicle?.color">
        <text class="info-label">颜色</text>
        <text class="info-value">{{ vehicle?.color }}</text>
      </view>

      <!-- Vehicle Images -->
      <view class="images-grid" v-if="hasVehicleImages">
        <view class="image-item" v-if="vehicle?.front_image_url">
          <image class="vehicle-image" :src="vehicle?.front_image_url" mode="aspectFill" @click="previewImage(vehicle?.front_image_url)" />
          <text class="image-title">车头照片</text>
        </view>
        <view class="image-item" v-if="vehicle?.side_image_url">
          <image class="vehicle-image" :src="vehicle?.side_image_url" mode="aspectFill" @click="previewImage(vehicle?.side_image_url)" />
          <text class="image-title">侧面照片</text>
        </view>
        <view class="image-item" v-if="vehicle?.interior_image_url">
          <image class="vehicle-image" :src="vehicle?.interior_image_url" mode="aspectFill" @click="previewImage(vehicle?.interior_image_url)" />
          <text class="image-title">内饰照片</text>
        </view>
      </view>
    </view>

    <!-- Driver License -->
    <view class="section" v-if="merchant?.type === 'individual' && vehicle?.driver_license_url">
      <text class="section-title">驾驶证</text>
      <view class="info-row" v-if="vehicle?.driver_license_no">
        <text class="info-label">驾驶证号</text>
        <text class="info-value">{{ vehicle?.driver_license_no }}</text>
      </view>
      <view class="image-section">
        <text class="image-label">驾驶证照片</text>
        <image class="license-image" :src="vehicle?.driver_license_url" mode="aspectFit" @click="previewImage(vehicle?.driver_license_url)" />
      </view>
    </view>

    <!-- Review Actions -->
    <view class="review-actions">
      <view class="reject-section">
        <text class="reject-label">拒绝原因（可选）</text>
        <textarea class="reject-input" v-model="reviewNote" placeholder="如：证件信息不完整、车辆不符合要求..." maxlength="200" />
      </view>

      <view class="action-buttons">
        <button class="reject-btn" @click="handleReject">拒绝</button>
        <button class="approve-btn" @click="handleApprove">通过</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase'

const merchantId = ref('')
const merchant = ref<any>(null)
const vehicle = ref<any>(null)
const reviewNote = ref('')
const loading = ref(false)

const hasVehicleImages = computed(() => {
  return vehicle.value?.front_image_url || vehicle.value?.side_image_url || vehicle.value?.interior_image_url
})

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = (currentPage as any).options || {}
  merchantId.value = options.id || ''
  loadMerchant()
})

const loadMerchant = async () => {
  if (!merchantId.value) return

  try {
    const accessToken = uni.getStorageSync('accessToken')

    // 加载商家信息
    const res = await uni.request({
      url: `${SUPABASE_URL}/rest/v1/merchants?id=eq.${merchantId.value}&select=*`,
      method: 'GET',
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken || 'dummy'}`
      }
    })

    if (res.statusCode === 200 && (res.data as any[]).length > 0) {
      merchant.value = (res.data as any[])[0]

      // 如果是个人司机，加载车辆信息
      if (merchant.value.type === 'individual') {
        loadVehicle()
      }
    }
  } catch (e) {
    console.error('加载商家信息失败', e instanceof Error ? e.message : 'unknown error')
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

const loadVehicle = async () => {
  try {
    const accessToken = uni.getStorageSync('accessToken')

    const res = await uni.request({
      url: `${SUPABASE_URL}/rest/v1/vehicles?merchant_id=eq.${merchantId.value}&select=*`,
      method: 'GET',
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken || 'dummy'}`
      }
    })

    if (res.statusCode === 200 && (res.data as any[]).length > 0) {
      vehicle.value = (res.data as any[])[0]
    }
  } catch (e) {
    console.error('加载车辆信息失败', e instanceof Error ? e.message : 'unknown error')
  }
}

const formatTime = (time: string) => {
  if (!time) return ''
  const date = new Date(time)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
}

const previewImage = (url: string) => {
  uni.previewImage({
    urls: [url],
    current: url
  })
}

const handleApprove = async () => {
  uni.showModal({
    title: '确认通过',
    content: `确定要通过 ${merchant.value?.company_name || merchant.value?.contact_name} 的入驻申请吗？`,
    success: async (res) => {
      if (res.confirm) {
        await updateMerchantStatus('approved')
      }
    }
  })
}

const handleReject = async () => {
  if (!reviewNote.value) {
    uni.showToast({ title: '请填写拒绝原因', icon: 'none' })
    return
  }

  uni.showModal({
    title: '确认拒绝',
    content: `确定要拒绝 ${merchant.value?.company_name || merchant.value?.contact_name} 的入驻申请吗？`,
    success: async (res) => {
      if (res.confirm) {
        await updateMerchantStatus('rejected')
      }
    }
  })
}

const updateMerchantStatus = async (status: 'approved' | 'rejected') => {
  loading.value = true

  try {
    const accessToken = uni.getStorageSync('accessToken')

    await uni.request({
      url: `${SUPABASE_URL}/rest/v1/merchants?id=eq.${merchantId.value}`,
      method: 'PATCH',
      data: {
        review_status: status,
        review_note: status === 'rejected' ? reviewNote.value : null,
        reviewed_at: new Date().toISOString()
      },
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken || 'dummy'}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      }
    })

    uni.showToast({ title: status === 'approved' ? '已通过' : '已拒绝', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1000)
  } catch (e) {
    console.error('更新状态失败', e instanceof Error ? e.message : 'unknown error')
    uni.showToast({ title: '操作失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.review-container {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 24rpx 32rpx;
  padding-bottom: 200rpx;
}

/* Header */
.merchant-header {
  background: #000;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
}

.merchant-name {
  font-size: 32rpx;
  color: #fff;
  font-weight: 600;
  display: block;
  margin-bottom: 8rpx;
}

.merchant-type {
  font-size: 26rpx;
  color: rgba(255,255,255,0.8);
  display: block;
  margin-bottom: 8rpx;
}

.merchant-time {
  font-size: 24rpx;
  color: rgba(255,255,255,0.6);
}

/* Section */
.section {
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

/* Info Row */
.info-row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;
  border-bottom: 2rpx solid #f0f0f0;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 26rpx;
  color: #666;
}

.info-value {
  font-size: 26rpx;
  color: #000;
}

/* Image Section */
.image-section {
  margin-top: 16rpx;
}

.image-label {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-bottom: 12rpx;
}

.license-image {
  width: 100%;
  height: 300rpx;
  border-radius: 12rpx;
  background: #f5f5f5;
}

/* Vehicle Images Grid */
.images-grid {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}

.image-item {
  flex: 1;
}

.vehicle-image {
  width: 100%;
  height: 200rpx;
  border-radius: 12rpx;
  background: #f5f5f5;
}

.image-title {
  font-size: 24rpx;
  color: #666;
  display: block;
  text-align: center;
  margin-top: 8rpx;
}

/* Review Actions */
.review-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 24rpx 32rpx;
  border-top: 2rpx solid #f0f0f0;
}

.reject-section {
  margin-bottom: 16rpx;
}

.reject-label {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-bottom: 12rpx;
}

.reject-input {
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 16rpx;
  font-size: 28rpx;
  width: 100%;
  height: 100rpx;
}

.action-buttons {
  display: flex;
  gap: 16rpx;
}

.reject-btn {
  flex: 1;
  height: 88rpx;
  background: #f5f5f5;
  color: #ef4444;
  font-size: 28rpx;
  font-weight: 500;
  border-radius: 48rpx;
  border: none;
}

.reject-btn::after {
  border: none;
}

.approve-btn {
  flex: 1;
  height: 88rpx;
  background: #000;
  color: #fff;
  font-size: 28rpx;
  font-weight: 500;
  border-radius: 48rpx;
  border: none;
}

.approve-btn::after {
  border: none;
}
</style>
