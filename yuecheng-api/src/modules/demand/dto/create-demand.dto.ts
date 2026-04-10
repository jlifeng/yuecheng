import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { DemandType } from '../domain/demand-type'

export class CreateDemandDto {
  @IsIn(Object.values(DemandType))
  type!: DemandType

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  passengerName?: string
}
