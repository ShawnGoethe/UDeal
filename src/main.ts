import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.enableShutdownHooks();

  const httpPort = parseInt(process.env.PORT || '3000');
  await app.listen(httpPort);

  console.log(`🚀 UDeal 服务已启动`);
  console.log(`   主页: http://localhost:${httpPort}`);
}

bootstrap().catch((err) => {
  console.error('启动失败:', err);
  process.exit(1);
});
