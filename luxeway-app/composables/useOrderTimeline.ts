import { computed, type Ref } from 'vue'
import {
  type PassengerOrderDetail,
  type PassengerOrderStatus,
  type PassengerFeeSummary
} from '@/types/order'
import {
  FULFILLMENT_STATUS_COPY,
  getFulfillmentStatusCopy
} from '@/utils/fulfillmentStatusCopy'

export { getFulfillmentStatusCopy } from '@/utils/fulfillmentStatusCopy'

/**
 * Resolve passenger-facing fine status for copy/timeline.
 * Prefer fulfillmentStatus; fall back when status itself is already fine-grained.
 */
export function resolvePassengerOrderStatus(
  detail: PassengerOrderDetail | null | undefined
): PassengerOrderStatus | undefined {
  if (!detail) return undefined
  if (detail.fulfillmentStatus) {
    return detail.fulfillmentStatus as PassengerOrderStatus
  }
  const coarseOrFine = detail.status as PassengerOrderStatus
  if (FULFILLMENT_STATUS_COPY[coarseOrFine]) {
    return coarseOrFine
  }
  return undefined
}

export const useOrderTimeline = (detailRef: Ref<PassengerOrderDetail | null>) => {
  const status = computed<PassengerOrderStatus | undefined>(() =>
    resolvePassengerOrderStatus(detailRef.value)
  )

  const statusText = computed(() => {
    if (!status.value) {
      return detailRef.value?.statusDesc || '订单确认中'
    }
    return (
      getFulfillmentStatusCopy(status.value)?.title ??
      detailRef.value?.statusDesc ??
      '订单确认中'
    )
  })

  const subText = computed(() => {
    if (!status.value) {
      return ''
    }
    return getFulfillmentStatusCopy(status.value)?.subText ?? ''
  })

  const timelineItems = computed(() => detailRef.value?.timeline ?? [])

  const feeSummary = computed<PassengerFeeSummary | null>(() => detailRef.value?.feeSummary ?? null)

  const shouldShowFeeSummary = computed(() => {
    if (!detailRef.value) return false
    const fine = status.value
    const coarse = detailRef.value.status
    const show =
      fine === 'PENDING_FEE_CONFIRM' ||
      fine === 'COMPLETED' ||
      coarse === 'PENDING_FEE_CONFIRM' ||
      coarse === 'COMPLETED'
    return show && Boolean(detailRef.value.feeSummary)
  })

  const showWaitingFeeNotice = computed(() => status.value === 'WAITING_PASSENGER')

  return {
    statusText,
    subText,
    timelineItems,
    feeSummary,
    shouldShowFeeSummary,
    showWaitingFeeNotice
  }
}
