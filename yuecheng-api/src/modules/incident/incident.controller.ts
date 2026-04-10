import { Body, Controller, Get, Param, Post, ValidationPipe } from '@nestjs/common'
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'

const validationPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
})

type SourceRole = 'PASSENGER' | 'MERCHANT' | 'DRIVER'

interface IncidentRecord {
  id: string
  relatedOrderId: string
  sourceRole: SourceRole
  type: string
  description: string
  handledBy?: string
  result?: string
  createdAt: string
}

export class IncidentReportDto {
  @IsString()
  @IsNotEmpty()
  relatedOrderId!: string

  @IsEnum(['PASSENGER', 'MERCHANT', 'DRIVER'])
  sourceRole!: SourceRole

  @IsString()
  @IsNotEmpty()
  type!: string

  @IsString()
  @IsNotEmpty()
  description!: string

  @IsOptional()
  @IsString()
  handledBy?: string

  @IsOptional()
  @IsString()
  result?: string
}

@Controller('/api/incidents')
export class IncidentController {
  private sequence = 0
  private readonly incidents: IncidentRecord[] = []

  @Post()
  report(@Body(validationPipe) payload: IncidentReportDto) {
    const record: IncidentRecord = {
      ...payload,
      id: `incident-${++this.sequence}`,
      createdAt: new Date().toISOString(),
    }
    this.incidents.push(record)
    return {
      status: 'RECORDED',
      ...record,
    }
  }

  @Get(':orderId')
  listByOrder(@Param('orderId') orderId: string) {
    return this.incidents.filter((incident) => incident.relatedOrderId === orderId)
  }
}
