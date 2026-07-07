import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { DataModule } from './data/data.module';
import { BenefitsModule } from './benefits/benefits.module';
import { PlatformsModule } from './platforms/platforms.module';
import { CategoriesModule } from './categories/categories.module';
import { HomeModule } from './home/home.module';
import { AdminModule } from './admin/admin.module';
import { UpdateModule } from './update/update.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
    }),
    DataModule,
    BenefitsModule,
    PlatformsModule,
    CategoriesModule,
    HomeModule,
    AdminModule,
    UpdateModule,
  ],
})
export class AppModule {}
