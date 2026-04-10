<template>
  <view class="container">
    <!-- Map or Header Area (Simplified for now) -->
    <view class="route-info">
        <view class="route-row">
        <view class="dot green-dot"></view>
        <text class="address">{{ formState.startAddress }}</text>
      </view>
      <view class="route-row">
        <view class="dot orange-dot"></view>
        <text class="address">{{ formState.endAddress }}</text>
      </view>
    </view>

    <!-- Capsule Selectors Row -->
    <view class="capsule-row">
      <view class="capsule" @click="openTimeDrawer">
        <text class="capsule-text">{{ displayTime || '今天 现在出发' }}</text>
        <text class="capsule-icon">></text>
      </view>
      
      <view class="capsule" @click="openPeoplePicker">
        <text class="capsule-text">{{ formState.passengerCount ? formState.passengerCount + '人' : '乘车人数' }}</text>
        <text class="capsule-icon">></text>
      </view>
      
      <view class="capsule" @click="openRemarksInput">
        <text class="capsule-text">{{ formState.requirements ? '已备注' : '添加备注' }}</text>
        <text class="capsule-icon">></text>
      </view>
    </view>

    <!-- Submit Button -->
    <button class="submit-btn" @click="onSubmit">确认发布</button>

    <!-- Simple Bottom Drawer (Time Picker) -->
    <view class="mask" v-if="showTimeDrawer" @click="closeTimeDrawer"></view>
    <view class="drawer" :class="{ 'show': showTimeDrawer }">
      <view class="drawer-header">
        <text class="drawer-title">选择出发时间</text>
        <text class="drawer-close" @click="closeTimeDrawer">×</text>
      </view>
      <view class="drawer-content">
        <!-- Mock Time Options -->
        <view class="time-option" @click="selectTime('现在出发')">现在出发</view>
        <view class="time-option" @click="selectTime('15分钟后')">15分钟后</view>
        <view class="time-option" @click="selectTime('30分钟后')">30分钟后</view>
        <view class="time-option" @click="selectTime('1小时后')">1小时后</view>
        <picker mode="multiSelector" :range="dateTimeRange" @change="onCustomTimeChange">
            <view class="time-option custom-time">自定义时间 ></view>
        </picker>
      </view>
    </view>

  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useDemandForm } from '@/composables/useDemandForm'
import { submitDemand } from '@/services/passenger'

const displayTime = ref('')
const showTimeDrawer = ref(false)

const dateTimeRange = [
  ['今天', '明天', '后天'],
  [
    '00点',
    '01点',
    '02点',
    '03点',
    '04点',
    '05点',
    '06点',
    '07点',
    '08点',
    '09点',
    '10点',
    '11点',
    '12点',
    '13点',
    '14点',
    '15点',
    '16点',
    '17点',
    '18点',
    '19点',
    '20点',
    '21点',
    '22点',
    '23点'
  ],
  ['00分', '10分', '20分', '30分', '40分', '50分']
]

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

