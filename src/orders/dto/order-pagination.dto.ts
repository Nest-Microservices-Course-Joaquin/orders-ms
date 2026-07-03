import { IsEnum, IsOptional } from 'class-validator';
import { OrderStatus } from 'generated/prisma/enums';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class OrderPaginationDto extends PaginationDto {
  @IsOptional()
  @IsEnum(OrderStatus, { message: 'Status must be a valid order status' })
  status?: OrderStatus;
}
