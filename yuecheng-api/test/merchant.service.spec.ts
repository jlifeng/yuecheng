import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import { MerchantReviewStatus } from '../src/modules/merchant/domain/merchant-review-status'
import { MerchantApplyDto } from '../src/modules/merchant/dto/merchant-apply.dto'
import { MerchantService } from '../src/modules/merchant/merchant.service'

describe('MerchantService', () => {
  it('should reject bidding for every non-approved merchant status', () => {
    const service = new MerchantService()

    expect(() => service.assertBidAllowed(MerchantReviewStatus.PENDING)).toThrow(ForbiddenException)
    expect(() => service.assertBidAllowed(MerchantReviewStatus.REJECTED)).toThrow(ForbiddenException)
  })

  it('should allow bidding when the merchant is approved', () => {
    const service = new MerchantService()

    expect(() => service.assertBidAllowed(MerchantReviewStatus.APPROVED)).not.toThrow()
  })

  it('should keep apply status pending even when input carries a status field', () => {
    const service = new MerchantService()
    const merchant = service.apply(
      Object.assign(new MerchantApplyDto(), {
        merchantName: '测试商家',
        contactName: '张三',
        contactPhone: '13800000000',
        businessLicense: 'BUSINESS_LICENSE_001',
        fleetQualification: 'FLEET_QUALIFICATION_001',
        status: MerchantReviewStatus.APPROVED,
      }),
    )

    expect(merchant.status).toBe(MerchantReviewStatus.PENDING)
  })

  it('should return an approved merchant after review approval', () => {
    const service = new MerchantService()
    const merchant = service.apply(
      Object.assign(new MerchantApplyDto(), {
        merchantName: '测试商家',
        contactName: '张三',
        contactPhone: '13800000000',
        businessLicense: 'BUSINESS_LICENSE_001',
        fleetQualification: 'FLEET_QUALIFICATION_001',
      }),
    )

    expect(service.review(merchant, 'APPROVE')).toEqual({
      ...merchant,
      status: MerchantReviewStatus.APPROVED,
    })
  })

  it('should return a rejected merchant after review rejection', () => {
    const service = new MerchantService()
    const merchant = service.apply(
      Object.assign(new MerchantApplyDto(), {
        merchantName: '测试商家',
        contactName: '张三',
        contactPhone: '13800000000',
        businessLicense: 'BUSINESS_LICENSE_001',
        fleetQualification: 'FLEET_QUALIFICATION_001',
      }),
    )

    expect(service.review(merchant, 'REJECT')).toEqual({
      ...merchant,
      status: MerchantReviewStatus.REJECTED,
    })
  })

  it('should reject invalid review actions', () => {
    const service = new MerchantService()
    const merchant = service.apply(
      Object.assign(new MerchantApplyDto(), {
        merchantName: '测试商家',
        contactName: '张三',
        contactPhone: '13800000000',
        businessLicense: 'BUSINESS_LICENSE_001',
        fleetQualification: 'FLEET_QUALIFICATION_001',
      }),
    )

    expect(() => service.review(merchant, 'INVALID' as 'APPROVE')).toThrow(BadRequestException)
  })
})
