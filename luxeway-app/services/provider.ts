import { httpRequest } from './http'
import {
  canManageFleet,
  canQuoteDemand,
  visibleMenusForRole,
  type ProviderSession
} from '@/types/provider'
import { ProviderSessionManager } from '@/utils/dataManager'

export interface ProviderWorkbenchData {
  pendingDemandCount: number
  quotedCount: number
  activeOrderCount: number
  session: ProviderSession
  visibleMenus: string[]
  canQuote: boolean
  canManageFleet: boolean
}

export interface ProviderBidPayload {
  demandId: number
  vehicleId: number
  price: number
  remark: string
}

export function createProviderService(
  request: <T>(url: string, options?: { method?: 'GET' | 'POST'; body?: unknown; mockResponse?: T }) => Promise<T>
) {
  return {
    fetchWorkbench() {
      const session = ProviderSessionManager.getSession()
      return request<ProviderWorkbenchData>('/provider/workbench', {
        method: 'GET',
        mockResponse: {
          pendingDemandCount: 12,
          quotedCount: 4,
          activeOrderCount: 6,
          session,
          visibleMenus: visibleMenusForRole(session.role),
          canQuote: canQuoteDemand(session.reviewStatus) && session.role !== 'DRIVER',
          canManageFleet: canManageFleet(session.role)
        }
      })
    },
    submitBid(payload: ProviderBidPayload) {
      const session = ProviderSessionManager.getSession()
      if (session.role === 'DRIVER') {
        throw new Error('司机模式不能报价')
      }
      if (!canQuoteDemand(session.reviewStatus)) {
        throw new Error('商家审核通过后才能报价')
      }
      return request<{ bidId: string }>('/provider/bids', {
        method: 'POST',
        body: payload,
        mockResponse: {
          bidId: `bid-${payload.demandId}-${Date.now()}`
        }
      })
    }
  }
}

export const providerService = createProviderService((url, options) =>
  httpRequest(url, {
    method: options?.method,
    body: options?.body,
    mockResponse: options?.mockResponse
  })
)
