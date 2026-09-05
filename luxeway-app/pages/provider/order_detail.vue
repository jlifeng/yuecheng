<template>
  <view class="container">
    <!-- 状态卡片 -->
    <view class="status-card" :class="statusClass">
      <text class="status-text">{{ statusText }}</text>
      <text class="sub-text">{{ statusSubText }}</text>
    </view>

    <!-- 乘客信息 -->
    <view class="passenger-card" v-if="orderDetail">
      <view class="passenger-info">
        <view class="passenger-avatar">
          <text>👤</text>
        </view>
        <view class="passenger-detail">
          <text class="passenger-name">乘客</text>
          <text class="passenger-count">{{ orderDetail.passengerCount }}人</text>
        </view>
      </view>
      <view class="passenger-remark" v-if="orderDetail.requirements">
        <text class="remark-label">备注：</text>
        <text class="remark-text">{{ orderDetail.requirements }}</text>
      </view>
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
      </view>
    </view>

    <!-- 报价信息 -->
    <view class="price-card" v-if="orderDetail">
      <text class="card-title">报价信息</text>
      <view class="price-row">
        <text>报价金额</text>
        <text class="price-value">¥{{ orderDetail.price }}</text>
      </view>
      <view class="price-row" v-if="orderDetail.carModel">
        <text>车型</text>
        <text>{{ orderDetail.carModel }}</text>
      </view>
      <view class="price-row" v-if="orderDetail.message">
        <text>报价说明</text>
        <text class="price-remark">{{ orderDetail.message }}</text>
      </view>
    </view>

    <!-- 已指派司机 -->
    <view class="driver-card" v-if="orderDetail && assignedDriver">
      <text class="card-title">执行司机</text>
      <view class="driver-row">
        <view class="driver-main">
          <text class="driver-name">{{ assignedDriver.name || '司机' }}</text>
          <text class="driver-phone" v-if="assignedDriver.phone">{{ assignedDriver.phone }}</text>
        </view>
        <view class="driver-vehicle" v-if="assignedVehicle">
          <text>{{ assignedVehicle.model || '车辆' }}</text>
          <text class="plate" v-if="assignedVehicle.plateNumber">{{ assignedVehicle.plateNumber }}</text>
        </view>
      </view>
    </view>

    <!-- 已提交费用（待乘客确认 / 已完成） -->
    <view class="fee-card" v-if="orderDetail && submittedFee">
      <text class="card-title">费用明细</text>
      <view class="fee-list">
        <view class="fee-row">
          <text>基础车费</text>
          <text>¥{{ submittedFee.baseFare }}</text>
        </view>
        <view class="fee-row" v-if="submittedFee.waitingFee">
          <text>等待费</text>
          <text>¥{{ submittedFee.waitingFee }}</text>
        </view>
        <view class="fee-row" v-if="submittedFee.tollFee">
          <text>过路费</text>
          <text>¥{{ submittedFee.tollFee }}</text>
        </view>
        <view class="fee-row" v-if="submittedFee.parkingFee">
          <text>停车费</text>
          <text>¥{{ submittedFee.parkingFee }}</text>
        </view>
        <view class="fee-row" v-if="submittedFee.otherFee">
          <text>其他</text>
          <text>¥{{ submittedFee.otherFee }}</text>
        </view>
        <view class="fee-row total">
          <text>合计</text>
          <text class="total-price">¥{{ submittedFee.totalAmount }}</text>
        </view>
      </view>
      <text class="fee-note" v-if="submittedFee.notes">备注：{{ submittedFee.notes }}</text>
      <text class="fee-status" v-if="fulfillment === 'PENDING_FEE_CONFIRM'">
        已提交，等待乘客确认
      </text>
      <text class="fee-status done" v-else-if="fulfillment === 'COMPLETED' || submittedFee.confirmedAt">
        乘客已确认
      </text>
    </view>

    <!-- 操作按钮 -->
    <view class="action-area">
      <!-- 到达目的地：提交费用 -->
      <template v-if="canSubmitFees">
        <view class="action-row">
          <button
            v-if="canCancelOrder"
            class="action-btn cancel"
            @click="showCancelModal"
          >
            取消订单
          </button>
          <button
            class="action-btn primary flex-1"
            :disabled="submittingFees"
            @click="openFeeModal"
          >
            提交费用
          </button>
        </view>
      </template>

      <!-- 待乘客确认费用 -->
      <template v-else-if="isPendingFeeConfirm">
        <view class="waiting-fee-tip">
          <text>费用已提交，等待乘客确认</text>
        </view>
      </template>

      <!-- 主路径节点推进：唯一主操作 + 可取消（不含费用） -->
      <template v-else-if="primaryAction && !isTerminal">
        <view class="action-row">
          <button
            v-if="canCancelOrder"
            class="action-btn cancel"
            @click="showCancelModal"
          >
            取消订单
          </button>
          <button
            class="action-btn primary flex-1"
            :disabled="advancing"
            @click="onPrimaryAction"
          >
            {{ advancing ? '处理中...' : primaryActionLabel }}
          </button>
        </view>
      </template>

      <!-- COMPLETED -->
      <view v-else-if="orderDetail?.status === 'COMPLETED' || fulfillment === 'COMPLETED'" class="completed-tip">
        <text>✓ 订单已完成</text>
      </view>

      <!-- CANCELLED -->
      <view v-else-if="orderDetail?.status === 'CANCELLED' || fulfillment === 'CANCELLED'" class="cancelled-tip">
        <text>订单已取消</text>
      </view>

      <!-- 当前用户不是执行司机：仅查看进度 -->
      <view v-else-if="orderDetail && !isAssignedDriver && !isTerminal" class="read-only-tip">
        <text>您不是该订单的执行司机，仅可查看进度</text>
      </view>
    </view>

    <!-- 费用录入弹层 -->
    <view class="modal-mask" v-if="feeModalVisible" @click="closeFeeModal"></view>
    <view class="modal-popup fee-popup" v-if="feeModalVisible">
      <view class="modal-header">
        <text class="modal-title">提交费用</text>
        <text class="modal-close" @click="closeFeeModal">×</text>
      </view>
      <view class="modal-body">
        <text class="modal-desc">线下结算留档，不涉及在线支付</text>

        <view class="fee-field">
          <text class="fee-label">基础车费</text>
          <input
            class="fee-input"
            type="digit"
            v-model="feeForm.baseFare"
            placeholder="默认报价金额"
          />
        </view>
        <view class="fee-field">
          <text class="fee-label">过路费</text>
          <input
            class="fee-input"
            type="digit"
            v-model="feeForm.tollFee"
            placeholder="0"
          />
        </view>
        <view class="fee-field">
          <text class="fee-label">停车费</text>
          <input
            class="fee-input"
            type="digit"
            v-model="feeForm.parkingFee"
            placeholder="0"
          />
        </view>
        <view class="fee-field">
          <text class="fee-label">其他</text>
          <input
            class="fee-input"
            type="digit"
            v-model="feeForm.otherFee"
            placeholder="0"
          />
        </view>
        <view class="fee-field">
          <text class="fee-label">备注</text>
          <input
            class="fee-input"
            type="text"
            v-model="feeForm.notes"
            placeholder="选填"
          />
        </view>

        <view class="fee-total-row">
          <text>合计</text>
          <text class="fee-total-value">¥{{ feeFormTotal }}</text>
        </view>
      </view>
      <view class="modal-footer fee-footer">
        <button
          class="modal-btn secondary"
          :disabled="submittingFees"
          @click="submitFeesNoExtra"
        >
          无附加费提交
        </button>
        <button
          class="modal-btn confirm-black"
          :disabled="submittingFees"
          @click="submitFeesWithForm"
        >
          {{ submittingFees ? '提交中...' : '确认提交' }}
        </button>
      </view>
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
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import {
  merchantCancelOrder,
  advanceFulfillment,
  submitOrderFees,
} from '@/services/provider'
import type { OrderFee } from '@/types/order'
import {
  canCancelFulfillment,
  defaultFulfillmentForDemandStatus,
  FULFILLMENT_STATUS,
  getPrimaryNextAction,
  type FulfillmentAction
} from '@/utils/fulfillmentStateMachine'
import { getFulfillmentStatusCopy } from '@/utils/fulfillmentStatusCopy'

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase'

