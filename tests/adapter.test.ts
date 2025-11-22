import {
  parseQuery,
  toPrismaFilter,
  toTypeORMFilter,
  toSequelizeFilter,
  toMongoFilter,
  toSqlFilter,
  toDrizzleFilter,
  finalizeSequelizeFilter,
  finalizeTypeOrmFilter,
} from '../src/index';

describe('Prisma Adapter', () => {
  test('should transform simple comparison to Prisma filter', () => {
    const ast = parseQuery('age gt 25');
    const filter = toPrismaFilter(ast);
    
    expect(filter).toEqual({
      where: {
        age: { gt: 25 },
      },
    });
  });

  test('should transform eq operator to equals', () => {
    const ast = parseQuery('name eq "John"');
    const filter = toPrismaFilter(ast);
    
    expect(filter).toEqual({
      where: {
        name: { equals: 'John' },
      },
    });
  });

  test('should transform ne operator to not', () => {
    const ast = parseQuery('name ne "John"');
    const filter = toPrismaFilter(ast);
    
    expect(filter).toEqual({
      where: {
        name: { not: 'John' },
      },
    });
  });

  test('should transform AND operation', () => {
    const ast = parseQuery('age gt 25 and name eq "John"');
    const filter = toPrismaFilter(ast);
    
    expect(filter.where).toHaveProperty('age');
    expect(filter.where).toHaveProperty('name');
    expect(filter.where.age).toEqual({ gt: 25 });
    expect(filter.where.name).toEqual({ equals: 'John' });
  });

  test('should transform OR operation', () => {
    const ast = parseQuery('name eq "John" or name eq "Jane"');
    const filter = toPrismaFilter(ast);
    
    expect(filter.where).toHaveProperty('OR');
    expect(Array.isArray(filter.where.OR)).toBe(true);
    expect(filter.where.OR.length).toBe(2);
    expect(filter.where.OR[0]).toEqual({ name: { equals: 'John' } });
    expect(filter.where.OR[1]).toEqual({ name: { equals: 'Jane' } });
  });

  test('should transform nested OR in AND', () => {
    const ast = parseQuery('age gt 25 and (name eq "John" or name eq "Jane")');
    const filter = toPrismaFilter(ast);
    
    expect(filter.where).toHaveProperty('age');
    expect(filter.where).toHaveProperty('OR');
    expect(Array.isArray(filter.where.OR)).toBe(true);
  });

  test('should transform in operator', () => {
    const ast = parseQuery('age in [1,2,3]');
    const filter = toPrismaFilter(ast);
    
    expect(filter.where).toEqual({
      age: { in: [1, 2, 3] },
    });
  });

  test('should transform contains operator', () => {
    const ast = parseQuery('name contains "John"');
    const filter = toPrismaFilter(ast);
    
    expect(filter.where).toEqual({
      name: { contains: 'John' },
    });
  });

  test('should transform startsWith operator', () => {
    const ast = parseQuery('name startsWith "Jo"');
    const filter = toPrismaFilter(ast);

    expect(filter.where).toEqual({
      name: { startsWith: 'Jo' },
    });
  });

  test('should transform notIn operator', () => {
    const ast = parseQuery('age notIn [10,20]');
    const filter = toPrismaFilter(ast);

    expect(filter.where).toEqual({
      age: { notIn: [10, 20] },
    });
  });

  test('should transform between operator', () => {
    const ast = parseQuery('createdAt between ["2024-01-01","2024-02-01"]');
    const filter = toPrismaFilter(ast);

    expect(filter.where).toEqual({
      createdAt: { gte: '2024-01-01', lte: '2024-02-01' },
    });
  });

  test('should transform NOT logical node', () => {
    const ast = parseQuery('not age gt 30');
    const filter = toPrismaFilter(ast);

    expect(filter.where).toHaveProperty('NOT');
  });

  test('should transform all comparison operators', () => {
    const operators = [
      { op: 'eq', expected: 'equals' },
      { op: 'ne', expected: 'not' },
      { op: 'gt', expected: 'gt' },
      { op: 'lt', expected: 'lt' },
      { op: 'gte', expected: 'gte' },
      { op: 'lte', expected: 'lte' },
    ];

    for (const { op, expected } of operators) {
      const ast = parseQuery(`age ${op} 25`);
      const filter = toPrismaFilter(ast);
      
      expect(filter.where.age).toHaveProperty(expected);
      expect(filter.where.age[expected]).toBe(25);
    }
  });
});

