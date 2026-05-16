import { IsOptional, IsString, IsNumber, IsEnum, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'
import { DossierStatus } from '@guineatender/database'

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
  @IsString()
  aoId?: string

  @ApiProperty({ enum: DossierStatus, required: false })
  @IsOptional()
  @IsEnum(DossierStatus)
  status?: DossierStatus
}
