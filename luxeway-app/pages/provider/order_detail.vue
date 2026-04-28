<template>
  <view class="container">
    <!-- 状态卡片 -->
    <view class="status-card" :class="statusClass">
      <text class="status-text">{{ statusText }}</text>
      <text class="sub-text">{{ statusSubText }}</text>
    </view>

    <!-- 乘客信息 -->
    <view class="passenger-card" v-if="orderDetail">
      <view class="passenger-info">
        <view class="passenger-avatar">
          <text>👤</text>
        </view>
        <view class="passenger-detail">
          <text class="passenger-name">乘客</text>
          <text class="passenger-count">{{ orderDetail.passengerCount }}人</text>
        </view>
      </view>
      <view class="passenger-remark" v-if="orderDetail.requirements">
        <text class="remark-label">备注：</text>
        <text class="remark-text">{{ orderDetail.requirements }}</text>
      </view>
    </view>

    <!-- 行程信息 -->
    <view class="trip-card" v-if="orderDetail">
      <view class="trip-row">
        <view class="trip-dot start"></view>
        <view class="trip-info">
          <text class="trip-label">出发地</text>
          <text class="trip-address">{{ orderDetail.startAddress }}</text>
        </view>
      </view>
      <view class="trip-row">
        <view class="trip-dot end"></view>
        <view class="trip-info">
          <text class="trip-label">目的地</text>
          <text class="trip-address">{{ orderDetail.endAddress }}</text>
        </view>
      </view>
      <view class="trip-meta">
        <text>{{ formatTime(orderDetail.earliestDeparture) }}</text>
      </view>
    </view>

    <!-- 报价信息 -->
    <view class="price-card" v-if="orderDetail">
      <text class="card-title">报价信息</text>
      <view class="price-row">
        <text>报价金额</text>
        <text class="price-value">¥{{ orderDetail.price }}</text>
      </view>
      <view class="price-row" v-if="orderDetail.carModel">
        <text>车型</text>
        <text>{{ orderDetail.carModel }}</text>
      </view>
      <view class="price-row" v-if="orderDetail.message">
        <text>报价说明</text>
        <text class="price-remark">{{ orderDetail.message }}</text>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="action-area">
      <!-- ACCEPTED 状态：开始行程 + 取消订单 -->
      <template v-if="orderDetail?.status === 'ACCEPTED'">
        <button class="action-btn cancel" @click="showCancelModal">
          取消订单
        </button>
        <button class="action-btn primary" @click="startTrip">
          开始行程
        </button>
      </template>

      <!-- IN_PROGRESS 状态：完成行程 -->
      <button
        v-if="orderDetail?.status === 'IN_PROGRESS'"
        class="action-btn primary"
        @click="completeTrip"
      >
        完成行程
      </button>

      <!-- COMPLETED 状态：已完成 -->
      <view v-if="orderDetail?.status === 'COMPLETED'" class="completed-tip">
        <text>✓ 订单已完成</text>
      </view>

      <!-- CANCELLED 状态：已取消 -->
      <view v-if="orderDetail?.status === 'CANCELLED'" class="cancelled-tip">
        <text>订单已取消</text>
      </view>
    </view>

    <!-- 取消原因弹窗 -->
    <view class="modal-mask" v-if="cancelModalVisible" @click="cancelModalVisible = false"></view>
    <view class="modal-popup" v-if="cancelModalVisible">
      <view class="modal-header">
        <text class="modal-title">取消订单</text>
        <text class="modal-close" @click="cancelModalVisible = false">×</text>
      </view>
      <view class="modal-body">
        <text class="modal-desc">请选择取消原因：</text>
        <view class="reason-list">
          <view
            class="reason-item"
            v-for="reason in cancelReasons"
            :key="reason"
            :class="{ active: selectedReason === reason }"
            @click="selectedReason = reason"
          >
            <text>{{ reason }}</text>
            <view class="reason-check" v-if="selectedReason === reason">✓</view>
          </view>
        </view>
      </view>
      <view class="modal-footer">
        <button class="modal-btn cancel" @click="cancelModalVisible = false">返回</button>
        <button class="modal-btn confirm" @click="confirmCancel" :disabled="!selectedReason || cancelling">
          {{ cancelling ? '取消中...' : '确认取消' }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { merchantCancelOrder } from '@/services/provider'

const SUPABASE_URL = 'https://qcsmavxqjofrhrdwgkpt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjc21hdnhxam9mcmhyZHdna3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3OTU2OTUsImV4cCI6MjA5MTM3MTY5NX0.zM4mVvvZAylQIXZFrnzaSAy_MGqTvR3hrSWfSSP8xRQ'

const demandId = ref('')
const bidId = ref('')
const orderDetail = ref<any>(null)

// 取消订单相关
const cancelModalVisible = ref(false)
const selectedReason = ref('')
const cancelling = ref(false)
const cancelReasons = [
  '乘客取消行程',
  '车辆故障',
  '无法联系乘客',
  '其他原因'
]

const statusClass = computed(() => {
  const status = orderDetail.value?.status
  if (status === 'IN_PROGRESS') return 'status-active'
  if (status === 'COMPLETED') return 'status-done'
  return 'status-accepted'
})

const statusText = computed(() => {
  const status = orderDetail.value?.status
  if (status === 'ACCEPTED') return '待出发'
  if (status === 'IN_PROGRESS') return '进行中'
  if (status === 'COMPLETED') return '已完成'
  if (status === 'CANCELLED') return '已取消'
  return '加载中...'
})

const statusSubText = computed(() => {
  const status = orderDetail.value?.status
  if (status === 'ACCEPTED') return '请按时到达出发地点接乘客'
  if (status === 'IN_PROGRESS') return '行程进行中，请安全驾驶'
  if (status === 'COMPLETED') return '感谢您的服务'
  return ''
})

const formatTime = (iso: string) => {
  if (!iso) return ''
  const date = new Date(iso)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours().toString().padStart(2, '0')
  const min = date.getMinutes().toString().padStart(2, '0')
  return `${month}月${day}日 ${hour}:${min}`
}

const loadOrderDetail = async (id: string) => {
  const accessToken = uni.getStorageSync('accessToken')
  if (!accessToken) return

  try {
    uni.showLoading({ title: '加载中...' })

    // 查询需求信息
    const demandRes = await uni.request({
      url: `${SUPABASE_URL}/rest/v1/demands?id=eq.${id}&select=*`,
      method: 'GET',
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (demandRes.statusCode === 200 && (demandRes.data as any[])?.length) {
      const demand = (demandRes.data as any[])[0]

      // 查询已接受的报价
      const bidRes = await uni.request({
        url: `${SUPABASE_URL}/rest/v1/bids?demand_id=eq.${id}&status=eq.ACCEPTED&select=*`,
        method: 'GET',
        header: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`
        }
      })

      const bid = (bidRes.data as any[])?.[0]
      if (bid) bidId.value = bid.id

      orderDetail.value = {
        id: demand.id,
        status: demand.status,
        startAddress: demand.start_address,
        endAddress: demand.end_address,
        earliestDeparture: demand.earliest_departure,
        latestDeparture: demand.latest_departure,
        passengerCount: demand.passenger_count || 1,
        requirements: demand.requirements,
        price: bid?.price || 0,
        carModel: bid?.car_model || '',
        message: bid?.message || ''
      }
    }
  } catch (error) {
    console.error('加载订单详情失败', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

const startTrip = async () => {
  const accessToken = uni.getStorageSync('accessToken')
  if (!accessToken) return

  const confirmRes = await uni.showModal({
    title: '确认开始行程',
    content: '确定已接到乘客，开始行程吗？',
    confirmColor: '#000'
  })

  if (!confirmRes.confirm) return

  try {
    uni.showLoading({ title: '处理中...' })

    const res = await uni.request({
      url: `${SUPABASE_URL}/rest/v1/demands?id=eq.${demandId.value}`,
      method: 'PATCH',
      data: { status: 'IN_PROGRESS' },
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      }
    })

    if (res.statusCode === 204) {
      uni.showToast({ title: '行程已开始', icon: 'success' })
      orderDetail.value.status = 'IN_PROGRESS'
    } else {
      throw new Error('状态更新失败')
    }
  } catch (error: any) {
    uni.showToast({ title: error.message || '操作失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

const completeTrip = async () => {
  const accessToken = uni.getStorageSync('accessToken')
  if (!accessToken) return

  const confirmRes = await uni.showModal({
    title: '确认完成行程',
    content: '确定行程已完成吗？',
    confirmColor: '#000'
  })

  if (!confirmRes.confirm) return

  try {
    uni.showLoading({ title: '处理中...' })

    const res = await uni.request({
      url: `${SUPABASE_URL}/rest/v1/demands?id=eq.${demandId.value}`,
      method: 'PATCH',
      data: { status: 'COMPLETED' },
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      }
    })

    if (res.statusCode === 204) {
      uni.showToast({ title: '行程已完成', icon: 'success' })
      orderDetail.value.status = 'COMPLETED'
    } else {
      throw new Error('状态更新失败')
    }
  } catch (error: any) {
    uni.showToast({ title: error.message || '操作失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

// 显示取消弹窗
const showCancelModal = () => {
  selectedReason.value = ''
  cancelModalVisible.value = true
}

// 确认取消订单
const confirmCancel = async () => {
  if (!selectedReason.value || !demandId.value) return

  cancelling.value = true
  try {
    await merchantCancelOrder(demandId.value, selectedReason.value)
    uni.showToast({ title: '订单已取消', icon: 'success' })
    cancelModalVisible.value = false
    orderDetail.value.status = 'CANCELLED'
  } catch (error) {
    console.error('取消订单失败', error)
    uni.showToast({ title: '取消失败', icon: 'none' })
  } finally {
    cancelling.value = false
  }
}

onLoad((options: any) => {
  const id = options?.demandId || options?.id
  if (id) {
    demandId.value = id
    loadOrderDetail(id)
  }
})
</script>

<style scoped>
.container {
  padding: 24rpx;
  background: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 200rpx;
}

/* 状态卡片 */
.status-card {
  background: #000;
  padding: 40rpx 30rpx;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
  text-align: center;
}

.status-card.status-active {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
}

.status-card.status-done {
  background: #666;
}

.status-text {
  font-size: 36rpx;
  font-weight: bold;
  color: #fff;
  display: block;
  margin-bottom: 8rpx;
}

.sub-text {
  font-size: 26rpx;
  color: rgba(255,255,255,0.8);
}

/* 乘客卡片 */
.passenger-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
}

.passenger-info {
  display: flex;
  align-items: center;
}

.passenger-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  margin-right: 20rpx;
}

.passenger-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #000;
  display: block;
}

.passenger-count {
  font-size: 26rpx;
  color: #666;
}

.passenger-remark {
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1px solid #f0f0f0;
}

.remark-label {
  font-size: 26rpx;
  color: #999;
}

.remark-text {
  font-size: 26rpx;
  color: #666;
}

/* 行程卡片 */
.trip-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
}

.trip-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 20rpx;
}

.trip-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  margin-right: 20rpx;
  margin-top: 6rpx;
}

.trip-dot.start {
  background: #000;
}

.trip-dot.end {
  background: #3b82f6;
}

.trip-info {
  flex: 1;
}

.trip-label {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-bottom: 4rpx;
}

.trip-address {
  font-size: 30rpx;
  color: #000;
  font-weight: 500;
}

.trip-meta {
  padding-top: 20rpx;
  border-top: 1px solid #f0f0f0;
  font-size: 26rpx;
  color: #666;
}

/* 报价卡片 */
.price-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #000;
  display: block;
  margin-bottom: 20rpx;
}

.price-row {
  display: flex;
  justify-content: space-between;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 16rpx;
}

.price-row:last-child {
  margin-bottom: 0;
}

.price-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #000;
}

.price-remark {
  font-size: 26rpx;
  color: #999;
  max-width: 400rpx;
  text-align: right;
}

/* 操作按钮 */
.action-area {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 30rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
}

.action-btn {
  width: 100%;
  height: 88rpx;
  border-radius: 44rpx;
  font-size: 32rpx;
  font-weight: bold;
  border: none;
}

.action-btn.primary {
  background: #000;
  color: #fff;
}

.action-btn.cancel {
  background: #fff;
  color: #ef4444;
  border: 2rpx solid #ef4444;
  margin-right: 20rpx;
  flex: 0 0 auto;
  width: 200rpx;
}

.completed-tip {
  text-align: center;
  padding: 30rpx;
  font-size: 32rpx;
  color: #666;
}

.cancelled-tip {
  text-align: center;
  padding: 30rpx;
  font-size: 32rpx;
  color: #999;
}

/* 弹窗 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

.modal-popup {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  z-index: 1000;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.modal-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #000;
}

.modal-close {
  font-size: 40rpx;
  color: #999;
}

.modal-body {
  padding: 30rpx;
}

.modal-desc {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 20rpx;
  display: block;
}

.reason-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.reason-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #333;
}

.reason-item.active {
  background: #000;
  color: #fff;
}

.reason-check {
  font-size: 28rpx;
}

.modal-footer {
  display: flex;
  gap: 20rpx;
  padding: 30rpx;
  border-top: 1rpx solid #f0f0f0;
}

.modal-btn {
  flex: 1;
  height: 88rpx;
  font-size: 30rpx;
  border-radius: 44rpx;
  border: none;
}

.modal-btn.cancel {
  background: #f5f5f5;
  color: #666;
}

.modal-btn.confirm {
  background: #ef4444;
  color: #fff;
}

.modal-btn.confirm[disabled] {
  background: #ccc;
}

.modal-btn::after {
  border: none;
}
</style>
