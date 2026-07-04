<template>
  <view class="page-container">
    <!-- Role Tab - 固定在顶部，滚动时隐藏，只显示用户拥有的角色 -->
    <view class="role-tab-bar" :class="{ hidden: isTabHidden }" :style="{ top: (statusBarHeight + 10) + 'px' }" v-if="isFleetMember">
      <view class="role-tab" :class="{ active: currentRole === 'passenger' }" @click="switchRole('passenger')">
        <text class="role-text">乘客</text>
      </view>
      <view class="role-tab" :class="{ active: currentRole === 'owner' }" @click="switchRole('owner')">
        <text class="role-text">车主</text>
      </view>
    </view>

    <!-- 定位按钮 - fixed定位 -->
    <view class="locate-btn" :style="{ top: (statusBarHeight + 60) + 'px' }" @click="doGetLocation">
      <uni-icons type="location-filled" size="18" color="#000"></uni-icons>
    </view>

    <!-- 整体滚动区域 - 地图和内容一起滚动 -->
    <scroll-view
      scroll-y
      class="scroll-container"
      @scroll="onPageScroll"
      :scroll-top="scrollTop"
    >
      <!-- Map Area -->
      <map class="map-bg" :latitude="latitude" :longitude="longitude" :show-location="true"></map>

      <!-- Content Area -->
      <view class="bottom-card">
        <!-- Passenger Content -->
        <template v-if="currentRole === 'passenger'">
          <!-- 起终点输入 -->
          <view class="input-card">
            <view class="input-row" @click="chooseStartLocation">
              <view class="dot black"></view>
              <view class="input-content">
                <text class="input-value">{{ currentAddress || '设置出发地' }}</text>
              </view>
            </view>
            <view class="input-line"></view>
            <view class="input-row" @click="chooseEndLocation">
              <view class="dot black"></view>
              <view class="input-content">
                <text class="input-value" :class="{ muted: !destinationAddress }">
                  {{ destinationAddress || '输入目的地' }}
                </text>
              </view>
            </view>
          </view>

          <!-- 行程类型 -->
          <view class="type-row" v-if="destinationAddress">
            <view class="type-item" :class="{ selected: formState.type === 'TRANSFER' }" @click="setType('TRANSFER')">
              <text class="type-label">接送</text>
            </view>
            <view class="type-item" :class="{ selected: formState.type === 'CHARTER_DAY' }" @click="setType('CHARTER_DAY')">
              <text class="type-label">包天</text>
            </view>
            <view class="type-item" :class="{ selected: formState.type === 'MULTI_DAY' }" @click="setType('MULTI_DAY')">
              <text class="type-label">多日</text>
            </view>
          </view>

        <!-- 选项 -->
        <view class="options-area" v-if="destinationAddress">
          <!-- 出发时间 -->
          <view class="option-row" @click="openTimeDrawer">
            <text class="option-title">出发时间</text>
            <text class="option-value">{{ displayTime || '请选择' }}</text>
          </view>

          <!-- 乘车人数 - 步进器 -->
          <view class="option-row">
            <text class="option-title">乘车人数</text>
            <view class="stepper">
              <view class="stepper-btn" :class="{ disabled: formState.passengerCount <= 1 }" @click="decreasePassenger">
                <text class="stepper-icon">−</text>
              </view>
              <text class="stepper-value">{{ formState.passengerCount || 1 }}</text>
              <view class="stepper-btn" :class="{ disabled: formState.passengerCount >= 6 }" @click="increasePassenger">
                <text class="stepper-icon">+</text>
              </view>
            </view>
          </view>

          <!-- 备注 - 文本域 -->
          <view class="option-row textarea-row">
            <text class="option-title">备注</text>
            <textarea
              class="remarks-input"
              placeholder="如：有大件行李、需儿童座椅..."
              :value="formState.requirements"
              @input="onRemarksInput"
              maxlength="200"
              auto-height
            />
          </view>
        </view>

        <!-- 确认按钮 - Uber风格：黑色大按钮 -->
        <view class="action-area" v-if="destinationAddress">
          <button class="confirm-btn" @click="submitDemandDirectly">
            <text class="btn-text">确认发布行程</text>
          </button>
        </view>

        <!-- 进行中的行程 -->
        <view class="trips-area" v-if="ongoingTrips.length > 0">
          <view class="trips-header">
            <text class="trips-title">进行中的行程</text>
            <text class="trips-link" @click="goToMyTrips">查看全部</text>
          </view>
          <view class="trip-card" v-for="trip in ongoingTrips" :key="trip.id" @click="goToTripDetail(trip.id)">
            <view class="trip-card-header">
              <view class="trip-status-badge" :class="trip.statusClass">
                {{ trip.bidCount > 0 && trip.status === 'BIDDING' ? `已有${trip.bidCount}个报价` : trip.statusDesc }}
              </view>
              <uni-icons type="forward" size="16" color="#000"></uni-icons>
            </view>
            <view class="trip-card-body">
              <view class="trip-route-row">
                <view class="trip-route-dot"></view>
                <text class="trip-route-text">前往 {{ trip.destination }}</text>
              </view>
              <view class="trip-meta-row">
                <view class="trip-route-dot"></view>
                <text class="trip-time-text">{{ trip.time }}</text>
              </view>
            </view>
          </view>
        </view>
      </template>

      <!-- Owner Content - 简化版：只展示进行中的订单 -->
      <template v-else>
        <!-- 车主模式：展示进行中的订单 -->
        <view v-if="isFleetMember" class="owner-home">
          <!-- 进行中的订单 -->
          <view class="trips-area" v-if="providerOngoingOrders.length > 0">
            <view class="trips-header">
              <text class="trips-title">进行中的订单</text>
              <text class="trips-link" @click="goToWorkbench">查看全部</text>
            </view>
            <view class="trip-card" v-for="order in providerOngoingOrders" :key="order.id" @click="goToOrderDetail(order.id)">
              <view class="trip-card-header">
                <view class="trip-status-badge status-active">{{ order.statusDesc }}</view>
                <uni-icons type="forward" size="16" color="#000"></uni-icons>
              </view>
              <view class="trip-card-body">
                <view class="trip-route-row">
                  <view class="trip-route-dot"></view>
                  <text class="trip-route-text">{{ order.start }} → {{ order.end }}</text>
                </view>
                <view class="trip-meta-row">
                  <text class="trip-time-text">{{ order.time }}</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 无订单时显示提示 -->
          <view v-else class="owner-empty">
            <text class="empty-title">暂无进行中的订单</text>
            <text class="empty-desc">前往工作台查看待报价需求</text>
            <button class="empty-btn" @click="goToWorkbench">前往工作台</button>
          </view>
        </view>

        <!-- 非车队成员：显示入驻引导 -->
        <view v-else class="owner-register-guide">
          <view class="guide-header">
            <text class="guide-title">成为车主，开始接单赚钱</text>
            <text class="guide-desc">入驻后可查看订单并报价接单</text>
          </view>
          <button class="register-btn" @click="goToRegister">立即入驻</button>
        </view>
      </template>
      </view>
    </scroll-view>

    <!-- Time Drawer - 根据行程类型显示不同的选择方式 -->
    <view class="mask" v-if="showTimeDrawer" @click="closeTimeDrawer"></view>
    <view class="drawer time-drawer" :class="{ show: showTimeDrawer }">
      <view class="drawer-header">
        <text class="drawer-title">{{ timeDrawerTitle }}</text>
        <text class="drawer-close" @click="closeTimeDrawer">×</text>
      </view>

      <!-- 接送：日期+时间选择 -->
      <template v-if="formState.type === 'TRANSFER'">
        <view class="single-time-display">
          <text class="time-label">出发时间</text>
          <text class="time-value">{{ formatSingleTime(selectedDateTime) }}</text>
        </view>
        <picker-view :value="dateTimePickerValue" @change="onDateTimePickerChange" class="picker-view" indicator-style="height: 50px;">
          <picker-view-column>
            <view class="picker-item" v-for="(day, index) in days" :key="index">{{ day }}</view>
          </picker-view-column>
          <picker-view-column>
            <view class="picker-item" v-for="(hour, index) in hours" :key="index">{{ hour }}时</view>
          </picker-view-column>
          <picker-view-column>
            <view class="picker-item" v-for="(min, index) in minutes" :key="index">{{ min }}分</view>
          </picker-view-column>
        </picker-view>
      </template>

      <!-- 包天：日期选择 -->
      <template v-else-if="formState.type === 'CHARTER_DAY'">
        <view class="single-date-display">
          <text class="date-label">包车日期</text>
          <text class="date-value">{{ formatDate(selectedSingleDate) }}</text>
        </view>
        <picker-view :value="datePickerValue" @change="onDatePickerChange" class="picker-view" indicator-style="height: 50px;">
          <picker-view-column>
            <view class="picker-item" v-for="(day, index) in dateDays" :key="index">{{ day }}</view>
          </picker-view-column>
        </picker-view>
      </template>

      <!-- 多日：日期范围选择 -->
      <template v-else-if="formState.type === 'MULTI_DAY'">
        <view class="range-display">
          <view class="range-item" :class="{ active: isSelectingStartDate }" @click="isSelectingStartDate = true">
            <text class="range-label">开始日期</text>
            <text class="range-value">{{ formatDate(startDateIndex) }}</text>
          </view>
          <view class="range-divider"></view>
          <view class="range-item" :class="{ active: !isSelectingStartDate }" @click="isSelectingStartDate = false">
            <text class="range-label">结束日期</text>
            <text class="range-value">{{ formatDate(endDateIndex) }}</text>
          </view>
        </view>
        <picker-view :value="rangeDatePickerValue" @change="onRangeDatePickerChange" class="picker-view" indicator-style="height: 50px;">
          <picker-view-column>
            <view class="picker-item" v-for="(day, index) in dateDays" :key="index">{{ day }}</view>
          </picker-view-column>
        </picker-view>
      </template>

      <view class="drawer-footer">
        <button class="confirm-btn" @click="confirmTimeSelection">
          <text class="btn-text">确认</text>
        </button>
      </view>
    </view>

    <CustomTabBar :current="0" />
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import md5 from '@/utils/md5'
import CustomTabBar from '@/components/CustomTabBar.vue'
import { useDemandForm } from '@/composables/useDemandForm'
import { submitDemand, fetchMyDemands } from '@/services/passenger'
import { fetchPendingDemands } from '@/services/provider'
import type { DemandType } from '@/types/demand'

