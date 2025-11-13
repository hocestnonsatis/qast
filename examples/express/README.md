# Express.js REST API Example

This example demonstrates how to use QAST with Express.js and Prisma to create a REST API with query filtering.

## Setup

1. Install dependencies:
```bash
npm install express @prisma/client qast
npm install -D typescript @types/express @types/node ts-node prisma
```

2. Initialize Prisma:
```bash
npx prisma init
```

3. Run migrations:
```bash
npx prisma migrate dev
```

4. Run the server:
```bash
npm run dev
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

# IN operator
GET http://localhost:3000/users?filter=age in [25, 30, 35]

# Contains operator
GET http://localhost:3000/users?filter=name contains "John"
```

## Example Response

```json
[
  {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "age": 30,
    "active": true,
    "city": "New York",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
]
```

