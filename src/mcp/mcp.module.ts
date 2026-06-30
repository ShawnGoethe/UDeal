import { Module } from "@nestjs/common";
import { McpService } from "./mcp.service";
import { BenefitsModule } from "../benefits/benefits.module";

@Module({
  imports: [BenefitsModule],
  providers: [McpService],
  exports: [McpService],
})
export class McpModule {}
