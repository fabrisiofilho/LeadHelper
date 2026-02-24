import {
  Repository,
  FindOptionsWhere,
  FindOneOptions,
  DeepPartial,
  ObjectLiteral,
  EntityTarget,
  EntityManager,
  DataSource,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity.js';
import { PageResult } from '@shared/interfaces/types/common.types';
import { FilterFactory } from '@main/infrastructure/page/filter-factory';
import { Pagination } from '@main/infrastructure/page/pagination';
import { getDataSource } from '@main/infrastructure/database/data-source';
import { logger } from '@main/infrastructure/log/logger';

export abstract class BaseRepository<T extends ObjectLiteral> {
  private _repository: Repository<T> | null = null;
  private _cachedDataSource: DataSource | null = null;
  private readonly entity: EntityTarget<T>;
  private readonly manager?: EntityManager;

  constructor(entity: EntityTarget<T>, manager?: EntityManager) {
    this.entity = entity;
    this.manager = manager;
  }

  protected get repository(): Repository<T> {
    if (!this.manager) {
      let dataSource: DataSource;
      try {
        dataSource = getDataSource();
      } catch (error) {
        this._repository = null;
        this._cachedDataSource = null;
        logger.error('Erro ao obter DataSource:', error);
        throw error;
      }

      if (!dataSource) {
        this._repository = null;
        this._cachedDataSource = null;
        throw new Error(
          'DataSource não foi criado. Aguarde a inicialização do banco de dados.',
        );
      }

      if (!dataSource.isInitialized) {
        this._repository = null;
        this._cachedDataSource = null;
        throw new Error(
          'DataSource não está inicializado. Aguarde a inicialização do banco de dados.',
        );
      }

      if (this._cachedDataSource !== dataSource) {
        this._repository = null;
        this._cachedDataSource = dataSource;
      }

      if (!this._repository) {
        try {
          const entityName =
            typeof this.entity === 'function'
              ? this.entity.name
              : String(this.entity);
          logger.info(`Criando repositório para entidade: ${entityName}`);

          this._repository = dataSource.manager.getRepository(this.entity);

          if (!this._repository) {
            this._repository = null;
            throw new Error(
              `Repositório não foi criado para entidade: ${entityName}`,
            );
          }

          if (!this._repository.metadata) {
            logger.error(`Metadata undefined para repositório: ${entityName}`);
            this._repository = null;
            throw new Error(
              `Repositório criado sem metadata para entidade: ${entityName}`,
            );
          }

          logger.info(
            `Repositório criado com sucesso para: ${this._repository.metadata.tableName}`,
          );
        } catch (error) {
          this._repository = null;
          logger.error('Erro ao criar repositório:', error);
          throw error;
        }
      }
    } else {
      if (!this._repository) {
        this._repository = this.manager.getRepository(this.entity);
      }
    }

    return this._repository;
  }

  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    return await this.repository.findOne(options);
  }

  async findOneBy(where: FindOptionsWhere<T>): Promise<T | null> {
    return await this.repository.findOneBy(where);
  }

  async find(options?: FindOneOptions<T>): Promise<T[]> {
    return await this.repository.find(options);
  }

  async save(data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(data);
    const saved = await this.repository.save(entity);

    logger.info(`Entity saved to ${this.repository.metadata.tableName}:`, {
      id: (saved as any).id,
    });

    // Force sync to disk for SQLite WAL mode
    try {
      await this.repository.query('PRAGMA wal_checkpoint(PASSIVE)');
      logger.info('WAL checkpoint completed after save');
    } catch (error) {
      logger.warning('WAL checkpoint failed (data still in WAL):', error);
    }

    return saved;
  }

  async update(
    criteria: FindOptionsWhere<T>,
    data: QueryDeepPartialEntity<T>,
  ): Promise<void> {
    await this.repository.update(criteria, data);
  }

  async delete(criteria: FindOptionsWhere<T>): Promise<void> {
    await this.repository.delete(criteria);
  }

  async deleteAll(): Promise<void> {
    await this.repository.clear();
  }

  async count(where?: FindOptionsWhere<T>): Promise<number> {
    return await this.repository.count({ where });
  }

  async findAndPaginate(
    pagination: Pagination,
    customFilters: Map<string, FilterFactory> = new Map(),
    alias?: string,
  ): Promise<PageResult<T>> {
    const entityAlias = alias ?? this.getDefaultAlias();
    const query = this.repository.createQueryBuilder(entityAlias);

    return await pagination.apply(query, customFilters);
  }

  async findAndPaginateWithGroupBy(
    pagination: Pagination,
    customFilters: Map<string, FilterFactory> = new Map(),
    alias?: string,
  ): Promise<PageResult<T>> {
    const entityAlias = alias ?? this.getDefaultAlias();
    const query = this.repository.createQueryBuilder(entityAlias);

    return await pagination.applyWithGroupBy(query, customFilters);
  }

  private getDefaultAlias(): string {
    const entityName = this.repository.metadata.tableName;
    return entityName.charAt(0).toLowerCase() + entityName.slice(1);
  }
}
