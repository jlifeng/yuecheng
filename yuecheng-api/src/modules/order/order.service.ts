import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { OrderStatus } from './domain/order-status'

export interface OrderRecord {
  id: string
  demandId: string
  bidId: string
  merchantId: string
  price: number
  status: typeof OrderStatus[keyof typeof OrderStatus]
}

export interface BidCandidate {
  bidId: string
  merchantId: string
  price: number
}

export interface SelectBidResult {
  demandId: string
  selectedBidId: string
  orderStatus: OrderRecord['status']
  closedBidIds: string[]
  order: OrderRecord
}

@Injectable()
export class OrderService {
  private readonly orders = new Map<string, OrderRecord>()

  private sequence = 0

  createOrderFromSelectedBid(input: Omit<OrderRecord, 'id' | 'status'>): OrderRecord {
    const order: OrderRecord = {
      id: this.nextId(),
      ...input,
      status: OrderStatus.PENDING_ASSIGN,
    }

    this.orders.set(order.id, order)
    return this.cloneOrder(order)
  }

  selectBid(demandId: string, bids: BidCandidate[], selectedBidId: string): SelectBidResult {
    const selectedBid = bids.find((bid) => bid.bidId === selectedBidId)

    if (selectedBid === undefined) {
      throw new BadRequestException('SELECTED_BID_NOT_FOUND')
    }

    const order = this.createOrderFromSelectedBid({
      demandId,
      bidId: selectedBid.bidId,
      merchantId: selectedBid.merchantId,
      price: selectedBid.price,
    })

    return {
      demandId,
      selectedBidId,
      orderStatus: order.status,
      closedBidIds: bids.filter((bid) => bid.bidId !== selectedBidId).map((bid) => bid.bidId),
      order: this.cloneOrder(order),
    }
  }

  getOrder(id: string): OrderRecord | undefined {
    const order = this.orders.get(id)
    return order === undefined ? undefined : this.cloneOrder(order)
  }

  listOrders(): OrderRecord[] {
    return [...this.orders.values()].map((order) => this.cloneOrder(order))
  }

  private nextId(): string {
    this.sequence += 1
    return `order-${this.sequence}`
  }

  private cloneOrder(order: OrderRecord): OrderRecord {
    return { ...order }
  }
}
