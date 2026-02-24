import { Filter } from '@shared/interfaces/types/common.types';
import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

export interface FilterFactory {
  apply<T extends ObjectLiteral>(
    query: SelectQueryBuilder<T>,
    filter: Filter,
  ): void;
}
