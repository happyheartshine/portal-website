import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class ClearCouponDto {
  @ApiProperty({
    description: 'Amount to clear (must equal remaining balance exactly)',
    example: 50.0,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  amountUSD: number;
}

