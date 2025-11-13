import { parseQuery, toPrismaFilter, toTypeORMFilter, toSequelizeFilter } from '../src/index';

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

