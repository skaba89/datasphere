import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class RegisterDto {
  @ApiProperty({ example: 'Mamadou' })
  @IsString()
  prenom: string

  @ApiProperty({ example: 'Diallo' })
  @IsString()
  nom: string

  @ApiProperty({ example: 'mamadou@techguinee.gn' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'MonMotDePasse@123' })
  @IsString()
  @MinLength(8)
  password: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  telephone?: string

  @ApiProperty({ required: false, example: 'Tech Guinée SARL' })
  @IsOptional()
  @IsString()
  organisationNom?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  organisationId?: string
}
