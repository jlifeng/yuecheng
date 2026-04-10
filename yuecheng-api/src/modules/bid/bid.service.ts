import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { DemandStatus } from '../demand/domain/demand-status'
import { DemandService } from '../demand/demand.service'
import { OrderService, SelectBidResult } from '../order/order.service'

export type BidStatus = 'OPEN' | 'SELECTED' | 'CLOSED'

export interface BidRecord {
  id: string
  demandId: string
  merchantId: string
  price: number
  status: BidStatus
}

export interface CreateBidInput {
  demandId: string
  merchantId: string
  price: number
}

@Injectable()
export class BidService {
  private readonly bids = new Map<string, BidRecord>()

  private sequence = 0

  constructor(
    private readonly demandService: DemandService = new DemandService(),
    private readonly orderService: OrderService = new OrderService(),
  ) {}

  createBid(input: CreateBidInput): BidRecord {
    const demand = this.demandService.getDemand(input.demandId)

    if (demand === undefined) {
      throw new NotFoundException('DEMAND_NOT_FOUND')
    }

    if (demand.status === DemandStatus.CLOSED) {
      throw new BadRequestException('DEMAND_CLOSED')
    }

    if (demand.status === DemandStatus.ORDER_CREATED) {
      throw new BadRequestException('DEMAND_ORDER_CREATED')
    }

    const bid: BidRecord = {
      id: this.nextId(),
      ...input,
      status: 'OPEN',
    }

    this.bids.set(bid.id, bid)
    return this.cloneBid(bid)
  }

  getBid(id: string): BidRecord | undefined {
    const bid = this.bids.get(id)
    return bid === undefined ? undefined : this.cloneBid(bid)
  }

  listBidsByDemand(demandId: string): BidRecord[] {
    return [...this.bids.values()]
      .filter((bid) => bid.demandId === demandId)
      .map((bid) => this.cloneBid(bid))
  }

  selectBid(demandId: string, selectedBidId: string): SelectBidResult & {
    selectedBid: BidRecord
    closedBids: BidRecord[]
  } {
    const demand = this.demandService.getDemand(demandId)

    if (demand === undefined) {
      throw new NotFoundException('DEMAND_NOT_FOUND')
    }

    if (demand.status === DemandStatus.CLOSED) {
      throw new BadRequestException('DEMAND_CLOSED')
    }

    if (demand.status === DemandStatus.ORDER_CREATED) {
      throw new BadRequestException('DEMAND_ORDER_CREATED')
    }

    const bids = this.listBidsByDemand(demandId)
    const selection = this.orderService.selectBid(
      demandId,
      bids.map((bid) => ({
        bidId: bid.id,
        merchantId: bid.merchantId,
        price: bid.price,
      })),
      selectedBidId,
    )

    const selectedBid = this.assertBidExists(selectedBidId)
    this.bids.set(selectedBid.id, {
      ...selectedBid,
      status: 'SELECTED',
    })

    const closedBids = selection.closedBidIds.map((bidId) => {
      const bid = this.assertBidExists(bidId)
      const closedBid: BidRecord = {
        ...bid,
        status: 'CLOSED',
      }

      this.bids.set(bidId, closedBid)
      return closedBid
    })

    this.demandService.markOrderCreated(demandId)

    return {
      ...selection,
      selectedBid: this.cloneBid(this.assertBidExists(selectedBidId)),
      closedBids: closedBids.map((bid) => this.cloneBid(bid)),
    }
  }

  private assertBidExists(id: string): BidRecord {
    const bid = this.bids.get(id)

    if (bid === undefined) {
      throw new NotFoundException('BID_NOT_FOUND')
    }

    return bid
  }

  private nextId(): string {
    this.sequence += 1
    return `bid-${this.sequence}`
  }

  private cloneBid(bid: BidRecord): BidRecord {
    return { ...bid }
  }
}
