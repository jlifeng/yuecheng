<template>
  <view class="page-container">


    <!-- Map Area -->
    <map class="map-bg" :latitude="latitude" :longitude="longitude" :show-location="true"></map>

    <!-- Content Area (Floating over map) -->
    <view class="content-card">
      <!-- Input Section -->
      <view class="input-card">
        <view class="location-row border-bottom" @click="chooseStartLocation">
          <view class="dot green-dot"></view>
          <text class="location-text">{{ currentAddress }}</text>
        </view>
        <view class="location-row" @click="chooseEndLocation">
          <view class="dot orange-dot"></view>
          <text class="location-text" :class="{ placeholder: !destinationAddress }">
              {{ destinationAddress || '输入目的地' }}
          </text>
        </view>
        <view class="type-selection-row">
          <button
            v-for="type in demandTypes"
            :key="type"
            class="type-option"
            :class="{ active: formState.type === type }"
            @click="setType(type)">
            <text>{{ type.replace('_', ' ') }}</text>
          </button>
        </view>
        
        <!-- Options Row -->
        <view class="capsule-row" v-if="destinationAddress">
          <view class="capsule" @click="openTimeDrawer">
            <text class="capsule-text">{{ displayTime || '现在出发' }}</text>
          </view>
          <view class="capsule" @click="openPeoplePicker">
            <text class="capsule-text">{{ passengerCountLabel }}</text>
          </view>
          <view class="capsule" @click="openRemarksInput">
            <text class="capsule-text">{{ requirementsLabel }}</text>
          </view>
        </view>

        <button v-if="destinationAddress" class="confirm-btn" @click="goToPostConfirm">确认发布行程</button>
      </view>

      <!-- Ongoing Trips Section -->
      <view class="trips-section" v-if="ongoingTrips.length > 0">
        <view class="section-header" @click="goToList">
          <text class="section-title">你有 {{ ongoingTrips.length }} 个进行中的行程</text>
          <text class="see-all" decode='true'>查看全部 &gt;</text>
        </view>
        
        <view class="trip-card" v-for="trip in ongoingTrips" :key="trip.id" @click="goToList">
          <view class="trip-main">
            <view class="trip-left">
              <view class="trip-status-row">
                <text class="trip-status">{{ trip.statusDesc }}</text>
              </view>
              <view class="trip-info">
                <text class="trip-time">{{ trip.time }} 出发</text>
                <text class="trip-route">去 {{ trip.destination }}</text>
              </view>
              <!-- 只有确认订单后才显示金额 -->
              <view class="trip-action" v-if="trip.confirmedPrice">
                <text class="price-text">订单金额: ¥{{ trip.confirmedPrice }}</text>
              </view>
            </view>
            
            <view class="trip-right">
              <view class="bid-indicator">
                <uni-icons type="right" size="20" color="#999"></uni-icons>
                <text class="bid-count" v-if="trip.bidCount > 0">{{ trip.bidCount }}个报价</text>
                <text class="bid-hint" v-else>查看详情</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
    
    <!-- Time Drawer with Range Selection -->
    <view class="mask" v-if="showTimeDrawer" @click="closeTimeDrawer"></view>
    <view class="drawer range-drawer" :class="{ 'show': showTimeDrawer }">
      <view class="drawer-header">
        <text class="drawer-title">请选择出发时间</text>
        <text class="drawer-close" @click="closeTimeDrawer">×</text>
      </view>
      
      <!-- Range Display -->
      <view class="range-display">
        <view class="range-item" :class="{ active: isSelectingStart }" @click="isSelectingStart = true">
            <text class="range-label">最早出发时间</text>
            <text class="range-value">{{ formatTime(startTimeIndex) }}</text>
        </view>
        <view class="range-divider"></view>
        <view class="range-item" :class="{ active: !isSelectingStart }" @click="isSelectingStart = false">
            <text class="range-label">最晚出发时间</text>
            <text class="range-value">{{ formatTime(endTimeIndex) }}</text>
        </view>
      </view>
      
      <!-- Picker View -->
      <picker-view :value="pickerValue" @change="onPickerChange" class="picker-view" indicator-style="height: 50px;">
        <picker-view-column>
            <view class="picker-item" v-for="(day, index) in days" :key="index">{{ day }}</view>
        </picker-view-column>
        <picker-view-column>
            <view class="picker-item" v-for="(hour, index) in hours" :key="index">{{ hour }}点</view>
        </picker-view-column>
        <picker-view-column>
            <view class="picker-item" v-for="(min, index) in minutes" :key="index">{{ min }}分</view>
        </picker-view-column>
      </picker-view>
      
      <!-- Confirm Button -->
      <view class="drawer-footer">
          <button class="range-confirm-btn" @click="confirmTimeRange">
              <text>确认</text>
              <text class="btn-subtext">{{ formatTime(startTimeIndex) }} - {{ formatTime(endTimeIndex, true) }}出发</text>
          </button>
      </view>
    </view>
    
    <CustomTabBar :current="0" />
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import md5 from '@/utils/md5'
import CustomTabBar from '@/components/CustomTabBar.vue'
import { useDemandForm } from '@/composables/useDemandForm'
import { DEMAND_TYPES } from '@/types/demand'

