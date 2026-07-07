import { Controller, Get } from '@nestjs/common';
import { LoaderService } from '../data/loader.service';

@Controller('api/tags')
export class TagsController {
  constructor(private readonly loader: LoaderService) {}

  @Get()
  getTags() {
    return this.loader.loadTags();
  }
}
