import { OptionalProps, PrimaryKey, Property } from '@mikro-orm/core';

export abstract class BaseEntity<Optional extends string = never> {
  [OptionalProps]?: 'ID' | 'createdAt' | 'updatedAt' | Optional;
  @PrimaryKey({ fieldName: 'ID', autoincrement: true })
  ID!: number;

  @Property({ fieldName: 'createdAt', onCreate: () => new Date() })
  createdAt = new Date();

  @Property({
    fieldName: 'updatedAt',
    onCreate: () => new Date(),
    onUpdate: () => new Date(),
  })
  updatedAt = new Date();
}
