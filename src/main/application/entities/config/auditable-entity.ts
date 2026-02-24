import {
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';

export abstract class AuditableEntity {
  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
  })
  createdAt?: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'datetime',
  })
  updatedAt?: Date;

  @BeforeInsert()
  setCreateDates?() {
    const now = new Date();
    this.createdAt = now;
    this.updatedAt = now;
  }

  @BeforeUpdate()
  setUpdateDate?() {
    this.updatedAt = new Date();
  }
}
