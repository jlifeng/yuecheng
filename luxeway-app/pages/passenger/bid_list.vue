<template>
  <view class="container">
    <view class="header">
      <text class="title">商家报价 (3)</text>
    </view>

    <!-- 模拟报价列表 -->
    <view class="bid-list">
      <view class="bid-card" v-for="(bid, index) in bids" :key="index" @click="selectBid(bid)">
        <view class="bid-header">
          <text class="price">¥{{ bid.price }}</text>
          <text class="provider">{{ bid.providerName }}</text>
        </view>
        <view class="car-info">
          <image :src="bid.carImage" mode="aspectFill" class="car-image"></image>
          <view class="car-details">
            <text class="car-model">{{ bid.carModel }}</text>
            <text class="seats">{{ bid.seats }}座</text>
            <text class="rating">评分 {{ bid.rating }}</text>
          </view>
        </view>
        <view class="action-area">
          <button class="accept-btn">选择此报价</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchBidList, type PassengerBid } from '@/services/passenger'

const bids = ref<PassengerBid[]>([])

const loadBids = async () => {
  try {
    bids.value = await fetchBidList()
  } catch (error) {
    console.error('加载报价失败', error)
  }
}

const selectBid = (bid: PassengerBid) => {
  uni.showModal({
    title: '确认选择',
    content: `确定选择 ${bid.providerName} (¥${bid.price}) 吗？`,
    success: (res) => {
      if (res.confirm) {
        uni.navigateTo({ url: '/pages/order/detail?id=' + bid.id })
      }
    }
  })
}

onMounted(loadBids)
</script>

<style>
.container {
  padding: 15px;
  background-color: #f5f5f5;
  min-height: 100vh;
}
.header { margin-bottom: 20px; }
.title { font-size: 20px; font-weight: bold; }

.bid-card {
  background: white;
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.bid-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.price { color: #f5222d; font-size: 22px; font-weight: bold; }
.provider { font-size: 14px; color: #666; }

.car-info {
  display: flex;
  margin-bottom: 15px;
}

.car-image {
  width: 100px;
  height: 70px;
  border-radius: 6px;
  margin-right: 12px;
  background-color: #eee;
}

.car-details {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
}

.car-model { font-size: 16px; font-weight: 500; }
.seats, .rating { font-size: 12px; color: #999; }
.rating { color: #faad14; }

.accept-btn {
  background: #007aff;
  color: white;
  font-size: 14px;
  border-radius: 20px;
}
</style>
