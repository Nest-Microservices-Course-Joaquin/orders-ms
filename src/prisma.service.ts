import { Injectable, Logger } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'generated/prisma/client';
import { envs } from './config/env.validation';

@Injectable()
export class PrismaService extends PrismaClient {
  private logger = new Logger('PrismaService - OrdersDB');

  constructor() {
    const adapter = new PrismaPg({
      connectionString: envs.DATABASE_URL,
    });
    super({ adapter });
    this.logger.log('Database connected');
  }
}
