import { Module } from '@nestjs/common';
import { TagsController } from './tags.controller';
import { DataModule } from '../data/data.module';

@Module({
  imports: [DataModule],
  controllers: [TagsController],
})
export class TagsModule {}
