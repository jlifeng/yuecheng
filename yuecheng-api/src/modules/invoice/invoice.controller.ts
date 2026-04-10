import { Body, Controller, Get, Param, Post, ValidationPipe } from '@nestjs/common'
import { IsISO8601, IsNotEmpty, IsString, IsUrl, IsOptional } from 'class-validator'

const validationPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
})

interface InvoiceRecord {
  id: string
  orderId: string
  invoiceType: string
  fileUrl: string
  issuedAt: string
  notes?: string
  status: 'UPLOADED'
}

export class InvoiceUploadDto {
  @IsString()
  @IsNotEmpty()
  orderId!: string

  @IsString()
  @IsNotEmpty()
  invoiceType!: string

  @IsUrl()
  fileUrl!: string

  @IsISO8601()
  issuedAt!: string

  @IsOptional()
  @IsString()
  notes?: string
}

@Controller('/api/invoices')
export class InvoiceController {
  private sequence = 0
  private readonly invoices: InvoiceRecord[] = []

  @Post('upload')
  upload(@Body(validationPipe) payload: InvoiceUploadDto) {
    const record: InvoiceRecord = {
      ...payload,
      id: `invoice-${++this.sequence}`,
      status: 'UPLOADED',
    }
    this.invoices.push(record)
    return record
  }

  @Get(':orderId')
  listByOrder(@Param('orderId') orderId: string) {
    return this.invoices.filter((invoice) => invoice.orderId === orderId)
  }
}
