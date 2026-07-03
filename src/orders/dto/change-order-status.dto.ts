import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { OrderStatus } from 'generated/prisma/enums';

export class ChangeOrderStatusDto {
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @IsEnum(OrderStatus)
  @IsNotEmpty()
  status: OrderStatus;
}
