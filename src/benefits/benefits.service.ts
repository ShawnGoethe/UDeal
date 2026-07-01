import { Injectable } from '@nestjs/common';
import { LoaderService } from '../data/loader.service';
import type { SearchResult } from '../common/types';

@Injectable()
export class BenefitsService {
  constructor(private readonly loader: LoaderService) {}

  search(query: string, filters?: { tag?: string; platform?: string; type?: string }) {
    return this.loader.searchBenefits(query, filters);
  }

  getAll(filters?: { tag?: string; platform?: string; type?: string }) {
    return this.loader.getAllBenefits(filters);
  }

  getById(id: string) {
    return this.loader.getBenefitById(id);
  }

  getMyBenefits() {
    return this.loader.getMyBenefits();
  }

  compare(query: string) {
    return this.loader.compareBenefitAcrossPlatforms(query);
  }
}
