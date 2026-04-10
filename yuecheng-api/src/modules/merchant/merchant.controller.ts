import { Body, Controller, Post } from '@nestjs/common'
import { MerchantApplyDto } from './dto/merchant-apply.dto'
import { MerchantReviewDto } from './dto/merchant-review.dto'
import { MerchantService } from './merchant.service'

@Controller('api/merchant')
export class MerchantController {
  constructor(private readonly merchantService: MerchantService) {}

  @Post('apply')
  apply(@Body() dto: MerchantApplyDto) {
    return this.merchantService.apply(dto)
  }

  @Post('review')
  review(@Body() body: MerchantReviewDto) {
    return this.merchantService.review(body.merchant, body.action)
  }
}
