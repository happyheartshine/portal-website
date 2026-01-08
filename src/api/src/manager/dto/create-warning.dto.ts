import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateWarningDto {
  @ApiProperty({ description: 'Employee ID to issue warning to' })
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @ApiProperty({ example: 'Late submission - Please submit on time' })
  @IsString()
  @IsNotEmpty()
  message: string;

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