const SUPABASE_URL = 'https://qcsmavxqjofrhrdwgkpt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjc21hdnhxam9mcmhyZHdna3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3OTU2OTUsImV4cCI6MjA5MTM3MTY5NX0.zM4mVvvZAylQIXZFrnzaSAy_MGqTvR3hrSWfSSP8xRQ'

// Role state
const currentRole = ref<'passenger' | 'owner'>('passenger')
const merchantInfo = ref<any>(null)
const statusBarHeight = ref(0)
const isTabHidden = ref(false)
const scrollTop = ref(0)
const lastScrollTop = ref(0)

// 是否是车队成员（通过roles数组或merchant_id判断）
const isFleetMember = computed(() => {
  const userProfile = uni.getStorageSync('userProfile')
  const roles = userProfile?.roles || []
  // 检查是否有商家角色
  const hasMerchantRole = roles.some((r: any) =>
    r.name === 'merchant_owner' || r.name === 'merchant_dispatcher' || r.name === 'merchant_driver'
  )
  // 或者 merchant_id 存在（兼容旧数据）
  return hasMerchantRole || userProfile?.merchant_id
})

// 车队名称
const fleetName = computed(() => {
  const userProfile = uni.getStorageSync('userProfile')
  // 从drivers表获取车队名称（需要在onMounted中加载）
  return userProfile?.fleetName || '我的车队'
})

