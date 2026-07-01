import { Controller, Get } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('api')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get('categories')
  getCategories() {
    return this.categoriesService.getCategories();
  }

  @Get('tags')
  getTags() {
    return this.categoriesService.getTags();
  }
}
