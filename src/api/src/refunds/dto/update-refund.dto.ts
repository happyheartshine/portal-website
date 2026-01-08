import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min, IsOptional } from 'class-validator';

export class UpdateRefundDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @ApiProperty({ example: 'John Zelle' })
  @IsString()
  @IsNotEmpty()
  zelleSenderName: string;

  @ApiProperty({ example: 'Server-01' })
  @IsString()
  @IsNotEmpty()
  server: string;

  @ApiProperty({ example: 'Refund' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 'Customer requested refund' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({ example: 50.0, minimum: 0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ required: false, type: 'string', format: 'binary' })
  @IsOptional()
  screenshot?: Express.Multer.File;
}

