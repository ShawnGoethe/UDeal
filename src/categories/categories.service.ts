import { Injectable } from "@nestjs/common";
import { LoaderService } from "../data/loader.service";

@Injectable()
export class CategoriesService {
  constructor(private readonly loader: LoaderService) {}

  getCategories() {
    return this.loader.loadCategories();
  }

  getTags() {
    return this.loader.loadTags();
  }
}
