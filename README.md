# QAST — Query to AST to ORM

[![npm version](https://img.shields.io/npm/v/qast.svg)](https://www.npmjs.com/package/qast)
[![npm downloads](https://img.shields.io/npm/dm/qast.svg)](https://www.npmjs.com/package/qast)
[![GitHub stars](https://img.shields.io/github/stars/hocestnonsatis/qast.svg)](https://github.com/hocestnonsatis/qast)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/npm/l/qast.svg)](https://github.com/hocestnonsatis/qast/blob/main/LICENSE)

**QAST** is a small, ORM-agnostic library that parses human-readable query strings (e.g. `age gt 25 and (name eq "John" or city eq "Paris")`) into an **Abstract Syntax Tree (AST)** and then transforms that AST into **ORM-compatible filter objects** such as Prisma or TypeORM filters.

It aims to provide a secure, declarative, and type-safe way to support advanced filtering in REST APIs — without falling into the pitfalls of raw string-based query patterns.

## Features

- 🔒 **Safe**: Validates operators, values, and fields against whitelists
- 🎯 **Type-Safe**: Full TypeScript support for parsed ASTs and generated filters
- 🔌 **ORM-Agnostic**: Works with Prisma, TypeORM, Sequelize, and more via adapters
- 📝 **Simple Syntax**: Natural query expressions using logical operators
- 🚀 **Lightweight**: No dependencies, small bundle size

## Installation

```bash
npm install qast
```

## Quick Start

### Basic Usage

```typescript
import { parseQuery, toPrismaFilter } from 'qast';

const query = 'age gt 25 and (name eq "John" or city eq "Paris")';

const ast = parseQuery(query);
const prismaFilter = toPrismaFilter(ast);

await prisma.user.findMany(prismaFilter);
```

### With Validation

```typescript
import { parseQuery, toPrismaFilter } from 'qast';

const query = 'age gt 25 and name eq "John"';

// Parse with whitelist validation
const ast = parseQuery(query, {
  allowedFields: ['age', 'name', 'city'],
  allowedOperators: ['gt', 'eq', 'lt'],
  validate: true,
});

const prismaFilter = toPrismaFilter(ast);
await prisma.user.findMany(prismaFilter);
```

## Query Syntax

### Operators

QAST supports the following comparison operators:

- `eq` - Equal
- `ne` - Not equal
- `gt` - Greater than
- `lt` - Less than
- `gte` - Greater than or equal
- `lte` - Less than or equal
- `in` - In array
- `contains` - Contains substring (string matching)

### Logical Operators

- `and` - Logical AND
- `or` - Logical OR

### Values

- **Strings**: Use single or double quotes: `"John"` or `'John'`
- **Numbers**: Integers or floats: `25`, `25.99`, `-10`
- **Booleans**: `true` or `false`
- **Arrays**: For `in` operator: `[1,2,3]` or `["John","Jane"]`

### Examples

```typescript
// Simple comparison
'age gt 25'

// String comparison
'name eq "John"'

// Boolean comparison
'active eq true'

// Array (in operator)
'age in [1,2,3]'

// AND operation
'age gt 25 and name eq "John"'

// OR operation
'name eq "John" or name eq "Jane"'

// Nested parentheses
'age gt 25 and (name eq "John" or city eq "Paris")'

// Complex query
'age gt 25 and (name eq "John" or city eq "Paris") and active eq true'
```

## ORM Adapters

### Prisma

```typescript
import { parseQuery, toPrismaFilter } from 'qast';

const query = 'age gt 25 and name eq "John"';
const ast = parseQuery(query);
const filter = toPrismaFilter(ast);

// filter = {
//   where: {
//     age: { gt: 25 },
//     name: { equals: "John" }
//   }
// }

await prisma.user.findMany(filter);
```

### TypeORM

```typescript
import { parseQuery, toTypeORMFilter } from 'qast';
import { MoreThan, Equal } from 'typeorm';

const query = 'age gt 25 and name eq "John"';
const ast = parseQuery(query);
const filter = toTypeORMFilter(ast);

// Note: TypeORM requires operator functions for non-equality comparisons
// The adapter returns a structure that you can transform using TypeORM operators
// For equality, TypeORM accepts plain values directly

// filter.where = {
//   age: { __qast_operator__: 'gt', value: 25 },
//   name: "John"
// }

// Transform to use TypeORM operators:
// const transformed = {
//   age: MoreThan(25),
//   name: "John"
// }

await userRepository.find({ where: transformed });
```

**Note**: TypeORM requires operator functions (`MoreThan`, `LessThan`, etc.) for non-equality comparisons. The adapter returns a structure with metadata that you can transform. For equality comparisons, TypeORM accepts plain values.

### Sequelize

```typescript
import { parseQuery, toSequelizeFilter } from 'qast';
import { Op } from 'sequelize';

const query = 'age gt 25 and name eq "John"';
const ast = parseQuery(query);
const filter = toSequelizeFilter(ast);

// filter = {
//   __qast_logical__: 'and',
//   conditions: [
//     { age: { __qast_operator__: 'gt', value: 25 } },
//     { name: 'John' }
//   ]
// }

// Transform to use Sequelize Op operators:
function transformSequelizeFilter(filter: any): any {
  if (filter.__qast_logical__) {
    const op = filter.__qast_logical__ === 'and' ? Op.and : Op.or;
    return {
      [op]: filter.conditions.map(transformSequelizeFilter),
    };
  }
  
  const result: any = {};
  for (const [key, value] of Object.entries(filter)) {
    if (value && typeof value === 'object' && '__qast_operator__' in value) {
      const opKey = value.__qast_operator__;
      const op = Op[opKey as keyof typeof Op];
      if (opKey === 'contains') {
        result[key] = { [Op.like]: `%${value.value}%` };
      } else {
        result[key] = { [op]: value.value };
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

const transformed = transformSequelizeFilter(filter);
// transformed = {
//   [Op.and]: [
//     { age: { [Op.gt]: 25 } },
//     { name: 'John' }
//   ]
// }

await User.findAll({ where: transformed });
```

**Note**: Sequelize uses the `Op` object from 'sequelize'. Since Sequelize is an optional peer dependency, the adapter returns a structure with metadata (`__qast_operator__` and `__qast_logical__`) that you need to transform to use `Op` operators. For simple equality (`eq`), the adapter returns plain values which Sequelize accepts directly.

## API Reference

### `parseQuery(query: string, options?: ParseOptions): QastNode`

Parse a query string into an AST.

**Parameters:**
- `query` - The query string to parse
- `options` - Optional parsing options:
  - `allowedFields?: string[]` - Whitelist of allowed field names
  - `allowedOperators?: Operator[]` - Whitelist of allowed operators
  - `validate?: boolean` - Whether to validate against whitelists (default: true if whitelists are provided)

**Returns:** The parsed AST node

**Example:**
```typescript
const ast = parseQuery('age gt 25', {
  allowedFields: ['age', 'name'],
  allowedOperators: ['gt', 'eq'],
  validate: true,
});
```

### `toPrismaFilter(ast: QastNode): PrismaFilter`

Transform an AST to a Prisma filter.

**Returns:** Prisma filter object with `where` property

### `toTypeORMFilter(ast: QastNode): TypeORMFilter`

Transform an AST to a TypeORM filter.

**Returns:** TypeORM filter object with `where` property

**Note:** TypeORM requires operator functions for non-equality comparisons. You may need to transform the result.

### `toSequelizeFilter(ast: QastNode): SequelizeFilter`

Transform an AST to a Sequelize filter.

**Returns:** Sequelize filter object

**Note:** Sequelize uses the `Op` object. You need to transform `$`-prefixed operators to use `Op` operators.

### `validateQuery(ast: QastNode, whitelist: WhitelistOptions): void`

Validate an AST against whitelists.

**Parameters:**
- `ast` - The AST to validate
- `whitelist` - Whitelist options:
  - `allowedFields?: string[]` - Allowed field names
  - `allowedOperators?: Operator[]` - Allowed operators

**Throws:** `ValidationError` if validation fails

### `extractFields(ast: QastNode): string[]`

Extract all field names used in an AST.

**Returns:** Array of unique field names

### `extractOperators(ast: QastNode): Operator[]`

Extract all operators used in an AST.

**Returns:** Array of unique operators

## Security Best Practices

1. **Always use whitelists**: Restrict which fields and operators can be used in queries.

```typescript
const ast = parseQuery(req.query.filter, {
  allowedFields: ['age', 'name', 'city'],
  allowedOperators: ['gt', 'eq', 'lt'],
  validate: true,
});
```

2. **Validate user input**: Don't trust user-provided query strings without validation.

3. **Limit query complexity**: Consider limiting the depth of nested queries to prevent DoS attacks.

4. **Use type checking**: Ensure values match expected types for fields.

## Error Handling

QAST provides custom error classes:

- `ParseError` - Syntax errors in query strings
- `ValidationError` - Validation failures (disallowed fields/operators)
- `TokenizationError` - Tokenization errors

```typescript
import { parseQuery, ParseError, ValidationError } from 'qast';

try {
  const ast = parseQuery(query, { allowedFields: ['age'], validate: true });
} catch (error) {
  if (error instanceof ParseError) {
    console.error('Parse error:', error.message);
  } else if (error instanceof ValidationError) {
    console.error('Validation error:', error.message);
    console.error('Field:', error.field);
    console.error('Operator:', error.operator);
  }
}
```

## TypeScript Support

QAST is written in TypeScript and provides full type definitions:

```typescript
import { QastNode, ComparisonNode, LogicalNode, Operator } from 'qast';

function processNode(node: QastNode): void {
  if (node.type === 'COMPARISON') {
    const comparison = node as ComparisonNode;
    console.log(comparison.field, comparison.op, comparison.value);
  } else if (node.type === 'AND' || node.type === 'OR') {
    const logical = node as LogicalNode;
    processNode(logical.left);
    processNode(logical.right);
  }
}
```

## Examples

### REST API Endpoint

```typescript
import { parseQuery, toPrismaFilter } from 'qast';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

app.get('/users', async (req, res) => {
  try {
    const query = req.query.filter as string;
    
    // Parse and validate query
    const ast = parseQuery(query, {
      allowedFields: ['age', 'name', 'city', 'active'],
      allowedOperators: ['gt', 'lt', 'eq', 'in'],
      validate: true,
    });
    
    // Transform to Prisma filter
    const filter = toPrismaFilter(ast);
    
    // Query database
    const users = await prisma.user.findMany(filter);
    
    res.json(users);
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});
```

### Express Middleware

```typescript
import { parseQuery, toPrismaFilter, ValidationError } from 'qast';

function qastMiddleware(allowedFields: string[], allowedOperators: Operator[]) {
  return (req, res, next) => {
    try {
      if (req.query.filter) {
        const ast = parseQuery(req.query.filter, {
          allowedFields,
          allowedOperators,
          validate: true,
        });
        
        req.qastFilter = toPrismaFilter(ast);
      }
      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else {
        next(error);
      }
    }
  };
}
```

## Comparison with Alternatives

### Why QAST?

| Feature | QAST | GraphQL | OData | Custom Parsers |
|---------|------|---------|-------|----------------|
| **Type Safety** | ✅ Full TypeScript | ❌ Runtime only | ⚠️ Partial | ❌ Usually none |
| **Security** | ✅ Whitelist validation | ✅ Built-in | ✅ Built-in | ⚠️ Manual |
| **ORM Agnostic** | ✅ Yes | ❌ No | ❌ No | ⚠️ Varies |
| **Zero Dependencies** | ✅ Yes | ❌ No | ❌ No | ⚠️ Varies |
| **Learning Curve** | ✅ Simple | ❌ Complex | ❌ Complex | ⚠️ Varies |
| **REST API Friendly** | ✅ Yes | ❌ Requires GraphQL endpoint | ✅ Yes | ⚠️ Varies |
| **Bundle Size** | ✅ < 10KB | ❌ Large | ❌ Large | ⚠️ Varies |

**Use QAST when:**
- You want a simple, secure query language for REST APIs
- You need type-safe query parsing with TypeScript
- You're using Prisma, TypeORM, or Sequelize
- You want zero dependencies and a small bundle size
- You need field and operator whitelisting for security

**Consider alternatives when:**
- You need GraphQL's full query capabilities
- You require standardized query protocols (OData)
- You have complex nested data relationships

## Examples

See the [`examples`](./examples) directory for complete, working examples:

- [Express.js REST API](./examples/express) - Full Express.js server with Prisma
- [Next.js API Routes](./examples/nextjs) - Next.js API routes with QAST
- [NestJS Integration](./examples/nestjs) - NestJS controller with query filtering
- [Interactive Playground](./examples/playground.html) - Try QAST queries in your browser (demo)

## License

MIT © 2025

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

- GitHub Repository: https://github.com/hocestnonsatis/qast
- Issues: https://github.com/hocestnonsatis/qast/issues

## Acknowledgments

QAST is inspired by the need for safe, type-safe query parsing in REST APIs. It aims to provide a lightweight alternative to complex query protocols while maintaining security and developer experience.
