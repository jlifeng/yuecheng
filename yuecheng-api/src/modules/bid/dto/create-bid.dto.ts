import { Type } from 'class-transformer'
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator'

export class CreateBidDto {
  @IsString()
  @IsNotEmpty()
  demandId!: string

  @IsString()
  @IsNotEmpty()
  merchantId!: string

  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  price!: number
}