const safeAreaTop = ref(44)
const latitude = ref(30.572269)
const longitude = ref(114.296389)
const currentAddress = ref('获取当前位置中...')
const showTimeDrawer = ref(false)
const displayTime = ref('')

const {
  formState,
  setStartAddress,
  setEndAddress,
  setPassengerCount,
  setRequirements,
  setDepartureWindow,
  toPayload,
  setType
} = useDemandForm()

const demandTypes = DEMAND_TYPES

const destinationAddress = computed(() => formState.endAddress)
const passengerCountLabel = computed(() =>
  formState.passengerCount ? `${formState.passengerCount}人` : '乘车人数'
)
const requirementsLabel = computed(() => (formState.requirements ? '已备注' : '备注'))

const days = ['今天', '明天', '后天']
const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
const minutes = ['00', '10', '20', '30', '40', '50']
const isSelectingStart = ref(true)
const startTimeIndex = ref([0, new Date().getHours(), 0])
const endTimeIndex = ref([0, new Date().getHours(), 1])
const pickerValue = computed(() => [...(isSelectingStart.value ? startTimeIndex.value : endTimeIndex.value)])

const ongoingTrips = ref([
  {
    id: 1,
    statusDesc: '等待车主报价中',
    time: '1月31日 18:00-23:55',
    destination: '黄冈市·新凯花园道',
    confirmedPrice: null,
    bidCount: 3
  }
])

const formatTime = (indices: number[], timeOnly = false) => {
  if (!indices || indices.length < 3) return ''
  const day = days[indices[0]] || days[0]
  const hour = hours[indices[1]] || hours[0]
  const minute = minutes[indices[2]] || minutes[0]
  if (timeOnly) return `${hour}:${minute}`
  return `${day}${hour}:${minute}`
}

const buildDateFromIndices = (indices: number[]) => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + (indices[0] ?? 0))
  date.setHours(Number(hours[indices[1]] || hours[0]), Number(minutes[indices[2]] || minutes[0]), 0, 0)
  return date
}

const formatDateDisplay = (date: Date, timeOnly = false) => {
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  const current = new Date(date)
  current.setSeconds(0, 0)
  const diffDays = Math.round((current.getTime() - base.getTime()) / (24 * 60 * 60 * 1000))
  const dayLabel = days[diffDays] || `${current.getMonth() + 1}/${current.getDate()}`
  const hour = current.getHours().toString().padStart(2, '0')
  const minute = current.getMinutes().toString().padStart(2, '0')
  if (timeOnly) return `${hour}:${minute}`
  return `${dayLabel}${hour}:${minute}`
}

