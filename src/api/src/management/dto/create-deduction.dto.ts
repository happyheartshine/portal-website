import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateDeductionDto {
  @ApiProperty({ description: 'Employee ID' })
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @ApiProperty({ description: 'Reason key from the reasons list' })
  @IsString()
  @IsNotEmpty()
  reasonKey: string;

  @ApiProperty({
    description: 'Deduction amount in INR (₹)',
    example: 100.0,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  amountINR: number;
}