// Demand types with Chinese labels
const demandTypeLabels: Record<DemandType, string> = {
  'TRANSFER': '接送',
  'CHARTER_DAY': '包天',
  'MULTI_DAY': '多日'
}

// Location state
const latitude = ref(30.572269)
const longitude = ref(114.296389)
const currentAddress = ref('获取当前位置中...')
const showTimeDrawer = ref(false)
const displayTime = ref('')

// Demand form
const { formState, setStartAddress, setEndAddress, setPassengerCount, setRequirements, setDepartureWindow, setType, toPayload, resetForm } = useDemandForm()

const destinationAddress = computed(() => formState.endAddress)
const passengerCountLabel = computed(() => formState.passengerCount ? `${formState.passengerCount}人` : '乘车人数')
const requirementsLabel = computed(() => formState.requirements ? '已备注' : '备注')

// Time picker - 根据行程类型显示不同选择方式
const days = ['今天', '明天', '后天']
const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
const minutes = ['00', '10', '20', '30', '40', '50']

// 日期选择器（包天/多日）- 生成更多日期
const dateDays = Array.from({ length: 30 }, (_, i) => {
  const date = new Date()
  date.setDate(date.getDate() + i)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const weekday = weekdays[date.getDay()]
  return i === 0 ? '今天' : i === 1 ? '明天' : `${month}月${day}日 ${weekday}`
})

// 接送类型：日期+时间选择
const selectedDateTime = ref([0, new Date().getHours(), 0])
const dateTimePickerValue = computed(() => [...selectedDateTime.value])

// 包天类型：单日期选择
const selectedSingleDate = ref(0)
const datePickerValue = computed(() => [selectedSingleDate.value])

// 多日类型：日期范围选择
const isSelectingStartDate = ref(true)
const startDateIndex = ref(0)
const endDateIndex = ref(1)
const rangeDatePickerValue = computed(() => [isSelectingStartDate.value ? startDateIndex.value : endDateIndex.value])

// 时间选择器标题
const timeDrawerTitle = computed(() => {
  switch (formState.type) {
    case 'TRANSFER': return '选择出发时间'
    case 'CHARTER_DAY': return '选择包车日期'
    case 'MULTI_DAY': return '选择出行日期范围'
    default: return '选择时间'
  }
})

// 用户需求列表（行程列表）
const ongoingTrips = ref<any[]>([])
const previewOrders = ref([
  { id: 1, start: '武汉天河机场', end: '光谷希尔顿酒店', time: '今天 14:00' },
  { id: 2, start: '武昌火车站', end: '汉口江滩', time: '明天 09:00' }
])
const pendingDemands = ref<any[]>([])
const providerOngoingOrders = ref<any[]>([])
const myOrders = ref<any[]>([]) // 商家订单列表，暂未实现

// 状态描述映射
const statusDescMap: Record<string, string> = {
  'PENDING': '待发布',
  'BIDDING': '等待报价',
  'ACCEPTED': '已确认',
  'IN_PROGRESS': '进行中',
  'COMPLETED': '已完成',
  'CANCELLED': '已取消'
}

// 状态样式类映射
const statusClassMap: Record<string, string> = {
  'PENDING': 'status-pending',
  'BIDDING': 'status-bidding',
  'ACCEPTED': 'status-accepted',
  'IN_PROGRESS': 'status-active',
  'COMPLETED': 'status-done',
  'CANCELLED': 'status-cancelled'
}

// 格式化时间显示（处理跨天情况）
const formatDemandTime = (earliest: string, latest: string) => {
  const start = new Date(earliest)
  const end = new Date(latest)

  const startMonth = start.getMonth() + 1
  const startDay = start.getDate()
  const startHour = start.getHours().toString().padStart(2, '0')
  const startMin = start.getMinutes().toString().padStart(2, '0')

  const endMonth = end.getMonth() + 1
  const endDay = end.getDate()
  const endHour = end.getHours().toString().padStart(2, '0')
  const endMin = end.getMinutes().toString().padStart(2, '0')

  // 判断是否跨天
  const isSameDay = startMonth === endMonth && startDay === endDay

  if (isSameDay) {
    // 同一天：4月11日 14:00-15:00
    return `${startMonth}月${startDay}日 ${startHour}:${startMin}-${endHour}:${endMin}`
  } else {
    // 跨天：4月11日 14:00 - 4月12日 10:00
    return `${startMonth}月${startDay}日 ${startHour}:${startMin} - ${endMonth}月${endDay}日 ${endHour}:${endMin}`
  }
}

// 进行中的状态（首页只展示这些）
const activeStatuses = ['BIDDING', 'ACCEPTED', 'IN_PROGRESS']

