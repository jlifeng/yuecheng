<template>
  <view class="container">
    <view class="page-header">
      <text class="page-title">司机管理</text>
      <text class="subtitle">共 {{ drivers.length }} 位司机</text>
    </view>

    <view v-if="isDriverMode" class="access-limited">
      <text class="access-limited__title">司机模式不可维护司机档案</text>
      <text class="access-limited__desc">当前账号只保留任务执行入口，如需增删改司机信息，请切换到商家管理员账号。</text>
    </view>

    <!-- 司机列表 -->
    <view v-else class="driver-list">
      <view
        class="driver-item"
        v-for="(driver, index) in drivers"
        :key="driver.id"
        @click="viewDriverDetail(driver)"
        @longpress="showActionMenu(driver)"
      >
        <view class="driver-main">
          <view class="driver-avatar">
            <text class="avatar-text">{{ driver.name.charAt(0) }}</text>
          </view>

          <view class="driver-info">
            <view class="driver-header">
              <text class="driver-name">{{ driver.name }}</text>
              <view class="status-badge" :class="{ active: driver.active }">
                <text class="status-text">{{ driver.active ? '在岗' : '休息中' }}</text>
              </view>
            </view>

            <view class="driver-role" v-if="driver.role === '队长'">
              <uni-icons type="star-filled" size="12" color="#ff9800"></uni-icons>
              <text class="role-text">{{ driver.role }}</text>
            </view>

            <view class="driver-details">
              <text class="detail-item">
                <uni-icons type="phone" size="12" color="#999"></uni-icons>
                {{ driver.phone }}
              </text>
            </view>

            <!-- 关联车辆 -->
            <view class="vehicle-section" v-if="driver.vehicle">
              <uni-icons type="gear" size="12" color="#999"></uni-icons>
              <text class="vehicle-text">{{ driver.vehicle.plate }}</text>
              <text class="vehicle-model">{{ driver.vehicle.model }}</text>
            </view>
            <view class="vehicle-section" v-else>
              <uni-icons type="gear" size="12" color="#ccc"></uni-icons>
              <text class="no-vehicle">未分配车辆</text>
            </view>
          </view>
        </view>

        <view class="action-area">
          <view class="quick-edit-btn" @click.stop="editDriver(driver)">
            <uni-icons type="gear" size="16" color="#666"></uni-icons>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="drivers.length === 0" class="empty-state">
        <text class="empty-icon">👨‍✈️</text>
        <text class="empty-text">暂无司机</text>
        <text class="empty-hint">点击下方按钮添加第一位司机</text>
      </view>
    </view>

    <!-- 添加按钮 -->
    <view v-if="!isDriverMode" class="add-button" @click="addDriver">
      <uni-icons type="plus" size="20" color="#fff"></uni-icons>
      <text>添加司机</text>
    </view>

    <!-- 司机详情弹窗 -->
    <view class="mask" v-if="!isDriverMode && showDetail" @click="closeDetail"></view>
    <view class="detail-popup" :class="{ show: showDetail }">
      <view class="popup-header">
        <text class="popup-title">司机详情</text>
        <text class="popup-close" @click="closeDetail">×</text>
      </view>

      <scroll-view scroll-y class="popup-content">
        <view class="detail-section">
          <view class="detail-avatar">
            <text class="detail-avatar-text">{{ currentDriver?.name.charAt(0) }}</text>
          </view>
          <view class="detail-name">{{ currentDriver?.name }}</view>
          <view class="detail-role" v-if="currentDriver?.role === '队长'">
            <uni-icons type="star-filled" size="14" color="#ff9800"></uni-icons>
            <text>{{ currentDriver.role }}</text>
          </view>
          <view class="status-badge large" :class="{ active: currentDriver?.active }">
            {{ currentDriver?.active ? '在岗' : '休息中' }}
          </view>
        </view>

        <view class="detail-section">
          <view class="section-label">基本信息</view>
          <view class="info-row">
            <text class="info-label">手机号</text>
            <text class="info-value">{{ currentDriver?.phone }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">身份证号</text>
            <text class="info-value">{{ currentDriver?.idCard }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">驾驶证类型</text>
            <text class="info-value">{{ currentDriver?.licenseType }}</text>
          </view>
        </view>

        <view class="detail-section">
          <view class="section-label">业务统计</view>
          <view class="stats-row">
            <view class="stat-item">
              <text class="stat-value">{{ currentDriver?.stats.totalOrders }}</text>
              <text class="stat-label">总订单</text>
            </view>
            <view class="stat-item">
              <text class="stat-value">{{ currentDriver?.stats.thisMonth }}</text>
              <text class="stat-label">本月订单</text>
            </view>
            <view class="stat-item">
              <text class="stat-value">{{ currentDriver?.stats.rating }}</text>
              <text class="stat-label">评分</text>
            </view>
          </view>
        </view>

        <view class="detail-section" v-if="currentDriver?.vehicle">
          <view class="section-label">关联车辆</view>
          <view class="vehicle-card">
            <view class="vehicle-icon" :style="{ background: getVehicleColor(currentDriver.vehicle.color) }">
              <text>🚗</text>
            </view>
            <view class="vehicle-detail">
              <text class="vehicle-plate">{{ currentDriver.vehicle.plate }}</text>
              <text class="vehicle-model">{{ currentDriver.vehicle.model }}</text>
            </view>
          </view>
        </view>

        <view class="detail-section" v-if="currentDriver?.joinDate">
          <view class="section-label">入职信息</view>
          <view class="info-row">
            <text class="info-label">入职日期</text>
            <text class="info-value">{{ currentDriver.joinDate }}</text>
          </view>
        </view>
      </scroll-view>

      <view class="popup-footer">
        <button class="popup-btn secondary" @click="editDriver(currentDriver)">编辑</button>
        <button class="popup-btn danger" @click="confirmDelete">删除司机</button>
      </view>
    </view>

    <!-- 添加/编辑弹窗 -->
    <view class="mask" v-if="!isDriverMode && showForm" @click="closeForm"></view>
    <view class="form-popup" :class="{ show: showForm }">
      <view class="popup-header">
        <text class="popup-title">{{ isEdit ? '编辑司机' : '添加司机' }}</text>
        <text class="popup-close" @click="closeForm">×</text>
      </view>

      <scroll-view scroll-y class="popup-content">
        <view class="form-section">
          <view class="form-item">
            <text class="form-label">姓名 <text class="required">*</text></text>
            <input
              class="form-input"
              v-model="formData.name"
              placeholder="请输入司机姓名"
              placeholder-class="input-placeholder"
            />
          </view>

          <view class="form-item">
            <text class="form-label">手机号 <text class="required">*</text></text>
            <input
              class="form-input"
              v-model="formData.phone"
              placeholder="请输入手机号"
              placeholder-class="input-placeholder"
              type="number"
              maxlength="11"
            />
          </view>

          <view class="form-item">
            <text class="form-label">身份证号 <text class="required">*</text></text>
            <input
              class="form-input"
              v-model="formData.idCard"
              placeholder="请输入身份证号"
              placeholder-class="input-placeholder"
              maxlength="18"
            />
          </view>

          <view class="form-item">
            <text class="form-label">驾驶证类型 <text class="required">*</text></text>
            <picker mode="selector" :range="licenseOptions" @change="onLicenseChange">
              <view class="picker-input">
                <text :class="{ placeholder: !formData.licenseType }">
                  {{ formData.licenseType || '请选择驾驶证类型' }}
                </text>
                <uni-icons type="arrowdown" size="14" color="#999"></uni-icons>
              </view>
            </picker>
          </view>

          <view class="form-item">
            <text class="form-label">职位</text>
            <view class="role-options">
              <view
                class="role-option"
                :class="{ active: formData.role === '司机' }"
                @click="formData.role = '司机'"
              >
                <text>司机</text>
              </view>
              <view
                class="role-option"
                :class="{ active: formData.role === '队长' }"
                @click="formData.role = '队长'"
              >
                <text>队长</text>
              </view>
            </view>
          </view>

          <view class="form-item">
            <text class="form-label">入职日期</text>
            <picker mode="date" :value="formData.joinDate" @change="onJoinDateChange">
              <view class="picker-input">
                <text :class="{ placeholder: !formData.joinDate }">
                  {{ formData.joinDate || '请选择入职日期' }}
                </text>
                <uni-icons type="arrowdown" size="14" color="#999"></uni-icons>
              </view>
            </picker>
          </view>

          <view class="form-item">
            <text class="form-label">关联车辆</text>
            <picker mode="selector" :range="vehicleOptions" range-key="label" @change="onVehicleChange">
              <view class="picker-input">
                <text :class="{ placeholder: !formData.vehicleId }">
                  {{ getSelectedVehicleLabel() || '暂不关联车辆' }}
                </text>
                <uni-icons type="arrowdown" size="14" color="#999"></uni-icons>
              </view>
            </picker>
          </view>

          <view class="form-item">
            <text class="form-label">状态</text>
            <view class="status-options">
              <view
                class="status-option"
                :class="{ active: formData.active }"
                @click="formData.active = true"
              >
                <text>在岗</text>
              </view>
              <view
                class="status-option"
                :class="{ active: !formData.active }"
                @click="formData.active = false"
              >
                <text>休息中</text>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>

      <view class="popup-footer">
        <button class="popup-btn secondary" @click="closeForm">取消</button>
        <button class="popup-btn primary" @click="saveDriver">保存</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ProviderSessionManager } from '@/utils/dataManager';
import { type ProviderRole } from '@/types/provider';

// 可用车辆数据（与我的车队页面保持一致）
const availableVehicles = ref([
  { id: 1, plate: '鄂A·B1234', model: '丰田阿尔法', color: '黑色' },
  { id: 2, plate: '鄂A·X5678', model: '奔驰S级', color: '白色' },
  { id: 3, plate: '鄂A·C9012', model: '别克GL8', color: '银色' }
]);

// 司机数据
const drivers = ref([
  {
    id: 1,
    name: '张伟',
    role: '队长',
    phone: '138****1234',
    idCard: '4201061985****1234',
    licenseType: 'A1',
    joinDate: '2020-03-15',
    active: true,
    vehicle: { id: 1, plate: '鄂A·B1234', model: '丰田阿尔法', color: '黑色' },
    stats: {
      totalOrders: 458,
      thisMonth: 32,
      rating: 4.9
    }
  },
  {
    id: 2,
    name: '李强',
    role: '司机',
    phone: '139****5678',
    idCard: '4201061990****5678',
    licenseType: 'C1',
    joinDate: '2022-06-20',
    active: true,
    vehicle: { id: 2, plate: '鄂A·X5678', model: '奔驰S级', color: '白色' },
    stats: {
      totalOrders: 186,
      thisMonth: 18,
      rating: 4.8
    }
  },
  {
    id: 3,
    name: '王芳',
    role: '司机',
    phone: '150****9012',
    idCard: '4201061992****9012',
    licenseType: 'C1',
    joinDate: '2023-01-10',
    active: false,
    vehicle: null,
    stats: {
      totalOrders: 95,
      thisMonth: 8,
      rating: 4.7
    }
  },
  {
    id: 4,
    name: '赵明',
    role: '司机',
    phone: '136****3456',
    idCard: '4201061988****3456',
    licenseType: 'B2',
    joinDate: '2021-09-05',
    active: true,
    vehicle: null,
    stats: {
      totalOrders: 234,
      thisMonth: 25,
      rating: 4.9
    }
  }
]);

// 详情弹窗
const showDetail = ref(false);
const currentDriver = ref<any>(null);

// 表单弹窗
const showForm = ref(false);
const isEdit = ref(false);
const licenseOptions = ['C1', 'C2', 'B1', 'B2', 'A1', 'A2', 'A3'];

const formData = ref({
  id: null,
  name: '',
  phone: '',
  idCard: '',
  licenseType: '',
  role: '司机',
  joinDate: '',
  vehicleId: null,
  active: true
});

const vehicleOptions = computed(() => [
  { id: null, label: '暂不关联车辆' },
  ...availableVehicles.value.map(v => ({ id: v.id, label: `${v.plate} ${v.model}` }))
]);
const providerRole = ref<ProviderRole>('OWNER');
const isDriverMode = computed(() => providerRole.value === 'DRIVER');

// 获取车辆颜色
const getVehicleColor = (colorName: string) => {
  const colorMap: Record<string, string> = {
    '黑色': '#2c2c2c',
    '白色': '#f5f5f5',
    '银色': '#c0c0c0',
    '灰色': '#808080'
  };
  return colorMap[colorName] || '#ddd';
};

// 查看详情
const viewDriverDetail = (driver: any) => {
  currentDriver.value = driver;
  showDetail.value = true;
};

const closeDetail = () => {
  showDetail.value = false;
  currentDriver.value = null;
};

// 显示操作菜单（长按）
const showActionMenu = (driver: any) => {
  uni.showActionSheet({
    itemList: ['查看详情', '编辑', '删除'],
    success: (res) => {
      if (res.tapIndex === 0) {
        viewDriverDetail(driver);
      } else if (res.tapIndex === 1) {
        editDriver(driver);
      } else if (res.tapIndex === 2) {
        currentDriver.value = driver;
        confirmDelete();
      }
    }
  });
};

// 添加司机
const addDriver = () => {
  isEdit.value = false;
  formData.value = {
    id: null,
    name: '',
    phone: '',
    idCard: '',
    licenseType: '',
    role: '司机',
    joinDate: '',
    vehicleId: null,
    active: true
  };
  showForm.value = true;
};

// 编辑司机
const editDriver = (driver: any) => {
  closeDetail();
  isEdit.value = true;
  currentDriver.value = driver;
  formData.value = {
    id: driver.id,
    name: driver.name,
    phone: driver.phone.replace(/\*/g, '1'), // 去掉掩码方便编辑
    idCard: driver.idCard.replace(/\*/g, '0'),
    licenseType: driver.licenseType,
    role: driver.role,
    joinDate: driver.joinDate,
    vehicleId: driver.vehicle?.id || null,
    active: driver.active
  };
  showForm.value = true;
};

const closeForm = () => {
  showForm.value = false;
  formData.value = {
    id: null,
    name: '',
    phone: '',
    idCard: '',
    licenseType: '',
    role: '司机',
    joinDate: '',
    vehicleId: null,
    active: true
  };
};

// 保存司机
const saveDriver = () => {
  // 表单验证
  if (!formData.value.name) {
    uni.showToast({ title: '请输入姓名', icon: 'none' });
    return;
  }
  if (!formData.value.phone || formData.value.phone.length !== 11) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' });
    return;
  }
  if (!formData.value.idCard || formData.value.idCard.length !== 18) {
    uni.showToast({ title: '请输入正确的身份证号', icon: 'none' });
    return;
  }
  if (!formData.value.licenseType) {
    uni.showToast({ title: '请选择驾驶证类型', icon: 'none' });
    return;
  }

  // 格式化手机号和身份证号（添加掩码）
  const maskPhone = (phone: string) => phone.slice(0, 3) + '****' + phone.slice(7);
  const maskIdCard = (idCard: string) => idCard.slice(0, 10) + '****' + idCard.slice(14);

  // 查找关联的车辆
  const selectedVehicle = availableVehicles.value.find(v => v.id === formData.value.vehicleId);

  if (isEdit.value) {
    // 更新现有司机
    const index = drivers.value.findIndex(d => d.id === formData.value.id);
    if (index !== -1) {
      drivers.value[index] = {
        ...drivers.value[index],
        name: formData.value.name,
        phone: maskPhone(formData.value.phone),
        idCard: maskIdCard(formData.value.idCard),
        licenseType: formData.value.licenseType,
        role: formData.value.role,
        joinDate: formData.value.joinDate || '未知',
        vehicle: selectedVehicle || null,
        active: formData.value.active
      };
    }
    uni.showToast({ title: '修改成功', icon: 'success' });
  } else {
    // 添加新司机
    const newDriver = {
      id: Date.now(),
      name: formData.value.name,
      phone: maskPhone(formData.value.phone),
      idCard: maskIdCard(formData.value.idCard),
      licenseType: formData.value.licenseType,
      role: formData.value.role,
      joinDate: formData.value.joinDate || new Date().toISOString().split('T')[0],
      vehicle: selectedVehicle || null,
      active: formData.value.active,
      stats: {
        totalOrders: 0,
        thisMonth: 0,
        rating: 5.0
      }
    };
    drivers.value.unshift(newDriver);
    uni.showToast({ title: '添加成功', icon: 'success' });
  }

  closeForm();
};

