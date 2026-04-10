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
        <view class="vehicle-selector">
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
        <text class="form-hint" v-if="!selectedVehicle">请选择要派出的车辆</text>
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
      <button class="submit-btn" :class="{ disabled: !canSubmit }" @click="submitBid">
        <text>确认报价</text>
        <text class="btn-price" v-if="bidPrice">¥{{ bidPrice }}</text>
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { providerService } from '@/services/provider';
import { canQuoteDemand, type MerchantReviewStatus, type ProviderRole } from '@/types/provider';

// 订单信息
const orderInfo = ref({
  id: 0,
  start: '',
  end: '',
  startTime: '',
  passengerCount: 0,
  distance: '',
  duration: '',
  remark: ''
});

// 可用车辆列表
const availableVehicles = ref([
  { id: 1, plate: '鄂A·B1234', model: '丰田阿尔法', seats: 7, color: '黑色', status: 'active' },
  { id: 2, plate: '鄂A·X5678', model: '奔驰S级', seats: 4, color: '白色', status: 'active' },
  { id: 3, plate: '鄂A·C9012', model: '别克GL8', seats: 8, color: '银色', status: 'maintenance' }
]);

// 表单数据
const selectedVehicle = ref<any>(null);
const bidPrice = ref('');
const bidRemark = ref('');
const platformFeeRate = 5; // 平台服务费率 5%
const providerRole = ref<ProviderRole>('OWNER');
const reviewStatus = ref<MerchantReviewStatus>('APPROVED');

// 建议价格（根据订单距离等计算）
const suggestedPrices = computed(() => {
  const basePrice = parseInt(orderInfo.value.distance) || 100;
  return [basePrice, Math.round(basePrice * 1.2), Math.round(basePrice * 1.5)];
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
  return (
    providerRole.value !== 'DRIVER' &&
    canQuoteDemand(reviewStatus.value) &&
    selectedVehicle.value &&
    bidPrice.value &&
    parseFloat(bidPrice.value) > 0
  );
});

const accessHint = computed(() => {
  if (providerRole.value === 'DRIVER') {
    return '司机模式不可报价，请返回任务页处理已分配订单'
  }
  if (!canQuoteDemand(reviewStatus.value)) {
    return '商家审核通过后才可报价，当前页面仅供预览订单信息'
  }
  return ''
})

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

  // 根据车型自动建议价格
  if (vehicle.seats >= 7) {
    setPrice(suggestedPrices.value[1]); // 大车推荐中等价位
  } else {
    setPrice(suggestedPrices.value[0]); // 小车推荐基础价位
  }
};

// 设置价格
const setPrice = (price: number) => {
  bidPrice.value = price.toString();
};

// 价格输入处理
const onPriceInput = (e: any) => {
  const value = e.detail.value;
  // 限制小数点后两位
  if (value.includes('.')) {
    const parts = value.split('.');
    if (parts[1] && parts[1].length > 2) {
      bidPrice.value = parts[0] + '.' + parts[1].substring(0, 2);
    }
  }
};

// 提交报价
const submitBid = async () => {
  if (!canSubmit.value) {
    uni.showToast({ title: accessHint.value || '请完善报价信息', icon: 'none' });
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
    await providerService.submitBid({
      demandId: orderInfo.value.id,
      vehicleId: selectedVehicle.value.id,
      price: parseFloat(bidPrice.value),
      remark: bidRemark.value
    });
    uni.hideLoading();
    uni.showToast({ title: '报价成功', icon: 'success' });
    setTimeout(() => {
      uni.navigateBack();
    }, 1200);
  } catch (error) {
    uni.hideLoading();
    uni.showToast({
      title: error instanceof Error ? error.message : '报价失败',
      icon: 'none'
    });
  }
};

// 页面加载时获取订单信息
onMounted(() => {
  providerService
    .fetchWorkbench()
    .then((workbench) => {
      providerRole.value = workbench.session.role;
      reviewStatus.value = workbench.session.reviewStatus;
    })
    .catch((error) => {
      console.error('加载商家权限失败', error);
    });

  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const options = currentPage.options as any;

  if (options.id) {
    orderInfo.value.id = parseInt(options.id);

    // 模拟获取订单详情（实际应该从接口获取）
    const mockOrder = {
      id: 101,
      start: '武汉天河国际机场-T3航站楼',
      end: '武汉洪山区人民法院',
      startTime: '今天 16:30-16:45',
      passengerCount: 4,
      distance: '45公里',
      duration: '约50分钟',
      remark: '需要别克GL8，有两件大行李'
    };

    orderInfo.value = { ...orderInfo.value, ...mockOrder };
  }
});
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
