import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaService } from 'src/prisma.service';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { PRODUCTS_SERVICE } from 'src/config/services';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PRODUCTS_SERVICE) private readonly productsClient: ClientProxy,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    const productsIds = createOrderDto.items.map((item) => item.productId);

    const products = await firstValueFrom(
      this.productsClient.send({ cmd: 'validate_products' }, productsIds),
    );

    return products;
  }

  async findAll(orderPaginationDto: OrderPaginationDto) {
    const { page = 1, limit = 10, status } = orderPaginationDto;
    const skip = (page - 1) * limit;

    const total = await this.prisma.order.count({
      where: {
        status,
      },
    });
    const lastPage = Math.ceil(total / limit);

    const orders = await this.prisma.order.findMany({
      skip,
      take: limit,
      where: {
        status,
      },
    });

    return {
      data: orders,
      metadata: {
        total,
        page,
        lastPage,
      },
    };
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: {
        id,
      },
    });

    if (!order) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Order with id ${id} not found`,
      });
    }

    return order;
  }

  async changeStatus(changeOrderStatusDto: ChangeOrderStatusDto) {
    const { id, status } = changeOrderStatusDto;

    const order = await this.findOne(id);

    if (order.status === status) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: `Order with id ${id} already has status ${status}`,
      });
    }

    await this.prisma.order.update({
      where: {
        id,
      },
      data: {
        status,
      },
    });

    return {
      message: `Order status changed to ${status}`,
    };
  }
}
