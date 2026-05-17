import { IsString, IsEnum, IsOptional, IsDateString, IsNumber, IsArray } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { AOSource, AOSector, AOType } from '@guineatender/database'

export class CreateAODto {
  @ApiProperty()
  @IsString()
  titre: string

  @ApiProperty()
  @IsString()
  objet: string

  @ApiProperty()
  @IsString()
  entiteAdj: string

  @ApiProperty({ enum: AOSource })
  @IsEnum(AOSource)
  source: AOSource

  @ApiProperty({ enum: AOSector, required: false })
  @IsOptional()
  @IsEnum(AOSector)
  secteur?: AOSector

  @ApiProperty({ enum: AOType, required: false })
  @IsOptional()
  @IsEnum(AOType)
  typeMarche?: AOType

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  budgetEstimeGNF?: number

  @ApiProperty()
  @IsDateString()
  datePublication: string

  @ApiProperty()
  @IsDateString()
  dateLimite: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  dureeMarche?: number

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  documentUrls?: string[]

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sourceUrl?: string
}
