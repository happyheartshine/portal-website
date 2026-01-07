import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, Min, IsOptional } from 'class-validator';

export enum OrderAction {
  APPROVE = 'approve',
  REJECT = 'reject',
}

export class ApproveOrderDto {
  @ApiProperty({
    enum: OrderAction,
    description: 'Action to take on the order',
    example: OrderAction.APPROVE,
  })
  @IsEnum(OrderAction)
  action: OrderAction;

  @ApiProperty({
    description: 'Approved count (required if action is approve)',
    example: 8,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  approvedCount?: number;
}

