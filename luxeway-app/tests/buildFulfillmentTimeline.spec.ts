import { describe, expect, it } from 'vitest'
import { buildFulfillmentTimeline } from '../services/passenger'
import type { OrderEvent } from '@/types/order'

describe('buildFulfillmentTimeline', () => {
  it('marks main-path nodes completed/active/pending from current fulfillment', () => {
    const timeline = buildFulfillmentTimeline('ARRIVED_PICKUP', [])
    const arrived = timeline.find((t) => t.code === 'ARRIVED_PICKUP')
    const boarded = timeline.find((t) => t.code === 'PASSENGER_BOARDED')
    const assigned = timeline.find((t) => t.code === 'ASSIGNED')

    expect(assigned?.status).toBe('completed')
    expect(arrived?.status).toBe('active')
    expect(boarded?.status).toBe('pending')
  })

  it('attaches event note/time when present', () => {
    const events: OrderEvent[] = [
      {
        id: 'e1',
        demandId: 'd1',
        eventType: 'ON_THE_WAY',
        note: '司机出发',
        createdAt: '2026-07-14T10:00:00.000Z'
      }
    ]
    const timeline = buildFulfillmentTimeline('ON_THE_WAY', events)
    const onTheWay = timeline.find((t) => t.code === 'ON_THE_WAY')
    expect(onTheWay?.time).toBe('2026-07-14T10:00:00.000Z')
    expect(onTheWay?.desc).toBe('司机出发')
    expect(onTheWay?.status).toBe('active')
  })

  it('appends cancel node when cancelled', () => {
    const events: OrderEvent[] = [
      {
        id: 'e1',
        demandId: 'd1',
        eventType: 'ASSIGNED',
        createdAt: '2026-07-14T09:00:00.000Z'
      },
      {
        id: 'e2',
        demandId: 'd1',
        eventType: 'CANCELLED',
        note: '乘客取消',
        createdAt: '2026-07-14T09:30:00.000Z'
      }
    ]
    const timeline = buildFulfillmentTimeline('CANCELLED', events)
    const cancel = timeline[timeline.length - 1]
    expect(cancel.code).toBe('CANCELLED')
    expect(cancel.status).toBe('active')
    expect(cancel.desc).toBe('乘客取消')
  })

  it('maps optional WAITING_PASSENGER onto main-path progress', () => {
    const timeline = buildFulfillmentTimeline('WAITING_PASSENGER', [])
    const arrived = timeline.find((t) => t.code === 'ARRIVED_PICKUP')
    const boarded = timeline.find((t) => t.code === 'PASSENGER_BOARDED')
    const assigned = timeline.find((t) => t.code === 'ASSIGNED')

    expect(assigned?.status).toBe('completed')
    expect(arrived?.status).toBe('active')
    expect(boarded?.status).toBe('pending')
  })
})
