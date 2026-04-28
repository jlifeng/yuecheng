<template>
  <view class="container">
    <view v-if="accessHint" class="access-hint">
      <text>{{ accessHint }}</text>
    </view>

    <!-- 订单信息卡片 -->
    <view class="info-card">
      <view class="card-header">
        <text class="header-title">订单详情</text>
        <view class="order-tag">包车/预约</view>
      </view>

      <!-- 路线信息 -->
      <view class="route-section">
        <view class="route-item">
          <view class="dot green-dot"></view>
          <text class="route-text">{{ orderInfo.start }}</text>
        </view>
        <view class="route-item">
          <view class="dot orange-dot"></view>
          <text class="route-text">{{ orderInfo.end }}</text>
        </view>
      </view>

      <!-- 订单详情 -->
      <view class="detail-grid">
        <view class="grid-item">
          <text class="grid-label">出发时间</text>
          <text class="grid-value">{{ orderInfo.startTime }}</text>
        </view>
        <view class="grid-item">
          <text class="grid-label">乘车人数</text>
          <text class="grid-value">{{ orderInfo.passengerCount }}人</text>
        </view>
        <view class="grid-item" v-if="orderInfo.distance">
          <text class="grid-label">预估里程</text>
          <text class="grid-value">{{ orderInfo.distance }}</text>
        </view>
        <view class="grid-item" v-if="orderInfo.duration">
          <text class="grid-label">预估时长</text>
          <text class="grid-value">{{ orderInfo.duration }}</text>
        </view>
      </view>

      <!-- 乘客备注 -->
      <view class="remark-section" v-if="orderInfo.remark">
        <view class="remark-header">
          <uni-icons type="chatbubble" size="16" color="#ff5f00"></uni-icons>
          <text class="remark-title">乘客备注</text>
        </view>
        <text class="remark-text">{{ orderInfo.remark }}</text>
      </view>
    </view>

    <!-- 报价表单卡片 -->
    <view class="form-card">
      <view class="card-header">
        <text class="header-title">我的报价</text>
      </view>

      <!-- 选择车辆 -->
      <view class="form-section">
        <text class="section-label">选择车辆 <text class="required">*</text></text>
        <view v-if="availableVehicles.length === 0" class="empty-vehicle">
          <text class="empty-text">暂无可用车辆</text>
          <text class="empty-hint">请先在"我的车队"中添加车辆</text>
        </view>
        <view v-else class="vehicle-selector">
          <scroll-view scroll-x class="vehicle-scroll" show-scrollbar="false">
            <view
              class="vehicle-option"
              :class="{ active: selectedVehicle?.id === vehicle.id }"
              v-for="vehicle in availableVehicles"
              :key="vehicle.id"
              @click="selectVehicle(vehicle)"
            >
              <view class="vehicle-icon" :style="{ background: getVehicleColor(vehicle.color) }">
                <text>🚗</text>
              </view>
              <text class="vehicle-plate">{{ vehicle.plate }}</text>
              <text class="vehicle-model">{{ vehicle.seats }}座 · {{ vehicle.model }}</text>
            </view>
          </scroll-view>
        </view>
        <text class="form-hint" v-if="availableVehicles.length > 0 && !selectedVehicle">请选择要派出的车辆</text>
      </view>

      <!-- 报价金额 -->
      <view class="form-section">
        <text class="section-label">报价金额 <text class="required">*</text></text>
        <view class="price-input-wrapper">
          <text class="price-symbol">¥</text>
          <input
            class="price-input"
            type="digit"
            v-model="bidPrice"
            placeholder="0.00"
            placeholder-class="input-placeholder"
            @input="onPriceInput"
          />
        </view>
        <view class="price-options">
          <view
            class="price-option"
            v-for="price in suggestedPrices"
            :key="price"
            @click="setPrice(price)"
          >
            <text>¥{{ price }}</text>
          </view>
        </view>
      </view>

      <!-- 报价说明 -->
      <view class="form-section">
        <text class="section-label">报价说明（选填）</text>
        <textarea
          class="textarea-input"
          v-model="bidRemark"
          placeholder="可填写服务内容、包含费用等信息..."
          placeholder-class="input-placeholder"
          maxlength="200"
        ></textarea>
        <text class="char-count">{{ bidRemark.length }}/200</text>
      </view>

      <!-- 费用明细 -->
      <view class="fee-breakdown" v-if="bidPrice">
        <view class="fee-row">
          <text class="fee-label">报价金额</text>
          <text class="fee-value">¥{{ bidPrice }}</text>
        </view>
        <view class="fee-row">
          <text class="fee-label">平台服务费（{{ platformFeeRate }}%）</text>
          <text class="fee-value">-¥{{ platformFee }}</text>
        </view>
        <view class="fee-row total">
          <text class="fee-label">预计收入</text>
          <text class="fee-value highlight">¥{{ estimatedIncome }}</text>
        </view>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="bottom-actions">
      <button class="submit-btn" :class="{ disabled: !canSubmit }" @click="submitBidHandler">
        <text>确认报价</text>
        <text class="btn-price" v-if="bidPrice">¥{{ bidPrice }}</text>
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app'
import { submitBid } from '@/services/provider'

