import { describe, expect, it } from 'vitest'
import {
  FULFILLMENT_STATUS,
  canCancelFulfillment,
  canTransition,
  defaultFulfillmentForDemandStatus,
  getDemandStatusForFulfillment,
  getNextFulfillmentStatuses,
  getPrimaryNextAction,
  nextActions
} from '../utils/fulfillmentStateMachine'

describe('fulfillmentStateMachine mapping', () => {
  it('maps fine status to coarse demand status per Approach B', () => {
    expect(getDemandStatusForFulfillment('PENDING_ASSIGN')).toBe('ACCEPTED')
    expect(getDemandStatusForFulfillment('ASSIGNED')).toBe('ACCEPTED')
    expect(getDemandStatusForFulfillment('ON_THE_WAY')).toBe('IN_PROGRESS')
    expect(getDemandStatusForFulfillment('ARRIVED_PICKUP')).toBe('IN_PROGRESS')
    expect(getDemandStatusForFulfillment('WAITING_PASSENGER')).toBe('IN_PROGRESS')
    expect(getDemandStatusForFulfillment('PASSENGER_BOARDED')).toBe('IN_PROGRESS')
    expect(getDemandStatusForFulfillment('ARRIVING_DESTINATION')).toBe('IN_PROGRESS')
    expect(getDemandStatusForFulfillment('ARRIVED_DESTINATION')).toBe('IN_PROGRESS')
    expect(getDemandStatusForFulfillment('PENDING_FEE_CONFIRM')).toBe('IN_PROGRESS')
    expect(getDemandStatusForFulfillment('COMPLETED')).toBe('COMPLETED')
    expect(getDemandStatusForFulfillment('CANCELLED')).toBe('CANCELLED')
    expect(getDemandStatusForFulfillment(null)).toBeNull()
  })

  it('backfills default fulfillment from historical coarse status', () => {
    expect(defaultFulfillmentForDemandStatus('ACCEPTED')).toBe('PENDING_ASSIGN')
    expect(defaultFulfillmentForDemandStatus('IN_PROGRESS')).toBe('PASSENGER_BOARDED')
    expect(defaultFulfillmentForDemandStatus('COMPLETED')).toBe('COMPLETED')
    expect(defaultFulfillmentForDemandStatus('CANCELLED')).toBe('CANCELLED')
    expect(defaultFulfillmentForDemandStatus('BIDDING')).toBeNull()
    expect(defaultFulfillmentForDemandStatus('PENDING')).toBeNull()
  })
})

describe('fulfillmentStateMachine transitions', () => {
  it('allows the main happy path one step at a time', () => {
    const path = [
      'PENDING_ASSIGN',
      'ASSIGNED',
      'ON_THE_WAY',
      'ARRIVED_PICKUP',
      'PASSENGER_BOARDED',
      'ARRIVED_DESTINATION',
      'PENDING_FEE_CONFIRM',
      'COMPLETED'
    ] as const

    for (let i = 0; i < path.length - 1; i += 1) {
      expect(canTransition(path[i], path[i + 1])).toBe(true)
    }
  })

  it('allows optional WAITING_PASSENGER branch', () => {
    expect(canTransition('ARRIVED_PICKUP', 'WAITING_PASSENGER')).toBe(true)
    expect(canTransition('WAITING_PASSENGER', 'PASSENGER_BOARDED')).toBe(true)
  })

  it('allows optional ARRIVING_DESTINATION branch', () => {
    expect(canTransition('PASSENGER_BOARDED', 'ARRIVING_DESTINATION')).toBe(true)
    expect(canTransition('ARRIVING_DESTINATION', 'ARRIVED_DESTINATION')).toBe(true)
    // Still rejects multi-step skip from optional node
    expect(canTransition('ARRIVING_DESTINATION', 'PENDING_FEE_CONFIRM')).toBe(false)
  })

  it('rejects illegal skips and reverse transitions', () => {
    expect(canTransition('PENDING_ASSIGN', 'ON_THE_WAY')).toBe(false)
    expect(canTransition('ASSIGNED', 'PASSENGER_BOARDED')).toBe(false)
    expect(canTransition('ON_THE_WAY', 'ASSIGNED')).toBe(false)
    expect(canTransition('ARRIVED_DESTINATION', 'PENDING_ASSIGN')).toBe(false)
    expect(canTransition('COMPLETED', 'PENDING_FEE_CONFIRM')).toBe(false)
    expect(canTransition('PENDING_ASSIGN', 'PENDING_ASSIGN')).toBe(false)
    expect(canTransition('PENDING_ASSIGN', 'COMPLETED')).toBe(false)
    expect(canTransition('ABNORMAL_PROCESSING', 'COMPLETED')).toBe(false)
  })

  it('allows cancel only before fee confirmation', () => {
    expect(canCancelFulfillment('PENDING_ASSIGN')).toBe(true)
    expect(canCancelFulfillment('ASSIGNED')).toBe(true)
    expect(canCancelFulfillment('ON_THE_WAY')).toBe(true)
    expect(canCancelFulfillment('ARRIVED_DESTINATION')).toBe(true)
    expect(canCancelFulfillment('PENDING_FEE_CONFIRM')).toBe(false)
    expect(canCancelFulfillment('COMPLETED')).toBe(false)
    expect(canCancelFulfillment('CANCELLED')).toBe(false)

    expect(canTransition('ON_THE_WAY', 'CANCELLED')).toBe(true)
    expect(canTransition('PENDING_FEE_CONFIRM', 'CANCELLED')).toBe(false)
    expect(canTransition('COMPLETED', 'CANCELLED')).toBe(false)
  })

  it('returns next statuses and primary action for merchant CTA', () => {
    expect(getNextFulfillmentStatuses('PENDING_ASSIGN')).toEqual(['ASSIGNED'])
    expect(getNextFulfillmentStatuses('COMPLETED')).toEqual([])

    const assignAction = getPrimaryNextAction('PENDING_ASSIGN')
    expect(assignAction?.to).toBe('ASSIGNED')
    expect(assignAction?.code).toBe('ASSIGN_DRIVER')
    expect(assignAction?.primary).toBe(true)

    const afterPickup = nextActions('ARRIVED_PICKUP')
    expect(afterPickup.map((a) => a.to)).toContain('PASSENGER_BOARDED')
    expect(afterPickup.map((a) => a.to)).toContain('WAITING_PASSENGER')
    expect(getPrimaryNextAction('ARRIVED_PICKUP')?.to).toBe('PASSENGER_BOARDED')

    expect(getPrimaryNextAction('ASSIGNED')?.label).toBe('去接驾')
    expect(getPrimaryNextAction(FULFILLMENT_STATUS.PENDING_FEE_CONFIRM)?.code).toBe(
      'CONFIRM_FEES'
    )
  })
})