describe('TypeORM Adapter', () => {
  test('should transform simple comparison to TypeORM filter', () => {
    const ast = parseQuery('age eq 25');
    const filter = toTypeORMFilter(ast);
    
    expect(filter).toHaveProperty('where');
    expect(filter.where).toEqual({
      age: 25,
    });
  });

  test('should transform gt operator with metadata', () => {
    const ast = parseQuery('age gt 25');
    const filter = toTypeORMFilter(ast);
    
    const where = filter.where as Record<string, any>;
    expect(where).toHaveProperty('age');
    expect(where.age).toHaveProperty('__qast_operator__');
    expect(where.age.__qast_operator__).toBe('gt');
    expect(where.age.value).toBe(25);
  });

  test('should transform AND operation', () => {
    const ast = parseQuery('age gt 25 and name eq "John"');
    const filter = toTypeORMFilter(ast);
    
    expect(filter.where).toHaveProperty('age');
    expect(filter.where).toHaveProperty('name');
  });

  test('should transform OR operation to array', () => {
    const ast = parseQuery('name eq "John" or name eq "Jane"');
    const filter = toTypeORMFilter(ast);
    
    expect(Array.isArray(filter.where)).toBe(true);
    expect(filter.where.length).toBe(2);
  });

  test('should transform in operator', () => {
    const ast = parseQuery('age in [1,2,3]');
    const filter = toTypeORMFilter(ast);
    
    const where = filter.where as Record<string, any>;
    expect(where).toHaveProperty('age');
    expect(where.age).toHaveProperty('__qast_operator__');
    expect(where.age.__qast_operator__).toBe('in');
    expect(Array.isArray(where.age.value)).toBe(true);
  });

  test('should transform notIn operator', () => {
    const ast = parseQuery('age notIn [1,2,3]');
    const filter = toTypeORMFilter(ast);
    const where = filter.where as Record<string, any>;

    expect(where.age.__qast_operator__).toBe('notIn');
  });

  test('should transform between operator', () => {
    const ast = parseQuery('createdAt between ["2024-01-01","2024-02-01"]');
    const filter = toTypeORMFilter(ast);
    const where = filter.where as Record<string, any>;

    expect(where.createdAt.__qast_operator__).toBe('between');
  });

  test('should transform NOT logical node', () => {
    const ast = parseQuery('not age gt 30');
    const filter = toTypeORMFilter(ast);

    expect(filter.where).toHaveProperty('__qast_not__');
  });
});

