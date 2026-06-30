import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { McpService } from "./mcp.service";

async function main() {
  // 创建 NestJS 应用（不启动 HTTP）
  const app = await NestFactory.createApplicationContext(AppModule);
  await app.init();

  // 获取 MCP 服务并以 stdio 模式启动
  const mcpService = app.get(McpService);
  const mcpServer = mcpService.getServer();
  await mcpServer.start({ transportType: "stdio" });
}

main().catch((err) => {
  console.error("启动失败:", err);
  process.exit(1);
});
