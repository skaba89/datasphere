import { IsOptional, IsString, IsNumber, IsEnum, Min, Max } from 'class-validator'
import { Type, Transform } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'
import { DossierStatus } from '@guineatender/database'

const EmptyToUndefined = () => Transform(({ value }) => (value === '' || value === undefined) ? undefined : value)

export class QueryDossierDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page: number = 1

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit: number = 20

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  aoId?: string

  @ApiProperty({ enum: DossierStatus, required: false })
  @IsOptional()
  @EmptyToUndefined()
  @IsEnum(DossierStatus)
  status?: DossierStatus
}
