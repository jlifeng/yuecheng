import { BadRequestException, ValidationPipe } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import { MerchantApplyDto } from '../src/modules/merchant/dto/merchant-apply.dto'
import { MerchantReviewDto } from '../src/modules/merchant/dto/merchant-review.dto'
import { MerchantController } from '../src/modules/merchant/merchant.controller'
import { MerchantService } from '../src/modules/merchant/merchant.service'

describe('MerchantController validation boundary', () => {
  it('should reject invalid review actions before the controller method runs', async () => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true })
    const controller = new MerchantController(new MerchantService())

    await expect(
      pipe.transform(
        {
          merchant: {
            merchantName: '测试商家',
          },
          action: 'INVALID',
        },
        {
          type: 'body',
          metatype: MerchantReviewDto,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException)

    expect(controller).toBeInstanceOf(MerchantController)
  })

  it('should reject apply requests with missing required fields', async () => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true })

    await expect(
      pipe.transform(
        {
          merchantName: '测试商家',
          contactName: '张三',
          contactPhone: '13800000000',
        },
        {
          type: 'body',
          metatype: MerchantApplyDto,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('should strip extra fields before the controller handles apply input', async () => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true })
    const controller = new MerchantController(new MerchantService())

    const dto = await pipe.transform(
      {
        merchantName: '测试商家',
        contactName: '张三',
        contactPhone: '13800000000',
        businessLicense: 'BUSINESS_LICENSE_001',
        fleetQualification: 'FLEET_QUALIFICATION_001',
        status: 'APPROVED',
      },
      {
        type: 'body',
        metatype: MerchantApplyDto,
      },
    )

    expect(controller.apply(dto as MerchantApplyDto)).toEqual(
      expect.objectContaining({
        status: 'PENDING',
        merchantName: '测试商家',
      }),
    )
    expect((dto as Record<string, unknown>).status).toBeUndefined()
  })
})
