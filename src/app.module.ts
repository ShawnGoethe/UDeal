import { Module } from "@nestjs/common";
import { DataModule } from "./data/data.module";
import { BenefitsModule } from "./benefits/benefits.module";
import { PlatformsModule } from "./platforms/platforms.module";
import { CategoriesModule } from "./categories/categories.module";
import { HomeModule } from "./home/home.module";
import { McpModule } from "./mcp/mcp.module";
import { UpdateModule } from "./update/update.module";

@Module({
  imports: [
    DataModule,
    BenefitsModule,
    PlatformsModule,
    CategoriesModule,
    HomeModule,
    McpModule,
    UpdateModule,
  ],
})
export class AppModule {}
