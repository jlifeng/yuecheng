<template>
  <view class="container">
    <!-- 状态卡片 -->
    <view class="status-card" :class="statusClass">
      <text class="status-text">{{ orderDetail?.statusDesc || '加载中...' }}</text>
      <text class="sub-text">{{ statusSubText }}</text>
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
        <text>{{ orderDetail.passengerCount }}人</text>
        <text>¥{{ orderDetail.price }}</text>
      </view>
    </view>

    <!-- 司机信息 -->
    <view class="driver-card" v-if="orderDetail">
      <view class="driver-info">
        <view class="driver-avatar">
          <text>🚗</text>
        </view>
        <view class="driver-detail">
          <text class="driver-name">{{ orderDetail.driverName || '司机' }}</text>
          <text class="driver-provider">{{ orderDetail.providerName }}</text>
          <text class="driver-car" v-if="orderDetail.carModel">{{ orderDetail.carModel }}</text>
        </view>
      </view>
      <view class="driver-actions">
        <button class="call-btn" @click="callDriver" v-if="orderDetail.driverPhone">
          <text>📞 联系司机</text>
        </button>
      </view>
    </view>

    <!-- 时间线 -->
    <view class="timeline-card" v-if="orderDetail?.timeline?.length">
      <text class="card-title">订单进度</text>
      <view class="timeline">
        <view
          class="timeline-item"
          v-for="(item, index) in orderDetail.timeline"
          :key="index"
          :class="item.status"
        >
          <view class="timeline-dot"></view>
          <view class="timeline-content">
            <text class="timeline-title">{{ item.title }}</text>
            <text class="timeline-desc" v-if="item.desc">{{ item.desc }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 费用明细 -->
    <view class="fee-card" v-if="orderDetail?.feeSummary">
      <text class="card-title">费用明细</text>
      <view class="fee-list">
        <view class="fee-row">
          <text>行程费用</text>
          <text>¥{{ orderDetail.feeSummary.baseFare }}</text>
        </view>
        <view class="fee-row" v-if="orderDetail.feeSummary.tollFee">
          <text>过路费</text>
          <text>¥{{ orderDetail.feeSummary.tollFee }}</text>
        </view>
        <view class="fee-row" v-if="orderDetail.feeSummary.parkingFee">
          <text>停车费</text>
          <text>¥{{ orderDetail.feeSummary.parkingFee }}</text>
        </view>
        <view class="fee-row total">
          <text>合计</text>
          <text class="total-price">¥{{ orderDetail.feeSummary.total }}</text>
        </view>
      </view>
    </view>

    <!-- 报价说明 -->
    <view class="remark-card" v-if="orderDetail?.message">
      <text class="card-title">商家备注</text>
      <text class="remark-text">{{ orderDetail.message }}</text>
    </view>

    <!-- 乘客备注 -->
    <view class="remark-card" v-if="orderDetail?.requirements">
      <text class="card-title">乘客备注</text>
      <text class="remark-text">{{ orderDetail.requirements }}</text>
    </view>

    <!-- 操作按钮 -->
    <view class="action-card" v-if="orderDetail && canCancel">
      <button class="cancel-btn" @click="showCancelModal">取消订单</button>
    </view>

    <!-- 评价按钮 -->
    <view class="action-card" v-if="orderDetail && canReview">
      <button class="review-btn" @click="showReviewModal">
        {{ hasReviewed ? '已评价' : '评价订单' }}
      </button>
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

    <!-- 评价弹窗 -->
    <view class="modal-mask" v-if="reviewModalVisible" @click="reviewModalVisible = false"></view>
    <view class="modal-popup review-popup" v-if="reviewModalVisible">
      <view class="modal-header">
        <text class="modal-title">评价订单</text>
        <text class="modal-close" @click="reviewModalVisible = false">×</text>
      </view>
      <view class="modal-body">
        <!-- 星级评分 -->
        <view class="rating-section">
          <text class="rating-label">服务评分</text>
          <view class="stars">
            <view
              class="star"
              v-for="i in 5"
              :key="i"
              :class="{ active: i <= rating }"
              @click="rating = i"
            >
              <text>★</text>
            </view>
          </view>
          <text class="rating-text">{{ ratingText }}</text>
        </view>

        <!-- 评价标签 -->
        <view class="tags-section">
          <text class="tags-label">选择标签</text>
          <view class="tags-list">
            <view
              class="tag-item"
              v-for="tag in reviewTags"
              :key="tag"
              :class="{ active: selectedTags.includes(tag) }"
              @click="toggleTag(tag)"
            >
              <text>{{ tag }}</text>
            </view>
          </view>
        </view>

        <!-- 文字评价 -->
        <view class="comment-section">
          <textarea
            class="comment-input"
            v-model="reviewComment"
            placeholder="说说您的体验吧（选填）"
            maxlength="200"
          ></textarea>
        </view>
      </view>
      <view class="modal-footer">
        <button class="modal-btn confirm full" @click="submitReviewClick" :disabled="submittingReview">
          {{ submittingReview ? '提交中...' : '提交评价' }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { fetchOrderDetail, cancelOrder, submitReview, checkReviewExists, type PassengerOrderDetail } from '@/services/passenger'

const demandId = ref('')
const orderDetail = ref<PassengerOrderDetail | null>(null)
const merchantId = ref('')

// 取消订单相关
const cancelModalVisible = ref(false)
const selectedReason = ref('')
const cancelling = ref(false)
const cancelReasons = [
  '行程有变',
  '找不到司机',
  '等待时间过长',
  '价格不合理',
  '其他原因'
]

const statusClass = computed(() => {
  const status = orderDetail.value?.status
  if (status === 'IN_PROGRESS') return 'status-active'
  if (status === 'COMPLETED') return 'status-done'
  if (status === 'CANCELLED') return 'status-cancelled'
  return 'status-accepted'
})

const statusSubText = computed(() => {
  const status = orderDetail.value?.status
  if (status === 'ACCEPTED') return '司机将按时到达出发地点'
  if (status === 'IN_PROGRESS') return '行程进行中，请注意安全'
  if (status === 'COMPLETED') return '感谢您的使用，期待下次服务'
  if (status === 'CANCELLED') return '订单已取消'
  return ''
})

// 是否可以取消订单
const canCancel = computed(() => {
  const status = orderDetail.value?.status
  // ACCEPTED 状态可以取消，IN_PROGRESS 需协商
  return status === 'ACCEPTED'
})

// 是否可以评价
const canReview = computed(() => {
  const status = orderDetail.value?.status
  return status === 'COMPLETED'
})

// 评价相关
const reviewModalVisible = ref(false)
const rating = ref(5)
const selectedTags = ref<string[]>([])
const reviewComment = ref('')
const submittingReview = ref(false)
const hasReviewed = ref(false)
const reviewTags = ['准时到达', '服务态度好', '车况良好', '驾驶平稳', '路线合理', '价格公道']

const ratingText = computed(() => {
  if (rating.value >= 5) return '非常满意'
  if (rating.value >= 4) return '满意'
  if (rating.value >= 3) return '一般'
  if (rating.value >= 2) return '不满意'
  return '很不满意'
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
  try {
    uni.showLoading({ title: '加载中...' })
    orderDetail.value = await fetchOrderDetail(id)

    // 获取商家 ID
    if (orderDetail.value) {
      // 从报价中获取 merchant_id
      const accessToken = uni.getStorageSync('accessToken')
      const bidRes = await uni.request({
        url: `https://qcsmavxqjofrhrdwgkpt.supabase.co/rest/v1/bids?demand_id=eq.${id}&status=eq.ACCEPTED&select=merchant_id`,
        method: 'GET',
        header: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjc21hdnhxam9mcmhyZHdna3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3OTU2OTUsImV4cCI6MjA5MTM3MTY5NX0.zM4mVvvZAylQIXZFrnzaSAy_MGqTvR3hrSWfSSP8xRQ',
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (bidRes.statusCode === 200 && (bidRes.data as any[])?.[0]) {
        merchantId.value = (bidRes.data as any[])[0].merchant_id
      }

      // 检查是否已评价
      if (orderDetail.value.status === 'COMPLETED') {
        hasReviewed.value = await checkReviewExists(id)
      }
    }

    console.log('订单详情:', orderDetail.value)
  } catch (error) {
    console.error('加载订单详情失败', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

const callDriver = () => {
  const phone = orderDetail.value?.driverPhone
  if (phone) {
    uni.makePhoneCall({ phoneNumber: phone })
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
    await cancelOrder(demandId.value, selectedReason.value)
    uni.showToast({ title: '订单已取消', icon: 'success' })
    cancelModalVisible.value = false

    // 刷新订单详情
    setTimeout(() => {
      loadOrderDetail(demandId.value)
    }, 500)
  } catch (error) {
    console.error('取消订单失败', error)
    uni.showToast({ title: '取消失败', icon: 'none' })
  } finally {
    cancelling.value = false
  }
}

// 显示评价弹窗
const showReviewModal = () => {
  if (hasReviewed.value) {
    uni.showToast({ title: '该订单已评价', icon: 'none' })
    return
  }
  rating.value = 5
  selectedTags.value = []
  reviewComment.value = ''
  reviewModalVisible.value = true
}

// 切换标签
const toggleTag = (tag: string) => {
  const index = selectedTags.value.indexOf(tag)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
  } else {
    selectedTags.value.push(tag)
  }
}

// 提交评价
const submitReviewClick = async () => {
  if (!demandId.value || !merchantId.value) return

  submittingReview.value = true
  try {
    await submitReview(
      demandId.value,
      merchantId.value,
      rating.value,
      selectedTags.value,
      reviewComment.value || undefined
    )
    uni.showToast({ title: '评价成功', icon: 'success' })
    reviewModalVisible.value = false
    hasReviewed.value = true
  } catch (error) {
    console.error('提交评价失败', error)
    uni.showToast({ title: '提交失败', icon: 'none' })
  } finally {
    submittingReview.value = false
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

.status-card.status-cancelled {
  background: #999;
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
  display: flex;
  gap: 30rpx;
  padding-top: 20rpx;
  border-top: 1px solid #f0f0f0;
  font-size: 26rpx;
  color: #666;
}

/* 司机卡片 */
.driver-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.driver-info {
  display: flex;
  align-items: center;
}

.driver-avatar {
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

.driver-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #000;
  display: block;
}

.driver-provider {
  font-size: 26rpx;
  color: #666;
  display: block;
}

.driver-car {
  font-size: 24rpx;
  color: #999;
  display: block;
}

.call-btn {
  background: #000;
  color: #fff;
  font-size: 26rpx;
  border-radius: 40rpx;
  padding: 16rpx 32rpx;
  border: none;
}

/* 时间线 */
.timeline-card, .fee-card, .remark-card {
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

.timeline {
  position: relative;
}

.timeline-item {
  display: flex;
  align-items: flex-start;
  position: relative;
  padding-bottom: 30rpx;
  padding-left: 40rpx;
}

.timeline-item:last-child {
  padding-bottom: 0;
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: 11rpx;
  top: 30rpx;
  bottom: 0;
  width: 2rpx;
  background: #e0e0e0;
}

.timeline-item:last-child::before {
  display: none;
}

.timeline-dot {
  position: absolute;
  left: 0;
  top: 6rpx;
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  background: #e0e0e0;
}

.timeline-item.completed .timeline-dot {
  background: #000;
}

.timeline-item.active .timeline-dot {
  background: #3b82f6;
}

.timeline-title {
  font-size: 28rpx;
  color: #000;
  font-weight: 500;
  display: block;
}

.timeline-desc {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-top: 4rpx;
}

/* 费用明细 */
.fee-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.fee-row {
  display: flex;
  justify-content: space-between;
  font-size: 28rpx;
  color: #666;
}

.fee-row.total {
  padding-top: 16rpx;
  border-top: 1px solid #f0f0f0;
  font-weight: bold;
  color: #000;
}

.total-price {
  font-size: 36rpx;
  color: #000;
}

/* 备注 */
.remark-text {
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
}

/* 操作按钮 */
.action-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
}

.cancel-btn {
  width: 100%;
  height: 88rpx;
  background: #fff;
  color: #ef4444;
  font-size: 30rpx;
  border-radius: 44rpx;
  border: 2rpx solid #ef4444;
}

.cancel-btn::after {
  border: none;
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

/* 评价弹窗 */
.review-popup {
  max-height: 80vh;
}

.rating-section {
  text-align: center;
  padding: 20rpx 0;
}

.rating-label {
  font-size: 28rpx;
  color: #666;
  display: block;
  margin-bottom: 20rpx;
}

.stars {
  display: flex;
  justify-content: center;
  gap: 16rpx;
}

.star {
  font-size: 60rpx;
  color: #ddd;
}

.star.active {
  color: #fbbf24;
}

.rating-text {
  font-size: 28rpx;
  color: #fbbf24;
  margin-top: 16rpx;
  display: block;
}

.tags-section {
  margin-top: 30rpx;
}

.tags-label {
  font-size: 28rpx;
  color: #666;
  display: block;
  margin-bottom: 16rpx;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.tag-item {
  padding: 16rpx 24rpx;
  background: #f5f5f5;
  border-radius: 30rpx;
  font-size: 26rpx;
  color: #666;
}

.tag-item.active {
  background: #000;
  color: #fff;
}

.comment-section {
  margin-top: 30rpx;
}

.comment-input {
  width: 100%;
  height: 160rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.modal-btn.full {
  flex: none;
  width: 100%;
}

/* 评价按钮 */
.review-btn {
  width: 100%;
  height: 88rpx;
  background: #000;
  color: #fff;
  font-size: 30rpx;
  border-radius: 44rpx;
  border: none;
}

.review-btn::after {
  border: none;
}
</style>
