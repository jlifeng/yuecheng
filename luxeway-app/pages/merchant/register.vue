<template>
  <view class="page-container">
    <view class="form-header">
      <text class="form-title">车主入驻申请</text>
      <text class="form-desc">提交申请后，平台将在1-3个工作日内审核</text>
    </view>

    <!-- Type Selection -->
    <view class="type-section">
      <text class="section-title">入驻类型</text>
      <view class="type-options">
        <view class="type-option" :class="{ active: form.type === 'individual' }" @click="form.type = 'individual'">
          <view class="type-icon">👤</view>
          <text class="type-name">个人司机</text>
          <text class="type-desc">独立运营，需驾驶证和车辆</text>
        </view>
        <view class="type-option" :class="{ active: form.type === 'company' }" @click="form.type = 'company'">
          <view class="type-icon">🏢</view>
          <text class="type-name">企业车队</text>
          <text class="type-desc">公司运营，需营业执照</text>
        </view>
      </view>
    </view>

    <!-- Basic Info -->
    <view class="form-section">
      <text class="section-title">基本信息</text>

      <!-- Company Name (company type only) -->
      <view class="form-item" v-if="form.type === 'company'">
        <text class="form-label">公司名称 *</text>
        <input class="form-input" v-model="form.company_name" placeholder="请输入公司全称" />
      </view>

      <view class="form-item">
        <text class="form-label">联系人姓名 *</text>
        <input class="form-input" v-model="form.contact_name" placeholder="请输入姓名" />
      </view>

      <view class="form-item">
        <text class="form-label">联系电话 *</text>
        <input class="form-input" v-model="form.contact_phone" type="number" placeholder="请输入手机号" maxlength="11" />
      </view>

      <view class="form-item">
        <text class="form-label">简介</text>
        <textarea class="form-textarea" v-model="form.description" placeholder="简单介绍您的服务特色（可选）" maxlength="200" />
      </view>
    </view>

    <!-- Driver License (individual type only) -->
    <view class="form-section" v-if="form.type === 'individual'">
      <text class="section-title">驾驶证信息</text>

      <view class="form-item">
        <text class="form-label">驾驶证照片 *</text>
        <view class="upload-area" @click="uploadDriverLicense">
          <image v-if="form.driver_license_url" :src="form.driver_license_url" class="upload-image" mode="aspectFit" />
          <view v-else class="upload-placeholder">
            <uni-icons type="camera-filled" size="40" color="#666"></uni-icons>
            <text class="upload-text">上传驾驶证正面照片</text>
          </view>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">驾驶证号</text>
        <input class="form-input" v-model="form.driver_license_no" placeholder="请输入驾驶证档案号" />
      </view>
    </view>

    <!-- Vehicle Info (individual type only) -->
    <view class="form-section" v-if="form.type === 'individual'">
      <text class="section-title">车辆信息</text>

      <view class="form-item">
        <text class="form-label">车辆照片 *</text>
        <view class="upload-row">
          <view class="upload-item" @click="uploadCarImage('car_front_url')">
            <image v-if="form.car_front_url" :src="form.car_front_url" class="upload-thumb" mode="aspectFill" />
            <view v-else class="upload-thumb-placeholder">
              <uni-icons type="camera-filled" size="24" color="#666"></uni-icons>
              <text class="upload-thumb-text">车头</text>
            </view>
          </view>
          <view class="upload-item" @click="uploadCarImage('car_side_url')">
            <image v-if="form.car_side_url" :src="form.car_side_url" class="upload-thumb" mode="aspectFill" />
            <view v-else class="upload-thumb-placeholder">
              <uni-icons type="camera-filled" size="24" color="#666"></uni-icons>
              <text class="upload-thumb-text">侧面</text>
            </view>
          </view>
          <view class="upload-item" @click="uploadCarImage('car_interior_url')">
            <image v-if="form.car_interior_url" :src="form.car_interior_url" class="upload-thumb" mode="aspectFill" />
            <view v-else class="upload-thumb-placeholder">
              <uni-icons type="camera-filled" size="24" color="#666"></uni-icons>
              <text class="upload-thumb-text">内饰</text>
            </view>
          </view>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">车牌号 *</text>
        <input class="form-input" v-model="form.car_plate" placeholder="如：鄂A12345" />
      </view>

      <view class="form-item">
        <text class="form-label">车型 *</text>
        <input class="form-input" v-model="form.car_model" placeholder="如：别克GL8、奔驰V-Class" />
      </view>

      <view class="form-item">
        <text class="form-label">座位数 *</text>
        <view class="seat-options">
          <view class="seat-option" :class="{ active: form.car_seats === 5 }" @click="form.car_seats = 5">5座</view>
          <view class="seat-option" :class="{ active: form.car_seats === 7 }" @click="form.car_seats = 7">7座</view>
          <view class="seat-option" :class="{ active: form.car_seats === 9 }" @click="form.car_seats = 9">9座</view>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">车辆颜色</text>
        <input class="form-input" v-model="form.car_color" placeholder="如：黑色、白色" />
      </view>
    </view>

    <!-- License (company type only) -->
    <view class="form-section" v-if="form.type === 'company'">
      <text class="section-title">资质信息</text>

      <view class="form-item">
        <text class="form-label">营业执照号 *</text>
        <input class="form-input" v-model="form.license_number" placeholder="请输入营业执照注册号" />
      </view>

      <view class="form-item">
        <text class="form-label">营业执照照片 *</text>
        <view class="upload-area" @click="uploadLicense">
          <image v-if="form.license_image_url" :src="form.license_image_url" class="upload-image" mode="aspectFit" />
          <view v-else class="upload-placeholder">
            <uni-icons type="camera-filled" size="40" color="#666"></uni-icons>
            <text class="upload-text">上传营业执照</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Submit -->
    <view class="form-footer">
      <button class="submit-btn" :disabled="!canSubmit" @click="submitForm">
        {{ submitting ? '提交中...' : '提交申请' }}
      </button>
      <text class="submit-tip">提交即表示同意平台服务条款</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase'