const demandId = ref('')
const bidId = ref('')
const orderDetail = ref<any>(null)
const assignedDriver = ref<{ id: string; name: string; phone: string; userId?: string | null } | null>(null)
const assignedVehicle = ref<{ id: string; plateNumber: string; model: string } | null>(null)

// 履约推进
const advancing = ref(false)

// 费用录入
const feeModalVisible = ref(false)
const submittingFees = ref(false)
const submittedFee = ref<OrderFee | null>(null)
const feeForm = ref({
  baseFare: '',
  tollFee: '',
  parkingFee: '',
  otherFee: '',
  notes: ''
})

// 取消订单相关
const cancelModalVisible = ref(false)
const selectedReason = ref('')
const cancelling = ref(false)
const cancelReasons = [
  '乘客取消行程',
  '车辆故障',
  '无法联系乘客',
  '其他原因'
]

const resolveFulfillment = (detail: any): FulfillmentStatus | null => {
  if (!detail) return null
  if (detail.fulfillmentStatus) return detail.fulfillmentStatus as FulfillmentStatus
  return defaultFulfillmentForDemandStatus(detail.status)
}

const fulfillment = computed(() => resolveFulfillment(orderDetail.value))

const isTerminal = computed(() => {
  const f = fulfillment.value
  return (
    f === FULFILLMENT_STATUS.COMPLETED ||
    f === FULFILLMENT_STATUS.CANCELLED ||
    orderDetail.value?.status === 'COMPLETED' ||
    orderDetail.value?.status === 'CANCELLED'
  )
})

