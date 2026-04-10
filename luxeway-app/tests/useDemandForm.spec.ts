import { describe, expect, it } from 'vitest'
import { useDemandForm } from '../composables/useDemandForm'

describe('useDemandForm', () => {
  it('builds normalized payload and exposes validity helpers', () => {
    const {
      setStartAddress,
      setEndAddress,
      setPassengerCount,
      setRequirements,
      setDepartureWindow,
      toPayload,
      isValidDemand,
      formState
    } = useDemandForm()

    expect(isValidDemand()).toBe(false)

    setStartAddress('起点')
    setEndAddress('终点')
    setPassengerCount(3)
    setRequirements('有大件行李')
    setDepartureWindow({
      earliest: '2026-05-01T08:00:00',
      latest: '2026-05-01T12:00:00'
    })

    expect(formState.passengerCount).toBe(3)
    expect(formState.departureWindow.latest).toBe('2026-05-01T12:00:00')
    expect(isValidDemand()).toBe(true)

    expect(toPayload()).toEqual({
      type: 'TRANSFER',
      startAddress: '起点',
      endAddress: '终点',
      passengerCount: 3,
      requirements: '有大件行李',
      earliestDepartureAt: '2026-05-01T08:00:00',
      latestDepartureAt: '2026-05-01T12:00:00'
    })
  })

  it('throws when departure window is invalid', () => {
    const { setStartAddress, setEndAddress, setDepartureWindow, toPayload } = useDemandForm()
    setStartAddress('A')
    setEndAddress('B')
    setDepartureWindow({ earliest: '2026-05-01T12:00:00', latest: '2026-05-01T08:00:00' })

    expect(() => toPayload()).toThrow(/不完整|排序/)
  })
})
