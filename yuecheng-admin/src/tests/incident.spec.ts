import { beforeEach, describe, expect, it } from 'vitest'
import { fetchIncidentList, resolveIncident, resetAdminMockData } from '../services/admin'

describe('admin incident service', () => {
  beforeEach(() => {
    resetAdminMockData()
  })

  it('returns open incidents before resolved incidents', async () => {
    const list = await fetchIncidentList()

    expect(list[0]?.status).toBe('OPEN')
    expect(list[0]?.summary).toContain('投诉')
  })

  it('marks incident as resolved', async () => {
    const updated = await resolveIncident('i-1')

    expect(updated.status).toBe('RESOLVED')

    const list = await fetchIncidentList()
    expect(list.find((item) => item.id === 'i-1')?.status).toBe('RESOLVED')
  })
})
