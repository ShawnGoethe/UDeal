import { Injectable } from '@nestjs/common';
import { LoaderService } from '../data/loader.service';
import type {  SearchResult } from '../common/types';

@Injectable()
export class BenefitsService {
  constructor(private readonly loader: LoaderService) {}

  async getAll(filters?: { tag?: string; platform?: string; type?: string }): Promise<SearchResult[]> {
    return this.loader.getAllBenefits(filters);
  }
}
