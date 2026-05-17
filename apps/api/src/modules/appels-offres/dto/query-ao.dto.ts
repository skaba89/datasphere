import { IsOptional, IsEnum, IsString, IsNumber, IsDateString, Min, Max } from 'class-validator'
import { Type, Transform } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'
import { AOStatus, AOSource, AOSector } from '@guineatender/database'

// Transforme les chaînes vides en undefined pour les champs optionnels enum
const EmptyToUndefined = () => Transform(({ value }) => (value === '' || value === undefined) ? undefined : value)

export class QueryAODto {
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
  @Transform(({ value }) => (value === '' ? undefined : value))
  search?: string

  @ApiProperty({ enum: AOStatus, required: false })
  @IsOptional()
  @EmptyToUndefined()
  @IsEnum(AOStatus)
  status?: AOStatus

  @ApiProperty({ enum: AOSource, required: false })
  @IsOptional()
  @EmptyToUndefined()
  @IsEnum(AOSource)
  source?: AOSource

  @ApiProperty({ enum: AOSector, required: false })
  @IsOptional()
  @EmptyToUndefined()
  @IsEnum(AOSector)
  secteur?: AOSector

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  scoreMin?: number

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsDateString()
  dateLimit?: string

  @ApiProperty({ required: false, enum: ['score', 'dateLimite', 'createdAt'], default: 'dateLimite' })
  @IsOptional()
  @IsString()
  sort?: string = 'dateLimite'
}
