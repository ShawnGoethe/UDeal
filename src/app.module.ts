import { Module } from '@nestjs/common';
import { DataModule } from './data/data.module';
import { BenefitsModule } from './benefits/benefits.module';
import { PlatformsModule } from './platforms/platforms.module';
import { CategoriesModule } from './categories/categories.module';
import { HomeModule } from './home/home.module';

@Module({
  imports: [
    DataModule,
    BenefitsModule,
    PlatformsModule,
    CategoriesModule,
    HomeModule,
  ],
})
export class AppModule {}