/**
 * 当前登录用户是否为执行司机（即报价人）。
 * acceptBid 时 accepted_provider_id = bid.provider_id = 报价人的 userProfile.id。
 * 只有执行司机本人才可推进履约节点（去接驾、到达上车点等）。
 */
const isAssignedDriver = computed(() => {
  const userId = uni.getStorageSync('userProfile')?.id
  if (!userId) return false
  return orderDetail.value?.acceptedProviderId === userId
})

/** Primary next action from state machine; hide fee dedicated flows. */
const primaryAction = computed<FulfillmentAction | null>(() => {
  if (isTerminal.value) return null
  const f = fulfillment.value
  if (!f) return null
  // 费用录入 / 等待确认有独立 UI
  if (
    f === FULFILLMENT_STATUS.ARRIVED_DESTINATION ||
    f === FULFILLMENT_STATUS.PENDING_FEE_CONFIRM
  ) {
    return null
  }
  const action = getPrimaryNextAction(f)
  if (!action) return null
  if (action.code === 'SUBMIT_FEES' || action.code === 'CONFIRM_FEES') return null
  // 仅执行司机本人可推进履约节点
  if (!isAssignedDriver.value) return null
  return action
})

/** Primary action excludes fee submit/confirm (dedicated UI). */
const primaryActionLabel = computed(() => {
  if (!primaryAction.value) return ''
  return primaryAction.value.label
})

const canSubmitFees = computed(() => {
  if (!orderDetail.value || isTerminal.value) return false
  return fulfillment.value === FULFILLMENT_STATUS.ARRIVED_DESTINATION
})

const isPendingFeeConfirm = computed(() => {
  return fulfillment.value === FULFILLMENT_STATUS.PENDING_FEE_CONFIRM
})

const feeFormTotal = computed(() => {
  const n = (v: string) => {
    const x = Number(v)
    if (!Number.isFinite(x) || x < 0) return 0
    return Math.round(x * 100) / 100
  }
  const total =
    n(feeForm.value.baseFare) +
    n(feeForm.value.tollFee) +
    n(feeForm.value.parkingFee) +
    n(feeForm.value.otherFee)
  return Math.round(total * 100) / 100
})

const canCancelOrder = computed(() => {
  if (isTerminal.value) return false
  return canCancelFulfillment(fulfillment.value)
})