const SUPABASE_URL = 'https://qcsmavxqjofrhrdwgkpt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjc21hdnhxam9mcmhyZHdna3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3OTU2OTUsImV4cCI6MjA5MTM3MTY5NX0.zM4mVvvZAylQIXZFrnzaSAy_MGqTvR3hrSWfSSP8xRQ'

// 需求信息
const demandInfo = ref<any>(null)
const orderInfo = ref({
  id: '',
  start: '',
  end: '',
  startTime: '',
  passengerCount: 0,
  distance: '',
  duration: '',
  remark: ''
});

// 可用车辆列表
const availableVehicles = ref<any[]>([]);

// 表单数据
const selectedVehicle = ref<any>(null);
const bidPrice = ref('');
const bidRemark = ref('');
const platformFeeRate = 5;
const accessHint = ref('');

// 建议价格
const suggestedPrices = computed(() => {
  return [100, 150, 200]
});

// 平台服务费
const platformFee = computed(() => {
  if (!bidPrice.value) return '0.00';
  const price = parseFloat(bidPrice.value);
  return (price * platformFeeRate / 100).toFixed(2);
});

// 预计收入
const estimatedIncome = computed(() => {
  if (!bidPrice.value) return '0.00';
  const price = parseFloat(bidPrice.value);
  return (price - parseFloat(platformFee.value)).toFixed(2);
});

// 是否可以提交
const canSubmit = computed(() => {
  return bidPrice.value && parseFloat(bidPrice.value) > 0
});

// 获取车辆颜色
const getVehicleColor = (colorName: string) => {
  const colorMap: Record<string, string> = {
    '黑色': '#2c2c2c',
    '白色': '#f5f5f5',
    '银色': '#c0c0c0'
  };
  return colorMap[colorName] || '#ddd';
};

// 选择车辆
const selectVehicle = (vehicle: any) => {
  if (vehicle.status !== 'active') {
    uni.showToast({ title: '该车辆维护中，无法选择', icon: 'none' });
    return;
  }
  selectedVehicle.value = vehicle;
};

// 设置价格
const setPrice = (price: number) => {
  bidPrice.value = price.toString();
};

// 价格输入处理
const onPriceInput = (e: any) => {
  const value = e.detail.value;
  if (value.includes('.')) {
    const parts = value.split('.');
    if (parts[1] && parts[1].length > 2) {
      bidPrice.value = parts[0] + '.' + parts[1].substring(0, 2);
    }
  }
};

// 格式化时间
const formatTime = (earliest: string, latest: string) => {
  const start = new Date(earliest)
  const end = new Date(latest)
  const month = start.getMonth() + 1
  const day = start.getDate()
  const startHour = start.getHours().toString().padStart(2, '0')
  const startMin = start.getMinutes().toString().padStart(2, '0')
  const endHour = end.getHours().toString().padStart(2, '0')
  const endMin = end.getMinutes().toString().padStart(2, '0')
  return `${month}月${day}日 ${startHour}:${startMin}-${endHour}:${endMin}`
}

