<template>
  <view class="page-container">
    <!-- 所有行程列表 -->
    <view class="trips-section" v-if="allDemands.length > 0 && !currentDemand">
      <view class="section-header">
        <text class="section-title">我的行程</text>
        <text class="section-count">{{ allDemands.length }}个</text>
      </view>

      <view class="trip-card" v-for="demand in allDemands" :key="demand.id" @click="viewDemandDetail(demand)">
        <view class="trip-card-header">
          <view class="trip-status-badge" :class="getStatusClass(demand.status)">{{ getStatusText(demand.status) }}</view>
          <uni-icons type="forward" size="16" color="#000"></uni-icons>
        </view>
        <view class="trip-card-body">
          <view class="trip-route-row">
            <view class="trip-route-dot"></view>
            <text class="trip-route-text">{{ demand.start_address }}</text>
          </view>
          <view class="trip-route-row">
            <view class="trip-route-dot"></view>
            <text class="trip-route-text">{{ demand.end_address }}</text>
          </view>
          <view class="trip-meta-row">
            <view class="trip-meta-dot"></view>
            <text class="trip-time-text">{{ formatTime(demand.earliest_departure, demand.latest_departure) }}</text>
            <text class="trip-count-text">{{ demand.passenger_count || 1 }}人</text>
          </view>
        </view>
      </view>

      <!-- 暂无行程 -->
      <view class="empty-state" v-if="allDemands.length === 0">
        <text class="empty-text">暂无行程记录</text>
        <button class="empty-btn" @click="goToIndex">去发布行程</button>
      </view>
    </view>

    <!-- 单个行程的报价列表（通过 URL 参数 demandId 进入） -->
    <view class="bids-section" v-if="currentDemand">
      <!-- 状态头部 - 优化设计 -->
      <view class="status-header">
        <view class="status-indicator" :class="getStatusClass(currentDemand.status)">
          <view class="status-dot"></view>
          <view class="status-line"></view>
        </view>
        <view class="status-info">
          <text class="status-title">{{ getStatusText(currentDemand.status) }}</text>
          <text class="status-desc">{{ getStatusDesc(currentDemand.status) }}</text>
        </view>
      </view>

      <!-- 行程信息卡片 -->
      <view class="demand-card">
        <view class="demand-body">
          <!-- 行程类型 -->
          <view class="demand-type-row">
            <text class="demand-type-label">行程类型</text>
            <text class="demand-type-value">{{ getTypeText(currentDemand.type) }}</text>
          </view>
          <!-- 路线信息 -->
          <view class="demand-route-row">
            <view class="demand-dot"></view>
            <text class="demand-route-text">{{ currentDemand.start_address }}</text>
          </view>
          <view class="demand-route-row">
            <view class="demand-dot"></view>
            <text class="demand-route-text">{{ currentDemand.end_address }}</text>
          </view>
          <!-- 时间和人数 -->
          <view class="demand-meta-row">
            <view class="demand-meta-dot"></view>
            <text class="demand-time-text">{{ formatTime(currentDemand.earliest_departure, currentDemand.latest_departure) }}</text>
            <text class="demand-count-text">{{ currentDemand.passenger_count || 1 }}人</text>
          </view>
          <!-- 行程备注 -->
          <view class="demand-remark-row" v-if="currentDemand.requirements">
            <view class="demand-remark-icon">
              <uni-icons type="info" size="14" color="#666"></uni-icons>
            </view>
            <text class="demand-remark-text">{{ currentDemand.requirements }}</text>
          </view>
        </view>
      </view>

      <!-- 报价列表 -->
      <view class="section-header">
        <text class="section-title">商家报价</text>
        <text class="section-count">{{ bids.length }}个</text>
      </view>

      <view class="bid-card" v-for="bid in bids" :key="bid.id" @click="goToBidDetail(bid)">
        <view class="bid-price-row">
          <text class="bid-price">¥{{ bid.price }}</text>
          <uni-icons type="forward" size="16" color="#000"></uni-icons>
        </view>
        <view class="bid-info-row">
          <text class="bid-provider">{{ bid.providerName || '商家' }}</text>
          <text class="bid-car">{{ bid.carModel || '舒适车型' }}</text>
          <text class="bid-rating">评分 {{ bid.rating }}</text>
        </view>
        <!-- 报价说明 -->
        <view class="bid-message-row" v-if="bid.message">
          <text class="bid-message-text">{{ bid.message }}</text>
        </view>
      </view>

      <!-- 暂无报价 -->
      <view class="empty-bids" v-if="bids.length === 0">
        <text class="empty-text">暂无报价</text>
        <text class="empty-tip">商家正在报价中，请稍后再来查看</text>
        <button class="refresh-btn" @click="loadBids">刷新</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { fetchBidList, fetchMyDemands, fetchDemandById, type PassengerBid } from '@/services/passenger'

