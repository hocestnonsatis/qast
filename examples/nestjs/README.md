# NestJS Integration Example

This example demonstrates how to use QAST with NestJS controllers and Prisma.

## Setup

1. Install dependencies:
```bash
npm install @nestjs/common @nestjs/core @nestjs/platform-express @prisma/client qast
npm install -D @nestjs/cli @nestjs/schematics prisma typescript
```

2. Initialize Prisma:
```bash
npx prisma init
```

3. Run migrations:
```bash
npx prisma migrate dev
```

4. Run the development server:
```bash
npm run start:dev
```

## Usage

Once the server is running, you can query users with filters:

```bash
# Simple comparison
GET http://localhost:3000/users?filter=age gt 25

# AND operation
GET http://localhost:3000/users?filter=age gt 25 and active eq true

# OR operation
GET http://localhost:3000/users?filter=city eq "Paris" or city eq "Tokyo"

# Complex nested query
GET http://localhost:3000/users?filter=age gt 25 and (city eq "Paris" or city eq "Tokyo")
```

## Files

- `src/users/users.controller.ts` - NestJS controller with QAST integration
- `src/users/users.service.ts` - Service layer using Prisma
- `src/users/dto/query-filter.dto.ts` - DTO for query parameters

