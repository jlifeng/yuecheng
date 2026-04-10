import { Body, Controller, Get, Param, Post, ValidationPipe } from '@nestjs/common'
import { IsEnum, IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'
import { Transform } from 'class-transformer'
import { FeeDetailInput, OrderTimelineService } from './order-timeline.service'
import { OrderStatus } from './domain/order-status'

const validationPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
})

const timelineTypes = [...Object.values(OrderStatus), 'WAITING_STARTED', 'WAITING_ENDED'] as const

export type TimelineEventType = (typeof timelineTypes)[number]

export class TimelineEventDto {
  @IsEnum(timelineTypes, { message: 'type must be a valid timeline event' })
  type!: TimelineEventType

  @IsISO8601()
  timestamp!: string

  @IsOptional()
  @IsString()
  actor?: string

  @IsOptional()
  @IsString()
  location?: string

  @IsOptional()
  @IsString()
  note?: string
}

export class FeeDetailDto {
  @TransformNumeric()
  @IsNumber()
  baseFare!: number

  @TransformNumeric()
  @IsNumber()
  waitingFee!: number

  @TransformNumeric()
  @IsNumber()
  tollFee!: number

  @TransformNumeric()
  @IsNumber()
  parkingFee!: number

  @TransformNumeric()
  @IsNumber()
  otherFee!: number
}

function TransformNumeric() {
  return Transform(({ value }) => {
    if (typeof value === 'number') {
      return value
    }

    if (typeof value !== 'string') {
      return value
    }

    const trimmed = value.trim()
    if (trimmed === '') {
      return value
    }
    if (!/^[+-]?\d+(\.\d+)?$/.test(trimmed)) {
      return value
    }
    const parsed = Number(trimmed)
    if (!Number.isFinite(parsed)) {
      return value
    }
    return parsed
  })
}

@Controller('order-timeline')
export class OrderTimelineController {
  constructor(private readonly timeline: OrderTimelineService) {}

  @Post(':orderId/events')
  addEvent(@Param('orderId') orderId: string, @Body(validationPipe) body: TimelineEventDto) {
    this.timeline.recordEvent(orderId, body)
    return this.timeline.getSummary(orderId)
  }

  @Post(':orderId/fees')
  addFees(@Param('orderId') orderId: string, @Body(validationPipe) payload: FeeDetailDto) {
    this.timeline.recordFeeDetail(orderId, {
      baseFare: payload.baseFare,
      waitingFee: payload.waitingFee,
      tollFee: payload.tollFee,
      parkingFee: payload.parkingFee,
      otherFee: payload.otherFee,
    })
    return this.timeline.getSummary(orderId)
  }

  @Get(':orderId')
  getSummary(@Param('orderId') orderId: string) {
    return this.timeline.getSummary(orderId)
  }
}
