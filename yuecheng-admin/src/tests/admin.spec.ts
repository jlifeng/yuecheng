import { beforeEach, describe, expect, it } from 'vitest'
import { fetchMerchantReviewList, reviewMerchant, resetAdminMockData } from '../services/admin'

describe('admin merchant review service', () => {
  beforeEach(() => {
    resetAdminMockData()
  })

  it('returns merchant review records with pending companies first', async () => {
    const list = await fetchMerchantReviewList()

    expect(list[0]?.status).toBe('PENDING')
    expect(list[0]?.companyName).toContain('悦程')
  })

  it('updates merchant status after review', async () => {
    const updated = await reviewMerchant('m-1', 'APPROVED')

    expect(updated.status).toBe('APPROVED')

    const list = await fetchMerchantReviewList()
    expect(list.find((item) => item.id === 'm-1')?.status).toBe('APPROVED')
  })
})
