import { describe, expect, it } from 'vitest'
import { canQuoteDemand, providerTabItemsForRole, visibleMenusForRole } from '../types/provider'

describe('provider access rules', () => {
  it('blocks quote action when merchant review is pending', () => {
    expect(canQuoteDemand('PENDING')).toBe(false)
  })

  it('exposes task-only menus for driver mode', () => {
    expect(visibleMenusForRole('DRIVER')).toEqual(['TASKS', 'CURRENT_ORDER', 'PROFILE'])
  })

  it('maps driver mode tab labels to task semantics', () => {
    expect(providerTabItemsForRole('DRIVER').map((item) => item.text)).toEqual(['任务', '我的'])
  })
})