// 加载需求详情
const loadDemandDetail = async (demandId: string) => {
  const accessToken = uni.getStorageSync('accessToken')
  const userProfile = uni.getStorageSync('userProfile')

  if (!accessToken || !userProfile?.merchant_id) {
    accessHint.value = '请先登录商家账号'
    return
  }

  try {
    const res = await uni.request({
      url: `${SUPABASE_URL}/rest/v1/demands?id=eq.${demandId}&select=*`,
      method: 'GET',
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (res.statusCode === 200 && res.data && (res.data as any[]).length > 0) {
      demandInfo.value = (res.data as any[])[0]
      orderInfo.value = {
        id: demandInfo.value.id,
        start: demandInfo.value.start_address,
        end: demandInfo.value.end_address,
        startTime: formatTime(demandInfo.value.earliest_departure, demandInfo.value.latest_departure),
        passengerCount: demandInfo.value.passenger_count || 1,
        distance: '',
        duration: '',
        remark: demandInfo.value.requirements || ''
      }
    }
  } catch (e) {
    console.error('加载需求详情失败', e)
  }
}

// 加载车辆列表
const loadVehicles = async () => {
  const accessToken = uni.getStorageSync('accessToken')
  const userProfile = uni.getStorageSync('userProfile')

  if (!accessToken || !userProfile?.merchant_id) {
    return
  }

  try {
    const res = await uni.request({
      url: `${SUPABASE_URL}/rest/v1/vehicles?merchant_id=eq.${userProfile.merchant_id}&status=eq.active&select=*&order=created_at.desc`,
      method: 'GET',
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`
      }
    })

    console.log('车辆查询结果:', res.statusCode, res.data)

    if (res.statusCode === 200 && res.data) {
      availableVehicles.value = (res.data as any[]).map(v => ({
        id: v.id,
        plate: v.plate_number,
        model: v.model,
        seats: v.seats,
        color: v.color || '黑色',
        status: v.status,
        frontImage: v.front_image_url
      }))
    }
  } catch (e) {
    console.error('加载车辆列表失败', e)
  }
}

// 提交报价
const submitBidHandler = async () => {
  if (!canSubmit.value) {
    uni.showToast({ title: '请输入报价金额', icon: 'none' });
    return;
  }

  const confirmRes = await uni.showModal({
    title: '确认报价',
    content: `确认以 ¥${bidPrice.value} 报价此订单吗？`,
    confirmColor: '#1e2023'
  });

  if (!confirmRes.confirm) {
    return;
  }

  try {
    uni.showLoading({ title: '提交中...' });
    await submitBid({
      demandId: orderInfo.value.id,
      price: parseFloat(bidPrice.value),
      carModel: selectedVehicle.value?.model || undefined,
      message: bidRemark.value || undefined
    });
    uni.hideLoading();
    uni.showToast({ title: '报价成功', icon: 'success' });
    setTimeout(() => {
      uni.navigateBack();
    }, 1200);
  } catch (error: any) {
    uni.hideLoading();
    uni.showToast({
      title: error.message || '报价失败',
      icon: 'none'
    });
  }
};

// 页面加载
onLoad((options: any) => {
  if (options?.demandId) {
    loadDemandDetail(options.demandId)
  }
  // 加载车辆列表
  loadVehicles()
})
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: 100px;
}

.access-hint {
  margin: 15px 15px 0;
  padding: 12px 15px;
  border-radius: 12px;
  background: #fff7e6;
  border: 1px solid #ffd591;
  color: #ad6800;
  font-size: 12px;
  line-height: 1.6;
}

/* 信息卡片 */
.info-card,
.form-card {
  background: #fff;
  margin: 15px;
  border-radius: 12px;
  padding: 15px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.header-title {
  font-size: 16px;
  font-weight: bold;
  color: #1e2023;
}

.order-tag {
  background: #f0f0f0;
  color: #666;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 4px;
}

/* 路线信息 */
.route-section {
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #f5f5f5;
}

.route-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.route-item:last-child {
  margin-bottom: 0;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 10px;
  flex-shrink: 0;
}

.green-dot { background: #3cb371; }
.orange-dot { background: #ff5f00; }

.route-text {
  font-size: 15px;
  color: #333;
  font-weight: 500;
}

/* 详情网格 */
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-bottom: 10px;
}

.grid-item {
  display: flex;
  flex-direction: column;
}

.grid-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.grid-value {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

/* 备注区域 */
.remark-section {
  background: #fff8f5;
  border-radius: 8px;
  padding: 12px;
}

.remark-header {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}

.remark-title {
  font-size: 13px;
  color: #ff5f00;
  font-weight: 500;
  margin-left: 6px;
}

.remark-text {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

/* 表单区域 */
.form-section {
  margin-bottom: 20px;
}

.section-label {
  font-size: 14px;
  color: #333;
  font-weight: 500;
  margin-bottom: 10px;
  display: block;
}

.required {
  color: #f5222d;
}

/* 车辆选择 */
.vehicle-selector {
  margin-bottom: 8px;
}

.vehicle-scroll {
  white-space: nowrap;
}

.vehicle-option {
  display: inline-block;
  width: 140px;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 12px;
  margin-right: 10px;
  text-align: center;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.vehicle-option.active {
  background: #f0f5ff;
  border-color: #1e2023;
}

.vehicle-icon {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  margin: 0 auto 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.vehicle-plate {
  display: block;
  font-size: 14px;
  font-weight: bold;
  color: #1e2023;
  margin-bottom: 4px;
}

.vehicle-model {
  display: block;
  font-size: 12px;
  color: #999;
}

.form-hint {
  font-size: 12px;
  color: #ff5f00;
}

/* 空车辆状态 */
.empty-vehicle {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}

.empty-vehicle .empty-text {
  display: block;
  font-size: 14px;
  color: #999;
  margin-bottom: 6px;
}

.empty-vehicle .empty-hint {
  display: block;
  font-size: 12px;
  color: #ccc;
}

/* 价格输入 */
.price-input-wrapper {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 12px 15px;
  margin-bottom: 10px;
}

.price-symbol {
  font-size: 24px;
  font-weight: bold;
  color: #1e2023;
  margin-right: 8px;
}

.price-input {
  flex: 1;
  font-size: 28px;
  font-weight: bold;
  color: #1e2023;
  height: 40px;
}

.input-placeholder {
  color: #ccc;
}

.price-options {
  display: flex;
  gap: 8px;
}

.price-option {
  flex: 1;
  text-align: center;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 8px 0;
  font-size: 13px;
  color: #666;
  transition: all 0.2s;
}

.price-option:active {
  background: #f5f5f5;
  border-color: #1e2023;
  color: #1e2023;
}

/* 文本域 */
.textarea-input {
  width: 100%;
  min-height: 100px;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 12px;
  font-size: 14px;
  color: #333;
  line-height: 1.6;
  box-sizing: border-box;
}

.char-count {
  display: block;
  text-align: right;
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

/* 费用明细 */
.fee-breakdown {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  margin-top: 15px;
}

.fee-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.fee-row:last-child {
  margin-bottom: 0;
}

.fee-row.total {
  padding-top: 8px;
  border-top: 1px dashed #e0e0e0;
  margin-top: 8px;
}

.fee-label {
  font-size: 13px;
  color: #666;
}

.fee-value {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.fee-value.highlight {
  font-size: 16px;
  color: #ff5f00;
  font-weight: bold;
}

/* 底部按钮 */
.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 12px 15px;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
  z-index: 100;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
}

.submit-btn {
  width: 100%;
  height: 48px;
  background: #1e2023;
  color: #fff;
  border-radius: 24px;
  font-size: 16px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.submit-btn::after {
  border: none;
}

.submit-btn.disabled {
  background: #ccc;
  color: #999;
}

.btn-price {
  font-size: 18px;
}
</style>
