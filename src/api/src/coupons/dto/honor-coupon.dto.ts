import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class HonorCouponDto {
  @ApiProperty({ example: 'CP-20240115-1234' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

