import { computed, reactive } from 'vue'
import { DEMAND_TYPES, type DemandType, type PassengerDemandPayload } from '@/types/demand'

interface DepartureWindow {
  earliest: string
  latest: string
}

export interface DemandFormState {
  type: DemandType
  startAddress: string
  endAddress: string
  passengerCount: number
  requirements: string
  departureWindow: DepartureWindow
}

const createInitialState = (): DemandFormState => ({
  type: DEMAND_TYPES[0],
  startAddress: '',
  endAddress: '',
  passengerCount: 0,
  requirements: '',
  departureWindow: {
    earliest: '',
    latest: ''
  }
})

const normalizeString = (value: unknown) => {
  if (typeof value !== 'string') return ''
  return value.trim()
}

export const useDemandForm = () => {
  const formState = reactive<DemandFormState>(createInitialState())

  const setStartAddress = (value: string) => {
    formState.startAddress = normalizeString(value)
  }

  const setEndAddress = (value: string) => {
    formState.endAddress = normalizeString(value)
  }

  const setPassengerCount = (value: number) => {
    formState.passengerCount = Number.isFinite(value) && value > 0 ? Math.floor(value) : 1
  }

  const setRequirements = (value: string) => {
    formState.requirements = normalizeString(value)
  }

  const setDepartureWindow = (window: DepartureWindow) => {
    formState.departureWindow.earliest = normalizeString(window.earliest)
    formState.departureWindow.latest = normalizeString(window.latest)
  }

  const setType = (value: DemandType) => {
    if (DEMAND_TYPES.includes(value)) {
      formState.type = value
    }
  }

  const hasValidAddresses = computed(() => {
    return Boolean(formState.startAddress && formState.endAddress)
  })

  const hasValidPassengerCount = computed(() => formState.passengerCount > 0)

  const hasValidWindow = computed(() => {
    const { earliest, latest } = formState.departureWindow
    return Boolean(earliest && latest && earliest < latest)
  })

  const isValidDemand = () => {
    return hasValidAddresses.value && hasValidPassengerCount.value && hasValidWindow.value
  }

  const toPayload = (): PassengerDemandPayload => {
    if (!isValidDemand()) {
      throw new Error('需求信息不完整或排序错误')
    }

    return {
      type: formState.type,
      startAddress: formState.startAddress,
      endAddress: formState.endAddress,
      earliestDepartureAt: formState.departureWindow.earliest,
      latestDepartureAt: formState.departureWindow.latest,
      passengerCount: formState.passengerCount,
      requirements: formState.requirements
    }
  }

  const resetForm = () => {
    const next = createInitialState()
    Object.assign(formState, next)
  }

  return {
    formState,
    setType,
    setStartAddress,
    setEndAddress,
    setPassengerCount,
    setRequirements,
    setDepartureWindow,
    toPayload,
    isValidDemand,
    resetForm,
    hasValidWindow
  }
}