const statusClass = computed(() => {
  const status = orderDetail.value?.status
  const f = fulfillment.value
  if (status === 'IN_PROGRESS' || (f && [
    'ON_THE_WAY',
    'ARRIVED_PICKUP',
    'WAITING_PASSENGER',
    'PASSENGER_BOARDED',
    'ARRIVING_DESTINATION',
    'ARRIVED_DESTINATION',
    'PENDING_FEE_CONFIRM'
  ].includes(f))) {
    return 'status-active'
  }
  if (status === 'COMPLETED' || f === 'COMPLETED') return 'status-done'
  if (status === 'CANCELLED' || f === 'CANCELLED') return 'status-done'
  return 'status-accepted'
})

const statusText = computed(() => {
  const detail = orderDetail.value
  if (!detail) return '加载中...'
  const f = resolveFulfillment(detail)
  if (f) {
    const copy = getFulfillmentStatusCopy(f)
    if (copy?.title) return copy.title
  }
  if (detail.status === 'ACCEPTED') return '待出发'
  if (detail.status === 'IN_PROGRESS') return '进行中'
  if (detail.status === 'COMPLETED') return '已完成'
  if (detail.status === 'CANCELLED') return '已取消'
  return '加载中...'
})

const statusSubText = computed(() => {
  const detail = orderDetail.value
  if (!detail) return ''
  const f = resolveFulfillment(detail)
  if (f) {
    const copy = getFulfillmentStatusCopy(f)
    if (copy?.subText) return copy.subText
  }
  if (detail.status === 'ACCEPTED') return '请按时到达出发地点接乘客'
  if (detail.status === 'IN_PROGRESS') return '行程进行中，请安全驾驶'
  if (detail.status === 'COMPLETED') return '感谢您的服务'
  return ''
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

const loadAssignedEntities = async (
  accessToken: string,
  driverId?: string | null,
  vehicleId?: string | null
) => {
  assignedDriver.value = null
  assignedVehicle.value = null

  if (driverId) {
    try {
      const driverRes = await uni.request({
        url: `${SUPABASE_URL}/rest/v1/drivers?id=eq.${driverId}&select=id,name,phone,user_id`,
        method: 'GET',
        header: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`
        }
      })
      const d = (driverRes.data as any[])?.[0]
      if (d) {
        assignedDriver.value = {
          id: d.id,
          name: d.name || '司机',
          phone: d.phone || '',
          userId: d.user_id || null
        }
      }
    } catch (e) {
      console.error('加载指派司机失败', e instanceof Error ? e.message : 'unknown error')
    }
  }

  if (vehicleId) {
    try {
      const vehicleRes = await uni.request({
        url: `${SUPABASE_URL}/rest/v1/vehicles?id=eq.${vehicleId}&select=id,plate_number,model`,
        method: 'GET',
        header: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`
        }
      })
      const v = (vehicleRes.data as any[])?.[0]
      if (v) {
        assignedVehicle.value = {
          id: v.id,
          plateNumber: v.plate_number || '',
          model: v.model || ''
        }
      }
    } catch (e) {
      console.error('加载指派车辆失败', e instanceof Error ? e.message : 'unknown error')
    }
  }
}

const loadOrderDetail = async (id: string) => {
  const accessToken = uni.getStorageSync('accessToken')
  if (!accessToken) return

  try {
    uni.showLoading({ title: '加载中...' })

    const demandRes = await uni.request({
      url: `${SUPABASE_URL}/rest/v1/demands?id=eq.${id}&select=*`,
      method: 'GET',
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (demandRes.statusCode === 200 && (demandRes.data as any[])?.length) {
      const demand = (demandRes.data as any[])[0]

      const bidRes = await uni.request({
        url: `${SUPABASE_URL}/rest/v1/bids?demand_id=eq.${id}&status=eq.ACCEPTED&select=*`,
        method: 'GET',
        header: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`
        }
      })

      const bid = (bidRes.data as any[])?.[0]
      if (bid) bidId.value = bid.id

      orderDetail.value = {
        id: demand.id,
        status: demand.status,
        fulfillmentStatus: demand.fulfillment_status || null,
        acceptedProviderId: demand.accepted_provider_id || null,
        assignedDriverId: demand.assigned_driver_id || null,
        assignedVehicleId: demand.assigned_vehicle_id || null,
        startAddress: demand.start_address,
        endAddress: demand.end_address,
        earliestDeparture: demand.earliest_departure,
        latestDeparture: demand.latest_departure,
        passengerCount: demand.passenger_count || 1,
        requirements: demand.requirements,
        price: bid?.price || 0,
        carModel: bid?.car_model || '',
        message: bid?.message || ''
      }

      await loadAssignedEntities(
        accessToken,
        demand.assigned_driver_id,
        demand.assigned_vehicle_id
      )

      // load submitted fees if any
      submittedFee.value = null
      try {
        const feeRes = await uni.request({
          url: `${SUPABASE_URL}/rest/v1/order_fees?demand_id=eq.${id}&select=*&limit=1`,
          method: 'GET',
          header: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`
          }
        })
        const feeRow = (feeRes.data as any[])?.[0]
        if (feeRow) {
          submittedFee.value = {
            id: feeRow.id,
            demandId: feeRow.demand_id,
            baseFare: Number(feeRow.base_fare) || 0,
            waitingFee: Number(feeRow.waiting_fee) || 0,
            tollFee: Number(feeRow.toll_fee) || 0,
            parkingFee: Number(feeRow.parking_fee) || 0,
            otherFee: Number(feeRow.other_fee) || 0,
            totalAmount: Number(feeRow.total_amount) || 0,
            currency: feeRow.currency || 'CNY',
            submittedBy: feeRow.submitted_by,
            submittedAt: feeRow.submitted_at,
            confirmedAt: feeRow.confirmed_at,
            notes: feeRow.notes
          }
        }
      } catch (e) {
        console.error('加载费用失败', e instanceof Error ? e.message : 'unknown error')
      }
    }
  } catch (error) {
    console.error('加载订单详情失败', error instanceof Error ? error.message : 'unknown error')
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

const onPrimaryAction = async () => {
  if (!primaryAction.value || !demandId.value || advancing.value) return

  // 禁止跳过费用流程直接完成
  if (
    primaryAction.value.to === FULFILLMENT_STATUS.COMPLETED ||
    primaryAction.value.to === FULFILLMENT_STATUS.PENDING_FEE_CONFIRM ||
    primaryAction.value.code === 'SUBMIT_FEES' ||
    primaryAction.value.code === 'CONFIRM_FEES'
  ) {
    uni.showToast({ title: '请先完成费用确认', icon: 'none' })
    return
  }

  const confirmRes = await uni.showModal({
    title: primaryAction.value.label,
    content: `确认执行「${primaryAction.value.label}」？`,
    confirmColor: '#000'
  })
  if (!confirmRes.confirm) return

  advancing.value = true
  try {
    uni.showLoading({ title: '处理中...' })
    await advanceFulfillment(demandId.value, primaryAction.value.to)
    uni.showToast({ title: '已更新', icon: 'success' })
    await loadOrderDetail(demandId.value)
  } catch (error: any) {
    console.error('推进履约失败', error instanceof Error ? error.message : 'unknown error')
    uni.showToast({ title: error?.message || '操作失败', icon: 'none' })
  } finally {
    advancing.value = false
    uni.hideLoading()
  }
}

const parseFeeInput = (value: string, fallback = 0): number => {
  if (value === '' || value === null || value === undefined) return fallback
  const n = Number(value)
  if (!Number.isFinite(n)) {
    throw new Error('费用金额格式无效')
  }
  if (n < 0) {
    throw new Error('费用金额不能为负数')
  }
  return Math.round(n * 100) / 100
}

const openFeeModal = () => {
  if (!canSubmitFees.value) {
    uni.showToast({ title: '当前状态不可提交费用', icon: 'none' })
    return
  }
  const defaultBase = orderDetail.value?.price ?? 0
  feeForm.value = {
    baseFare: String(defaultBase || 0),
    tollFee: '0',
    parkingFee: '0',
    otherFee: '0',
    notes: ''
  }
  feeModalVisible.value = true
}

const closeFeeModal = () => {
  if (submittingFees.value) return
  feeModalVisible.value = false
}

const doSubmitFees = async (payload: {
  baseFare: number
  tollFee: number
  parkingFee: number
  otherFee: number
  notes?: string
}) => {
  if (!demandId.value || submittingFees.value) return
  submittingFees.value = true
  try {
    uni.showLoading({ title: '提交中...' })
    await submitOrderFees(demandId.value, payload)
    uni.showToast({ title: '费用已提交', icon: 'success' })
    feeModalVisible.value = false
    await loadOrderDetail(demandId.value)
  } catch (error: any) {
    console.error('提交费用失败', error instanceof Error ? error.message : 'unknown error')
    uni.showToast({ title: error?.message || '提交失败', icon: 'none' })
  } finally {
    submittingFees.value = false
    uni.hideLoading()
  }
}

const submitFeesNoExtra = async () => {
  try {
    const base = parseFeeInput(feeForm.value.baseFare, orderDetail.value?.price || 0)
    await doSubmitFees({
      baseFare: base,
      tollFee: 0,
      parkingFee: 0,
      otherFee: 0,
      notes: feeForm.value.notes?.trim() || undefined
    })
  } catch (error: any) {
    uni.showToast({ title: error?.message || '费用金额无效', icon: 'none' })
  }
}

const submitFeesWithForm = async () => {
  try {
    const base = parseFeeInput(feeForm.value.baseFare, orderDetail.value?.price || 0)
    await doSubmitFees({
      baseFare: base,
      tollFee: parseFeeInput(feeForm.value.tollFee, 0),
      parkingFee: parseFeeInput(feeForm.value.parkingFee, 0),
      otherFee: parseFeeInput(feeForm.value.otherFee, 0),
      notes: feeForm.value.notes?.trim() || undefined
    })
  } catch (error: any) {
    uni.showToast({ title: error?.message || '费用金额无效', icon: 'none' })
  }
}

const showCancelModal = () => {
  if (!canCancelOrder.value) {
    uni.showToast({ title: '当前状态不可取消', icon: 'none' })
    return
  }
  selectedReason.value = ''
  cancelModalVisible.value = true
}

const confirmCancel = async () => {
  if (!selectedReason.value || !demandId.value) return

  cancelling.value = true
  try {
    await merchantCancelOrder(demandId.value, selectedReason.value)
    uni.showToast({ title: '订单已取消', icon: 'success' })
    cancelModalVisible.value = false
    await loadOrderDetail(demandId.value)
  } catch (error: any) {
    console.error('取消订单失败', error instanceof Error ? error.message : 'unknown error')
    uni.showToast({ title: error?.message || '取消失败', icon: 'none' })
  } finally {
    cancelling.value = false
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
  padding-bottom: 220rpx;
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

/* 乘客卡片 */
.passenger-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
}

.passenger-info {
  display: flex;
  align-items: center;
}

.passenger-avatar {
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

.passenger-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #000;
  display: block;
}

.passenger-count {
  font-size: 26rpx;
  color: #666;
}

.passenger-remark {
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1px solid #f0f0f0;
}

.remark-label {
  font-size: 26rpx;
  color: #999;
}

.remark-text {
  font-size: 26rpx;
  color: #666;
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
  padding-top: 20rpx;
  border-top: 1px solid #f0f0f0;
  font-size: 26rpx;
  color: #666;
}

/* 报价 / 司机卡片 */
.price-card,
.driver-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
}

.driver-card.pending {
  border: 2rpx dashed #e0e0e0;
}

.card-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #000;
  display: block;
  margin-bottom: 20rpx;
}

.price-row {
  display: flex;
  justify-content: space-between;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 16rpx;
}

.price-row:last-child {
  margin-bottom: 0;
}

.price-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #000;
}

.price-remark {
  font-size: 26rpx;
  color: #999;
  max-width: 400rpx;
  text-align: right;
}

.driver-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20rpx;
}

