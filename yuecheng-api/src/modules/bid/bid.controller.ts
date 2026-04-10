import { Body, Controller, Param, Post } from '@nestjs/common'
import { CreateBidDto } from './dto/create-bid.dto'
import { BidService } from './bid.service'

@Controller('api/bid')
export class BidController {
  constructor(private readonly bidService: BidService) {}

  @Post()
  create(@Body() body: CreateBidDto) {
    return this.bidService.createBid(body)
  }

  @Post(':demandId/select/:bidId')
  select(@Param('demandId') demandId: string, @Param('bidId') bidId: string) {
    return this.bidService.selectBid(demandId, bidId)
  }
}
