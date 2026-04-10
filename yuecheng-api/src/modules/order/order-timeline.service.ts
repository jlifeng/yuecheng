import { BadRequestException, Injectable } from '@nestjs/common'
import { OrderStatus } from './domain/order-status'

type TimelineEventType = OrderStatus | 'WAITING_STARTED' | 'WAITING_ENDED'

export interface TimelineEvent {
  orderId: string
  type: TimelineEventType
  timestamp: string
  actor?: string
  location?: string
  note?: string
}

export interface TimelineEventInput extends Omit<TimelineEvent, 'orderId'> {}

export interface FeeDetailInput {
  baseFare: number
  waitingFee: number
  tollFee?: number
  parkingFee?: number
  otherFee?: number
}

export interface FeeSummary extends FeeDetailInput {
  totalAmount: number
}

export interface OrderTimelineSummary {
  events: TimelineEvent[]
  currentStatus?: OrderStatus
  totalWaitingSeconds: number
  feeSummary?: FeeSummary
}

@Injectable()
export class OrderTimelineService {
  private readonly events = new Map<string, TimelineEvent[]>()
  private readonly waitingTotals = new Map<string, number>()
  private readonly feeSummaries = new Map<string, FeeSummary>()
  private readonly currentStatus = new Map<string, OrderStatus>()

  recordEvent(orderId: string, input: TimelineEventInput) {
    const parsedTimestamp = new Date(input.timestamp)
    if (Number.isNaN(parsedTimestamp.getTime())) {
      throw new BadRequestException('INVALID_TIMESTAMP')
    }
    const event: TimelineEvent = { orderId, ...input, timestamp: parsedTimestamp.toISOString() }
    const bucket = this.events.get(orderId) ?? []
    bucket.push(event)
    bucket.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    this.events.set(orderId, bucket)

    this.recalculateWaiting(orderId, bucket)
  }

  recordFeeDetail(orderId: string, input: FeeDetailInput) {
    const feeValues = {
      baseFare: input.baseFare,
      waitingFee: input.waitingFee,
      tollFee: input.tollFee ?? 0,
      parkingFee: input.parkingFee ?? 0,
      otherFee: input.otherFee ?? 0,
    }

    Object.entries(feeValues).forEach(([key, value]) => this.validateFeeValue(value, key))

    const totalAmount = this.sumToCents(Object.values(feeValues))
    const summary: FeeSummary = { ...feeValues, totalAmount }
    this.feeSummaries.set(orderId, summary)
  }

  getSummary(orderId: string): OrderTimelineSummary {
    const eventsCopy = (this.events.get(orderId) ?? []).map((event) => ({ ...event }))
    const feeSummary = this.feeSummaries.get(orderId)
    return {
      events: eventsCopy,
      currentStatus: this.currentStatus.get(orderId),
      totalWaitingSeconds: this.waitingTotals.get(orderId) ?? 0,
      feeSummary: feeSummary ? { ...feeSummary } : undefined,
    }
  }

  private recalculateWaiting(orderId: string, events: TimelineEvent[]) {
    let activeStart: Date | null = null
    let totalSeconds = 0
    let lastStatus: OrderStatus | undefined

    for (const event of events) {
      if (event.type === 'WAITING_STARTED') {
        activeStart = new Date(event.timestamp)
      } else if (event.type === 'WAITING_ENDED' && activeStart) {
        const durationSeconds = Math.max(0, Math.round((new Date(event.timestamp).getTime() - activeStart.getTime()) / 1000))
        totalSeconds += durationSeconds
        activeStart = null
      }

      if (this.isOrderStatusEvent(event.type)) {
        lastStatus = event.type as OrderStatus
      }
    }

    this.waitingTotals.set(orderId, totalSeconds)
    if (lastStatus) {
      this.currentStatus.set(orderId, lastStatus)
    } else {
      this.currentStatus.delete(orderId)
    }
  }

  private isOrderStatusEvent(value: TimelineEventType): value is OrderStatus {
    return Object.values(OrderStatus).includes(value as OrderStatus)
  }

  calculateWaitingMinutes(waitingStart: string | Date, waitingEnd: string | Date): number {
    const start = new Date(waitingStart)
    const end = new Date(waitingEnd)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new Error('INVALID_DATE')
    }
    const diffMs = end.getTime() - start.getTime()
    return Math.max(0, Math.round(diffMs / 60000))
  }

  calculateFinalAmount(
    basePrice: number,
    waitingFee: number,
    tollFee: number,
    parkingFee: number,
    extraFee: number,
  ): number {
    const components = {
      basePrice,
      waitingFee,
      tollFee,
      parkingFee,
      extraFee,
    }
    Object.entries(components).forEach(([key, value]) => this.validateFeeValue(value, key))
    return this.sumToCents(Object.values(components))
  }

  private sumToCents(values: number[]): number {
    const cents = values
      .map((value) => this.toCents(value))
      .reduce((sum, value) => sum + value, 0n)
    return Number(cents) / 100
  }

  private validateFeeValue(value: number, label: string) {
    if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
      throw new BadRequestException(`${label} must be a valid number`)
    }
    if (value < 0) {
      throw new BadRequestException(`${label} must be non-negative`)
    }
  }

  private toCents(value: number): bigint {
    const normalized = this.normalizeDecimalString(value)
    const [integerPart, fractionalPart = ''] = normalized.split('.')
    const integerDigits = integerPart || '0'
    const paddedFraction = (fractionalPart + '000').slice(0, 3)
    const wholeCents = BigInt(integerDigits) * 100n + BigInt(paddedFraction.slice(0, 2))
    const thirdDigit = paddedFraction[2]
    if (thirdDigit >= '5') {
      return wholeCents + 1n
    }
    return wholeCents
  }

  private normalizeDecimalString(value: number): string {
    const str = value.toString()
    if (!/[eE]/.test(str)) {
      return str
    }
    return this.expandExponential(str)
  }

  private expandExponential(valueStr: string): string {
    const [rawMantissa, rawExponent] = valueStr.split(/e/i)
    const exponent = Number(rawExponent)
    if (Number.isNaN(exponent)) {
      return rawMantissa
    }
    let mantissa = rawMantissa
    let sign = ''
    if (mantissa.startsWith('-')) {
      sign = '-'
      mantissa = mantissa.slice(1)
    }
    const [integerPart, fractionalPart = ''] = mantissa.split('.')
    const digits = `${integerPart}${fractionalPart}`
    const pointIndex = integerPart.length + exponent
    if (pointIndex <= 0) {
      return `${sign}0.${'0'.repeat(-pointIndex)}${digits}`
    }
    if (pointIndex >= digits.length) {
      return `${sign}${digits}${'0'.repeat(pointIndex - digits.length)}`
    }
    const integerSection = digits.slice(0, pointIndex)
    const fractionalSection = digits.slice(pointIndex)
    return `${sign}${integerSection}.${fractionalSection}`
  }
}
