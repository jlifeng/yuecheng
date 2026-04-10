import { describe, expect, it } from 'vitest'
import { OrderStatus } from '../src/modules/order/domain/order-status'

describe('OrderStatus', () => {
  it('should expose the complete unique status set', () => {
    const values = Object.values(OrderStatus)
    const expectedValues = [
      'PENDING_ASSIGN',
      'ASSIGNED',
      'ON_THE_WAY',
      'ARRIVED_PICKUP',
      'WAITING_PASSENGER',
      'PASSENGER_BOARDED',
      'ARRIVING_DESTINATION',
      'ARRIVED_DESTINATION',
      'PENDING_FEE_CONFIRM',
      'COMPLETED',
      'CANCELLED',
      'ABNORMAL_PROCESSING',
    ]

    expect(values).toEqual(expectedValues)
    expect(new Set(values).size).toBe(expectedValues.length)
  })
})
