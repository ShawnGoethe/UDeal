import { Global, Module } from '@nestjs/common';
import { LoaderService } from './loader.service';
import { WriterService } from './writer.service';

@Global()
@Module({
  providers: [LoaderService, WriterService],
  exports: [LoaderService, WriterService],
})
export class DataModule {}
