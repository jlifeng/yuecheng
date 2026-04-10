import { describe, expect, it } from 'vitest'
import { validateSync } from 'class-validator'
import { MerchantApplyDto } from '../src/modules/merchant/dto/merchant-apply.dto'

describe('MerchantApplyDto', () => {
  it('should report missing onboarding fields by property name', () => {
    const dto = Object.assign(new MerchantApplyDto(), {
      merchantName: '测试商家',
      contactName: '张三',
      contactPhone: '13800000000',
    })

    const errors = validateSync(dto)
    const errorProperties = errors.map((error) => error.property)

    expect(errorProperties).toContain('businessLicense')
    expect(errorProperties).toContain('fleetQualification')
  })

  it('should reject empty strings, non strings, invalid vehicleTypeIds, and non string array items', () => {
    const dto = Object.assign(new MerchantApplyDto(), {
      merchantName: '',
      contactName: 123,
      contactPhone: '13800000000',
      businessLicense: 'BUSINESS_LICENSE_001',
      fleetQualification: 'FLEET_QUALIFICATION_001',
      vehicleTypeIds: ['GL8', 123],
    })

    const errors = validateSync(dto)

    expect(errors.some((error) => error.property === 'merchantName')).toBe(true)
    expect(errors.some((error) => error.property === 'contactName')).toBe(true)
    expect(errors.some((error) => error.property === 'vehicleTypeIds')).toBe(true)
  })

  it('should reject non-array vehicleTypeIds values', () => {
    const dto = Object.assign(new MerchantApplyDto(), {
      merchantName: '测试商家',
      contactName: '张三',
      contactPhone: '13800000000',
      businessLicense: 'BUSINESS_LICENSE_001',
      fleetQualification: 'FLEET_QUALIFICATION_001',
      vehicleTypeIds: 'GL8',
    })

    const errors = validateSync(dto)

    expect(errors.some((error) => error.property === 'vehicleTypeIds')).toBe(true)
  })

  it('should reject empty vehicleTypeIds items', () => {
    const dto = Object.assign(new MerchantApplyDto(), {
      merchantName: '测试商家',
      contactName: '张三',
      contactPhone: '13800000000',
      businessLicense: 'BUSINESS_LICENSE_001',
      fleetQualification: 'FLEET_QUALIFICATION_001',
      vehicleTypeIds: [''],
    })

    const errors = validateSync(dto)

    expect(errors.some((error) => error.property === 'vehicleTypeIds')).toBe(true)
  })
})
