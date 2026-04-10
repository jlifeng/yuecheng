export const DemandType = {
  TRANSFER: 'TRANSFER',
  CHARTER_DAY: 'CHARTER_DAY',
  MULTI_DAY: 'MULTI_DAY',
} as const

export type DemandType = (typeof DemandType)[keyof typeof DemandType]
