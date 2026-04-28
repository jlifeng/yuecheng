export type MerchantReviewStatus = 'pending' | 'approved' | 'rejected'

export type ProviderRole = 'OWNER' | 'DISPATCHER' | 'DRIVER'

export type ProviderMenuKey =
  | 'WORKBENCH'
  | 'ORDERS'
  | 'FLEET'
  | 'PROFILE'
  | 'TASKS'
  | 'CURRENT_ORDER'

export interface ProviderSession {
  reviewStatus: MerchantReviewStatus
  role: ProviderRole
  companyName: string
  displayName: string
}

export interface ProviderTabItem {
  icon: string
  text: string
  path: string
}

export const canQuoteDemand = (status: MerchantReviewStatus) => status === 'approved'

export const visibleMenusForRole = (role: ProviderRole): ProviderMenuKey[] => {
  if (role === 'DRIVER') {
    return ['TASKS', 'CURRENT_ORDER', 'PROFILE']
  }

  return ['WORKBENCH', 'ORDERS', 'FLEET', 'PROFILE']
}

export const canManageFleet = (role: ProviderRole) => role !== 'DRIVER'

export const providerTabItemsForRole = (role: ProviderRole): ProviderTabItem[] => {
  if (role === 'DRIVER') {
    return [
      { icon: 'home', text: '任务', path: '/pages/provider/workbench' },
      { icon: 'person', text: '我的', path: '/pages/mine/mine' }
    ]
  }

  return [
    { icon: 'home', text: '工作台', path: '/pages/provider/workbench' },
    { icon: 'person', text: '我的', path: '/pages/mine/mine' }
  ]
}
