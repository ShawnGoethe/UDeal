import { Module } from "@nestjs/common";
import { DataModule } from "../data/data.module";
import { UpdateController } from "./update.controller";
import { UpdateService } from "./update.service";

@Module({
  imports: [DataModule],
  controllers: [UpdateController],
  providers: [UpdateService],
})
export class UpdateModule {}