.driver-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #000;
  display: block;
}

.driver-phone {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-top: 6rpx;
}

.driver-vehicle {
  text-align: right;
  font-size: 26rpx;
  color: #666;
}

.driver-vehicle .plate {
  display: block;
  margin-top: 6rpx;
  color: #000;
  font-weight: 500;
}

.pending-tip {
  font-size: 28rpx;
  color: #666;
}

/* 操作按钮 */
.action-area {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 30rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
}

.action-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.action-btn {
  width: 100%;
  height: 88rpx;
  border-radius: 44rpx;
  font-size: 32rpx;
  font-weight: bold;
  border: none;
}

.action-btn.primary {
  background: #000;
  color: #fff;
}

.action-btn.flex-1 {
  flex: 1;
  width: auto;
}

.action-btn.cancel {
  background: #fff;
  color: #ef4444;
  border: 2rpx solid #ef4444;
  flex: 0 0 auto;
  width: 200rpx;
}

.action-btn.disabled,
.action-btn[disabled] {
  background: #ccc !important;
  color: #fff !important;
}

.fee-hint {
  display: block;
  text-align: center;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #999;
}

.completed-tip {
  text-align: center;
  padding: 30rpx;
  font-size: 32rpx;
  color: #666;
}

.cancelled-tip {
  text-align: center;
  padding: 30rpx;
  font-size: 32rpx;
  color: #999;
}

