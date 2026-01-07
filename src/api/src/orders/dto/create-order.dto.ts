import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, Min, Matches } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({
    description: 'Date in YYYY-MM-DD format',
    example: '2024-01-15',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dateKey must be in YYYY-MM-DD format',
  })
  dateKey: string;

  @ApiProperty({
    description: 'Number of orders submitted',
    example: 10,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  submittedCount: number;
}

