import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsEnum, IsOptional, IsNumber, Min, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ enum: UserRole, example: UserRole.EMPLOYEE })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @ApiProperty({ example: 'tempPassword123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  tempPassword: string;

  @ApiProperty({ example: 5.0, required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  ratePerOrder?: number;
}

