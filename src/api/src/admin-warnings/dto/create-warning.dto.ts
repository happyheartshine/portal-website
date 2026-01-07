import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateWarningDto {
  @ApiProperty({ description: 'User ID to issue warning to' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 'Late submission' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({ example: 'Please submit on time', required: false })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiProperty({
    example: 10.0,
    description: 'Optional deduction amount',
    required: false,
    minimum: 0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  deductionAmount?: number;
}
