import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export enum TrendRange {
  SEVEN_DAYS = 7,
  FIFTEEN_DAYS = 15,
  THIRTY_DAYS = 30,
}

export class TrendsQueryDto {
  @ApiProperty({
    enum: TrendRange,
    description: 'Number of days for trend analysis',
    example: TrendRange.SEVEN_DAYS,
    required: false,
    default: TrendRange.SEVEN_DAYS,
  })
  @IsOptional()
  @Transform(({ value }) => {
    const num = parseInt(value, 10);
    return isNaN(num) ? value : num;
  })
  @IsEnum(TrendRange)
  range?: TrendRange = TrendRange.SEVEN_DAYS;
}

