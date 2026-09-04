import { create } from 'zustand'
import { getPendingMerchantsCount } from '@/lib/api'

interface PendingState {
  merchantCount: number
  setMerchantCount: (count: number) => void
  refreshMerchantCount: () => Promise<void>
}

export const usePendingStore = create<PendingState>()((set) => ({
  merchantCount: 0,
  setMerchantCount: (count) => set({ merchantCount: count }),
  refreshMerchantCount: async () => {
    try {
      const count = await getPendingMerchantsCount()
      set({ merchantCount: count })
    } catch {
      set({ merchantCount: 0 })
    }
  },
}))