export type MerchantReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type MerchantReviewDecision = Extract<MerchantReviewStatus, 'APPROVED' | 'REJECTED'>

export interface MerchantReviewRecord {
  id: string
  companyName: string
  contactName: string
  city: string
  fleetSize: number
  submittedAt: string
  status: MerchantReviewStatus
}

export type IncidentStatus = 'OPEN' | 'PROCESSING' | 'RESOLVED'

export interface IncidentRecord {
  id: string
  orderId: string
  level: 'HIGH' | 'MEDIUM' | 'LOW'
  summary: string
  source: string
  reportedAt: string
  status: IncidentStatus
}

export type DictionaryType = 'CAR_MODEL' | 'SERVICE_TAG' | 'INCIDENT_TYPE'

export interface DictionaryItem {
  id: string
  type: DictionaryType
  label: string
}

const DEFAULT_MERCHANT_REVIEWS: MerchantReviewRecord[] = [
  {
    id: 'm-1',
    companyName: '武汉悦程商务接待',
    contactName: '刘峰',
    city: '武汉',
    fleetSize: 12,
    submittedAt: '2026-04-08 10:20',
    status: 'PENDING'
  },
  {
    id: 'm-2',
    companyName: '沪上礼宾车队',
    contactName: '周宁',
    city: '上海',
    fleetSize: 20,
    submittedAt: '2026-04-07 14:10',
    status: 'APPROVED'
  },
  {
    id: 'm-3',
    companyName: '鹏城会务出行',
    contactName: '陈璐',
    city: '深圳',
    fleetSize: 8,
    submittedAt: '2026-04-07 09:30',
    status: 'REJECTED'
  }
]

const DEFAULT_INCIDENTS: IncidentRecord[] = [
  {
    id: 'i-1',
    orderId: 'o-1001',
    level: 'HIGH',
    summary: '乘客投诉司机迟到',
    source: '乘客投诉',
    reportedAt: '2026-04-08 16:20',
    status: 'OPEN'
  },
  {
    id: 'i-2',
    orderId: 'o-1002',
    level: 'MEDIUM',
    summary: '司机反馈超区等待费争议',
    source: '司机申诉',
    reportedAt: '2026-04-08 13:10',
    status: 'PROCESSING'
  },
  {
    id: 'i-3',
    orderId: 'o-1003',
    level: 'LOW',
    summary: '订单备注缺失儿童座椅要求',
    source: '客服巡检',
    reportedAt: '2026-04-07 18:00',
    status: 'RESOLVED'
  }
]

const DEFAULT_DICTIONARY_ITEMS: DictionaryItem[] = [
  { id: 'd-1', type: 'CAR_MODEL', label: '别克 GL8' },
  { id: 'd-2', type: 'CAR_MODEL', label: '奔驰 V 级' },
  { id: 'd-3', type: 'SERVICE_TAG', label: '机场接送' },
  { id: 'd-4', type: 'INCIDENT_TYPE', label: '迟到投诉' }
]

let merchantReviews = DEFAULT_MERCHANT_REVIEWS.map((item) => ({ ...item }))
let incidents = DEFAULT_INCIDENTS.map((item) => ({ ...item }))
let dictionaryItems = DEFAULT_DICTIONARY_ITEMS.map((item) => ({ ...item }))

export const resetAdminMockData = () => {
  merchantReviews = DEFAULT_MERCHANT_REVIEWS.map((item) => ({ ...item }))
  incidents = DEFAULT_INCIDENTS.map((item) => ({ ...item }))
  dictionaryItems = DEFAULT_DICTIONARY_ITEMS.map((item) => ({ ...item }))
}

export const fetchMerchantReviewList = async () => {
  return merchantReviews
    .map((item) => ({ ...item }))
    .sort((left, right) => {
      if (left.status === right.status) return left.submittedAt < right.submittedAt ? 1 : -1
      if (left.status === 'PENDING') return -1
      if (right.status === 'PENDING') return 1
      return left.status.localeCompare(right.status)
    })
}

export const reviewMerchant = async (merchantId: string, decision: MerchantReviewDecision) => {
  const target = merchantReviews.find((item) => item.id === merchantId)
  if (!target) {
    throw new Error('商家记录不存在')
  }

  target.status = decision
  return { ...target }
}

export const fetchIncidentList = async () => {
  return incidents
    .map((item) => ({ ...item }))
    .sort((left, right) => {
      if (left.status === right.status) return left.reportedAt < right.reportedAt ? 1 : -1
      if (left.status === 'OPEN') return -1
      if (right.status === 'OPEN') return 1
      if (left.status === 'PROCESSING' && right.status === 'RESOLVED') return -1
      if (left.status === 'RESOLVED' && right.status === 'PROCESSING') return 1
      return 0
    })
}

export const resolveIncident = async (incidentId: string) => {
  const target = incidents.find((item) => item.id === incidentId)
  if (!target) {
    throw new Error('异常事件不存在')
  }

  target.status = 'RESOLVED'
  return { ...target }
}

export const fetchDictionaryItems = async () => {
  return dictionaryItems
    .map((item) => ({ ...item }))
    .sort((left, right) => {
      if (left.type === right.type) return left.label.localeCompare(right.label)
      return left.type.localeCompare(right.type)
    })
}

export const addDictionaryItem = async (payload: { type: DictionaryType; label: string }) => {
  const next: DictionaryItem = {
    id: `d-${dictionaryItems.length + 1}`,
    type: payload.type,
    label: payload.label.trim()
  }
  dictionaryItems.push(next)
  return { ...next }
}
