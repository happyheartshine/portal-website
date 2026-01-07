import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class PasswordResetConfirmDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  otp: string;

  @ApiProperty({ example: 'newPassword123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}