// 加载用户行程列表
const loadMyTrips = async () => {
  try {
    console.log('=== loadMyTrips 开始 ===')
    const demands = await fetchMyDemands()
    console.log('获取到的 demands 数量:', demands.length, '数据:', demands)

    // 只筛选进行中的行程，最多展示3条
    const activeDemands = demands
      .filter(d => activeStatuses.includes(d.status))
      .slice(0, 3)

    // 查询每个行程的报价数量
    const accessToken = uni.getStorageSync('accessToken')
    const tripsWithBidCount = await Promise.all(
      activeDemands.map(async (d) => {
        let bidCount = 0
        if (d.status === 'BIDDING' && accessToken) {
          try {
            const res = await uni.request({
              url: `${SUPABASE_URL}/rest/v1/bids?demand_id=eq.${d.id}&select=id`,
              method: 'GET',
              header: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken}`
              }
            })
            if (res.statusCode === 200 && res.data) {
              bidCount = (res.data as any[]).length
            }
          } catch (e) {
            console.error('查询报价数量失败', e)
          }
        }
        return {
          id: d.id,
          statusDesc: statusDescMap[d.status] || '未知状态',
          statusClass: statusClassMap[d.status] || 'status-pending',
          time: formatDemandTime(d.earliest_departure, d.latest_departure),
          destination: d.end_address,
          confirmedPrice: null,
          bidCount,
          status: d.status
        }
      })
    )

    ongoingTrips.value = tripsWithBidCount
    console.log('ongoingTrips:', ongoingTrips.value)
  } catch (e) {
    console.error('加载行程列表失败', e)
  }
}

// 加载待报价订单（商家端）
const loadPendingDemands = async () => {
  try {
    const demands = await fetchPendingDemands()
    pendingDemands.value = demands.map(d => ({
      id: d.id,
      start: d.start_address,
      end: d.end_address,
      time: formatDemandTime(d.earliest_departure, d.latest_departure),
      passengerCount: d.passenger_count || 1,
      type: d.type
    }))
  } catch (e) {
    console.error('加载待报价订单失败', e)
  }
}

// Role switching
const switchRole = (role: 'passenger' | 'owner') => {
  currentRole.value = role
  uni.setStorageSync('currentRole', role)
  // 同步更新 userRole storage（用于其他页面判断）
  uni.setStorageSync('userRole', role === 'owner' ? 'provider' : 'passenger')
  if (role === 'owner') fetchMerchantInfo()
}

// Scroll handler - 隐藏/显示角色 tab
const onPageScroll = (e: any) => {
  const currentScrollTop = e.detail.scrollTop
  // 向下滚动超过 50px 时隐藏 tab
  if (currentScrollTop > 50 && currentScrollTop > lastScrollTop.value) {
    isTabHidden.value = true
  }
  // 向上滚动或回到顶部时显示 tab
  if (currentScrollTop < 30 || currentScrollTop < lastScrollTop.value - 10) {
    isTabHidden.value = false
  }
  lastScrollTop.value = currentScrollTop
}

// Fetch merchant info
const fetchMerchantInfo = async () => {
  const profile = uni.getStorageSync('userProfile')
  const accessToken = uni.getStorageSync('accessToken')
  if (!profile?.id) return

  try {
    const res = await uni.request({
      url: `${SUPABASE_URL}/rest/v1/merchants`,
      method: 'GET',
      data: { owner_user_id: `eq.${profile.id}`, select: '*' },
      timeout: 10000,
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': accessToken ? `Bearer ${accessToken}` : `Bearer ${SUPABASE_ANON_KEY}`
      }
    })
    console.log('merchant fetch result:', res.statusCode, res.data)
    const data = res.data as any[]
    if (data?.length > 0) {
      merchantInfo.value = data[0]
      // 如果商家审核通过，加载待报价订单
      if (merchantInfo.value?.review_status === 'approved') {
        loadPendingDemands()
      }
    }
  } catch (e) { console.error('fetch merchant info error', e) }
}

const refreshMerchantStatus = () => { fetchMerchantInfo(); uni.showToast({ title: '已刷新', icon: 'success' }) }

// Navigation
const goToRegister = () => { uni.navigateTo({ url: '/pages/merchant/register' }) }
const goToDemands = () => { uni.navigateTo({ url: '/pages/provider/workbench' }) }
const goToBid = (demandId: string) => { uni.navigateTo({ url: `/pages/provider/bid_input?demandId=${demandId}` }) }
const goToOrder = (orderId: string) => { uni.navigateTo({ url: `/pages/order/detail?id=${orderId}` }) }
const goToList = () => { uni.navigateTo({ url: '/pages/passenger/bid_list' }) }
const goToMyTrips = () => { uni.navigateTo({ url: '/pages/passenger/bid_list' }) }
const goToTripDetail = (tripId: string) => {
  // 根据状态跳转不同页面：BIDDING 去报价列表，其他去订单详情
  const trip = ongoingTrips.value.find(t => t.id === tripId)
  if (trip?.status === 'BIDDING') {
    uni.navigateTo({ url: `/pages/passenger/bid_list?demandId=${tripId}` })
  } else {
    uni.navigateTo({ url: `/pages/order/detail?demandId=${tripId}` })
  }
}

// 车主模式方法
const goToWorkbench = () => { uni.navigateTo({ url: '/pages/provider/workbench' }) }
const goToOrderDetail = (orderId: string) => {
  uni.navigateTo({ url: `/pages/order/detail?id=${orderId}` })
}

// 时间格式化函数
// 格式化接送类型的单时间
const formatSingleTime = (indices: number[]) => {
  if (!indices || indices.length < 3) return ''
  const day = days[indices[0]] || days[0]
  const hour = hours[indices[1]] || hours[0]
  const minute = minutes[indices[2]] || minutes[0]
  return `${day} ${hour}:${minute}`
}

// 格式化日期（用于包天/多日）
const formatDate = (index: number) => {
  return dateDays[index] || dateDays[0]
}

// 构建日期对象
const buildDateFromDayIndex = (dayIndex: number) => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + dayIndex)
  return date
}

// 构建日期+时间对象
const buildDateTimeFromIndices = (indices: number[]) => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + (indices[0] ?? 0))
  date.setHours(Number(hours[indices[1]] || 0), Number(minutes[indices[2]] || 0), 0, 0)
  return date
}

// Picker 变化处理
const onDateTimePickerChange = (event: any) => {
  selectedDateTime.value = [...event.detail.value]
}

const onDatePickerChange = (event: any) => {
  selectedSingleDate.value = event.detail.value[0]
}

const onRangeDatePickerChange = (event: any) => {
  const val = event.detail.value[0]
  if (isSelectingStartDate.value) {
    startDateIndex.value = val
    if (startDateIndex.value > endDateIndex.value) {
      endDateIndex.value = startDateIndex.value
    }
  } else {
    endDateIndex.value = val
    if (endDateIndex.value < startDateIndex.value) {
      startDateIndex.value = endDateIndex.value
    }
  }
}

const openTimeDrawer = () => { showTimeDrawer.value = true }
const closeTimeDrawer = () => { showTimeDrawer.value = false }

// 确认时间选择
const confirmTimeSelection = () => {
  switch (formState.type) {
    case 'TRANSFER':
      // 接送：单时间点，设置 earliest 和 latest 相同（或相差15分钟）
      const departureDate = buildDateTimeFromIndices(selectedDateTime.value)
      const latestDate = new Date(departureDate.getTime() + 15 * 60 * 1000)
      displayTime.value = formatSingleTime(selectedDateTime.value)
      setDepartureWindow({ earliest: departureDate.toISOString(), latest: latestDate.toISOString() })
      break

    case 'CHARTER_DAY':
      // 包天：选择某一天，当天8点开始到23点结束
      const charterDate = buildDateFromDayIndex(selectedSingleDate.value)
      const charterStart = new Date(charterDate)
      charterStart.setHours(8, 0, 0, 0)
      const charterEnd = new Date(charterDate)
      charterEnd.setHours(23, 0, 0, 0)
      displayTime.value = formatDate(selectedSingleDate.value)
      setDepartureWindow({ earliest: charterStart.toISOString(), latest: charterEnd.toISOString() })
      break

    case 'MULTI_DAY':
      // 多日：日期范围
      const rangeStart = buildDateFromDayIndex(startDateIndex.value)
      rangeStart.setHours(8, 0, 0, 0)
      const rangeEnd = buildDateFromDayIndex(endDateIndex.value)
      rangeEnd.setHours(23, 0, 0, 0)
      displayTime.value = `${formatDate(startDateIndex.value)} - ${formatDate(endDateIndex.value)}`
      setDepartureWindow({ earliest: rangeStart.toISOString(), latest: rangeEnd.toISOString() })
      break
  }

  closeTimeDrawer()
}

// 步进器 - 减少人数
const decreasePassenger = () => {
  const current = formState.passengerCount || 1
  if (current > 1) {
    setPassengerCount(current - 1)
  }
}

// 步进器 - 增加人数
const increasePassenger = () => {
  const current = formState.passengerCount || 1
  if (current < 6) {
    setPassengerCount(current + 1)
  }
}

// 备注输入处理
const onRemarksInput = (e: any) => {
  setRequirements(e.detail.value)
}

// Location
const doGetLocation = () => {
  // 先设置一个默认状态
  currentAddress.value = '获取位置中...'

  uni.getLocation({
    type: 'gcj02',
    isHighAccuracy: true,
    success: (res) => {
      latitude.value = res.latitude
      longitude.value = res.longitude

      // 安卓真机可能不支持 geocode，直接调用腾讯地图API解析
      const KEY = 'HTLBZ-PFF33-AFM3W-O5YM2-2O4VJ-7FF2H'
      const SK = 'Yvi4a0SYxKXH1YqOMmGuvVxiPsg2YewD'
      const params = { key: KEY, location: `${res.latitude},${res.longitude}`, get_poi: '0' }
      const keys = Object.keys(params).sort()
      let qs = keys.map(k => `${k}=${params[k]}`).join('&')
      const path = '/ws/geocoder/v1'
      const sig = md5(`${path}?${qs}${SK}`)

      uni.request({
        url: 'https://apis.map.qq.com' + path,
        data: { ...params, sig },
        timeout: 10000,
        success: (apiRes: any) => {
          console.log('地图API响应:', apiRes.data)
          if (apiRes.data?.status === 0) {
            const result = apiRes.data.result
            // 优先使用推荐地址，其次使用标准地址
            const resolved = result.formatted_addresses?.recommend || result.address || '当前位置'
            currentAddress.value = resolved
            setStartAddress(resolved)
          } else {
            console.log('地图API失败:', apiRes.data?.message)
            // 如果API失败，使用坐标作为默认地址
            currentAddress.value = `当前位置 (${res.latitude.toFixed(4)}, ${res.longitude.toFixed(4)})`
            setStartAddress(currentAddress.value)
          }
        },
        fail: (err) => {
          console.log('地图API请求失败:', err)
          // 使用坐标作为默认地址
          currentAddress.value = `当前位置 (${res.latitude.toFixed(4)}, ${res.longitude.toFixed(4)})`
          setStartAddress(currentAddress.value)
        }
      })
    },
    fail: (err) => {
      console.log('定位失败:', err)
      // 使用默认坐标（武汉）
      latitude.value = 30.572269
      longitude.value = 114.296389
      currentAddress.value = '定位失败，点击选择出发地'
      uni.showToast({ title: '定位失败，请手动选择出发地', icon: 'none' })
    }
  })
}

const chooseStartLocation = () => {
  uni.chooseLocation({ latitude: latitude.value, longitude: longitude.value, success: (res) => {
    if (res.name || res.address) {
      currentAddress.value = res.name || res.address; setStartAddress(currentAddress.value)
      latitude.value = res.latitude; longitude.value = res.longitude
    }
  }})
}

const chooseEndLocation = () => {
  uni.chooseLocation({ latitude: latitude.value, longitude: longitude.value, success: (res) => {
    if (res.name || res.address) setEndAddress(res.name || res.address)
  }})
}

const ensureTimeWindow = () => {
  const { earliest, latest } = formState.departureWindow
  if (earliest && latest && earliest < latest) return { earliest, latest }
  const now = new Date()
  const defaultEarliest = now.toISOString()
  const defaultLatest = new Date(now.getTime() + 15 * 60 * 1000).toISOString()
  setDepartureWindow({ earliest: defaultEarliest, latest: defaultLatest })
  return { earliest: defaultEarliest, latest: defaultLatest }
}

// 直接发布行程需求
const submitDemandDirectly = async () => {
  if (!destinationAddress.value) {
    uni.showToast({ title: '请先输入目的地', icon: 'none' })
    return
  }
  if (!currentAddress.value || currentAddress.value === '获取当前位置中...' || currentAddress.value === '定位失败，请手动选择') {
    uni.showToast({ title: '请先选择起点', icon: 'none' })
    return
  }

  // 设置地址
  setStartAddress(currentAddress.value)
  setEndAddress(destinationAddress.value)

  // 确保时间窗口已设置
  ensureTimeWindow()

  // 确保乘客人数有值
  if (!formState.passengerCount || formState.passengerCount < 1) {
    setPassengerCount(1)
  }

  try {
    uni.showLoading({ title: '发布中...' })
    const result = await submitDemand(toPayload())
    uni.hideLoading()

    // 清空发布表单
    resetForm()

    // 刷新行程列表
    await loadMyTrips()

    uni.showToast({ title: '发布成功', icon: 'success' })

    // 跳转到报价列表页面
    setTimeout(() => {
      uni.navigateTo({ url: '/pages/passenger/bid_list' })
    }, 500)
  } catch (error: any) {
    uni.hideLoading()
    uni.showToast({ title: error.message || '发布失败', icon: 'none' })
  }
}

onMounted(() => {
  // 获取状态栏高度（适配刘海屏）
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 0

  doGetLocation()
  loadMyTrips() // 加载行程列表

  // 初始化角色模式
  const userProfile = uni.getStorageSync('userProfile')
  const roles = userProfile?.roles || []
  const hasMerchantRole = roles.some((r: any) =>
    r.name === 'merchant_owner' || r.name === 'merchant_dispatcher' || r.name === 'merchant_driver'
  ) || userProfile?.merchant_id

  // 如果用户有商家角色，检查之前保存的角色模式
  const savedRole = uni.getStorageSync('currentRole')
  if (hasMerchantRole && savedRole === 'owner') {
    currentRole.value = 'owner'
    fetchMerchantInfo()
    loadPendingDemands()
  } else {
    // 默认乘客模式（即使之前保存的是 owner，但没有商家角色也要重置）
    currentRole.value = 'passenger'
    uni.setStorageSync('currentRole', 'passenger')
    uni.setStorageSync('userRole', 'passenger')
  }

  // 如果有商家角色，加载车队信息
  if (hasMerchantRole && userProfile?.merchant_id) {
    loadFleetInfo(userProfile.merchant_id)
  }
})

// 每次显示页面时检查登录状态
onShow(() => {
  const userProfile = uni.getStorageSync('userProfile')
  const accessToken = uni.getStorageSync('accessToken')

  // 如果未登录，跳转到登录页
  if (!userProfile || !accessToken) {
    uni.reLaunch({ url: '/pages/login/index' })
    return
  }

  // 根据用户角色模式刷新数据
  const userRole = uni.getStorageSync('userRole')
  if (userRole === 'provider') {
    // 商家模式：加载待报价需求
    currentRole.value = 'owner'
    loadPendingDemands()
  } else {
    // 乘客模式：加载行程列表
    currentRole.value = 'passenger'
    loadMyTrips()
  }
})

// 加载车队信息
const loadFleetInfo = async (merchantId: string) => {
  const accessToken = uni.getStorageSync('accessToken')
  try {
    const res = await uni.request({
      url: `${SUPABASE_URL}/rest/v1/merchants?id=eq.${merchantId}&select=company_name,contact_name`,
      method: 'GET',
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`
      }
    })
    if (res.statusCode === 200 && (res.data as any[]).length > 0) {
      const merchant = (res.data as any[])[0]
      const userProfile = uni.getStorageSync('userProfile')
      uni.setStorageSync('userProfile', {
        ...userProfile,
        fleetName: merchant.company_name || merchant.contact_name
      })
    }
  } catch (e) {
    console.error('加载车队信息失败', e)
  }
}
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════════
   Uber 设计风格 - 极简黑白
   ═══════════════════════════════════════════════════════════════ */

.page-container {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Scroll Container - 整体滚动 */
.scroll-container {
  flex: 1;
  height: 100vh;
}

/* Role Tab Bar - 固定在顶部 */
.role-tab-bar {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  display: flex;
  gap: 16rpx;
  background: rgba(255, 255, 255, 0.95);
  padding: 12rpx 16rpx;
  border-radius: 24rpx;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  transition: opacity 0.3s, transform 0.3s;
}

.role-tab-bar.hidden {
  opacity: 0;
  transform: translateX(-50%) translateY(-20rpx);
}

.role-tab {
  padding: 10rpx 28rpx;
  border-radius: 20rpx;
  background: transparent;
}

.role-tab.active {
  background: #000;
}

.role-tab.active .role-text {
  color: #fff;
}

.role-text {
  font-size: 28rpx;
  color: #000;
  font-weight: 500;
}

/* Map - 地图占屏幕 1/3 */
.map-bg {
  width: 750rpx;
  height: 33vh;
}

/* 定位按钮 - fixed定位 */
.locate-btn {
  position: fixed;
  right: 24rpx;
  width: 80rpx;
  height: 80rpx;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  z-index: 150;
}

/* Bottom Card - 紧跟地图下方 */
.bottom-card {
  background: #fff;
  padding: 24rpx 32rpx;
  padding-bottom: 180rpx;
}

/* Input Card - 起终点 */
.input-card {
  background: #f5f5f5;
  border-radius: 16rpx;
  padding: 16rpx 24rpx;
}

.input-row {
  display: flex;
  align-items: center;
  padding: 12rpx 0;
}

.dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  margin-right: 16rpx;
}

.dot.black {
  background: #000;
}

.input-content {
  flex: 1;
}

.input-value {
  font-size: 32rpx;
  color: #000;
  font-weight: 500;
}

.input-value.muted {
  color: #666;
}

.input-line {
  width: 2rpx;
  height: 24rpx;
  background: #ddd;
  margin-left: 8rpx;
  margin-bottom: 8rpx;
}

/* Type Row */
.type-row {
  display: flex;
  margin-top: 24rpx;
  gap: 16rpx;
}

.type-item {
  flex: 1;
  padding: 16rpx 0;
  background: #f5f5f5;
  border-radius: 12rpx;
  text-align: center;
}

.type-item.selected {
  background: #000;
}

.type-item.selected .type-label {
  color: #fff;
}

.type-label {
  font-size: 28rpx;
  color: #000;
}

/* Options Area - Uber风格 */
.options-area {
  margin-top: 24rpx;
  background: #f5f5f5;
  border-radius: 16rpx;
  padding: 16rpx;
}

.option-row {
  display: flex;
  align-items: center;
  padding: 16rpx 8rpx;
  border-bottom: 2rpx solid #e0e0e0;
}

.option-row:last-child {
  border-bottom: none;
}

.option-title {
  font-size: 28rpx;
  color: #000;
  width: 140rpx;
}

.option-value {
  flex: 1;
  font-size: 28rpx;
  color: #666;
  text-align: right;
}

/* 步进器 */
.stepper {
  display: flex;
  align-items: center;
}

.stepper-btn {
  width: 56rpx;
  height: 56rpx;
  background: #fff;
  border: 2rpx solid #000;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stepper-btn.disabled {
  border-color: #ccc;
}

.stepper-btn.disabled .stepper-icon {
  color: #ccc;
}

.stepper-icon {
  font-size: 32rpx;
  color: #000;
}

.stepper-value {
  font-size: 32rpx;
  color: #000;
  font-weight: 500;
  width: 80rpx;
  text-align: center;
}

/* 文本域 */
.textarea-row {
  flex-direction: column;
  align-items: flex-start;
}

.remarks-input {
  flex: 1;
  width: 100%;
  margin-top: 12rpx;
  font-size: 28rpx;
  color: #000;
  background: #fff;
  border-radius: 8rpx;
  padding: 12rpx;
  min-height: 80rpx;
}

/* Confirm Button - Uber风格黑色大按钮 */
.action-area {
  margin-top: 32rpx;
}

.confirm-btn {
  width: 100%;
  height: 96rpx;
  background: #000;
  border-radius: 48rpx;
  border: none;
}

.confirm-btn::after {
  border: none;
}

.btn-text {
  font-size: 32rpx;
  color: #fff;
  font-weight: 500;
}

/* Trips Area - 卡片形式 */
.trips-area {
  margin-top: 32rpx;
}

.trips-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.trips-title {
  font-size: 32rpx;
  color: #000;
  font-weight: 600;
}

.trips-link {
  font-size: 26rpx;
  color: #666;
}

/* 车主首页 */
.owner-home {
  padding: 24rpx 0;
}

.owner-empty {
  text-align: center;
  padding: 80rpx 32rpx;
}

.owner-empty .empty-title {
  font-size: 32rpx;
  color: #000;
  font-weight: 500;
  display: block;
  margin-bottom: 16rpx;
}

.owner-empty .empty-desc {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-bottom: 32rpx;
}

.owner-empty .empty-btn {
  background: #000;
  color: #fff;
  font-size: 28rpx;
  border-radius: 48rpx;
  height: 80rpx;
  line-height: 80rpx;
  padding: 0 48rpx;
  border: none;
}

.owner-empty .empty-btn::after {
  border: none;
}

/* 行程卡片 */
.trip-card {
  background: #f5f5f5;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 16rpx;
}

.trip-card:last-child {
  margin-bottom: 0;
}

.trip-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

/* 状态徽章 */
.trip-status-badge {
  font-size: 24rpx;
  font-weight: 500;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  color: #fff;
}

.trip-status-badge.status-bidding { background: #000; }
.trip-status-badge.status-accepted { background: #000; }
.trip-status-badge.status-active { background: #3b82f6; }
.trip-status-badge.status-pending { background: #999; }
.trip-status-badge.status-done { background: #999; }
.trip-status-badge.status-cancelled { background: #999; }

.trip-card-body {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.trip-route-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.trip-route-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: #000;
}

.trip-route-text {
  font-size: 30rpx;
  color: #000;
  font-weight: 500;
}

.trip-meta-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.trip-time-text {
  font-size: 26rpx;
  color: #666;
}

/* ═══════════════════════════════════════════════════════════════
   OWNER CONTENT - Uber风格
   ═══════════════════════════════════════════════════════════════ */

.owner-register-guide {
  text-align: center;
  padding: 40rpx 0;
}

.guide-header {
  margin-bottom: 32rpx;
}

.guide-title {
  font-size: 36rpx;
  color: #000;
  font-weight: 600;
  display: block;
  margin-bottom: 12rpx;
}

.guide-desc {
  font-size: 28rpx;
  color: #666;
}

.register-btn {
  background: #000;
  color: #fff;
  border-radius: 48rpx;
  height: 96rpx;
  font-size: 32rpx;
  font-weight: 500;
  margin-bottom: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.register-btn::after {
  border: none;
}

.register-btn::after {
  border: none;
}

.guide-preview {
  background: #f5f5f5;
  border-radius: 16rpx;
  padding: 24rpx;
}

.preview-title {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 20rpx;
  display: block;
}

.preview-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 2rpx solid #e0e0e0;
}

.preview-item:last-child {
  border-bottom: none;
}

.preview-info {
  flex: 1;
}

.preview-route {
  font-size: 28rpx;
  color: #000;
  display: block;
  margin-bottom: 8rpx;
}

.preview-time {
  font-size: 26rpx;
  color: #666;
}

.preview-lock {
  font-size: 24rpx;
  color: #000;
  background: #f5f5f5;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
}

.workbench-header {
  background: #f5f5f5;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  text-align: center;
}

.workbench-name {
  font-size: 32rpx;
  color: #000;
  font-weight: 600;
  display: block;
  margin-bottom: 12rpx;
}

.workbench-stats {
  font-size: 28rpx;
  color: #666;
}

.workbench-section {
  background: #f5f5f5;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.demand-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 2rpx solid #e0e0e0;
}

.demand-card:last-child {
  border-bottom: none;
}

.demand-main {
  flex: 1;
}

.demand-route {
  font-size: 28rpx;
  color: #000;
  display: block;
  margin-bottom: 8rpx;
}

.demand-time {
  font-size: 26rpx;
  color: #666;
  display: block;
}

.demand-count {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-top: 8rpx;
}

.bid-btn {
  background: #000;
  color: #fff;
  font-size: 28rpx;
  padding: 12rpx 32rpx;
  border-radius: 24rpx;
  height: auto;
}

.bid-btn::after {
  border: none;
}

.order-card {
  padding: 16rpx 0;
  border-bottom: 2rpx solid #e0e0e0;
}

.order-card:last-child {
  border-bottom: none;
}

.order-status {
  font-size: 28rpx;
  color: #000;
  font-weight: 600;
  display: block;
  margin-bottom: 8rpx;
}

.order-route {
  font-size: 26rpx;
  color: #666;
}

.owner-pending {
  text-align: center;
  padding: 40rpx;
  background: #f5f5f5;
  border-radius: 16rpx;
}

.pending-header {
  margin-bottom: 32rpx;
}

.pending-title {
  font-size: 32rpx;
  color: #000;
  font-weight: 600;
  display: block;
  margin-bottom: 12rpx;
}

.pending-status {
  font-size: 28rpx;
  color: #000;
}

.pending-info {
  display: flex;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 2rpx solid #e0e0e0;
}

.pending-label {
  font-size: 28rpx;
  color: #666;
}

.pending-value {
  font-size: 28rpx;
  color: #000;
  font-weight: 500;
}

.pending-btn {
  background: #000;
  color: #fff;
  font-size: 28rpx;
  border-radius: 48rpx;
  height: 80rpx;
  margin-top: 32rpx;
}

.pending-btn::after {
  border: none;
}

.owner-rejected {
  text-align: center;
  padding: 40rpx;
  background: #f5f5f5;
  border-radius: 16rpx;
}

.rejected-header {
  margin-bottom: 32rpx;
}

.rejected-title {
  font-size: 32rpx;
  color: #000;
  font-weight: 600;
  display: block;
  margin-bottom: 12rpx;
}

.rejected-reason {
  font-size: 28rpx;
  color: #666;
  display: block;
  margin-bottom: 32rpx;
}

.rejected-btn {
  background: #000;
  color: #fff;
  font-size: 28rpx;
  border-radius: 48rpx;
  height: 80rpx;
}

.rejected-btn::after {
  border: none;
}

/* ═══════════════════════════════════════════════════════════════
   TIME DRAWER - Uber风格
   ═══════════════════════════════════════════════════════════════ */

.mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.4);
  z-index: 998;
}

.drawer {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  z-index: 999;
  transform: translateY(100%);
  transition: transform 0.3s;
}

.drawer.show {
  transform: translateY(0);
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 32rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.drawer-title {
  font-size: 32rpx;
  color: #000;
  font-weight: 600;
}

.drawer-close {
  font-size: 48rpx;
  color: #000;
}

.time-drawer {
  min-height: 600rpx;
  padding-bottom: 120rpx;
}

/* 单时间显示（接送） */
.single-time-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 32rpx;
}

.time-label,
.date-label {
  font-size: 28rpx;
  color: #666;
}

.time-value,
.date-value {
  font-size: 32rpx;
  color: #000;
  font-weight: 500;
}

/* 单日期显示（包天） */
.single-date-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 32rpx;
}

/* 日期范围显示（多日） */
.range-display {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 24rpx 32rpx;
}

.range-item {
  text-align: center;
}

.range-label {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-bottom: 8rpx;
}

.range-value {
  font-size: 28rpx;
  color: #000;
  font-weight: 500;
}

.range-divider {
  width: 2rpx;
  height: 60rpx;
  background: #e0e0e0;
}

.picker-view {
  width: 100%;
  height: 300rpx;
  background: #fff;
}

.picker-item {
  line-height: 80rpx;
  text-align: center;
  font-size: 28rpx;
  color: #000;
}

.drawer-footer {
  padding: 24rpx 32rpx;
  padding-bottom: 40rpx;
}

.drawer-footer .confirm-btn {
  margin: 0;
}
</style>