const compareTime = (t1: number[], t2: number[]) => {
  if (t1[0] !== t2[0]) return t1[0] - t2[0]
  if (t1[1] !== t2[1]) return t1[1] - t2[1]
  return t1[2] - t2[2]
}

const onPickerChange = (event: any) => {
  const val = event.detail.value
  if (isSelectingStart.value) {
    startTimeIndex.value = [...val]
    if (compareTime(startTimeIndex.value, endTimeIndex.value) > 0) {
      endTimeIndex.value = [...startTimeIndex.value]
    }
  } else {
    endTimeIndex.value = [...val]
  }
}

const openTimeDrawer = () => {
  showTimeDrawer.value = true
}

const closeTimeDrawer = () => {
  showTimeDrawer.value = false
}

const confirmTimeRange = () => {
  const earliestDate = buildDateFromIndices(startTimeIndex.value)
  let latestDate = buildDateFromIndices(endTimeIndex.value)
  if (latestDate.getTime() <= earliestDate.getTime()) {
    latestDate = new Date(earliestDate.getTime() + 15 * 60 * 1000)
  }
  displayTime.value = `${formatDateDisplay(earliestDate)} - ${formatDateDisplay(latestDate, true)}`
  setDepartureWindow({
    earliest: earliestDate.toISOString(),
    latest: latestDate.toISOString()
  })
  closeTimeDrawer()
}

const openPeoplePicker = () => {
  uni.showActionSheet({
    itemList: ['1人', '2人', '3人', '4人', '5人', '6人'],
    success: (res) => {
      setPassengerCount(res.tapIndex + 1)
    }
  })
}

const openRemarksInput = () => {
  uni.showModal({
    title: '添加备注',
    editable: true,
    placeholderText: '例如：有大件行李、需儿童座椅',
    success: (res) => {
      if (res.confirm) {
        setRequirements(res.content)
      }
    }
  })
}

const doGetLocation = () => {
  uni.getLocation({
    type: 'gcj02',
    geocode: true,
    isHighAccuracy: true,
    success: (res) => {
      latitude.value = res.latitude
      longitude.value = res.longitude

      if (res.address) {
        let addr = ''
        if (typeof res.address === 'string') {
          addr = res.address
        } else if (typeof res.address === 'object') {
          addr = res.address.streetNum || res.address.street || res.address.city || ''
        }
        if (addr) {
          currentAddress.value = addr
          setStartAddress(addr)
          return
        }
      }

      const KEY = 'HTLBZ-PFF33-AFM3W-O5YM2-2O4VJ-7FF2H'
      const SK = 'Yvi4a0SYxKXH1YqOMmGuvVxiPsg2YewD'
      const params = {
        key: KEY,
        location: `${res.latitude},${res.longitude}`,
        get_poi: '0'
      }
      const keys = Object.keys(params).sort()
      let qs = ''
      keys.forEach((k) => {
        qs += `${k}=${params[k]}&`
      })
      qs = qs.slice(0, -1)
      const path = '/ws/geocoder/v1'
      const strToSign = `${path}?${qs}${SK}`
      const sig = md5(strToSign)
      const encodedParams: any = {}
      Object.keys(params).forEach((k) => {
        encodedParams[k] = encodeURIComponent(params[k])
      })

      uni.request({
        url: 'https://apis.map.qq.com' + path,
        data: {
          ...encodedParams,
          sig
        },
        success: (apiRes: any) => {
          if (apiRes.data && apiRes.data.status === 0) {
            const result = apiRes.data.result
            const resolved =
              result.formatted_addresses?.recommend || result.address || '未知位置'
            currentAddress.value = resolved
            setStartAddress(resolved)
          } else {
            currentAddress.value = '地址解析失败: ' + apiRes.data.message
          }
        },
        fail: () => {
          currentAddress.value = '网络请求失败'
        }
      })
    },
    fail: (err) => {
      currentAddress.value = '定位失败，请手动选择'
      if (err.errMsg.indexOf('auth') > -1) {
        uni.showModal({
          title: '需要定位权限',
          content: '请在设置中开启定位权限以获取当前位置',
          success: (res) => {
            if (res.confirm) uni.openSetting()
          }
        })
      }
    }
  })
}

