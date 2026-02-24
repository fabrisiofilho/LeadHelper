import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { FilterFactory } from './filter-factory';
import {
  PaginationOptions,
  PageResult,
  FilterTypeEnum,
  Filter,
  Sort,
} from '@shared/interfaces/types/common.types';

type SqlParam = string | number | boolean | Date | null;

export type PropertyMapping = Map<string, string>;

export class Pagination {
  page: number;
  size: number;
  sorts: Sort[];
  filters: Filter[];

  constructor(options: PaginationOptions = {}) {
    this.page = options.page ?? 0;
    this.size = options.size ?? 10;
    this.sorts = options.sorts ?? [];
    this.filters = options.filters ?? [];
  }

  async apply<T extends ObjectLiteral>(
    query: SelectQueryBuilder<T>,
    customFilters: Map<string, FilterFactory> = new Map(),
    propertyMapping: PropertyMapping = new Map(),
  ): Promise<PageResult<T>> {
    this.addOrderSpecifier(query, propertyMapping);

    this.addFilterSpecifier(query, customFilters);

    const totalElements = await query.getCount();

    query.skip(this.page * this.size).take(this.size);

    const content = await query.getMany();

    return {
      content,
      page: this.page,
      size: this.size,
      totalElements,
      totalPages: Math.ceil(totalElements / this.size),
    };
  }

  async applyWithGroupBy<T extends ObjectLiteral>(
    query: SelectQueryBuilder<T>,
    customFilters: Map<string, FilterFactory> = new Map(),
    propertyMapping: PropertyMapping = new Map(),
  ): Promise<PageResult<T>> {
    query.groupBy('id');
    return this.apply(query, customFilters, propertyMapping);
  }

  private mapProperty(property: string, mapping: PropertyMapping): string {
    return mapping.get(property) ?? property;
  }

  private addOrderSpecifier<T extends ObjectLiteral>(
    query: SelectQueryBuilder<T>,
    propertyMapping: PropertyMapping = new Map(),
  ): void {
    const alias = query.expressionMap.mainAlias!.name;

    const hasIdSort = this.sorts.some(
      (s) => s.property === 'id' || s.property === `${alias}.id`,
    );

    const orderObject: Record<string, 'ASC' | 'DESC'> = {};

    this.sorts.forEach((sort, index) => {
      const mappedProperty = this.mapProperty(sort.property, propertyMapping);

      const fullProperty = mappedProperty.includes('.')
        ? mappedProperty
        : `${alias}.${mappedProperty}`;

      const sortAlias = `sort_field_${index}`;
      query.addSelect(`LOWER(${fullProperty})`, sortAlias);

      orderObject[sortAlias] = sort.direction;
    });

    if (!hasIdSort) {
      orderObject[`${alias}.id`] = 'ASC';
    }

    if (Object.keys(orderObject).length > 0) {
      query.orderBy(orderObject);
    }
  }

  private addFilterSpecifier<T extends ObjectLiteral>(
    query: SelectQueryBuilder<T>,
    customFilters: Map<string, FilterFactory>,
  ): void {
    this.filters.forEach((filter) => {
      if (filter.type === FilterTypeEnum.FILTER_CUSTOM) {
        this.applyCustomFilter(query, filter, customFilters);
      } else {
        this.applyStandardFilter(query, filter);
      }
    });
  }

  private applyCustomFilter<T extends ObjectLiteral>(
    query: SelectQueryBuilder<T>,
    filter: Filter,
    customFilters: Map<string, FilterFactory>,
  ): void {
    if (customFilters.size === 0) {
      throw new Error(
        'Não foi informado nenhum filtro customizado para está busca.',
      );
    }

    const property = this.getSingleProperty(filter);
    const filterFactory = customFilters.get(property);

    if (!filterFactory) {
      throw new Error(
        `Filtro customizado não encontrado para a propriedade: ${property}`,
      );
    }

    filterFactory.apply(query, filter);
  }

