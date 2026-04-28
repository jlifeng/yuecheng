<template>
  <view class="page-container">
    <!-- 车队信息头部 -->
    <view class="fleet-header">
      <text class="fleet-name">{{ merchantInfo?.company_name || merchantInfo?.contact_name || '我的车队' }}</text>
      <text class="fleet-stats">车辆 {{ vehicles.length }}辆 · 司机 {{ drivers.length }}人</text>
    </view>

    <!-- 车辆管理 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">车辆管理</text>
        <view class="section-action" @click="showAddVehicle">
          <uni-icons type="plus" size="16" color="#000"></uni-icons>
          <text class="action-text">添加车辆</text>
        </view>
      </view>

      <view class="vehicle-card" v-for="vehicle in vehicles" :key="vehicle.id" @click="onVehicleClick(vehicle)">
        <view class="vehicle-info">
          <text class="vehicle-model">{{ vehicle.model }}</text>
          <text class="vehicle-plate">{{ vehicle.plate_number }}</text>
          <text class="vehicle-seats">{{ vehicle.seats }}座 · {{ vehicle.color || '未知颜色' }}</text>
        </view>
        <view class="vehicle-actions">
          <view class="vehicle-status" :class="{ active: vehicle.status === 'active' }">
            {{ vehicle.status === 'active' ? '可用' : '停用' }}
          </view>
          <text class="action-arrow">›</text>
        </view>
      </view>

      <view class="empty-tip" v-if="vehicles.length === 0">
        <text>暂无车辆，点击上方添加</text>
      </view>
    </view>

    <!-- 司机管理 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">司机管理</text>
        <view class="section-action" @click="showAddDriver">
          <uni-icons type="plus" size="16" color="#000"></uni-icons>
          <text class="action-text">添加司机</text>
        </view>
      </view>

      <view class="driver-card" v-for="driver in drivers" :key="driver.id" @click="onDriverClick(driver)">
        <view class="driver-info">
          <view class="driver-header">
            <text class="driver-name">{{ driver.name || '待确认' }}</text>
            <view class="role-badge" :class="getRoleClass(driver.role)">
              {{ getRoleName(driver.role) }}
            </view>
          </view>
          <text class="driver-phone">{{ formatPhone(driver.phone) }}</text>
        </view>
        <view class="driver-actions">
          <view class="driver-status" :class="{ active: driver.status === 'active', pending: driver.status === 'pending' }">
            {{ driver.status === 'active' ? '已绑定' : driver.status === 'pending' ? '待确认' : '已解绑' }}
          </view>
          <text class="action-arrow">›</text>
        </view>
      </view>

      <view class="empty-tip" v-if="drivers.length === 0">
        <text>暂无司机，点击上方添加</text>
      </view>
    </view>

    <!-- 添加车辆弹窗 -->
    <view class="popup-mask" v-if="showVehiclePopup" @click="showVehiclePopup = false"></view>
    <view class="popup" v-if="showVehiclePopup">
      <view class="popup-header">
        <text class="popup-title">{{ editingVehicle ? '编辑车辆' : '添加车辆' }}</text>
        <text class="popup-close" @click="closeVehiclePopup">×</text>
      </view>

      <view class="popup-body">
        <view class="popup-item">
          <text class="popup-label">车牌号 *</text>
          <input class="popup-input" v-model="vehicleForm.plate_number" placeholder="如：鄂A12345" />
        </view>
        <view class="popup-item">
          <text class="popup-label">车型 *</text>
          <input class="popup-input" v-model="vehicleForm.model" placeholder="如：别克GL8" />
        </view>
        <view class="popup-item">
          <text class="popup-label">座位数 *</text>
          <view class="seat-options">
            <view class="seat-option" :class="{ active: vehicleForm.seats === 5 }" @click="vehicleForm.seats = 5">5座</view>
            <view class="seat-option" :class="{ active: vehicleForm.seats === 7 }" @click="vehicleForm.seats = 7">7座</view>
            <view class="seat-option" :class="{ active: vehicleForm.seats === 9 }" @click="vehicleForm.seats = 9">9座</view>
          </view>
        </view>
        <view class="popup-item">
          <text class="popup-label">车辆颜色</text>
          <input class="popup-input" v-model="vehicleForm.color" placeholder="如：黑色" />
        </view>
        <view class="popup-item" v-if="editingVehicle">
          <text class="popup-label">车辆状态</text>
          <view class="status-options">
            <view class="status-option" :class="{ active: vehicleForm.status === 'active' }" @click="vehicleForm.status = 'active'">可用</view>
            <view class="status-option" :class="{ active: vehicleForm.status === 'inactive' }" @click="vehicleForm.status = 'inactive'">停用</view>
          </view>
        </view>
      </view>

      <view class="popup-footer">
        <button class="popup-btn primary" @click="saveVehicle">保存</button>
        <button class="popup-btn danger" v-if="editingVehicle" @click="removeVehicle">删除</button>
      </view>
    </view>

    <!-- 添加/编辑司机弹窗 -->
    <view class="popup-mask" v-if="showDriverPopup" @click="showDriverPopup = false"></view>
    <view class="popup" v-if="showDriverPopup">
      <view class="popup-header">
        <text class="popup-title">{{ editingDriver ? '编辑司机' : '添加司机' }}</text>
        <text class="popup-close" @click="closeDriverPopup">×</text>
      </view>

      <view class="popup-body">
        <view class="popup-item" v-if="!editingDriver">
          <text class="popup-label">司机手机号 *</text>
          <input class="popup-input" v-model="driverForm.phone" type="number" placeholder="输入司机手机号" maxlength="11" />
        </view>
        <view class="popup-item">
          <text class="popup-label">司机姓名</text>
          <input class="popup-input" v-model="driverForm.name" placeholder="司机姓名（可选）" />
        </view>
        <view class="popup-item">
          <text class="popup-label">角色类型</text>
          <view class="role-options">
            <view class="role-option" :class="{ active: driverForm.role === 'driver' }" @click="driverForm.role = 'driver'">司机</view>
            <view class="role-option" :class="{ active: driverForm.role === 'dispatcher' }" @click="driverForm.role = 'dispatcher'">调度员</view>
            <view class="role-option owner" :class="{ active: driverForm.role === 'owner' }" @click="driverForm.role = 'owner'">管理员</view>
          </view>
        </view>
        <view class="popup-tip" v-if="!editingDriver">
          <uni-icons type="info" size="14" color="#666"></uni-icons>
          <text class="popup-tip-text">司机需在小程序中绑定此手机号后才能激活</text>
        </view>
      </view>

      <view class="popup-footer">
        <button class="popup-btn primary" @click="saveDriver">保存</button>
        <button class="popup-btn danger" v-if="editingDriver && editingDriver.role !== 'owner'" @click="removeDriver">移除</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const SUPABASE_URL = 'https://qcsmavxqjofrhrdwgkpt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjc21hdnhxam9mcmhyZHdna3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3OTU2OTUsImV4cCI6MjA5MTM3MTY5NX0.zM4mVvvZAylQIXZFrnzaSAy_MGqTvR3hrSWfSSP8xRQ'

