import { beforeEach, describe, expect, it } from 'vitest'
import { addDictionaryItem, fetchDictionaryItems, resetAdminMockData } from '../services/admin'

describe('admin dictionary service', () => {
  beforeEach(() => {
    resetAdminMockData()
  })

  it('returns grouped dictionary items', async () => {
    const list = await fetchDictionaryItems()

    expect(list[0]?.type).toBe('CAR_MODEL')
    expect(list[0]?.label).toContain('别克')
  })

  it('adds dictionary item into the same type list', async () => {
    const created = await addDictionaryItem({
      type: 'SERVICE_TAG',
      label: '儿童座椅'
    })

    expect(created.type).toBe('SERVICE_TAG')

    const list = await fetchDictionaryItems()
    expect(list.some((item) => item.type === 'SERVICE_TAG' && item.label === '儿童座椅')).toBe(true)
  })
})