const form = ref({
  type: 'individual' as 'individual' | 'company',
  company_name: '',
  contact_name: '',
  contact_phone: '',
  description: '',
  // 企业资质
  license_number: '',
  license_image_url: '',
  // 个人司机 - 驾驶证
  driver_license_url: '',
  driver_license_no: '',
  // 个人司机 - 车辆
  car_front_url: '',
  car_side_url: '',
  car_interior_url: '',
  car_plate: '',
  car_model: '',
  car_seats: 7,
  car_color: ''
})

const submitting = ref(false)

const canSubmit = computed(() => {
  const baseValid = form.value.contact_name && form.value.contact_phone

  if (form.value.type === 'company') {
    return baseValid && form.value.company_name && form.value.license_number && form.value.license_image_url
  }

  // 个人司机
  return baseValid && form.value.driver_license_url && form.value.car_plate && form.value.car_model && form.value.car_seats
})

// 上传图片到 Supabase Storage（使用 uni.uploadFile）
const uploadImageToStorage = async (filePath: string, folder: string): Promise<string> => {
  const accessToken = uni.getStorageSync('accessToken')
  if (!accessToken) {
    throw new Error('请先登录')
  }

  // 获取文件名
  const ext = filePath.split('.').pop() || 'jpg'
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`

  console.log('开始上传文件')

  try {
    // 使用 uni.uploadFile 直接上传文件
    const uploadRes = await uni.uploadFile({
      url: `${SUPABASE_URL}/storage/v1/object/merchant-images/${fileName}`,
      filePath: filePath,
      name: 'file',
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'x-upsert': 'true'
      }
    })

    console.log('上传响应:', uploadRes.statusCode)

    // uni.uploadFile 返回的 data 可能是字符串，需要解析
    let responseData = uploadRes.data
    if (typeof responseData === 'string') {
      try {
        responseData = JSON.parse(responseData)
      } catch (e) {
        console.warn('解析上传响应失败，但不影响上传')
      }
    }

    // Supabase Storage 成功返回 200
    if (uploadRes.statusCode === 200) {
      // 返回公开URL
      return `${SUPABASE_URL}/storage/v1/object/public/merchant-images/${fileName}`
    }

    // 处理具体错误
    if (uploadRes.statusCode === 401) {
      throw new Error('登录已过期，请重新登录')
    }
    if (uploadRes.statusCode === 403) {
      throw new Error('无权限上传')
    }
    if (uploadRes.statusCode === 413) {
      throw new Error('文件太大')
    }

    const errorMsg = (responseData as any)?.message || (responseData as any)?.error || '上传失败'
    throw new Error(errorMsg)
  } catch (e: any) {
    console.error('上传异常:', e instanceof Error ? e.message : 'unknown error')
    throw e
  }
}

const uploadDriverLicense = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      uni.showLoading({ title: '上传中...' })
      try {
        const url = await uploadImageToStorage(res.tempFilePaths[0], 'license')
        form.value.driver_license_url = url
        uni.hideLoading()
        uni.showToast({ title: '上传成功', icon: 'success' })
      } catch (e: any) {
        uni.hideLoading()
        const errMsg = e?.message || '上传失败，请重试'
        console.error('上传驾驶证失败:', e instanceof Error ? e.message : 'unknown error')
        uni.showToast({ title: errMsg, icon: 'none', duration: 2000 })
      }
    },
    fail: (err) => {
      console.error('选择图片失败')
      uni.showToast({ title: '选择图片失败', icon: 'none' })
    }
  })
}

const uploadCarImage = (field: 'car_front_url' | 'car_side_url' | 'car_interior_url') => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      uni.showLoading({ title: '上传中...' })
      try {
        const url = await uploadImageToStorage(res.tempFilePaths[0], 'cars')
        form.value[field] = url
        uni.hideLoading()
        uni.showToast({ title: '上传成功', icon: 'success' })
      } catch (e: any) {
        uni.hideLoading()
        const errMsg = e?.message || '上传失败，请重试'
        console.error('上传车辆图片失败:', e instanceof Error ? e.message : 'unknown error')
        uni.showToast({ title: errMsg, icon: 'none', duration: 2000 })
      }
    },
    fail: (err) => {
      console.error('选择图片失败')
      uni.showToast({ title: '选择图片失败', icon: 'none' })
    }
  })
}

const uploadLicense = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      uni.showLoading({ title: '上传中...' })
      try {
        const url = await uploadImageToStorage(res.tempFilePaths[0], 'license')
        form.value.license_image_url = url
        uni.hideLoading()
        uni.showToast({ title: '上传成功', icon: 'success' })
      } catch (e: any) {
        uni.hideLoading()
        const errMsg = e?.message || '上传失败，请重试'
        console.error('上传营业执照失败:', e instanceof Error ? e.message : 'unknown error')
        uni.showToast({ title: errMsg, icon: 'none', duration: 2000 })
      }
    },
    fail: (err) => {
      console.error('选择图片失败')
      uni.showToast({ title: '选择图片失败', icon: 'none' })
    }
  })
}

const submitForm = async () => {
  if (!canSubmit.value || submitting.value) return

  submitting.value = true

  try {
    const profile = uni.getStorageSync('userProfile')
    const accessToken = uni.getStorageSync('accessToken')

    if (!profile?.id) {
      uni.showToast({ title: '请先登录', icon: 'none' })
      submitting.value = false
      return
    }

    // 创建商家记录
    const merchantPayload = {
      owner_user_id: profile.id,
      type: form.value.type,
      company_name: form.value.type === 'company' ? form.value.company_name : null,
      contact_name: form.value.contact_name,
      contact_phone: form.value.contact_phone,
      description: form.value.description || null,
      license_number: form.value.type === 'company' ? form.value.license_number : null,
      license_image_url: form.value.license_image_url || null,
      review_status: 'pending'
    }

    const merchantRes = await uni.request({
      url: `${SUPABASE_URL}/rest/v1/merchants`,
      method: 'POST',
      data: merchantPayload,
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    })

    if (merchantRes.statusCode !== 201) {
      throw new Error('商家创建失败')
    }

    const merchant = (merchantRes.data as any[])[0]

    // 个人司机：创建车辆记录
    if (form.value.type === 'individual') {
      const vehiclePayload = {
        merchant_id: merchant.id,
        plate_number: form.value.car_plate,
        model: form.value.car_model,
        seats: form.value.car_seats,
        color: form.value.car_color || null,
        front_image_url: form.value.car_front_url || null,
        side_image_url: form.value.car_side_url || null,
        interior_image_url: form.value.car_interior_url || null,
        driver_license_url: form.value.driver_license_url || null,
        driver_license_no: form.value.driver_license_no || null,
        status: 'active'
      }

      await uni.request({
        url: `${SUPABASE_URL}/rest/v1/vehicles`,
        method: 'POST',
        data: vehiclePayload,
        header: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        }
      })
    }

    // 更新 profile 的 merchant_id
    const updateProfileRes = await uni.request({
      url: `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profile.id}`,
      method: 'PATCH',
      data: { merchant_id: merchant.id },
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      }
    })

    // 同步更新本地存储的 userProfile
    if (updateProfileRes.statusCode === 204 || updateProfileRes.statusCode === 200) {
      profile.merchant_id = merchant.id
      uni.setStorageSync('userProfile', profile)
    }

    uni.showToast({ title: '申请已提交', icon: 'success' })
    uni.setStorageSync('currentRole', 'owner')
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/index/index' })
    }, 1500)
  } catch (e) {
    console.error('submit error', e instanceof Error ? e.message : 'unknown error')
    uni.showToast({ title: '提交失败，请重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 24rpx 32rpx;
  padding-bottom: 120rpx;
}

.form-header {
  text-align: center;
  margin-bottom: 40rpx;
}

.form-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #000;
  display: block;
  margin-bottom: 12rpx;
}

.form-desc {
  font-size: 26rpx;
  color: #666;
}

/* Type Section */
.type-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #000;
  display: block;
  margin-bottom: 20rpx;
}

.type-options {
  display: flex;
  gap: 16rpx;
}

.type-option {
  flex: 1;
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 20rpx;
  text-align: center;
  border: 4rpx solid transparent;
}

.type-option.active {
  background: #f5f5f5;
  border-color: #000;
}

.type-icon {
  font-size: 48rpx;
  margin-bottom: 12rpx;
}

.type-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #000;
  display: block;
  margin-bottom: 8rpx;
}

.type-desc {
  font-size: 24rpx;
  color: #666;
}

/* Form Section */
.form-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.form-item {
  margin-bottom: 20rpx;
}

.form-item:last-child {
  margin-bottom: 0;
}

.form-label {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-bottom: 12rpx;
}

.form-input {
  background: #f5f5f5;
  border-radius: 8rpx;
  padding: 16rpx 20rpx;
  font-size: 28rpx;
  color: #000;
  width: 100%;
}

.form-textarea {
  background: #f5f5f5;
  border-radius: 8rpx;
  padding: 16rpx 20rpx;
  font-size: 28rpx;
  color: #000;
  width: 100%;
  height: 120rpx;
}

/* Upload */
.upload-area {
  background: #f5f5f5;
  border-radius: 12rpx;
  width: 100%;
  height: 200rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-image {
  width: 100%;
  height: 200rpx;
  border-radius: 12rpx;
}

.upload-placeholder {
  text-align: center;
}

.upload-text {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-top: 12rpx;
}

/* 车辆照片多张 */
.upload-row {
  display: flex;
  gap: 16rpx;
}

.upload-item {
  flex: 1;
}

.upload-thumb {
  width: 100%;
  height: 160rpx;
  border-radius: 8rpx;
}

.upload-thumb-placeholder {
  background: #f5f5f5;
  border-radius: 8rpx;
  width: 100%;
  height: 160rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.upload-thumb-text {
  font-size: 24rpx;
  color: #666;
  margin-top: 8rpx;
}

/* 座位数选择 */
.seat-options {
  display: flex;
  gap: 16rpx;
}

.seat-option {
  flex: 1;
  background: #f5f5f5;
  border-radius: 8rpx;
  padding: 16rpx;
  text-align: center;
  font-size: 26rpx;
  color: #000;
}

.seat-option.active {
  background: #000;
  color: #fff;
}

/* Footer */
.form-footer {
  padding: 24rpx;
  text-align: center;
}

.submit-btn {
  background: #000;
  color: #fff;
  border-radius: 48rpx;
  height: 96rpx;
  font-size: 32rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}

.submit-btn[disabled] {
  opacity: 0.5;
}

.submit-btn::after {
  border: none;
}

.submit-tip {
  font-size: 24rpx;
  color: #999;
  margin-top: 16rpx;
  display: block;
}
</style>
