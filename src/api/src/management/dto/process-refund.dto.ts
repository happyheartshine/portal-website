import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class ProcessRefundDto {
  @ApiProperty({
    description: 'Refunded amount in USD (total refunded so far)',
    example: 50.0,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  refundedAmountUSD: number;
}

