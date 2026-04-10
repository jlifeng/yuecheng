import { Body, Controller, Param, Post } from '@nestjs/common'
import { CreateDemandDto } from './dto/create-demand.dto'
import { DemandService } from './demand.service'

@Controller('api/demand')
export class DemandController {
  constructor(private readonly demandService: DemandService) {}

  @Post()
  create(@Body() body: CreateDemandDto) {
    return this.demandService.createDemand(body)
  }

  @Post(':id/close')
  close(@Param('id') id: string) {
    return this.demandService.closeDemand(id)
  }
}
