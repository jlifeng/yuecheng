<template>
  <view class="orders-page">
    <scroll-view scroll-y class="scroll-container" @scrolltolower="loadMore">
      <!-- 空状态 -->
      <view v-if="!loading && orders.length === 0" class="empty-state">
        <text class="empty-icon">📋</text>
        <text class="empty-text">暂无订单</text>
        <text class="empty-hint">接受报价后，订单将显示在这里</text>
      </view>

      <!-- 订单列表 -->
      <view v-else class="orders-list">
        <view
          v-for="order in orders"
          :key="order.id"
          class="order-card"
          @click="goToDetail(order)"
        >
          <view class="card-header">
            <view :class="['status-badge', getStatusClass(order.status)]">
              {{ order.statusDesc }}
            </view>
            <text class="arrow">›</text>
          </view>

          <view class="card-route">
            <view class="route-dot"></view>
            <text class="route-text">{{ formatDestination(order.end) }}</text>
          </view>

          <view class="card-info">
            <text class="info-time">{{ formatTime(order.earliestDeparture) }}</text>
            <text class="info-price">¥{{ order.price }}</text>
          </view>
        </view>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="loading">
        <text>加载中...</text>
      </view>
      <view v-else-if="orders.length > 0 && !hasMore" class="no-more">
        <text>没有更多了</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchMerchantOrders } from '@/services/provider'

interface MerchantOrder {
  id: string
  bidId: string
  price: number
  start: string
  end: string
  earliestDeparture: string
  latestDeparture: string
  passengerCount: number
  status: string
  statusDesc: string
  createdAt: string
}

const orders = ref<MerchantOrder[]>([])
const loading = ref(true)
const page = ref(1)
const hasMore = ref(true)

onMounted(async () => {
  await loadOrders()
})

const loadOrders = async (isLoadMore: boolean = false) => {
  if (loading.value && isLoadMore) return

  if (isLoadMore) {
    if (!hasMore.value) return
    page.value++
  } else {
    page.value = 1
    hasMore.value = true
  }

  loading.value = true
  try {
    const { data, hasMore: more } = await fetchMerchantOrders(page.value)
    if (isLoadMore) {
      orders.value.push(...data)
    } else {
      orders.value = data
    }
    hasMore.value = more
  } catch (e) {
    console.error('加载订单失败:', e instanceof Error ? e.message : 'unknown error')
  } finally {
    loading.value = false
  }
}

const loadMore = () => {
  loadOrders(true)
}

const getStatusClass = (status: string): string => {
  switch (status) {
    case 'ACCEPTED': return 'status-accepted'
    case 'IN_PROGRESS': return 'status-active'
    case 'COMPLETED': return 'status-done'
    case 'CANCELLED': return 'status-cancelled'
    default: return 'status-pending'
  }
}

const formatDestination = (address: string): string => {
  if (!address) return ''
  const parts = address.split(/[\s,，]/)
  return parts[parts.length - 1] || address
}

const formatTime = (isoString: string): string => {
  if (!isoString) return ''
  const date = new Date(isoString)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours().toString().padStart(2, '0')
  const minute = date.getMinutes().toString().padStart(2, '0')
  return `${month}月${day}日 ${hour}:${minute}`
}

const goToDetail = (order: MerchantOrder) => {
  // 商家端跳转自己的订单详情页
  uni.navigateTo({
    url: `/pages/provider/order_detail?demandId=${order.id}`
  })
}
</script>

<style scoped>
.orders-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.scroll-container {
  height: 100vh;
  padding: 24rpx;
  box-sizing: border-box;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 32rpx;
  color: #333;
  margin-bottom: 12rpx;
}

.empty-hint {
  font-size: 26rpx;
  color: #999;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.order-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.status-badge {
  font-size: 24rpx;
  font-weight: 500;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  color: #fff;
}

.status-accepted {
  background: #000;
}

.status-active {
  background: #3b82f6;
}

.status-done {
  background: #999;
}

.status-cancelled {
  background: #999;
}

.arrow {
  font-size: 32rpx;
  color: #ccc;
}

.card-route {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}

.route-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #000;
  margin-right: 12rpx;
}

.route-text {
  font-size: 30rpx;
  color: #333;
  font-weight: 500;
}

.card-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-time {
  font-size: 26rpx;
  color: #666;
}

.info-price {
  font-size: 28rpx;
  color: #000;
  font-weight: 600;
}

.loading {
  display: flex;
  justify-content: center;
  padding: 48rpx;
  color: #999;
  font-size: 26rpx;
}

.no-more {
  text-align: center;
  padding: 30rpx 0;
  font-size: 26rpx;
  color: #999;
}
</style>
