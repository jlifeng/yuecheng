import { BadRequestException, NotFoundException, ValidationPipe } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import { DemandStatus } from '../src/modules/demand/domain/demand-status'
import { DemandType } from '../src/modules/demand/domain/demand-type'
import { CreateBidDto } from '../src/modules/bid/dto/create-bid.dto'
import { BidController } from '../src/modules/bid/bid.controller'
import { DemandService } from '../src/modules/demand/demand.service'
import { BidService } from '../src/modules/bid/bid.service'
import { OrderStatus } from '../src/modules/order/domain/order-status'
import { OrderService } from '../src/modules/order/order.service'

describe('BidService', () => {
  it('should select one bid, close others, and create an order', () => {
    const demandService = new DemandService()
    const orderService = new OrderService()
    const bidService = new BidService(demandService, orderService)
    const demand = demandService.createDemand({
      type: DemandType.TRANSFER,
    })

    const bid1 = bidService.createBid({
      demandId: demand.id,
      merchantId: 'merchant-1',
      price: 880,
    })
    const bid2 = bidService.createBid({
      demandId: demand.id,
      merchantId: 'merchant-2',
      price: 960,
    })

    const result = bidService.selectBid(demand.id, bid1.id)

    expect(result.order.status).toBe(OrderStatus.PENDING_ASSIGN)
    expect(result.closedBidIds).toEqual([bid2.id])
    expect(bidService.getBid(bid1.id)?.status).toBe('SELECTED')
    expect(bidService.getBid(bid2.id)?.status).toBe('CLOSED')
    expect(demandService.getDemand(demand.id)?.status).toBe(DemandStatus.ORDER_CREATED)
    expect(orderService.listOrders()).toHaveLength(1)
  })

  it('should reject new bids after the demand has become order-created', () => {
    const demandService = new DemandService()
    const orderService = new OrderService()
    const bidService = new BidService(demandService, orderService)
    const demand = demandService.createDemand({
      type: DemandType.TRANSFER,
    })

    demandService.markOrderCreated(demand.id)

    expect(() =>
      bidService.createBid({
        demandId: demand.id,
        merchantId: 'merchant-1',
        price: 880,
      }),
    ).toThrow(BadRequestException)
  })

  it('should reject selecting a bid again after the demand has already generated an order', () => {
    const demandService = new DemandService()
    const orderService = new OrderService()
    const bidService = new BidService(demandService, orderService)
    const demand = demandService.createDemand({
      type: DemandType.TRANSFER,
    })

    const bid = bidService.createBid({
      demandId: demand.id,
      merchantId: 'merchant-1',
      price: 880,
    })

    bidService.selectBid(demand.id, bid.id)

    expect(() => bidService.selectBid(demand.id, bid.id)).toThrow(BadRequestException)
  })

  it('should reject missing demand and bid references', () => {
    const demandService = new DemandService()
    const orderService = new OrderService()
    const bidService = new BidService(demandService, orderService)

    expect(() =>
      bidService.createBid({
        demandId: 'missing-demand',
        merchantId: 'merchant-1',
        price: 880,
      }),
    ).toThrow(NotFoundException)

    const demand = demandService.createDemand({
      type: DemandType.TRANSFER,
    })

    expect(() => bidService.selectBid(demand.id, 'missing-bid')).toThrow(BadRequestException)
  })
})

describe('BidController validation boundary', () => {
  it('should reject invalid bid payloads before the controller method runs', async () => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true })
    const controller = new BidController(new BidService(new DemandService(), new OrderService()))

    await expect(
      pipe.transform(
        {
          demandId: 'demand-1',
          merchantId: '',
          price: 'abc',
        },
        {
          type: 'body',
          metatype: CreateBidDto,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException)

    expect(controller).toBeInstanceOf(BidController)
  })
})