// 删除司机
const confirmDelete = () => {
  closeDetail();
  uni.showModal({
    title: '确认删除',
    content: `确定要删除司机 ${currentDriver.value?.name} 吗？`,
    confirmColor: '#f5222d',
    success: (res) => {
      if (res.confirm) {
        const index = drivers.value.findIndex(d => d.id === currentDriver.value?.id);
        if (index !== -1) {
          drivers.value.splice(index, 1);
          uni.showToast({ title: '删除成功', icon: 'success' });
        }
      }
    }
  });
};

// Picker 事件处理
const onLicenseChange = (e: any) => {
  formData.value.licenseType = licenseOptions[e.detail.value];
};

const onJoinDateChange = (e: any) => {
  formData.value.joinDate = e.detail.value;
};

const onVehicleChange = (e: any) => {
  const selected = vehicleOptions.value[e.detail.value];
  formData.value.vehicleId = selected.id;
};

const getSelectedVehicleLabel = () => {
  if (!formData.value.vehicleId) return '';
  const vehicle = availableVehicles.value.find(v => v.id === formData.value.vehicleId);
  return vehicle ? `${vehicle.plate} ${vehicle.model}` : '';
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

/* 司机列表 */
.driver-list {
  margin-bottom: 20px;
}

.driver-item {
  background: #fff;
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.driver-main {
  display: flex;
  gap: 12px;
}

.driver-avatar {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #1e2023 0%, #303741 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-text {
  color: #fff;
  font-size: 18px;
  font-weight: bold;
}

.driver-info {
  flex: 1;
  min-width: 0;
}

.driver-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.driver-name {
  font-size: 16px;
  font-weight: bold;
  color: #1e2023;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  background: #f5f5f5;
  color: #999;
}

.status-badge.active {
  background: #e8f5e9;
  color: #388e3c;
}

.driver-role {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}

.role-text {
  font-size: 12px;
  color: #ff9800;
}

.driver-details {
  margin-bottom: 4px;
}

.detail-item {
  font-size: 13px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 4px;
}

.vehicle-section {
  display: flex;
  align-items: center;
  padding-top: 6px;
  border-top: 1px solid #f5f5f5;
}

.vehicle-text {
  font-size: 12px;
  color: #333;
  margin-left: 6px;
  font-weight: 500;
}

.vehicle-model {
  font-size: 11px;
  color: #999;
  margin-left: 6px;
}

.no-vehicle {
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

.detail-avatar {
  width: 70px;
  height: 70px;
  background: linear-gradient(135deg, #1e2023 0%, #303741 100%);
  border-radius: 50%;
  margin: 0 auto 15px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-avatar-text {
  color: #fff;
  font-size: 26px;
  font-weight: bold;
}

.detail-name {
  text-align: center;
  font-size: 20px;
  font-weight: bold;
  color: #1e2023;
  margin-bottom: 8px;
}

.detail-role {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 14px;
  color: #ff9800;
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

/* 统计数据 */
.stats-row {
  display: flex;
  justify-content: space-around;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 15px 0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 20px;
  font-weight: bold;
  color: #1e2023;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #999;
}

/* 车辆卡片 */
.vehicle-card {
  display: flex;
  align-items: center;
  background: #f8f9fa;
  padding: 12px;
  border-radius: 8px;
  gap: 12px;
}

.vehicle-icon {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vehicle-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.vehicle-plate {
  font-size: 15px;
  font-weight: 500;
  color: #1e2023;
  margin-bottom: 2px;
}

.vehicle-model {
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

.role-options,
.status-options {
  display: flex;
  gap: 10px;
}

.role-option,
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

.role-option.active,
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
