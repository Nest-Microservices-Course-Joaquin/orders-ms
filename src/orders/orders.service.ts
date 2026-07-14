import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaService } from 'src/prisma.service';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { NATS_SERVICE } from 'src/config/services';
import { firstValueFrom } from 'rxjs';
import { Product } from 'src/products/interfaces/product.interface';
import { OrderWithProducts } from './interfaces/order.interface';
import { PaidOrderDto } from './dto/paid-order.dto';
import { OrderStatus } from 'generated/prisma/enums';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(NATS_SERVICE) private readonly natsClient: ClientProxy,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    try {
      const productsIds = createOrderDto.items.map((item) => item.productId);

      const products: Product[] = await firstValueFrom(
        this.natsClient.send({ cmd: 'validate_products' }, productsIds),
      );

      const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {
        const product = products.find(
          (prod) => prod.id === orderItem.productId,
        );

        const price = product!.price;
        const quantity = orderItem.quantity;
        return acc + price * quantity;
      }, 0);

      const totalItems = createOrderDto.items.reduce((acc, orderItem) => {
        return acc + orderItem.quantity;
      }, 0);

      const order = await this.prisma.order.create({
        data: {
          totalAmount,
          totalItems,
          orderItems: {
            createMany: {
              data: createOrderDto.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: products.find((prod) => prod.id === item.productId)!
                  .price,
              })),
            },
          },
        },
        include: {
          orderItems: {
            select: {
              productId: true,
              price: true,
              quantity: true,
            },
          },
        },
      });

      return {
        ...order,
        orderItems: order.orderItems.map((orderItem) => {
          return {
            ...orderItem,
            name: products.find((prod) => prod.id === orderItem.productId)!
              .name,
          };
        }),
      };
    } catch (error) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  }

  async createPaymentSession(order: OrderWithProducts) {
    const paymentSession = await firstValueFrom(
      this.natsClient.send(
        { cmd: 'create_payment_session' },
        {
          orderId: order.id,
          currency: 'usd',
          items: order.orderItems.map((item) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        },
      ),
    );

    return paymentSession;
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
      include: {
        orderItems: {
          select: {
            productId: true,
            quantity: true,
            price: true,
          },
        },
      },
    });

    if (!order) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Order with id ${id} not found`,
      });
    }

    const productsIds = order.orderItems.map((item) => item.productId);
    const products: Product[] = await firstValueFrom(
      this.natsClient.send({ cmd: 'validate_products' }, productsIds),
    );

    return {
      ...order,
      orderItems: order.orderItems.map((orderItem) => {
        return {
          ...orderItem,
          name: products.find((prod) => prod.id === orderItem.productId)!.name,
        };
      }),
    };
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

  async paidOrder(paidOrderDto: PaidOrderDto) {
    const { stripePaymentId, orderId, receiptUrl } = paidOrderDto;

    await this.findOne(orderId);

    const order = await this.prisma.order.update({
      where: {
        id: orderId,
      },
      data: {
        status: OrderStatus.PAID,
        stripeChargeId: stripePaymentId,
        paid: true,
        paidAt: new Date(),
        orderReceipt: {
          create: {
            receiptUrl,
          },
        },
      },
    });

    return order;
  }
}
