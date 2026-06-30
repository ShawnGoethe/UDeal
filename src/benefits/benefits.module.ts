import { Module } from "@nestjs/common";
import { BenefitsController } from "./benefits.controller";
import { BenefitsService } from "./benefits.service";
import { DataModule } from "../data/data.module";

@Module({
  imports: [DataModule],
  controllers: [BenefitsController],
  providers: [BenefitsService],
  exports: [BenefitsService],
})
export class BenefitsModule {}
