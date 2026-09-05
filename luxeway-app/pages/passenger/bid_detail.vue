<template>
  <view class="page-container">
    <!-- 行程信息摘要 -->
    <view class="trip-summary" v-if="demand">
      <view class="trip-summary-row">
        <text class="trip-summary-label">行程类型</text>
        <text class="trip-summary-value">{{ getTypeText(demand.type) }}</text>
      </view>
      <view class="trip-summary-row">
        <text class="trip-summary-label">出发时间</text>
        <text class="trip-summary-value">{{ formatTime(demand.earliest_departure) }}</text>
      </view>
      <view class="trip-summary-row">
        <text class="trip-summary-label">乘车人数</text>
        <text class="trip-summary-value">{{ demand.passenger_count || 1 }}人</text>
      </view>
    </view>

    <!-- 商家信息 -->
    <view class="merchant-card">
      <view class="merchant-header">
        <text class="merchant-name">{{ bidDetail?.merchants?.company_name || bidDetail?.merchants?.contact_name || '商家' }}</text>
        <view class="merchant-stats">
          <text class="merchant-rating">评分 {{ bidDetail?.merchants?.rating_avg || 4.8 }}</text>
          <text class="merchant-orders">已完成 {{ bidDetail?.merchants?.order_count || 0 }} 单</text>
        </view>
      </view>
      <view class="merchant-contact" v-if="bidDetail?.merchants?.contact_phone">
        <text class="merchant-phone">联系电话：{{ bidDetail.merchants.contact_phone }}</text>
      </view>
    </view>

    <!-- 报价详情 -->
    <view class="price-card">
      <view class="price-header">
        <text class="price-title">报价金额</text>
        <text class="price-value">¥{{ bidDetail?.price || 0 }}</text>
      </view>
    </view>

    <!-- 车辆信息 -->
    <view class="car-card">
      <view class="car-header">
        <text class="car-title">车辆信息</text>
      </view>
      <view class="car-image" v-if="bidDetail?.car_image">
        <image :src="bidDetail.car_image" mode="aspectFill" class="car-img"></image>
      </view>
      <view class="car-info">
        <view class="car-info-row">
          <text class="car-label">车型</text>
          <text class="car-value">{{ bidDetail?.car_model || '舒适商务车' }}</text>
        </view>
      </view>
    </view>

    <!-- 报价说明 -->
    <view class="message-card" v-if="bidDetail?.message">
      <view class="message-header">
        <text class="message-title">报价说明</text>
      </view>
      <text class="message-content">{{ bidDetail.message }}</text>
    </view>

    <!-- 操作按钮 -->
    <view class="action-area">
      <button
        class="reject-btn"
        v-if="bidDetail?.status === 'PENDING'"
        :disabled="isRejecting"
        @click="rejectBidHandler"
      >
        {{ isRejecting ? '处理中...' : '拒绝报价' }}
      </button>
      <button
        class="accept-btn"
        v-if="bidDetail?.status === 'PENDING'"
        :disabled="isAccepting"
        @click="acceptBidHandler"
      >
        <text class="accept-btn-text">选择此报价</text>
      </button>
      <view v-else-if="bidDetail?.status === 'REJECTED'" class="status-tip rejected">
        <text>已拒绝该报价</text>
      </view>
      <view v-else-if="bidDetail?.status === 'ACCEPTED'" class="status-tip accepted">
        <text>已选择该报价</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { fetchBidDetail, fetchMyDemands, acceptBid, rejectBid } from '@/services/passenger'

const bidId = ref('')
const demandId = ref('')
const bidDetail = ref<any>(null)
const demand = ref<any>(null)
const isAccepting = ref(false)
const isRejecting = ref(false)

const typeMap: Record<string, string> = {
  'TRANSFER': '接送',
  'CHARTER_DAY': '包天',
  'MULTI_DAY': '多日'
}

const getTypeText = (type: string) => typeMap[type] || '接送'

const formatTime = (iso: string) => {
  const date = new Date(iso)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours().toString().padStart(2, '0')
  const min = date.getMinutes().toString().padStart(2, '0')
  return `${month}月${day}日 ${hour}:${min}`
}

