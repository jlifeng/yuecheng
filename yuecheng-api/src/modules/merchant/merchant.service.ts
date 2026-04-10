import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common'
import { MerchantReviewStatus } from './domain/merchant-review-status'
import { MerchantApplyDto } from './dto/merchant-apply.dto'
import { MerchantReviewAction } from './dto/merchant-review.dto'

@Injectable()
export class MerchantService {
  assertBidAllowed(status: MerchantReviewStatus | string): void {
    if (status !== MerchantReviewStatus.APPROVED) {
      throw new ForbiddenException('MERCHANT_NOT_APPROVED')
    }
  }

  apply(dto: MerchantApplyDto) {
    return {
      ...dto,
      status: MerchantReviewStatus.PENDING,
    }
  }

  review<T extends Record<string, unknown>>(
    merchant: T,
    action: MerchantReviewAction | string,
  ): T & { status: MerchantReviewStatus } {
    if (action !== MerchantReviewAction.APPROVE && action !== MerchantReviewAction.REJECT) {
      throw new BadRequestException('INVALID_REVIEW_ACTION')
    }

    const status =
      action === MerchantReviewAction.APPROVE
        ? MerchantReviewStatus.APPROVED
        : MerchantReviewStatus.REJECTED

    return {
      ...merchant,
      status,
    }
  }
}
