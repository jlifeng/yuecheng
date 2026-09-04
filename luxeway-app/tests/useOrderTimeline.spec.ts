import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { useOrderTimeline } from '../composables/useOrderTimeline'
import type { PassengerOrderDetail } from '@/types/order'

const createDetail = (overrides: Partial<PassengerOrderDetail> = {}) => {
  return {
    id: 'mock-order',
    status: 'PENDING_ASSIGN',
    driverName: '李师傅',
    driverPhone: '13800138000',
    carModel: 'GL8',
    plateNumber: '京A·12345',
    timeline: [],
    hasInvoice: false,
    ...overrides
  } as PassengerOrderDetail
}

describe('useOrderTimeline', () => {
  it('provides status copy for the passenger view', () => {
    const detail = ref(createDetail({ status: 'PENDING_ASSIGN' }))
    const { statusText, subText } = useOrderTimeline(detail)

    expect(statusText.value).toBe('等待司机接单')
    expect(subText.value).toBe('商家确认中，正在指派执行司机')
  })

  it('prefers fulfillmentStatus over coarse status for copy', () => {
    const detail = ref(
      createDetail({
        status: 'IN_PROGRESS',
        fulfillmentStatus: 'ON_THE_WAY'
      })
    )
    const { statusText, subText } = useOrderTimeline(detail)

    expect(statusText.value).toBe('司机去接驾')
    expect(subText.value).toBe('司机已出发，正在前往上车点')
  })

  it('flags special waiting fee notice for WAITING_PASSENGER', () => {
    const detail = ref(createDetail({ status: 'WAITING_PASSENGER' }))
    const { showWaitingFeeNotice, shouldShowFeeSummary } = useOrderTimeline(detail)

    expect(showWaitingFeeNotice.value).toBe(true)
    expect(shouldShowFeeSummary.value).toBe(false)
  })

  it('exposes fee summary when status requires confirmation or completion', () => {
    const feeSummary = {
      baseFare: 100,
      waitingFee: 10,
      tollFee: 5,
      parkingFee: 2,
      otherFee: 3,
      totalAmount: 120
    }
    const detail = ref(
      createDetail({
        status: 'PENDING_FEE_CONFIRM',
        feeSummary,
        timeline: [
          { code: 'PENDING_ASSIGN', title: '等待', description: 'desc' },
          { code: 'PASSENGER_BOARDED', title: '上车', description: 'desc' }
        ]
      })
    )
    const { shouldShowFeeSummary, feeSummary: summary, timelineItems } = useOrderTimeline(detail)

    expect(shouldShowFeeSummary.value).toBe(true)
    expect(summary.value).toEqual(feeSummary)
    expect(timelineItems.value.length).toBe(2)
  })
})
