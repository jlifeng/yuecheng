import { computed, type Ref } from 'vue'
import {
  type PassengerOrderDetail,
  type PassengerOrderStatus,
  type PassengerFeeSummary
} from '@/types/order'

type StatusCopy = {
  title: string
  subText: string
}

const STATUS_COPY: Record<PassengerOrderStatus, StatusCopy> = {
  PENDING_ASSIGN: {
    title: '等待司机接单',
    subText: '系统正在寻找空闲司机，请稍候'
  },
  ASSIGNED: {
    title: '司机已接单',
    subText: '司机正在赶往接客点'
  },
  ON_THE_WAY: {
    title: '司机接近中',
    subText: '司机已出发，即将到达'
  },
  ARRIVED_PICKUP: {
    title: '司机已到达',
    subText: '请尽快上车，司机会在30分钟内等待'
  },
  WAITING_PASSENGER: {
    title: '司机等待中',
    subText: '等待费用会在等待超过免费时长后生效'
  },
  PASSENGER_BOARDED: {
    title: '乘客已上车',
    subText: '行程即将开始'
  },
  ARRIVING_DESTINATION: {
    title: '即将到达',
    subText: '请确认随身物品'
  },
  ARRIVED_DESTINATION: {
    title: '已到达目的地',
    subText: '祝您旅途愉快'
  },
  PENDING_FEE_CONFIRM: {
    title: '待确认费用',
    subText: '请确认费用并完成支付'
  },
  COMPLETED: {
    title: '已完成',
    subText: '感谢您使用尊享出行'
  },
  CANCELLED: {
    title: '已取消',
    subText: '如有疑问请联系客服'
  },
  ABNORMAL_PROCESSING: {
    title: '异常处理中',
    subText: '客服正在协助处理，请耐心等待'
  }
}

export const useOrderTimeline = (detailRef: Ref<PassengerOrderDetail | null>) => {
  const status = computed<PassengerOrderStatus | undefined>(() => detailRef.value?.status)

  const statusText = computed(() => {
    if (!status.value) {
      return '订单确认中'
    }
    return STATUS_COPY[status.value]?.title ?? '订单确认中'
  })

  const subText = computed(() => {
    if (!status.value) {
      return ''
    }
    return STATUS_COPY[status.value]?.subText ?? ''
  })

  const timelineItems = computed(() => detailRef.value?.timeline ?? [])

  const feeSummary = computed<PassengerFeeSummary | null>(() => detailRef.value?.feeSummary ?? null)

  const shouldShowFeeSummary = computed(() => {
    if (!detailRef.value) return false
    return (
      (detailRef.value.status === 'PENDING_FEE_CONFIRM' || detailRef.value.status === 'COMPLETED') &&
      Boolean(detailRef.value.feeSummary)
    )
  })

  const showWaitingFeeNotice = computed(() => detailRef.value?.status === 'WAITING_PASSENGER')

  return {
    statusText,
    subText,
    timelineItems,
    feeSummary,
    shouldShowFeeSummary,
    showWaitingFeeNotice
  }
}
