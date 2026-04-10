import { describe, expect, it } from 'vitest'
import { adminRoutes } from '../router'

describe('adminRoutes', () => {
  it('should expose review regulation and config pages', () => {
    expect(adminRoutes.map((route) => route.name)).toEqual([
      'merchant-review',
      'incident-regulation',
      'dictionary-config'
    ])
  })
})
