import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class DashboardQueryDto {
  @ApiProperty({
    description: 'Month in YYYY-MM format',
    example: '2024-01',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, {
    message: 'Month must be in YYYY-MM format',
  })
  month?: string;
}

