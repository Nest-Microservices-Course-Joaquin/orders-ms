import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { envs } from './config/env.validation';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const logger = new Logger('Main-Orders-MS');

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        port: envs.PORT,
      },
    },
  );
  await app.listen();
  logger.log(`Orders microservice is running on port ${envs.PORT}`);
}
bootstrap();
