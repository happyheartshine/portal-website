import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { TrendRange } from '../../user/dto/trends-query.dto';

export class OrderAnalyticsQueryDto {
  @ApiProperty({
    enum: TrendRange,
    description: 'Number of days for analysis',
    example: TrendRange.SEVEN_DAYS,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    const num = parseInt(value, 10);
    return isNaN(num) ? value : num;
  })
  @IsEnum(TrendRange)
  range?: TrendRange = TrendRange.SEVEN_DAYS;
}