const bids = ref<PassengerBid[]>([])
const currentDemand = ref<any>(null)
const allDemands = ref<any[]>([])

const statusMap: Record<string, string> = {
  'PENDING': '待发布',
  'BIDDING': '等待报价',
  'ACCEPTED': '已确认',
  'IN_PROGRESS': '进行中',
  'COMPLETED': '已完成',
  'CANCELLED': '已取消'
}

const statusDescMap: Record<string, string> = {
  'PENDING': '行程即将发布',
  'BIDDING': '商家正在报价，请耐心等待',
  'ACCEPTED': '已选择报价，等待出行',
  'IN_PROGRESS': '行程进行中',
  'COMPLETED': '行程已完成',
  'CANCELLED': '行程已取消'
}

const typeMap: Record<string, string> = {
  'TRANSFER': '接送',
  'CHARTER_DAY': '包天',
  'MULTI_DAY': '多日'
}

const getStatusText = (status: string) => statusMap[status] || '未知'
const getStatusDesc = (status: string) => statusDescMap[status] || ''
const getTypeText = (type: string) => typeMap[type] || '接送'

const getStatusClass = (status: string) => {
  const classMap: Record<string, string> = {
    'PENDING': 'status-pending',
    'BIDDING': 'status-bidding',
    'ACCEPTED': 'status-accepted',
    'IN_PROGRESS': 'status-active',
    'COMPLETED': 'status-done',
    'CANCELLED': 'status-cancelled'
  }
  return classMap[status] || 'status-pending'
}

const formatTime = (earliest: string, latest: string) => {
  const start = new Date(earliest)
  const end = new Date(latest)

  const startMonth = start.getMonth() + 1
  const startDay = start.getDate()
  const startHour = start.getHours().toString().padStart(2, '0')
  const startMin = start.getMinutes().toString().padStart(2, '0')

  const endMonth = end.getMonth() + 1
  const endDay = end.getDate()
  const endHour = end.getHours().toString().padStart(2, '0')
  const endMin = end.getMinutes().toString().padStart(2, '0')

  const isSameDay = startMonth === endMonth && startDay === endDay

  if (isSameDay) {
    return `${startMonth}月${startDay}日 ${startHour}:${startMin}-${endHour}:${endMin}`
  } else {
    return `${startMonth}月${startDay}日 ${startHour}:${startMin} - ${endMonth}月${endDay}日 ${endHour}:${endMin}`
  }
}

const loadBids = async () => {
  try {
    bids.value = await fetchBidList(currentDemand.value?.id)
  } catch (error) {
    console.error('加载报价失败', error instanceof Error ? error.message : 'unknown error')
  }
}

const loadAllDemands = async () => {
  try {
    allDemands.value = await fetchMyDemands()
  } catch (error) {
    console.error('加载行程列表失败', error instanceof Error ? error.message : 'unknown error')
  }
}

