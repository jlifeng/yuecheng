<template>
  <view class="container">
    <view class="page-header">
      <text class="page-title">我的车队</text>
      <text class="subtitle">共 {{ vehicles.length }} 辆车</text>
    </view>

    <view v-if="isDriverMode" class="access-limited">
      <text class="access-limited__title">司机模式不可维护车队</text>
      <text class="access-limited__desc">当前账号仅保留任务执行能力，车辆与司机维护请使用商家管理员账号。</text>
    </view>

    <!-- 车辆列表 -->
    <view v-else class="vehicle-list">
      <view
        class="vehicle-item"
        v-for="(vehicle, index) in vehicles"
        :key="vehicle.id"
        @click="viewVehicleDetail(vehicle)"
        @longpress="showActionMenu(vehicle)"
      >
        <view class="vehicle-main">
          <view class="vehicle-image" :style="{ background: getVehicleColor(vehicle.color) }">
            <text class="vehicle-icon">🚗</text>
          </view>

          <view class="vehicle-info">
            <view class="vehicle-header">
              <text class="plate-number">{{ vehicle.plate }}</text>
              <view class="status-badge" :class="vehicle.status">
                <text class="status-text">{{ getStatusText(vehicle.status) }}</text>
              </view>
            </view>

            <view class="vehicle-details">
              <text class="detail-text">{{ vehicle.model }}</text>
              <text class="detail-divider">|</text>
              <text class="detail-text">{{ vehicle.seats }}座</text>
              <text class="detail-divider">|</text>
              <text class="detail-text">{{ vehicle.color }}</text>
            </view>

            <view class="vehicle-meta">
              <text class="meta-item">{{ vehicle.year }}年上牌</text>
              <text class="meta-divider">·</text>
              <text class="meta-item" :class="{ expired: isInsuranceExpiring(vehicle.insuranceDate) }">
                保险至 {{ vehicle.insuranceDate }}
              </text>
            </view>

            <!-- 关联司机 -->
            <view class="driver-section" v-if="vehicle.driver">
              <uni-icons type="person" size="14" color="#999"></uni-icons>
              <text class="driver-text">{{ vehicle.driver.name }}</text>
              <text class="driver-phone">{{ vehicle.driver.phone }}</text>
            </view>
            <view class="driver-section" v-else>
              <uni-icons type="person" size="14" color="#ccc"></uni-icons>
              <text class="no-driver">未分配司机</text>
            </view>
          </view>
        </view>

        <view class="action-area">
          <view class="quick-edit-btn" @click.stop="editVehicle(vehicle)">
            <uni-icons type="compose" size="16" color="#666"></uni-icons>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="vehicles.length === 0" class="empty-state">
        <text class="empty-icon">🚙</text>
        <text class="empty-text">暂无车辆</text>
        <text class="empty-hint">点击下方按钮添加第一辆车</text>
      </view>
    </view>

    <!-- 添加按钮 -->
    <view v-if="!isDriverMode" class="add-button" @click="addVehicle">
      <uni-icons type="plus" size="20" color="#fff"></uni-icons>
      <text>添加车辆</text>
    </view>

    <!-- 车辆详情弹窗 -->
    <view class="mask" v-if="!isDriverMode && showDetail" @click="closeDetail"></view>
    <view class="detail-popup" :class="{ show: showDetail }">
      <view class="popup-header">
        <text class="popup-title">车辆详情</text>
        <text class="popup-close" @click="closeDetail">×</text>
      </view>

      <scroll-view scroll-y class="popup-content">
        <view class="detail-section">
          <view class="detail-image" :style="{ background: getVehicleColor(currentVehicle?.color) }">
            <text class="detail-vehicle-icon">🚗</text>
          </view>

          <view class="detail-plate">{{ currentVehicle?.plate }}</view>
          <view class="status-badge large" :class="currentVehicle?.status">
            {{ getStatusText(currentVehicle?.status) }}
          </view>
        </view>

        <view class="detail-section">
          <view class="section-label">基本信息</view>
          <view class="info-row">
            <text class="info-label">车型</text>
            <text class="info-value">{{ currentVehicle?.model }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">座位数</text>
            <text class="info-value">{{ currentVehicle?.seats }}座</text>
          </view>
          <view class="info-row">
            <text class="info-label">颜色</text>
            <text class="info-value">{{ currentVehicle?.color }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">上牌年份</text>
            <text class="info-value">{{ currentVehicle?.year }}年</text>
          </view>
        </view>

        <view class="detail-section">
          <view class="section-label">保险信息</view>
          <view class="info-row">
            <text class="info-label">保险到期日</text>
            <text class="info-value" :class="{ expired: isInsuranceExpiring(currentVehicle?.insuranceDate) }">
              {{ currentVehicle?.insuranceDate }}
            </text>
          </view>
        </view>

        <view class="detail-section" v-if="currentVehicle?.driver">
          <view class="section-label">关联司机</view>
          <view class="driver-card">
            <view class="driver-avatar">
              <text class="avatar-text">{{ currentVehicle.driver.name.charAt(0) }}</text>
            </view>
            <view class="driver-detail">
              <text class="driver-name">{{ currentVehicle.driver.name }}</text>
              <text class="driver-phone">{{ currentVehicle.driver.phone }}</text>
            </view>
          </view>
        </view>
      </scroll-view>

      <view class="popup-footer">
        <button class="popup-btn secondary" @click="editVehicle(currentVehicle)">编辑</button>
        <button class="popup-btn danger" @click="confirmDelete">删除车辆</button>
      </view>
    </view>

    <!-- 添加/编辑弹窗 -->
    <view class="mask" v-if="!isDriverMode && showForm" @click="closeForm"></view>
    <view class="form-popup" :class="{ show: showForm }">
      <view class="popup-header">
        <text class="popup-title">{{ isEdit ? '编辑车辆' : '添加车辆' }}</text>
        <text class="popup-close" @click="closeForm">×</text>
      </view>

      <scroll-view scroll-y class="popup-content">
        <view class="form-section">
          <view class="form-item">
            <text class="form-label">车牌号码 <text class="required">*</text></text>
            <input
              class="form-input"
              v-model="formData.plate"
              placeholder="请输入车牌号，如：鄂A12345"
              placeholder-class="input-placeholder"
            />
          </view>

          <view class="form-item">
            <text class="form-label">车型 <text class="required">*</text></text>
            <input
              class="form-input"
              v-model="formData.model"
              placeholder="请输入车型，如：别克GL8"
              placeholder-class="input-placeholder"
            />
          </view>

          <view class="form-item">
            <text class="form-label">座位数 <text class="required">*</text></text>
            <picker mode="selector" :range="seatOptions" @change="onSeatChange">
              <view class="picker-input">
                <text :class="{ placeholder: !formData.seats }">
                  {{ formData.seats ? formData.seats + '座' : '请选择座位数' }}
                </text>
                <uni-icons type="arrowdown" size="14" color="#999"></uni-icons>
              </view>
            </picker>
          </view>

          <view class="form-item">
            <text class="form-label">车辆颜色</text>
            <input
              class="form-input"
              v-model="formData.color"
              placeholder="如：黑色、白色、银色"
              placeholder-class="input-placeholder"
            />
          </view>

          <view class="form-item">
            <text class="form-label">上牌年份</text>
            <picker mode="date" fields="month" :value="formData.year" @change="onYearChange">
              <view class="picker-input">
                <text :class="{ placeholder: !formData.year }">
                  {{ formData.year || '请选择年份' }}
                </text>
                <uni-icons type="arrowdown" size="14" color="#999"></uni-icons>
              </view>
            </picker>
          </view>

          <view class="form-item">
            <text class="form-label">保险到期日</text>
            <picker mode="date" :value="formData.insuranceDate" @change="onInsuranceDateChange">
              <view class="picker-input">
                <text :class="{ placeholder: !formData.insuranceDate }">
                  {{ formData.insuranceDate || '请选择保险到期日' }}
                </text>
                <uni-icons type="arrowdown" size="14" color="#999"></uni-icons>
              </view>
            </picker>
          </view>

          <view class="form-item">
            <text class="form-label">车辆状态</text>
            <view class="status-options">
              <view
                class="status-option"
                :class="{ active: formData.status === 'active' }"
                @click="formData.status = 'active'"
              >
                <text>运营中</text>
              </view>
              <view
                class="status-option"
                :class="{ active: formData.status === 'maintenance' }"
                @click="formData.status = 'maintenance'"
              >
                <text>维护中</text>
              </view>
            </view>
          </view>

          <view class="form-item">
            <text class="form-label">关联司机</text>
            <picker mode="selector" :range="driverOptions" range-key="name" @change="onDriverChange">
              <view class="picker-input">
                <text :class="{ placeholder: !formData.driverId }">
                  {{ getSelectedDriverName() || '暂不关联司机' }}
                </text>
                <uni-icons type="arrowdown" size="14" color="#999"></uni-icons>
              </view>
            </picker>
          </view>
        </view>
      </scroll-view>

      <view class="popup-footer">
        <button class="popup-btn secondary" @click="closeForm">取消</button>
        <button class="popup-btn primary" @click="saveVehicle">保存</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ProviderSessionManager } from '@/utils/dataManager';
import { type ProviderRole } from '@/types/provider';

// 司机数据（可从司机管理页面或本地存储获取）
const availableDrivers = ref([
  { id: 1, name: '张伟', phone: '138****1234', role: '队长' },
  { id: 2, name: '李强', phone: '139****5678', role: '司机' },
  { id: 3, name: '王芳', phone: '150****9012', role: '司机' }
]);

// 车辆数据
const vehicles = ref([
  {
    id: 1,
    plate: '鄂A·B1234',
    model: '丰田阿尔法',
    seats: 7,
    year: '2022',
    color: '黑色',
    insuranceDate: '2025-06-15',
    status: 'active',
    driver: { id: 1, name: '张伟', phone: '138****1234' }
  },
  {
    id: 2,
    plate: '鄂A·X5678',
    model: '奔驰S级',
    seats: 4,
    year: '2023',
    color: '白色',
    insuranceDate: '2025-12-20',
    status: 'active',
    driver: { id: 2, name: '李强', phone: '139****5678' }
  },
  {
    id: 3,
    plate: '鄂A·C9012',
    model: '别克GL8',
    seats: 8,
    year: '2021',
    color: '银色',
    insuranceDate: '2024-10-01',
    status: 'maintenance',
    driver: null
  }
]);

// 详情弹窗
const showDetail = ref(false);
const currentVehicle = ref<any>(null);

// 表单弹窗
const showForm = ref(false);
const isEdit = ref(false);
const seatOptions = [4, 5, 6, 7, 8, 9];

const formData = ref({
  id: null,
  plate: '',
  model: '',
  seats: null,
  color: '',
  year: '',
  insuranceDate: '',
  status: 'active',
  driverId: null
});

const driverOptions = computed(() => [
  { id: null, name: '暂不关联司机' },
  ...availableDrivers.value
]);
const providerRole = ref<ProviderRole>('OWNER');
const isDriverMode = computed(() => providerRole.value === 'DRIVER');

// 状态文本
const getStatusText = (status: string) => {
  return status === 'active' ? '运营中' : '维护中';
};

// 获取车辆颜色
const getVehicleColor = (colorName: string) => {
  const colorMap: Record<string, string> = {
    '黑色': '#2c2c2c',
    '白色': '#f5f5f5',
    '银色': '#c0c0c0',
    '灰色': '#808080',
    '红色': '#e74c3c',
    '蓝色': '#3498db',
    '棕色': '#8b4513'
  };
  return colorMap[colorName] || '#ddd';
};

// 检查保险是否即将到期（30天内）
const isInsuranceExpiring = (dateStr: string) => {
  if (!dateStr) return false;
  const insuranceDate = new Date(dateStr);
  const today = new Date();
  const diffDays = Math.ceil((insuranceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 30;
};

// 查看详情
const viewVehicleDetail = (vehicle: any) => {
  currentVehicle.value = vehicle;
  showDetail.value = true;
};

const closeDetail = () => {
  showDetail.value = false;
  currentVehicle.value = null;
};

// 显示操作菜单（长按）
const showActionMenu = (vehicle: any) => {
  uni.showActionSheet({
    itemList: ['查看详情', '编辑', '删除'],
    success: (res) => {
      if (res.tapIndex === 0) {
        viewVehicleDetail(vehicle);
      } else if (res.tapIndex === 1) {
        editVehicle(vehicle);
      } else if (res.tapIndex === 2) {
        currentVehicle.value = vehicle;
        confirmDelete();
      }
    }
  });
};

// 添加车辆
const addVehicle = () => {
  isEdit.value = false;
  formData.value = {
    id: null,
    plate: '',
    model: '',
    seats: null,
    color: '',
    year: '',
    insuranceDate: '',
    status: 'active',
    driverId: null
  };
  showForm.value = true;
};

// 编辑车辆
const editVehicle = (vehicle: any) => {
  closeDetail();
  isEdit.value = true;
  currentVehicle.value = vehicle;
  formData.value = {
    id: vehicle.id,
    plate: vehicle.plate.replace('·', ''), // 去掉中间点方便编辑
    model: vehicle.model,
    seats: vehicle.seats,
    color: vehicle.color,
    year: vehicle.year,
    insuranceDate: vehicle.insuranceDate,
    status: vehicle.status,
    driverId: vehicle.driver?.id || null
  };
  showForm.value = true;
};

const closeForm = () => {
  showForm.value = false;
  formData.value = {
    id: null,
    plate: '',
    model: '',
    seats: null,
    color: '',
    year: '',
    insuranceDate: '',
    status: 'active',
    driverId: null
  };
};

// 保存车辆
const saveVehicle = () => {
  // 表单验证
  if (!formData.value.plate) {
    uni.showToast({ title: '请输入车牌号', icon: 'none' });
    return;
  }
  if (!formData.value.model) {
    uni.showToast({ title: '请输入车型', icon: 'none' });
    return;
  }
  if (!formData.value.seats) {
    uni.showToast({ title: '请选择座位数', icon: 'none' });
    return;
  }

  // 格式化车牌号
  const formatPlate = (plate: string) => {
    if (plate.length === 7) {
      return plate.slice(0, 2) + '·' + plate.slice(2);
    }
    return plate;
  };

  // 查找关联的司机
  const selectedDriver = availableDrivers.value.find(d => d.id === formData.value.driverId);

  if (isEdit.value) {
    // 更新现有车辆
    const index = vehicles.value.findIndex(v => v.id === formData.value.id);
    if (index !== -1) {
      vehicles.value[index] = {
        ...vehicles.value[index],
        plate: formatPlate(formData.value.plate),
        model: formData.value.model,
        seats: formData.value.seats,
        color: formData.value.color || '未设置',
        year: formData.value.year || '未知',
        insuranceDate: formData.value.insuranceDate || '未设置',
        status: formData.value.status,
        driver: selectedDriver || null
      };
    }
    uni.showToast({ title: '修改成功', icon: 'success' });
  } else {
    // 添加新车辆
    const newVehicle = {
      id: Date.now(),
      plate: formatPlate(formData.value.plate),
      model: formData.value.model,
      seats: formData.value.seats,
      color: formData.value.color || '未设置',
      year: formData.value.year || '未知',
      insuranceDate: formData.value.insuranceDate || '未设置',
      status: formData.value.status,
      driver: selectedDriver || null
    };
    vehicles.value.unshift(newVehicle);
    uni.showToast({ title: '添加成功', icon: 'success' });
  }

  closeForm();
};

// 删除车辆
const confirmDelete = () => {
  closeDetail();
  uni.showModal({
    title: '确认删除',
    content: `确定要删除车辆 ${currentVehicle.value?.plate} 吗？`,
    confirmColor: '#f5222d',
    success: (res) => {
      if (res.confirm) {
        const index = vehicles.value.findIndex(v => v.id === currentVehicle.value?.id);
        if (index !== -1) {
          vehicles.value.splice(index, 1);
          uni.showToast({ title: '删除成功', icon: 'success' });
        }
      }
    }
  });
};

// Picker 事件处理
const onSeatChange = (e: any) => {
  formData.value.seats = seatOptions[e.detail.value];
};

const onYearChange = (e: any) => {
  formData.value.year = e.detail.value;
};

const onInsuranceDateChange = (e: any) => {
  formData.value.insuranceDate = e.detail.value;
};

const onDriverChange = (e: any) => {
  const selected = driverOptions.value[e.detail.value];
  formData.value.driverId = selected.id;
};

const getSelectedDriverName = () => {
  if (!formData.value.driverId) return '';
  const driver = availableDrivers.value.find(d => d.id === formData.value.driverId);
  return driver?.name || '';
};

onMounted(() => {
  providerRole.value = ProviderSessionManager.getSession().role;
});
</script>

<style scoped>
.container {
  padding: 15px;
  background: #f5f7fa;
  min-height: 100vh;
  padding-bottom: 100px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.page-title {
  font-size: 22px;
  font-weight: bold;
  color: #1e2023;
}

.subtitle {
  font-size: 13px;
  color: #999;
}

.access-limited {
  padding: 24px 18px;
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 12px;
  margin-bottom: 16px;
}

.access-limited__title {
  display: block;
  font-size: 16px;
  font-weight: bold;
  color: #ad6800;
  margin-bottom: 8px;
}

.access-limited__desc {
  font-size: 13px;
  color: #8c5a00;
  line-height: 1.7;
}

/* 车辆列表 */
.vehicle-list {
  margin-bottom: 20px;
}

.vehicle-item {
  background: #fff;
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.vehicle-main {
  display: flex;
  gap: 12px;
}

.vehicle-image {
  width: 70px;
  height: 70px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.vehicle-icon {
  font-size: 32px;
}

.vehicle-info {
  flex: 1;
  min-width: 0;
}

.vehicle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.plate-number {
  font-size: 16px;
  font-weight: bold;
  color: #1e2023;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
}

.status-badge.active {
  background: #e8f5e9;
  color: #388e3c;
}

.status-badge.maintenance {
  background: #fff3e0;
  color: #f57c00;
}

.vehicle-details {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.detail-text {
  font-size: 13px;
  color: #666;
}

.detail-divider {
  margin: 0 6px;
  color: #ddd;
  font-size: 10px;
}

.vehicle-meta {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}

.meta-item {
  font-size: 12px;
  color: #999;
}

.meta-item.expired {
  color: #f5222d;
}

.meta-divider {
  margin: 0 6px;
  color: #ddd;
}

.driver-section {
  display: flex;
  align-items: center;
  padding-top: 6px;
  border-top: 1px solid #f5f5f5;
}

.driver-text {
  font-size: 12px;
  color: #333;
  margin-left: 6px;
}

.driver-phone {
  font-size: 11px;
  color: #999;
  margin-left: 8px;
}

.no-driver {
  font-size: 12px;
  color: #ccc;
  margin-left: 6px;
}

.action-area {
  display: flex;
  align-items: center;
  margin-left: 8px;
}

.quick-edit-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 60px;
  display: block;
  margin-bottom: 15px;
}

.empty-text {
  font-size: 16px;
  color: #999;
  display: block;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 13px;
  color: #ccc;
  display: block;
}

/* 添加按钮 */
.add-button {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1e2023;
  color: #fff;
  padding: 0 30px;
  height: 50px;
  border-radius: 25px;
  box-shadow: 0 4px 12px rgba(30, 32, 35, 0.3);
  gap: 8px;
  font-size: 15px;
  z-index: 100;
}

/* 弹窗样式 */
.mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 999;
}

.detail-popup,
.form-popup {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 20px 20px 0 0;
  z-index: 1000;
  transform: translateY(100%);
  transition: transform 0.3s ease-in-out;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.detail-popup.show,
.form-popup.show {
  transform: translateY(0);
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.popup-title {
  font-size: 16px;
  font-weight: bold;
  color: #1e2023;
}

.popup-close {
  font-size: 28px;
  color: #999;
  line-height: 1;
}

.popup-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* 详情弹窗内容 */
.detail-section {
  margin-bottom: 20px;
}

.section-label {
  font-size: 13px;
  color: #999;
  margin-bottom: 10px;
}

.detail-image {
  width: 100px;
  height: 100px;
  border-radius: 12px;
  margin: 0 auto 15px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-vehicle-icon {
  font-size: 48px;
}

.detail-plate {
  text-align: center;
  font-size: 20px;
  font-weight: bold;
  color: #1e2023;
  margin-bottom: 10px;
}

.status-badge.large {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 13px;
  margin: 0 auto;
  display: block;
  text-align: center;
  width: fit-content;
  margin-left: auto;
  margin-right: auto;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
}

.info-label {
  font-size: 14px;
  color: #666;
}

.info-value {
  font-size: 14px;
  color: #1e2023;
  font-weight: 500;
}

.info-value.expired {
  color: #f5222d;
}

/* 司机卡片 */
.driver-card {
  display: flex;
  align-items: center;
  background: #f8f9fa;
  padding: 12px;
  border-radius: 8px;
  gap: 12px;
}

.driver-avatar {
  width: 44px;
  height: 44px;
  background: #1e2023;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  color: #fff;
  font-size: 16px;
  font-weight: bold;
}

.driver-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.driver-name {
  font-size: 15px;
  font-weight: 500;
  color: #1e2023;
  margin-bottom: 2px;
}

.driver-phone {
  font-size: 13px;
  color: #999;
}

/* 表单样式 */
.form-section {
  padding-bottom: 20px;
}

.form-item {
  margin-bottom: 20px;
}

.form-label {
  font-size: 14px;
  color: #333;
  margin-bottom: 8px;
  display: block;
}

.required {
  color: #f5222d;
}

.form-input {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 12px 15px;
  font-size: 15px;
  color: #333;
}

.input-placeholder {
  color: #999;
}

.picker-input {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 12px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.picker-input text.placeholder {
  color: #999;
}

.status-options {
  display: flex;
  gap: 10px;
}

.status-option {
  flex: 1;
  text-align: center;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 8px;
  font-size: 14px;
  color: #666;
  transition: all 0.2s;
}

.status-option.active {
  background: #1e2023;
  color: #fff;
}

/* 弹窗底部 */
.popup-footer {
  display: flex;
  gap: 10px;
  padding: 15px 20px;
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.popup-btn {
  flex: 1;
  height: 44px;
  line-height: 44px;
  border-radius: 8px;
  font-size: 15px;
}

.popup-btn::after {
  border: none;
}

.popup-btn.secondary {
  background: #f5f5f5;
  color: #666;
}

.popup-btn.primary {
  background: #1e2023;
  color: #fff;
}

.popup-btn.danger {
  background: #fff1f0;
  color: #f5222d;
  border: 1px solid #ffccc7;
}
</style>
