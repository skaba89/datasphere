import { IsEmail, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class LoginDto {
  @ApiProperty({ example: 'mamadou@techguinee.gn' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'MonMotDePasse@123' })
  @IsString()
  password: string
}
