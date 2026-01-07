import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class PurgeDto {
  @ApiProperty({
    description: 'Month in YYYY-MM format',
    example: '2024-01',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}$/, {
    message: 'monthKey must be in YYYY-MM format',
  })
  monthKey: string;
}