const chooseStartLocation = () => {
  uni.chooseLocation({
    latitude: latitude.value,
    longitude: longitude.value,
    success: (res) => {
      if (res.name || res.address) {
        const addr = res.name || res.address
        currentAddress.value = addr
        setStartAddress(addr)
        latitude.value = res.latitude
        longitude.value = res.longitude
      }
    }
  })
}

const chooseEndLocation = () => {
  uni.chooseLocation({
    latitude: latitude.value,
    longitude: longitude.value,
    success: (res) => {
      if (res.name || res.address) {
        const addr = res.name || res.address
        setEndAddress(addr)
      }
    }
  })
}

const ensureTimeWindow = () => {
  const { earliest, latest } = formState.departureWindow
  if (earliest && latest && earliest < latest) {
    return { earliest, latest }
  }

  const now = new Date()
  const defaultEarliest = now.toISOString()
  const defaultLatest = new Date(now.getTime() + 15 * 60 * 1000).toISOString()
  setDepartureWindow({ earliest: defaultEarliest, latest: defaultLatest })
  return { earliest: defaultEarliest, latest: defaultLatest }
}

const goToPostConfirm = () => {
  if (!destinationAddress.value) {
    uni.showToast({ title: '请先输入目的地', icon: 'none' })
    return
  }
  const { earliest, latest } = ensureTimeWindow()
  const url = `/pages/passenger/post_demand?start=${encodeURIComponent(
    currentAddress.value
  )}&end=${encodeURIComponent(destinationAddress.value)}&type=${encodeURIComponent(
    formState.type
  )}&earliest=${encodeURIComponent(earliest)}&latest=${encodeURIComponent(latest)}`
  uni.navigateTo({ url })
}

const goToList = () => {
  uni.navigateTo({
    url: '/pages/passenger/bid_list'
  })
}

onMounted(() => {
  const sysInfo = uni.getSystemInfoSync()
  if (sysInfo.statusBarHeight) {
    safeAreaTop.value = sysInfo.statusBarHeight + 5
  }

  doGetLocation()
})
</script>

<style>
.page-container {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}



.map-bg {
  width: 750rpx; /* Use rpx for full width */
  height: 50vh; /* Fixed height */
}

.content-card {
  flex: 1;
  background: #f4f5f7;
  border-radius: 20px 20px 0 0;
  margin-top: -20px; /* Overlap map */
  z-index: 10;
  position: relative;
  padding: 15px;
  height: 0; /* Important for flex: 1 to scroll */
  overflow-y: scroll;
}

