# Next.js API Routes Example

This example demonstrates how to use QAST with Next.js API routes and Prisma.

## Setup

1. Install dependencies:
```bash
npm install @prisma/client qast
npm install -D prisma
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
npm run dev
```

## Usage

Once the server is running, you can query users with filters:

```bash
# Simple comparison
GET http://localhost:3000/api/users?filter=age gt 25

# AND operation
GET http://localhost:3000/api/users?filter=age gt 25 and active eq true

# OR operation
GET http://localhost:3000/api/users?filter=city eq "Paris" or city eq "Tokyo"

# Complex nested query
GET http://localhost:3000/api/users?filter=age gt 25 and (city eq "Paris" or city eq "Tokyo")
```

## Files

- `pages/api/users/index.ts` - API route handler for `/api/users`
- `lib/prisma.ts` - Prisma client singleton