.read-only-tip {
  text-align: center;
  padding: 24rpx;
  font-size: 28rpx;
  color: #999;
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
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.assign-popup .modal-body {
  overflow-y: auto;
  max-height: 56vh;
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

.section-label {
  font-size: 26rpx;
  color: #999;
  display: block;
  margin: 16rpx 0 12rpx;
}

.empty-fleet {
  font-size: 26rpx;
  color: #999;
  padding: 16rpx 0 24rpx;
}

.empty-fleet.subtle {
  padding-bottom: 12rpx;
}

.select-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.select-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
}

.select-item.active {
  background: #000;
}

.select-item.active .select-title,
.select-item.active .select-sub,
.select-item.active .select-check {
  color: #fff;
}

.select-title {
  font-size: 28rpx;
  color: #000;
  display: block;
}

.select-sub {
  font-size: 24rpx;
  color: #666;
  display: block;
  margin-top: 6rpx;
}

.select-check {
  font-size: 28rpx;
  color: #000;
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

.modal-btn.secondary {
  background: #fff;
  color: #000;
  border: 2rpx solid #000;
}

.modal-btn.confirm {
  background: #ef4444;
  color: #fff;
}

.modal-btn.confirm-black {
  background: #000;
  color: #fff;
}

.modal-btn.cancel[disabled],
.modal-btn.secondary[disabled],
.modal-btn.confirm[disabled],
.modal-btn.confirm-black[disabled] {
  background: #ccc;
  color: #fff;
  border-color: #ccc;
}

.modal-btn::after {
  border: none;
}

/* 费用卡片 */
.fee-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
}

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

.fee-note {
  display: block;
  margin-top: 16rpx;
  font-size: 24rpx;
  color: #999;
}

.fee-status {
  display: block;
  margin-top: 16rpx;
  font-size: 26rpx;
  color: #3b82f6;
}

.fee-status.done {
  color: #666;
}

.waiting-fee-tip {
  text-align: center;
  padding: 24rpx;
  font-size: 28rpx;
  color: #666;
}

.fee-popup .modal-body {
  overflow-y: auto;
  max-height: 56vh;
}

.fee-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
  gap: 20rpx;
}

.fee-label {
  font-size: 28rpx;
  color: #333;
  width: 160rpx;
  flex-shrink: 0;
}

.fee-input {
  flex: 1;
  height: 72rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  color: #000;
  text-align: right;
}

.fee-total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12rpx;
  padding-top: 20rpx;
  border-top: 1px solid #f0f0f0;
  font-size: 30rpx;
  font-weight: 600;
  color: #000;
}

.fee-total-value {
  font-size: 36rpx;
}

.fee-footer {
  flex-wrap: wrap;
}
</style>
