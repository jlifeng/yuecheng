import { Module } from '@nestjs/common'
import { BidController } from './modules/bid/bid.controller'
import { BidService } from './modules/bid/bid.service'
import { DictionariesController } from './modules/dictionaries/dictionaries.controller'
import { DemandController } from './modules/demand/demand.controller'
import { DemandService } from './modules/demand/demand.service'
import { MerchantController } from './modules/merchant/merchant.controller'
import { MerchantService } from './modules/merchant/merchant.service'
import { OrderService } from './modules/order/order.service'
import { OrderTimelineController } from './modules/order/order-timeline.controller'
import { OrderTimelineService } from './modules/order/order-timeline.service'
import { InvoiceController } from './modules/invoice/invoice.controller'
import { IncidentController } from './modules/incident/incident.controller'

@Module({
  imports: [],
  controllers: [
    MerchantController,
    DictionariesController,
    DemandController,
    BidController,
    OrderTimelineController,
    InvoiceController,
    IncidentController,
  ],
  providers: [
    MerchantService,
    DemandService,
    BidService,
    OrderService,
    OrderTimelineService,
  ],
})
export class AppModule {}
