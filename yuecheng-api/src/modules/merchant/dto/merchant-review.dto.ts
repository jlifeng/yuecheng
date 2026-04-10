import { IsIn, IsObject } from 'class-validator'

export const MerchantReviewAction = {
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
} as const

export type MerchantReviewAction =
  (typeof MerchantReviewAction)[keyof typeof MerchantReviewAction]

export class MerchantReviewDto {
  @IsObject()
  merchant!: Record<string, unknown>

  @IsIn(Object.values(MerchantReviewAction))
  action!: MerchantReviewAction
}