describe('Sequelize Adapter', () => {
  test('should transform simple comparison to Sequelize filter', () => {
    const ast = parseQuery('age gt 25');
    const filter = toSequelizeFilter(ast);
    
    // Sequelize adapter returns metadata that needs to be transformed
    expect(filter).toEqual({
      age: { __qast_operator__: 'gt', value: 25 },
    });
  });

  test('should transform eq operator to plain value', () => {
    const ast = parseQuery('name eq "John"');
    const filter = toSequelizeFilter(ast);
    
    // Equality uses plain values in Sequelize
    expect(filter).toEqual({
      name: 'John',
    });
  });

  test('should transform AND operation', () => {
    const ast = parseQuery('age gt 25 and name eq "John"');
    const filter = toSequelizeFilter(ast);
    
    // Sequelize adapter returns metadata structure
    expect(filter).toHaveProperty('__qast_logical__');
    expect(filter.__qast_logical__).toBe('and');
    expect(filter).toHaveProperty('conditions');
    expect(Array.isArray(filter.conditions)).toBe(true);
    expect(filter.conditions.length).toBe(2);
  });

  test('should transform OR operation', () => {
    const ast = parseQuery('name eq "John" or name eq "Jane"');
    const filter = toSequelizeFilter(ast);
    
    // Sequelize adapter returns metadata structure
    expect(filter).toHaveProperty('__qast_logical__');
    expect(filter.__qast_logical__).toBe('or');
    expect(filter).toHaveProperty('conditions');
    expect(Array.isArray(filter.conditions)).toBe(true);
    expect(filter.conditions.length).toBe(2);
  });

  test('should transform nested OR in AND', () => {
    const ast = parseQuery('age gt 25 and (name eq "John" or name eq "Jane")');
    const filter = toSequelizeFilter(ast);
    
    // Sequelize adapter returns metadata structure
    expect(filter).toHaveProperty('__qast_logical__');
    expect(filter.__qast_logical__).toBe('and');
    expect(filter).toHaveProperty('conditions');
    expect(Array.isArray(filter.conditions)).toBe(true);
  });

  test('should transform in operator', () => {
    const ast = parseQuery('age in [1,2,3]');
    const filter = toSequelizeFilter(ast);
    
    // Sequelize adapter returns metadata
    expect(filter).toEqual({
      age: { __qast_operator__: 'in', value: [1, 2, 3] },
    });
  });

  test('should transform contains operator', () => {
    const ast = parseQuery('name contains "John"');
    const filter = toSequelizeFilter(ast);
    
    // Sequelize adapter returns metadata
    expect(filter).toEqual({
      name: { __qast_operator__: 'contains', value: 'John' },
    });
  });

  test('should transform notIn operator', () => {
    const ast = parseQuery('age notIn [1,2,3]');
    const filter = toSequelizeFilter(ast);

    expect(filter.age.__qast_operator__).toBe('notIn');
  });

  test('should transform between operator', () => {
    const ast = parseQuery('createdAt between ["2024-01-01","2024-02-01"]');
    const filter = toSequelizeFilter(ast);

    expect(filter.createdAt.__qast_operator__).toBe('between');
  });

  test('should transform NOT logical node', () => {
    const ast = parseQuery('not age gt 30');
    const filter = toSequelizeFilter(ast);

    expect(filter.__qast_logical__).toBe('not');
  });

  test('should transform all comparison operators', () => {
    const operators = ['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'in'];
    
    for (const op of operators) {
      if (op === 'in') {
        const ast = parseQuery(`age ${op} [1,2,3]`);
        const filter = toSequelizeFilter(ast);
        
        expect(filter.age).toHaveProperty('__qast_operator__');
        expect(filter.age.__qast_operator__).toBe('in');
      } else if (op === 'eq') {
        const ast = parseQuery(`age ${op} 25`);
        const filter = toSequelizeFilter(ast);
        
        // Equality uses plain values
        expect(filter.age).toBe(25);
      } else {
        const ast = parseQuery(`age ${op} 25`);
        const filter = toSequelizeFilter(ast);
        
        expect(filter.age).toHaveProperty('__qast_operator__');
        expect(filter.age.__qast_operator__).toBe(op);
        expect(filter.age.value).toBe(25);
      }
    }
  });

  test('should handle complex nested queries', () => {
    const query = 'age gt 25 and (name eq "John" or city eq "Paris") and active eq true';
    const ast = parseQuery(query);
    const filter = toSequelizeFilter(ast);
    
    // Sequelize adapter returns metadata structure
    expect(filter).toHaveProperty('__qast_logical__');
    expect(filter.__qast_logical__).toBe('and');
    expect(filter).toHaveProperty('conditions');
  });
});

describe('Mongo Adapter', () => {
  test('should transform comparisons to Mongo filter', () => {
    const ast = parseQuery('age gt 30');
    const filter = toMongoFilter(ast);

    expect(filter).toEqual({ age: { $gt: 30 } });
  });

  test('should transform logical operators', () => {
    const ast = parseQuery('age gt 30 or city eq "Paris"');
    const filter = toMongoFilter(ast);

    expect(filter).toHaveProperty('$or');
    expect(filter.$or.length).toBe(2);
  });

  test('should transform NOT node', () => {
    const ast = parseQuery('not age gt 30');
    const filter = toMongoFilter(ast);

    expect(filter).toHaveProperty('$nor');
    expect(filter.$nor.length).toBe(1);
  });
});

describe('SQL Adapter', () => {
  test('should transform query to SQL filter', () => {
    const ast = parseQuery('age gt 30 and name eq "John"');
    const filter = toSqlFilter(ast);

    expect(filter.text).toBe('("age" > $1 AND "name" = $2)');
    expect(filter.params).toEqual([30, 'John']);
  });

  test('should handle NOT expressions', () => {
    const ast = parseQuery('not age gt 30');
    const filter = toSqlFilter(ast);

    expect(filter.text).toBe('(NOT ("age" > $1))');
    expect(filter.params).toEqual([30]);
  });

  test('should produce same output for Drizzle adapter', () => {
    const ast = parseQuery('age between [10,20]');
    const sqlFilter = toSqlFilter(ast);
    const drizzleFilter = toDrizzleFilter(ast);

    expect(drizzleFilter).toEqual(sqlFilter);
  });
});

describe('Sequelize Helper', () => {
  const mockOp = {
    and: 'AND',
    or: 'OR',
    not: 'NOT',
    gt: 'GT',
    gte: 'GTE',
    lt: 'LT',
    lte: 'LTE',
    ne: 'NE',
    in: 'IN',
    notIn: 'NOT_IN',
    like: 'LIKE',
    between: 'BETWEEN',
  };

  test('should finalize Sequelize filter with Op object', () => {
    const ast = parseQuery('age gt 30 and name eq "John"');
    const filter = toSequelizeFilter(ast);
    const finalized = finalizeSequelizeFilter(filter, mockOp);

    expect(finalized[mockOp.and]).toBeDefined();
    expect(finalized[mockOp.and][0].age[mockOp.gt]).toBe(30);
  });

  test('should convert contains to LIKE', () => {
    const ast = parseQuery('name contains "Jo"');
    const filter = toSequelizeFilter(ast);
    const finalized = finalizeSequelizeFilter(filter, mockOp);

    expect(finalized.name[mockOp.like]).toBe('%Jo%');
  });
});

describe('TypeORM Helper', () => {
  const operators = {
    Not: (value: any) => ({ NOT: value }),
    MoreThan: (value: any) => ({ GT: value }),
    In: (values: any[]) => ({ IN: values }),
    Between: (start: any, end: any) => ({ BETWEEN: [start, end] }),
    Like: (value: string) => ({ LIKE: value }),
  };

  test('should finalize TypeORM filter with operator map', () => {
    const ast = parseQuery('age gt 30 and status in ["ACTIVE","DISABLED"]');
    const filter = toTypeORMFilter(ast);
    const finalized = finalizeTypeOrmFilter(filter, operators);
    const where = finalized.where as Record<string, any>;

    expect(where.age).toEqual({ GT: 30 });
    expect(where.status).toEqual({ IN: ['ACTIVE', 'DISABLED'] });
  });

  test('should handle NOT nodes', () => {
    const ast = parseQuery('not status in ["ACTIVE"]');
    const filter = toTypeORMFilter(ast);
    const finalized = finalizeTypeOrmFilter(filter, operators);
    const where = finalized.where as Record<string, any>;

    expect(where.status).toEqual({ NOT: { IN: ['ACTIVE'] } });
  });
});

describe('Adapter - Complex Queries', () => {
  test('should handle deeply nested queries', () => {
    const query = '(age gt 25 and (name eq "John" or (city eq "Paris" and country eq "France")))';
    const ast = parseQuery(query);
    
    const prismaFilter = toPrismaFilter(ast);
    const sequelizeFilter = toSequelizeFilter(ast);
    const typeormFilter = toTypeORMFilter(ast);
    
    expect(prismaFilter.where).toBeDefined();
    expect(sequelizeFilter).toBeDefined();
    expect(typeormFilter.where).toBeDefined();
  });

  test('should handle multiple OR conditions', () => {
    const query = 'name eq "John" or name eq "Jane" or name eq "Bob"';
    const ast = parseQuery(query);
    
    const prismaFilter = toPrismaFilter(ast);
    const sequelizeFilter = toSequelizeFilter(ast);
    
    expect(prismaFilter.where.OR).toBeDefined();
    expect(prismaFilter.where.OR.length).toBe(3);
    // Sequelize adapter returns metadata structure
    expect(sequelizeFilter.__qast_logical__).toBe('or');
    expect(sequelizeFilter.conditions).toBeDefined();
    expect(sequelizeFilter.conditions.length).toBe(3);
  });

  test('should handle multiple AND conditions', () => {
    const query = 'age gt 25 and name eq "John" and active eq true';
    const ast = parseQuery(query);
    
    const prismaFilter = toPrismaFilter(ast);
    const sequelizeFilter = toSequelizeFilter(ast);
    
    expect(prismaFilter.where).toHaveProperty('age');
    expect(prismaFilter.where).toHaveProperty('name');
    expect(prismaFilter.where).toHaveProperty('active');
    // Sequelize adapter returns metadata structure
    expect(sequelizeFilter.__qast_logical__).toBe('and');
    expect(sequelizeFilter.conditions).toBeDefined();
  });
});