const loadBidDetail = async () => {
  try {
    bidDetail.value = await fetchBidDetail(bidId.value)
  } catch (error) {
    console.error('加载报价详情失败', error instanceof Error ? error.message : 'unknown error')
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

const loadDemand = async () => {
  try {
    const demands = await fetchMyDemands()
    demand.value = demands.find(d => d.id === demandId.value)
  } catch (error) {
    console.error('加载行程信息失败', error instanceof Error ? error.message : 'unknown error')
  }
}

const acceptBidHandler = async () => {
  if (isAccepting.value) return

  uni.showModal({
    title: '确认选择',
    content: `确定选择此报价 (¥${bidDetail.value?.price}) 吗？`,
    success: async (res) => {
      if (res.confirm) {
        isAccepting.value = true
        try {
          uni.showLoading({ title: '处理中...' })
          const result = await acceptBid(bidId.value)
          uni.hideLoading()
          uni.showToast({ title: '已选择报价', icon: 'success' })
          setTimeout(() => {
            uni.redirectTo({ url: `/pages/order/detail?demandId=${result.demandId}` })
          }, 1000)
        } catch (error: any) {
          uni.hideLoading()
          uni.showToast({ title: error.message || '操作失败', icon: 'none' })
        } finally {
          isAccepting.value = false
        }
      }
    }
  })
}

const rejectBidHandler = async () => {
  if (isRejecting.value) return

  uni.showModal({
    title: '拒绝报价',
    content: '确定拒绝此报价吗？拒绝后其他司机可重新报价。',
    confirmColor: '#000',
    success: async (res) => {
      if (res.confirm) {
        isRejecting.value = true
        try {
          uni.showLoading({ title: '处理中...' })
          await rejectBid(bidId.value)
          uni.hideLoading()
          uni.showToast({ title: '已拒绝报价', icon: 'success' })
          // 刷新报价详情，更新按钮状态
          await loadBidDetail()
        } catch (error: any) {
          uni.hideLoading()
          uni.showToast({ title: error.message || '操作失败', icon: 'none' })
        } finally {
          isRejecting.value = false
        }
      }
    }
  })
}

onLoad(async (options: any) => {
  if (options?.bidId) {
    bidId.value = options.bidId
    loadBidDetail()
  }
  if (options?.demandId) {
    demandId.value = options.demandId
    loadDemand()
  }
})
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════════
   Uber 设计风格 - 极简黑白
   ═══════════════════════════════════════════════════════════════ */

.page-container {
  background: #f5f5f5;
  min-height: 100vh;
  padding: 24rpx 32rpx;
  padding-bottom: 160rpx;
}

/* 行程摘要 */
.trip-summary {
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 16rpx;
}

.trip-summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8rpx 0;
}

.trip-summary-label {
  font-size: 26rpx;
  color: #666;
}

.trip-summary-value {
  font-size: 26rpx;
  color: #000;
  font-weight: 500;
}

/* 商家信息卡片 */
.merchant-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.merchant-header {
  margin-bottom: 12rpx;
}

.merchant-name {
  font-size: 32rpx;
  color: #000;
  font-weight: 600;
  display: block;
  margin-bottom: 8rpx;
}

.merchant-stats {
  display: flex;
  gap: 16rpx;
}

.merchant-rating {
  font-size: 26rpx;
  color: #666;
}

.merchant-orders {
  font-size: 26rpx;
  color: #666;
}

.merchant-contact {
  padding-top: 12rpx;
  border-top: 2rpx solid #f0f0f0;
}

.merchant-phone {
  font-size: 26rpx;
  color: #666;
}

/* 报价卡片 */
.price-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.price-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.price-title {
  font-size: 28rpx;
  color: #000;
  font-weight: 500;
}

.price-value {
  font-size: 40rpx;
  color: #000;
  font-weight: 600;
}

/* 车辆信息卡片 */
.car-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.car-header {
  margin-bottom: 16rpx;
}

.car-title {
  font-size: 28rpx;
  color: #000;
  font-weight: 500;
}

.car-image {
  margin-bottom: 16rpx;
}

.car-img {
  width: 100%;
  height: 300rpx;
  border-radius: 12rpx;
  background: #f5f5f5;
}

.car-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.car-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.car-label {
  font-size: 26rpx;
  color: #666;
}

.car-value {
  font-size: 26rpx;
  color: #000;
  font-weight: 500;
}

/* 报价说明卡片 */
.message-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.message-header {
  margin-bottom: 12rpx;
}

.message-title {
  font-size: 28rpx;
  color: #000;
  font-weight: 500;
}

.message-content {
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
}

/* 操作按钮 */
.action-area {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  background: #fff;
  border-top: 2rpx solid #f0f0f0;
  display: flex;
  gap: 16rpx;
}

.reject-btn {
  flex: none;
  height: 96rpx;
  background: #f5f5f5;
  color: #666;
  font-size: 30rpx;
  font-weight: 500;
  border-radius: 48rpx;
  padding: 0 40rpx;
  border: none;
}

.reject-btn::after {
  border: none;
}

.accept-btn {
  flex: 1;
  height: 96rpx;
  background: #000;
  color: #fff;
  font-size: 32rpx;
  font-weight: 500;
  border-radius: 48rpx;
}

.accept-btn::after {
  border: none;
}

.status-tip {
  width: 100%;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 48rpx;
  font-size: 30rpx;
  font-weight: 500;
}

.status-tip.rejected {
  background: #f5f5f5;
  color: #999;
}

.status-tip.accepted {
  background: #000;
  color: #fff;
}
</style>
