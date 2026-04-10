import { ref } from 'vue'
import { type PassengerOrderDetail } from '@/types/order'

const detailRef = ref<PassengerOrderDetail | null>(null)

export const useOrderStore = () => {
  const setOrderDetail = (payload: PassengerOrderDetail) => {
    detailRef.value = payload
  }

  const resetOrderDetail = () => {
    detailRef.value = null
  }

  return {
    detail: detailRef,
    setOrderDetail,
    resetOrderDetail
  }
}
