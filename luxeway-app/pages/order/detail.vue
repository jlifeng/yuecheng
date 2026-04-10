<template>
  <view class="container">
    <view class="status-card">
      <text class="status-text">{{ statusText }}</text>
      <text class="sub-text">{{ subText }}</text>
    </view>
    <view v-if="showWaitingFeeNotice" class="waiting-notice">
      <text>司机正在等待中，超出免费时长后将产生等待费用</text>
    </view>

    <view class="driver-card">
      <view class="driver-info">
        <image class="avatar" src="https://img.yzcdn.cn/vant/cat.jpeg"></image>
        <view>
          <text class="name">{{ driverName }}</text>
          <text class="plate">{{ plateNumber }}</text>
          <text class="car">{{ carModel }}</text>
        </view>
      </view>
      <view class="actions">
        <button class="call-btn" @click="callDriver">联系司机</button>
      </view>
    </view>

    <view v-if="timelineItems.length" class="timeline-card">
      <view class="timeline-item" v-for="item in timelineItems" :key="item.code">
        <text class="timeline-title">{{ item.title }}</text>
        <text class="timeline-desc">{{ item.description }}</text>
      </view>
    </view>

    <view v-if="shouldShowFeeSummary && feeSummary" class="fee-card">
      <text class="fee-label">费用明细</text>
      <view class="fee-row">
        <text>基础费用</text>
        <text>¥{{ feeSummary.baseFare }}</text>
      </view>
      <view class="fee-row">
        <text>等待费用</text>
        <text>¥{{ feeSummary.waitingFee }}</text>
      </view>
      <view class="fee-row">
        <text>过路费</text>
        <text>¥{{ feeSummary.tollFee }}</text>
      </view>
      <view class="fee-row">
        <text>停车费</text>
        <text>¥{{ feeSummary.parkingFee }}</text>
      </view>
      <view class="fee-row">
        <text>其他</text>
        <text>¥{{ feeSummary.otherFee }}</text>
      </view>
      <view class="fee-row total-row">
        <text>总计</text>
        <text class="total-value">¥{{ feeSummary.totalAmount }}</text>
      </view>
      <button class="confirm-fee-btn" @click="confirmFees">确认费用</button>
    </view>

  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useOrderStore } from '@/stores/order'
import { fetchOrderDetail } from '@/services/passenger'
import { useOrderTimeline } from '@/composables/useOrderTimeline'

const orderStore = useOrderStore()
const {
  statusText,
  subText,
  timelineItems,
  feeSummary,
  shouldShowFeeSummary,
  showWaitingFeeNotice
} = useOrderTimeline(orderStore.detail)

const driverName = computed(() => orderStore.detail.value?.driverName ?? '司机信息暂未同步')
const driverPhone = computed(() => orderStore.detail.value?.driverPhone ?? '')
const carModel = computed(() => orderStore.detail.value?.carModel ?? '')
const plateNumber = computed(() => orderStore.detail.value?.plateNumber ?? '')
const loadDetail = async (orderId: string) => {
  try {
    const detail = await fetchOrderDetail(orderId)
    orderStore.setOrderDetail(detail)
  } catch (error) {
    console.error('加载订单详情失败', error)
  }
}

onLoad((options: any) => {
  const id = options?.id ?? 'mock-order'
  loadDetail(id)
})

const callDriver = () => {
  const phone = driverPhone.value
  if (!phone) return
  uni.makePhoneCall({ phoneNumber: phone })
}

const confirmFees = () => {
  uni.showToast({
    title: '费用已确认，请尽快完成支付',
    icon: 'success'
  })
}
</script>

<style>
.container {
  padding: 20px;
  background-color: #f4f5f7;
  min-height: 100vh;
}

.status-card {
  background: linear-gradient(135deg, #007aff, #0056b3);
  padding: 30px 20px;
  border-radius: 12px;
  color: white;
  margin-bottom: 20px;
  text-align: center;
}
.status-text { font-size: 24px; font-weight: bold; display: block; margin-bottom: 10px; }
.sub-text { font-size: 14px; opacity: 0.9; }

.driver-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}
.driver-info { display: flex; align-items: center; }
.avatar { width: 50px; height: 50px; border-radius: 25px; margin-right: 15px; background: #eee; }
.name { font-size: 18px; font-weight: bold; display: block; }
.plate, .car { font-size: 12px; color: #666; display: block; margin-top: 2px; }

.call-btn {
  background: white;
  border: 1px solid #007aff;
  color: #007aff;
  font-size: 12px;
  border-radius: 20px;
}

.waiting-notice {
  background: #fff3e0;
  border: 1px dashed #ffb74d;
  padding: 10px 15px;
  border-radius: 10px;
  margin-bottom: 20px;
  color: #8a4b00;
}

.timeline-card {
  background: white;
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}
.timeline-item + .timeline-item {
  margin-top: 10px;
}
.timeline-title {
  font-size: 14px;
  font-weight: bold;
  color: #333;
}
.timeline-desc {
  font-size: 12px;
  color: #666;
}

.fee-card {
  background: white;
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}
.fee-label {
  font-weight: bold;
  margin-bottom: 10px;
  display: block;
}
.fee-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  border-bottom: 1px dashed #f0f0f0;
}
.fee-row:last-child {
  border-bottom: none;
}
.total-row {
  margin-top: 8px;
  font-weight: bold;
}
.total-value {
  font-size: 16px;
  color: #f5222d;
}
.confirm-fee-btn {
  margin-top: 12px;
  width: 100%;
  background: linear-gradient(135deg, #007aff, #0056b3);
  color: white;
  border-radius: 20px;
  padding: 12px 0;
  font-weight: bold;
  border: none;
}

</style>