const merchantInfo = ref<any>(null)
const vehicles = ref<any[]>([])
const drivers = ref<any[]>([])

const showVehiclePopup = ref(false)
const showDriverPopup = ref(false)

const editingVehicle = ref<any>(null)
const editingDriver = ref<any>(null)

const vehicleForm = ref({
  plate_number: '',
  model: '',
  seats: 7,
  color: '',
  status: 'active'
})

const driverForm = ref({
  phone: '',
  name: '',
  role: 'driver'
})

// 权限检查
const canManage = () => {
  const userProfile = uni.getStorageSync('userProfile')
  return userProfile?.role === 'merchant_owner' || userProfile?.role === 'merchant_dispatcher'
}

const isOwner = () => {
  const userProfile = uni.getStorageSync('userProfile')
  return userProfile?.role === 'merchant_owner'
}

onMounted(() => {
  if (!canManage()) {
    uni.showToast({ title: '无权限访问', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
    return
  }
  loadMerchantInfo()
  loadVehicles()
  loadDrivers()
})

const loadMerchantInfo = async () => {
  const accessToken = uni.getStorageSync('accessToken')
  const userProfile = uni.getStorageSync('userProfile')

  if (!accessToken || !userProfile?.merchant_id) return

  try {
    const res = await uni.request({
      url: `${SUPABASE_URL}/rest/v1/merchants?id=eq.${userProfile.merchant_id}&select=*`,
      method: 'GET',
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (res.statusCode === 200 && res.data && (res.data as any[]).length > 0) {
      merchantInfo.value = (res.data as any[])[0]
    }
  } catch (e) {
    console.error('加载商家信息失败', e)
  }
}

const loadVehicles = async () => {
  const accessToken = uni.getStorageSync('accessToken')
  const userProfile = uni.getStorageSync('userProfile')

  if (!accessToken || !userProfile?.merchant_id) return

  try {
    const res = await uni.request({
      url: `${SUPABASE_URL}/rest/v1/vehicles?merchant_id=eq.${userProfile.merchant_id}&select=*`,
      method: 'GET',
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (res.statusCode === 200 && res.data) {
      vehicles.value = res.data as any[]
    }
  } catch (e) {
    console.error('加载车辆列表失败', e)
  }
}

const loadDrivers = async () => {
  const accessToken = uni.getStorageSync('accessToken')
  const userProfile = uni.getStorageSync('userProfile')

  if (!accessToken || !userProfile?.merchant_id) return

  try {
    const res = await uni.request({
      url: `${SUPABASE_URL}/rest/v1/drivers?merchant_id=eq.${userProfile.merchant_id}&select=*`,
      method: 'GET',
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (res.statusCode === 200 && res.data) {
      drivers.value = res.data as any[]
    }
  } catch (e) {
    console.error('加载司机列表失败', e)
  }
}

const formatPhone = (phone: string) => {
  if (!phone) return ''
  return phone.slice(0, 3) + '****' + phone.slice(7)
}

const getRoleName = (role: string) => {
  const roleNames: Record<string, string> = {
    'owner': '管理员',
    'dispatcher': '调度员',
    'driver': '司机'
  }
  return roleNames[role] || '司机'
}

const getRoleClass = (role: string) => {
  const roleClasses: Record<string, string> = {
    'owner': 'role-owner',
    'dispatcher': 'role-dispatcher',
    'driver': 'role-driver'
  }
  return roleClasses[role] || 'role-driver'
}

// 车辆操作
const onVehicleClick = (vehicle: any) => {
  editingVehicle.value = vehicle
  vehicleForm.value = {
    plate_number: vehicle.plate_number,
    model: vehicle.model,
    seats: vehicle.seats,
    color: vehicle.color || '',
    status: vehicle.status
  }
  showVehiclePopup.value = true
}

const showAddVehicle = () => {
  editingVehicle.value = null
  vehicleForm.value = { plate_number: '', model: '', seats: 7, color: '', status: 'active' }
  showVehiclePopup.value = true
}

const closeVehiclePopup = () => {
  showVehiclePopup.value = false
  editingVehicle.value = null
}

const saveVehicle = async () => {
  if (!vehicleForm.value.plate_number || !vehicleForm.value.model) {
    uni.showToast({ title: '请填写完整信息', icon: 'none' })
    return
  }

  const accessToken = uni.getStorageSync('accessToken')
  const userProfile = uni.getStorageSync('userProfile')

  try {
    uni.showLoading({ title: '保存中...' })

    if (editingVehicle.value) {
      // 更新
      await uni.request({
        url: `${SUPABASE_URL}/rest/v1/vehicles?id=eq.${editingVehicle.value.id}`,
        method: 'PATCH',
        data: {
          plate_number: vehicleForm.value.plate_number,
          model: vehicleForm.value.model,
          seats: vehicleForm.value.seats,
          color: vehicleForm.value.color || null,
          status: vehicleForm.value.status
        },
        header: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        }
      })
    } else {
      // 新增
      await uni.request({
        url: `${SUPABASE_URL}/rest/v1/vehicles`,
        method: 'POST',
        data: {
          merchant_id: userProfile.merchant_id,
          plate_number: vehicleForm.value.plate_number,
          model: vehicleForm.value.model,
          seats: vehicleForm.value.seats,
          color: vehicleForm.value.color || null,
          status: 'active'
        },
        header: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        }
      })
    }

    uni.hideLoading()
    closeVehiclePopup()
    loadVehicles()
    uni.showToast({ title: '保存成功', icon: 'success' })
  } catch (e) {
    uni.hideLoading()
    console.error('保存车辆失败', e)
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

const removeVehicle = async () => {
  if (!editingVehicle.value) return

  uni.showModal({
    title: '确认删除',
    content: `确定要删除车辆 ${editingVehicle.value.plate_number} 吗？`,
    success: async (res) => {
      if (res.confirm) {
        const accessToken = uni.getStorageSync('accessToken')

        try {
          uni.showLoading({ title: '删除中...' })

          await uni.request({
            url: `${SUPABASE_URL}/rest/v1/vehicles?id=eq.${editingVehicle.value.id}`,
            method: 'DELETE',
            header: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Prefer': 'return=minimal'
            }
          })

          uni.hideLoading()
          closeVehiclePopup()
          loadVehicles()
          uni.showToast({ title: '已删除', icon: 'success' })
        } catch (e) {
          uni.hideLoading()
          console.error('删除车辆失败', e)
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}

// 司机操作
const onDriverClick = (driver: any) => {
  editingDriver.value = driver
  driverForm.value = {
    phone: driver.phone,
    name: driver.name || '',
    role: driver.role
  }
  showDriverPopup.value = true
}

const showAddDriver = () => {
  editingDriver.value = null
  driverForm.value = { phone: '', name: '', role: 'driver' }
  showDriverPopup.value = true
}

const closeDriverPopup = () => {
  showDriverPopup.value = false
  editingDriver.value = null
}

const saveDriver = async () => {
  if (!editingDriver.value && (!driverForm.value.phone || driverForm.value.phone.length !== 11)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }

  const accessToken = uni.getStorageSync('accessToken')
  const userProfile = uni.getStorageSync('userProfile')

  try {
    uni.showLoading({ title: '保存中...' })

    if (editingDriver.value) {
      // 更新
      await uni.request({
        url: `${SUPABASE_URL}/rest/v1/drivers?id=eq.${editingDriver.value.id}`,
        method: 'PATCH',
        data: {
          name: driverForm.value.name || null,
          role: driverForm.value.role
        },
        header: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        }
      })
    } else {
      // 新增
      await uni.request({
        url: `${SUPABASE_URL}/rest/v1/drivers`,
        method: 'POST',
        data: {
          merchant_id: userProfile.merchant_id,
          phone: driverForm.value.phone,
          name: driverForm.value.name || null,
          role: driverForm.value.role,
          status: 'pending'
        },
        header: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        }
      })
    }

    uni.hideLoading()
    closeDriverPopup()
    loadDrivers()
    uni.showToast({ title: '保存成功', icon: 'success' })
  } catch (e) {
    uni.hideLoading()
    console.error('保存司机失败', e)
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

const removeDriver = async () => {
  if (!editingDriver.value) return

  uni.showModal({
    title: '确认移除',
    content: `确定要移除司机 ${editingDriver.value.name || formatPhone(editingDriver.value.phone)} 吗？`,
    success: async (res) => {
      if (res.confirm) {
        const accessToken = uni.getStorageSync('accessToken')

        try {
          uni.showLoading({ title: '移除中...' })

          await uni.request({
            url: `${SUPABASE_URL}/rest/v1/drivers?id=eq.${editingDriver.value.id}`,
            method: 'DELETE',
            header: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Prefer': 'return=minimal'
            }
          })

          uni.hideLoading()
          closeDriverPopup()
          loadDrivers()
          uni.showToast({ title: '已移除', icon: 'success' })
        } catch (e) {
          uni.hideLoading()
          console.error('移除司机失败', e)
          uni.showToast({ title: '移除失败', icon: 'none' })
        }
      }
    }
  })
}
</script>

<style scoped>
.page-container {
  background: #f5f5f5;
  min-height: 100vh;
  padding: 24rpx 32rpx;
}

/* 车队头部 */
.fleet-header {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  text-align: center;
}

.fleet-name {
  font-size: 32rpx;
  color: #000;
  font-weight: 600;
  display: block;
  margin-bottom: 8rpx;
}

.fleet-stats {
  font-size: 26rpx;
  color: #666;
}

/* 区块 */
.section {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 28rpx;
  color: #000;
  font-weight: 600;
}

.section-action {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.action-text {
  font-size: 26rpx;
  color: #000;
}

/* 车辆卡片 */
.vehicle-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 2rpx solid #f0f0f0;
}

.vehicle-card:last-child {
  border-bottom: none;
}

.vehicle-info {
  flex: 1;
}

.vehicle-model {
  font-size: 28rpx;
  color: #000;
  font-weight: 500;
  display: block;
  margin-bottom: 8rpx;
}

.vehicle-plate {
  font-size: 26rpx;
  color: #666;
  display: block;
}

.vehicle-seats {
  font-size: 24rpx;
  color: #999;
  display: block;
}

.vehicle-actions {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.vehicle-status {
  font-size: 24rpx;
  color: #999;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  background: #f5f5f5;
}

.vehicle-status.active {
  color: #fff;
  background: #000;
}

.action-arrow {
  font-size: 32rpx;
  color: #ccc;
}

/* 司机卡片 */
.driver-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 2rpx solid #f0f0f0;
}

.driver-card:last-child {
  border-bottom: none;
}

.driver-info {
  flex: 1;
}

.driver-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.driver-name {
  font-size: 28rpx;
  color: #000;
  font-weight: 500;
}

.role-badge {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}

.role-owner {
  background: #000;
  color: #fff;
}

.role-dispatcher {
  background: #3b82f6;
  color: #fff;
}

.role-driver {
  background: #f5f5f5;
  color: #666;
}

.driver-phone {
  font-size: 26rpx;
  color: #666;
  display: block;
}

.driver-actions {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.driver-status {
  font-size: 24rpx;
  color: #999;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  background: #f5f5f5;
}

.driver-status.active {
  color: #fff;
  background: #000;
}

.driver-status.pending {
  color: #fff;
  background: #3b82f6;
}

.empty-tip {
  text-align: center;
  padding: 32rpx;
}

.empty-tip text {
  font-size: 26rpx;
  color: #999;
}

/* 弹窗 */
.popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 998;
}

.popup {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  z-index: 999;
  padding: 24rpx;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.popup-title {
  font-size: 32rpx;
  color: #000;
  font-weight: 600;
}

.popup-close {
  font-size: 48rpx;
  color: #000;
}

.popup-body {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.popup-item {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.popup-label {
  font-size: 26rpx;
  color: #666;
}

.popup-input {
  background: #f5f5f5;
  border-radius: 8rpx;
  padding: 16rpx 20rpx;
  font-size: 28rpx;
}

.seat-options, .role-options, .status-options {
  display: flex;
  gap: 16rpx;
}

.seat-option, .role-option, .status-option {
  flex: 1;
  background: #f5f5f5;
  border-radius: 8rpx;
  padding: 16rpx;
  text-align: center;
  font-size: 26rpx;
  color: #000;
}

.seat-option.active, .role-option.active, .status-option.active {
  background: #000;
  color: #fff;
}

.role-option.owner.active {
  background: #ef4444;
}

.popup-tip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
}

.popup-tip-text {
  font-size: 24rpx;
  color: #666;
}

.popup-footer {
  margin-top: 24rpx;
  display: flex;
  gap: 16rpx;
}

.popup-btn {
  flex: 1;
  background: #000;
  color: #fff;
  font-size: 28rpx;
  border-radius: 48rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.popup-btn.primary {
  background: #000;
}

.popup-btn.danger {
  background: #ef4444;
}

.popup-btn::after {
  border: none;
}
</style>