const loadSingleDemand = async (demandId: string) => {
  try {
    currentDemand.value = await fetchDemandById(demandId)
  } catch (error) {
    console.error('加载行程详情失败', error instanceof Error ? error.message : 'unknown error')
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

const goToBidDetail = (bid: PassengerBid) => {
  // 跳转到报价详情页面
  uni.navigateTo({ url: `/pages/passenger/bid_detail?bidId=${bid.id}&demandId=${currentDemand.value?.id}` })
}

const viewDemandDetail = (demand: any) => {
  if (demand.status === 'BIDDING') {
    // 跳转到报价详情页面，只传递 demandId
    uni.navigateTo({ url: `/pages/passenger/bid_list?demandId=${demand.id}` })
  } else {
    // 查看订单详情
    uni.navigateTo({ url: `/pages/order/detail?demandId=${demand.id}` })
  }
}

const goToIndex = () => {
  uni.switchTab({ url: '/pages/index/index' })
}

onLoad(async (options: any) => {
  if (options?.demandId) {
    // 查看特定行程的报价 - 只加载这一个行程
    uni.setNavigationBarTitle({ title: '查看报价' })
    await loadSingleDemand(options.demandId)
    loadBids()
  } else {
    // 显示所有行程列表
    uni.setNavigationBarTitle({ title: '我的行程' })
    loadAllDemands()
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
}

/* Section Header */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 32rpx;
  color: #000;
  font-weight: 600;
}

.section-count {
  font-size: 28rpx;
  color: #666;
}

/* ═══════════════════════════════════════════════════════════════
   状态头部 - 优化设计
   ═══════════════════════════════════════════════════════════════ */

.status-header {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.status-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}

.status-dot {
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  background: #000;
}

.status-indicator.status-active .status-dot {
  background: #3b82f6;
  animation: pulse 1.5s infinite;
}

.status-indicator.status-done .status-dot,
.status-indicator.status-cancelled .status-dot {
  background: #999;
}

.status-line {
  width: 4rpx;
  height: 40rpx;
  background: #000;
  border-radius: 2rpx;
}

.status-indicator.status-active .status-line {
  background: #3b82f6;
}

.status-indicator.status-done .status-line,
.status-indicator.status-cancelled .status-line {
  background: #999;
}

.status-info {
  flex: 1;
}

.status-title {
  font-size: 36rpx;
  color: #000;
  font-weight: 600;
  display: block;
  margin-bottom: 8rpx;
}

.status-desc {
  font-size: 26rpx;
  color: #666;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

/* ═══════════════════════════════════════════════════════════════
   行程卡片 - Uber风格
   ═══════════════════════════════════════════════════════════════ */

.trip-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 16rpx;
}

.trip-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.trip-status-badge {
  font-size: 24rpx;
  font-weight: 500;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  color: #fff;
}

.trip-status-badge.status-pending { background: #999; }
.trip-status-badge.status-bidding { background: #000; }
.trip-status-badge.status-accepted { background: #000; }
.trip-status-badge.status-active { background: #3b82f6; }
.trip-status-badge.status-done { background: #999; }
.trip-status-badge.status-cancelled { background: #999; }

.trip-card-body {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.trip-route-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.trip-route-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: #000;
}

.trip-route-text {
  font-size: 28rpx;
  color: #000;
  font-weight: 500;
}

.trip-meta-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.trip-meta-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: #000;
}

.trip-time-text {
  font-size: 26rpx;
  color: #666;
}

.trip-count-text {
  font-size: 26rpx;
  color: #666;
  margin-left: 16rpx;
}

/* ═══════════════════════════════════════════════════════════════
   单个行程详情卡片
   ═══════════════════════════════════════════════════════════════ */

.demand-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.demand-body {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.demand-type-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.demand-type-label {
  font-size: 26rpx;
  color: #666;
}

.demand-type-value {
  font-size: 26rpx;
  color: #000;
  font-weight: 500;
}

.demand-route-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.demand-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: #000;
}

.demand-route-text {
  font-size: 28rpx;
  color: #000;
  font-weight: 500;
}

.demand-meta-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.demand-meta-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: #000;
}

.demand-time-text {
  font-size: 26rpx;
  color: #666;
}

.demand-count-text {
  font-size: 26rpx;
  color: #666;
  margin-left: 16rpx;
}

.demand-remark-row {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  padding-top: 12rpx;
  border-top: 2rpx solid #f0f0f0;
  margin-top: 12rpx;
}

.demand-remark-icon {
  flex-shrink: 0;
}

.demand-remark-text {
  font-size: 26rpx;
  color: #666;
}

/* ═══════════════════════════════════════════════════════════════
   报价卡片
   ═══════════════════════════════════════════════════════════════ */

.bid-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 16rpx;
}

.bid-price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.bid-price {
  font-size: 36rpx;
  color: #000;
  font-weight: 600;
}

.bid-info-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.bid-provider {
  font-size: 26rpx;
  color: #666;
}

.bid-car {
  font-size: 26rpx;
  color: #666;
}

.bid-rating {
  font-size: 26rpx;
  color: #666;
}

.bid-message-row {
  margin-top: 12rpx;
  padding-top: 12rpx;
  border-top: 2rpx solid #f0f0f0;
}

.bid-message-text {
  font-size: 26rpx;
  color: #666;
}

/* ═══════════════════════════════════════════════════════════════
   空状态
   ═══════════════════════════════════════════════════════════════ */

.empty-state {
  text-align: center;
  padding: 80rpx 40rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #666;
  display: block;
  margin-bottom: 24rpx;
}

.empty-btn {
  width: 240rpx;
  height: 80rpx;
  background: #000;
  color: #fff;
  font-size: 28rpx;
  border-radius: 40rpx;
}

.empty-btn::after {
  border: none;
}

.empty-bids {
  text-align: center;
  padding: 60rpx 40rpx;
  background: #fff;
  border-radius: 16rpx;
}

.empty-tip {
  font-size: 26rpx;
  color: #999;
  display: block;
  margin-bottom: 24rpx;
}

.refresh-btn {
  width: 200rpx;
  height: 72rpx;
  background: #000;
  color: #fff;
  font-size: 26rpx;
  border-radius: 36rpx;
}

.refresh-btn::after {
  border: none;
}
</style>
