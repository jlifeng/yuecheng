import { BadRequestException } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import { OrderStatus } from '../src/modules/order/domain/order-status'
import { OrderService } from '../src/modules/order/order.service'

describe('OrderService', () => {
  it('should create order and close other bids when one bid is selected', () => {
    const service = new OrderService()

    const result = service.selectBid(
      'demand-1',
      [
        { bidId: 'bid-1', merchantId: 'merchant-1', price: 880 },
        { bidId: 'bid-2', merchantId: 'merchant-2', price: 960 },
      ],
      'bid-1',
    )

    expect(result.orderStatus).toBe(OrderStatus.PENDING_ASSIGN)
    expect(result.closedBidIds).toEqual(['bid-2'])
    expect(result.order).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        demandId: 'demand-1',
        bidId: 'bid-1',
        merchantId: 'merchant-1',
        price: 880,
        status: OrderStatus.PENDING_ASSIGN,
      }),
    )
    expect(service.listOrders()).toHaveLength(1)
  })

  it('should reject selecting a bid that does not exist in the candidate list', () => {
    const service = new OrderService()

    expect(() =>
      service.selectBid(
        'demand-1',
        [{ bidId: 'bid-1', merchantId: 'merchant-1', price: 880 }],
        'missing-bid',
      ),
    ).toThrow(BadRequestException)
  })

  it('should return copies instead of internal order references', () => {
    const service = new OrderService()
    const createdOrder = service.createOrderFromSelectedBid({
      demandId: 'demand-1',
      bidId: 'bid-1',
      merchantId: 'merchant-1',
      price: 880,
    })

    const fetchedOrder = service.getOrder(createdOrder.id)
    expect(fetchedOrder).toEqual(createdOrder)

    if (fetchedOrder === undefined) {
      throw new Error('Expected order to exist')
    }

    fetchedOrder.status = OrderStatus.CANCELLED
    expect(service.getOrder(createdOrder.id)?.status).toBe(OrderStatus.PENDING_ASSIGN)
  })
})
