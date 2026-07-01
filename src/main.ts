import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { McpService } from './mcp/mcp.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.enableShutdownHooks(); // 启用优雅关闭（Ctrl+C）

  // 确保所有 lifecycle hooks 执行完毕
  await app.init();

  const httpPort = parseInt(process.env.PORT || '3000');
  const mcpPort = parseInt(process.env.MCP_PORT || '3001');

  // 启动 MCP Server（HTTP Stream 模式）
  const mcpService = app.get(McpService);
  const mcpServer = mcpService.getServer();
  await mcpServer.start({
    transportType: 'httpStream',
    httpStream: {
      port: mcpPort,
      host: '0.0.0.0',
    },
  });

  // 启动 NestJS HTTP 服务
  await app.listen(httpPort);

  console.log(`🚀 UDeal 服务已启动`);
  console.log(`   主页: http://localhost:${httpPort}`);
  console.log(`   API: http://localhost:${httpPort}/api/benefits`);
  console.log(`   MCP: http://localhost:${httpPort}/mcp`);
}

bootstrap().catch((err) => {
  console.error('启动失败:', err);
  process.exit(1);
});