/* Input Card */
.input-card {
  background: white;
  border-radius: 12px;
  padding: 5px 15px;
  margin-bottom: 15px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.location-row {
  display: flex;
  align-items: center;
  padding: 18px 0;
}

.border-bottom {
  border-bottom: 1px solid #f0f0f0;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 12px;
}
.green-dot { background: #3cb371; }
.orange-dot { background: #ff5f00; }

.location-text {
  font-size: 16px;
  color: #333;
  font-weight: 500;
  width: 100%;
}
.placeholder {
  color: #333;
  font-size: 18px;
  font-weight: bold;
}

/* Trips Section */
.section-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  padding: 0 5px;
}
.section-title { font-size: 14px; color: #666; }
.see-all { font-size: 12px; color: #999; }

.trip-card {
  background: white;
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 15px;
}

.trip-main {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
}

.trip-left {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.trip-right {
  display: flex;
  align-items: center;
  padding-left: 15px;
  border-left: 1px solid #f0f0f0;
}

.bid-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 60px;
}

.bid-count {
  font-size: 12px;
  color: #ff5f00;
  font-weight: bold;
  margin-top: 5px;
  text-align: center;
}

.bid-hint {
  font-size: 11px;
  color: #999;
  margin-top: 5px;
  text-align: center;
}

.trip-status-row {
  margin-bottom: 8px;
}

.trip-status {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
  display: block;
}

.trip-info text {
  display: block;
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.trip-action {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #f0f0f0;
}

.price-text {
  font-size: 16px;
  font-weight: bold;
  color: #ff5f00;
}

/* Capsule Styles */
.capsule-row {
  display: flex;
  justify-content: space-between;
  margin-top: 15px;
  margin-bottom: 20px; /* Add some space before button */
}

.capsule {
  background: #f5f6f7;
  border-radius: 16px; /* Slightly less round to look more modern or keep as is */
  padding: 4px 10px; /* Reduced padding */
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  margin-right: 8px;
  height: 32px; /* Reduced height from 40px */
}

.type-selection-row {
  display: flex;
  justify-content: space-between;
  margin: 12px 0;
}

.type-option {
  flex: 1;
  margin-right: 6px;
  padding: 6px 10px;
  border-radius: 16px;
  background: #fff;
  border: 1px solid #e0e0e0;
  font-size: 12px;
  color: #333;
}

.type-option:last-child {
  margin-right: 0;
}

.type-option.active {
  background: #007aff;
  color: #fff;
  border-color: #007aff;
}

.capsule:last-child {
  margin-right: 0;
}

.capsule-text {
  font-size: 13px;
  color: #333;
  margin-right: 0; /* Removed margin since icon is gone */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80px;
}

.confirm-btn {
    margin-top: 10px;
    background: linear-gradient(135deg, #1e2023 0%, #303741 100%); /* Premium Dark */
    color: #e5c07b; /* Gold/Cream Text for premium feel, or just white */
    color: white;
    border-radius: 25px; /* Pill shape */
    font-size: 16px;
    font-weight: bold;
    height: 48px;
    line-height: 48px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.confirm-btn::after { border: none; } /* Remove UNI-APP default button border */
.drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    border-bottom: 1px solid #eee;
}

.drawer-title { font-size: 16px; font-weight: bold; }
.drawer-close { font-size: 24px; color: #999; }

/* Range Drawer Styles */
.range-drawer {
    height: auto; /* Let content dictate height or fix to specific if needed */
    min-height: 550px; 
    display: flex;
    flex-direction: column;
    background: #fff; 
}

.range-display {
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 20px 0;
}

.range-item {
    text-align: center;
    opacity: 0.5;
    transition: all 0.3s;
}
.range-item.active {
    opacity: 1;
    transform: scale(1.05);
}

.range-label {
    font-size: 14px;
    font-weight: bold;
    display: block;
    margin-bottom: 5px;
    color: #333;
}
.range-item.active .range-label { color: #3cb371; } /* Green for start */
.range-item:nth-child(3).active .range-label { color: #333; } /* Black for end usually, or customize */

.range-value {
    font-size: 16px;
    font-weight: bold;
    color: #333;
}
.range-item.active .range-value {
    color: #3cb371;
}
.range-item:nth-child(3).active .range-value {
    color: #3cb371; /* Or diff color */
}

.range-divider {
    width: 1px;
    height: 30px;
    background: #eee;
}

.drawer {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    background: #fff;
    border-radius: 20px 20px 0 0;
    z-index: 999;
    transform: translateY(100%);
    transition: transform 0.3s ease-in-out;
}

.drawer.show {
    transform: translateY(0);
}

.picker-view {
    width: 100%;
    height: 250px;
    background: #fff;
}
.picker-item {
    line-height: 50px;
    text-align: center;
    font-size: 16px;
}

.drawer-footer {
    padding: 20px;
    border-top: 1px solid #f0f0f0;
}

.range-confirm-btn {
    background: #4cd964; /* Green like screenshot */
    color: white;
    border-radius: 40px;
    height: 50px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    line-height: 1.2;
}
.btn-subtext {
    font-size: 12px;
    opacity: 0.9;
}
</style>
