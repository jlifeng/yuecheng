export const MerchantReviewStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const

export type MerchantReviewStatus =
  (typeof MerchantReviewStatus)[keyof typeof MerchantReviewStatus]
