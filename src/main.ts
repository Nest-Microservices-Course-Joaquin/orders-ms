import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { envs } from './config/env.validation';

async function bootstrap() {
  const logger = new Logger('Main-Orders-MS');

  const app = await NestFactory.create(AppModule);
  await app.listen(envs.PORT);
  logger.log(`Orders microservice is running on port ${envs.PORT}`);
}
bootstrap();
