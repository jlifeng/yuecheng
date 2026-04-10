import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class MerchantApplyDto {
  @IsString()
  @IsNotEmpty()
  merchantName?: string

  @IsString()
  @IsNotEmpty()
  contactName?: string

  @IsString()
  @IsNotEmpty()
  contactPhone?: string

  @IsString()
  @IsNotEmpty()
  businessLicense?: string

  @IsString()
  @IsNotEmpty()
  fleetQualification?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  vehicleTypeIds?: string[]
}
