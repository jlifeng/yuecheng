import { Controller, Get } from '@nestjs/common'

@Controller('api/common/dictionaries')
export class DictionariesController {
  @Get('vehicle-types')
  getVehicleTypes() {
    return [
      {
        code: 'GL8',
        name: '别克GL8',
      },
      {
        code: 'ALPHARD',
        name: '丰田阿尔法',
      },
    ]
  }
}
