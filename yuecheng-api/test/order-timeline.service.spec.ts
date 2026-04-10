import { BadRequestException, ValidationPipe } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import { IncidentReportDto } from '../src/modules/incident/incident.controller'
import { InvoiceUploadDto } from '../src/modules/invoice/invoice.controller'
import { OrderTimelineService } from '../src/modules/order/order-timeline.service'
import { FeeDetailDto, TimelineEventDto } from '../src/modules/order/order-timeline.controller'
import { OrderStatus } from '../src/modules/order/domain/order-status'

const validationPipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })

describe('OrderTimelineService', () => {
  it('calculateWaitingMinutes returns the rounded minute delta', () => {
    const service = new OrderTimelineService()
    const minutes = service.calculateWaitingMinutes('2026-04-09T10:00:00Z', '2026-04-09T10:18:00Z')
    expect(minutes).toBe(18)
  })

  it('calculateFinalAmount sums all provided components', () => {
    const service = new OrderTimelineService()
    const total = service.calculateFinalAmount(150, 12, 5, 3, 20)
    expect(total).toBe(190)
  })

  it('rejects invalid timestamps', () => {
    const service = new OrderTimelineService()
    expect(() =>
      service.recordEvent('order-1', {
        type: 'WAITING_STARTED',
        timestamp: 'not-a-timestamp',
      } as any),
    ).toThrow(BadRequestException)
  })

  it('rejects invalid fee values', () => {
    const service = new OrderTimelineService()
    expect(() =>
      service.recordFeeDetail('order-1', {
        baseFare: 100,
        waitingFee: 20,
        tollFee: Number('x'),
        parkingFee: 2,
        otherFee: 5,
      }),
    ).toThrow(BadRequestException)
  })

  it('handles unordered waiting events', () => {
    const service = new OrderTimelineService()
    service.recordEvent('order-1', { type: 'WAITING_ENDED', timestamp: '2026-04-09T11:05:30Z' })
    service.recordEvent('order-1', { type: 'WAITING_STARTED', timestamp: '2026-04-09T11:00:00Z' })
    expect(service.getSummary('order-1').totalWaitingSeconds).toBe(5 * 60 + 30)
  })

  it('orders currentStatus by timestamp, not insertion order', () => {
    const service = new OrderTimelineService()
    service.recordEvent('order-1', { type: OrderStatus.COMPLETED, timestamp: '2026-04-09T11:10:00Z' })
    service.recordEvent('order-1', { type: OrderStatus.PASSENGER_BOARDED, timestamp: '2026-04-09T11:05:00Z' })
    expect(service.getSummary('order-1').currentStatus).toBe(OrderStatus.COMPLETED)
  })

  it('rejects non-finite fee values', () => {
    const service = new OrderTimelineService()
    expect(() =>
      service.recordFeeDetail('order-1', {
        baseFare: Infinity,
        waitingFee: 10,
        tollFee: 5,
        parkingFee: 2,
        otherFee: 3,
      }),
    ).toThrow(BadRequestException)
  })

  it('rejects -Infinity fee values', () => {
    const service = new OrderTimelineService()
    expect(() =>
      service.recordFeeDetail('order-1', {
        baseFare: -Infinity,
        waitingFee: 5,
        tollFee: 2,
        parkingFee: 1,
        otherFee: 0,
      }),
    ).toThrow(BadRequestException)
  })

  it('locks decimal precision for fee totals', () => {
    const service = new OrderTimelineService()
    service.recordFeeDetail('order-1', {
      baseFare: 0.1,
      waitingFee: 0.2,
      tollFee: 0.3,
      parkingFee: 0,
      otherFee: 0,
    })
    expect(service.getSummary('order-1').feeSummary?.totalAmount).toBe(0.6)
  })

  it('calculateFinalAmount matches precision strategy', () => {
    const service = new OrderTimelineService()
    expect(service.calculateFinalAmount(0.1, 0.2, 0.3, 0, 0)).toBe(0.6)
  })

  it('handles 1.005 rounding in fee summary', () => {
    const service = new OrderTimelineService()
    service.recordFeeDetail('order-1', {
      baseFare: 1.005,
      waitingFee: 0,
      tollFee: 0,
      parkingFee: 0,
      otherFee: 0,
    })
    expect(service.getSummary('order-1').feeSummary?.totalAmount).toBe(1.01)
  })

  it('handles 2.675 rounding in calculateFinalAmount', () => {
    const service = new OrderTimelineService()
    expect(service.calculateFinalAmount(2.675, 0, 0, 0, 0)).toBe(2.68)
  })

  it('rounds 10.075 correctly in calculateFinalAmount', () => {
    const service = new OrderTimelineService()
    expect(service.calculateFinalAmount(10.075, 0, 0, 0, 0)).toBe(10.08)
  })

  it('rejects negative fee components in calculateFinalAmount', () => {
    const service = new OrderTimelineService()
    expect(() => service.calculateFinalAmount(-1, 0, 0, 0, 0)).toThrow(BadRequestException)
  })

  it('rejects negative fee components in recordFeeDetail', () => {
    const service = new OrderTimelineService()
    expect(() =>
      service.recordFeeDetail('order-1', { baseFare: 100, waitingFee: -1, tollFee: 0, parkingFee: 0, otherFee: 0 }),
    ).toThrow(BadRequestException)
  })

  it('returns copies to prevent external mutation', () => {
    const service = new OrderTimelineService()
    service.recordEvent('order-1', { type: 'WAITING_STARTED', timestamp: '2026-04-09T11:00:00Z' })
    const summary = service.getSummary('order-1')
    summary.events.push({ orderId: 'order-1', type: 'WAITING_ENDED', timestamp: '2026-04-09T11:05:00Z' })
    summary.feeSummary = { baseFare: 0, waitingFee: 0, tollFee: 0, parkingFee: 0, otherFee: 0, totalAmount: 0 }
    expect(service.getSummary('order-1').events).toHaveLength(1)
    expect(service.getSummary('order-1').feeSummary).toBeUndefined()
  })

  it('mutating summary events does not change internal state', () => {
    const service = new OrderTimelineService()
    service.recordEvent('order-1', { type: 'WAITING_STARTED', timestamp: '2026-04-09T11:00:00Z' })
    const summary = service.getSummary('order-1')
    summary.events[0].type = 'WAITING_ENDED'
    expect(service.getSummary('order-1').events[0].type).toBe('WAITING_STARTED')
  })

  it('still accumulates waiting seconds via timeline events', () => {
    const service = new OrderTimelineService()
    service.recordEvent('order-1', { type: 'WAITING_STARTED', timestamp: '2026-04-09T11:00:00Z' })
    service.recordEvent('order-1', { type: 'WAITING_ENDED', timestamp: '2026-04-09T11:05:30Z' })
    expect(service.getSummary('order-1').totalWaitingSeconds).toBe(5 * 60 + 30)
  })

  it('stores fee detail and exposes totalAmount through summary', () => {
    const service = new OrderTimelineService()
    service.recordFeeDetail('order-1', { baseFare: 100, waitingFee: 20, tollFee: 8, parkingFee: 2, otherFee: 0 })
    expect(service.getSummary('order-1').feeSummary?.totalAmount).toBe(130)
  })

  it('validates timeline controller event DTO', async () => {
    await expect(
      validationPipe.transform(
        { type: 'WAITING_STARTED', timestamp: 'not-date' },
        { type: 'body', metatype: TimelineEventDto },
      ),
    ).rejects.toThrow(BadRequestException)
  })

  it('validates timeline controller fee DTO', async () => {
    await expect(
      validationPipe.transform(
        { baseFare: 'abc', waitingFee: 10, tollFee: 5, parkingFee: 2, otherFee: 1 },
        { type: 'body', metatype: FeeDetailDto },
      ),
    ).rejects.toThrow(BadRequestException)
  })

  it('rejects empty string fee inputs', async () => {
    await expect(
      validationPipe.transform(
        { baseFare: '', waitingFee: 0, tollFee: 0, parkingFee: 0, otherFee: 0 },
        { type: 'body', metatype: FeeDetailDto },
      ),
    ).rejects.toThrow(BadRequestException)
  })

  it('rejects null fee inputs', async () => {
    await expect(
      validationPipe.transform(
        { baseFare: null, waitingFee: 0, tollFee: 0, parkingFee: 0, otherFee: 0 },
        { type: 'body', metatype: FeeDetailDto },
      ),
    ).rejects.toThrow(BadRequestException)
  })

  it('rejects whitespace fee inputs', async () => {
    await expect(
      validationPipe.transform(
        { baseFare: '   ', waitingFee: 0, tollFee: 0, parkingFee: 0, otherFee: 0 },
        { type: 'body', metatype: FeeDetailDto },
      ),
    ).rejects.toThrow(BadRequestException)
  })

  it('rejects boolean fee inputs', async () => {
    await expect(
      validationPipe.transform(
        { baseFare: true, waitingFee: 0, tollFee: 0, parkingFee: 0, otherFee: 0 },
        { type: 'body', metatype: FeeDetailDto },
      ),
    ).rejects.toThrow(BadRequestException)
  })

  it('rejects false fee inputs', async () => {
    await expect(
      validationPipe.transform(
        { baseFare: false, waitingFee: 0, tollFee: 0, parkingFee: 0, otherFee: 0 },
        { type: 'body', metatype: FeeDetailDto },
      ),
    ).rejects.toThrow(BadRequestException)
  })

  it('validates invoice upload DTO', async () => {
    await expect(
      validationPipe.transform(
        { orderId: '', invoiceType: '', fileUrl: 'not-url', issuedAt: 'bad-date' },
        { type: 'body', metatype: InvoiceUploadDto },
      ),
    ).rejects.toThrow(BadRequestException)
  })

  it('validates incident report DTO', async () => {
    await expect(
      validationPipe.transform(
        { relatedOrderId: '', sourceRole: 'UNKNOWN', type: '', description: '' },
        { type: 'body', metatype: IncidentReportDto },
      ),
    ).rejects.toThrow(BadRequestException)
  })
})