  private applyStandardFilter<T extends ObjectLiteral>(
    query: SelectQueryBuilder<T>,
    filter: Filter,
  ): void {
    switch (filter.type) {
      case FilterTypeEnum.SEARCH:
        this.applySearchFilter(query, filter);
        break;
      case FilterTypeEnum.FILTER_IN_IDS:
        this.applyInIdsFilter(query, filter);
        break;
      case FilterTypeEnum.FILTER_IN_VALUES:
        this.applyInValuesFilter(query, filter);
        break;
      default:
        throw new Error(`Tipo de filtro não implementado: ${filter.type}`);
    }
  }

  private applySearchFilter<T extends ObjectLiteral>(
    query: SelectQueryBuilder<T>,
    filter: Filter,
  ): void {
    const value = this.getSingleValue(filter);
    if (!value || value.trim() === '') return;

    const searchValue = this.removeAccents(value.toLowerCase().trim());
    const cleanedValue = this.removeNonAlphanumeric(searchValue);

    const conditions: string[] = [];
    const parameters: Record<string, SqlParam> = {};
    let paramIndex = 0;

    const alias = query.expressionMap.mainAlias!.name;

    filter.properties.forEach((property) => {
      const fullProperty = property.includes('.')
        ? property
        : `${alias}.${property}`;

      const normalParam = `search_${paramIndex++}`;
      conditions.push(`LOWER(${fullProperty}) LIKE :${normalParam}`);
      parameters[normalParam] = `%${searchValue}%`;

      if (cleanedValue !== searchValue && cleanedValue.length > 0) {
        const cleanParam = `search_${paramIndex++}`;
        conditions.push(
          `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(${fullProperty}), '.', ''), '-', ''), '/', ''), ' ', ''), '(', '') LIKE :${cleanParam}`,
        );
        parameters[cleanParam] = `%${cleanedValue}%`;
      }
    });

    const whereClause = conditions.join(' OR ');
    query.andWhere(`(${whereClause})`, parameters);
  }

  private applyInIdsFilter<T extends ObjectLiteral>(
    query: SelectQueryBuilder<T>,
    filter: Filter,
  ): void {
    if (!filter.values || filter.values.length === 0) return;

    const property = this.getSingleProperty(filter);
    const alias = query.expressionMap.mainAlias!.name;

    const ids = filter.values
      .map((v) => {
        const parsed = parseInt(v, 10);
        return isNaN(parsed) ? null : parsed;
      })
      .filter((id): id is number => id !== null);

    if (ids.length === 0) return;

    const fullProperty = property.includes('.')
      ? property
      : `${alias}.${property}`;

    const paramName = `in_ids_${property.replace(/\./g, '_')}`;
    query.andWhere(`${fullProperty} IN (:...${paramName})`, {
      [paramName]: ids,
    });
  }

  private applyInValuesFilter<T extends ObjectLiteral>(
    query: SelectQueryBuilder<T>,
    filter: Filter,
  ): void {
    if (!filter.values || filter.values.length === 0) return;

    const property = this.getSingleProperty(filter);
    const alias = query.expressionMap.mainAlias!.name;

    const values = filter.values.map((v) => v.trim()).filter((v) => v !== '');

    if (values.length === 0) return;

    const fullProperty = property.includes('.')
      ? property
      : `${alias}.${property}`;

    const paramName = `in_values_${property.replace(/\./g, '_')}`;
    query.andWhere(`${fullProperty} IN (:...${paramName})`, {
      [paramName]: values,
    });
  }

  private getSingleProperty(filter: Filter): string {
    const value = this.getSingle(filter.properties, 'propriedade');
    if (!value || value.trim() === '') {
      throw new Error('Uma de suas propriedades está nula ou vazia');
    }
    return value;
  }

  private getSingleValue(filter: Filter): string {
    return this.getSingle(filter.values, 'valor');
  }

  private getSingle<T>(list: T[], filterType: string): T {
    if (list.length > 1) {
      throw new Error(`Mais de um(a) ${filterType} informado no filtro.`);
    }
    return list[0];
  }

  private removeAccents(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private removeNonAlphanumeric(str: string): string {
    return str.replace(/[^a-z0-9]/g, '');
  }
}