const formatWindowDisplay = (earliest: string, latest: string) => {
  const start = new Date(earliest)
  const end = new Date(latest)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return '已同步时间'
  }

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const startDay = new Date(start)
  startDay.setHours(0, 0, 0, 0)
  const diffDays = Math.round((startDay.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
  const dayLabel = ['今天', '明天', '后天'][diffDays] || `${start.getMonth() + 1}/${start.getDate()}`
  const hour = start.getHours().toString().padStart(2, '0')
  const minute = start.getMinutes().toString().padStart(2, '0')
  const endHour = end.getHours().toString().padStart(2, '0')
  const endMinute = end.getMinutes().toString().padStart(2, '0')
  return `${dayLabel} ${hour}:${minute}-${endHour}:${endMinute}`
}

onLoad((options: any) => {
  if (options.start) setStartAddress(decodeURIComponent(options.start))
  if (options.end) setEndAddress(decodeURIComponent(options.end))
  if (options.type) setType(options.type)
  if (options.earliest && options.latest) {
    const earliest = decodeURIComponent(options.earliest)
    const latest = decodeURIComponent(options.latest)
    setDepartureWindow({
      earliest,
      latest
    })
    displayTime.value = formatWindowDisplay(earliest, latest)
  }
})

const openTimeDrawer = () => {
  showTimeDrawer.value = true
}

const closeTimeDrawer = () => {
  showTimeDrawer.value = false
}

const setTimeWindowFromDate = (date: Date) => {
  const earliest = date.toISOString()
  const latest = new Date(date.getTime() + 15 * 60 * 1000).toISOString()
  setDepartureWindow({ earliest, latest })
}

const parseQuickTimeLabel = (label: string) => {
  const offsets: Record<string, number> = {
    '现在出发': 0,
    '15分钟后': 15,
    '30分钟后': 30,
    '1小时后': 60
  }
  const offset = offsets[label]
  if (offset === undefined) return null
  const date = new Date()
  date.setMinutes(date.getMinutes() + offset)
  return date
}

const selectTime = (label: string) => {
  displayTime.value = label
  const date = parseQuickTimeLabel(label) || new Date()
  setTimeWindowFromDate(date)
  closeTimeDrawer()
}

const onCustomTimeChange = (event: any) => {
  const val = event.detail.value
  const day = dateTimeRange[0][val[0]]
  const hour = dateTimeRange[1][val[1]]
  const minute = dateTimeRange[2][val[2]]
  const formatted = `${day} ${hour}:${minute}`
  displayTime.value = formatted
  const dayOffset = val[0]
  const parsedHour = parseInt(hour.replace('点', ''), 10)
  const parsedMinute = parseInt(minute.replace('分', ''), 10)
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  base.setDate(base.getDate() + dayOffset)
  base.setHours(parsedHour, parsedMinute, 0, 0)
  setTimeWindowFromDate(base)
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

const onSubmit = async () => {
  if (!formState.startAddress || !formState.endAddress) {
    uni.showToast({ title: '行程信息不完整', icon: 'none' })
    return
  }

  try {
    uni.showLoading({ title: '发布中...' })
    await submitDemand(toPayload())
    uni.hideLoading()
    uni.navigateTo({
      url: '/pages/passenger/bid_list'
    })
  } catch (error) {
    uni.hideLoading()
    uni.showToast({
      title: error instanceof Error ? error.message : '需求发布失败',
      icon: 'none'
    })
  }
}
</script>

<style>
.container {
  padding: 20px;
  background-color: #fff;
  min-height: 100vh;
}

.route-info {
  margin-bottom: 30px;
}

.route-row {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.dot { width: 8px; height: 8px; border-radius: 50%; margin-right: 10px; flex-shrink: 0; }
.green-dot { background: #3cb371; }
.orange-dot { background: #ff5f00; }

.address {
    font-size: 16px;
    font-weight: 500;
    color: #333;
    width: 90%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* Capsule Styles */
.capsule-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 40px;
}

.capsule {
  background: #f5f6f7;
  border-radius: 20px;
  padding: 10px 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  margin-right: 10px;
  height: 24px;
}

.capsule:last-child {
  margin-right: 0;
}

.capsule-text {
  font-size: 14px;
  color: #333;
  margin-right: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80px;
}

.capsule-icon {
  font-size: 12px;
  color: #999;
}

.submit-btn {
  background-color: #007aff;
  color: #fff;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  box-shadow: 0 4px 10px rgba(0,122,255,0.3);
}

/* Drawer Styles */
.mask {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 998;
}

.drawer {
    position: fixed;
    bottom: -300px;
    left: 0;
    width: 100%;
    height: 300px;
    background: #fff;
    border-radius: 20px 20px 0 0;
    z-index: 999;
    transition: bottom 0.3s ease-in-out;
}

.drawer.show {
    bottom: 0;
}

.drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    border-bottom: 1px solid #eee;
}

.drawer-title { font-size: 16px; font-weight: bold; }
.drawer-close { font-size: 24px; color: #999; }

.drawer-content {
    padding: 10px 0;
}

.time-option {
    padding: 15px 20px;
    border-bottom: 1px solid #f9f9f9;
    font-size: 16px;
    color: #333;
    text-align: center;
}
.custom-time {
    color: #007aff;
}
</style>
