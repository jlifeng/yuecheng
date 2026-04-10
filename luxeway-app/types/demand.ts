export const DEMAND_TYPES = ['TRANSFER', 'CHARTER_DAY', 'MULTI_DAY'] as const

export type DemandType = (typeof DEMAND_TYPES)[number]

export interface PassengerDemandPayload {
  type: DemandType
  startAddress: string
  endAddress: string
  earliestDepartureAt: string
  latestDepartureAt: string
  passengerCount: number
  requirements: string
}
