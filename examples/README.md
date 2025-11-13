# QAST Examples

This directory contains complete, working examples of how to use QAST with popular frameworks and ORMs.

## Available Examples

### 1. Express.js REST API

A full Express.js server using QAST with Prisma for query filtering.

- **Location**: [`express/`](./express)
- **Framework**: Express.js
- **ORM**: Prisma
- **Features**: REST API with query filtering middleware

### 2. Next.js API Routes

Next.js API routes example showing how to integrate QAST.

- **Location**: [`nextjs/`](./nextjs)
- **Framework**: Next.js
- **ORM**: Prisma
- **Features**: API routes with query filtering

### 3. NestJS Integration

NestJS controller and service example using QAST for query filtering.

- **Location**: [`nestjs/`](./nestjs)
- **Framework**: NestJS
- **ORM**: Prisma
- **Features**: NestJS controller with DTOs and query filtering

### 4. Interactive Playground

A simple HTML playground to test QAST queries interactively (demo version).

- **Location**: [`playground.html`](./playground.html)
- **Features**: Interactive query testing, AST visualization, ORM filter preview

## Quick Start

Each example includes its own README with setup instructions. To get started:

1. Choose an example
2. Navigate to the example directory
3. Follow the setup instructions in the example's README

## Common Setup Steps

Most examples require:

1. **Install dependencies**:
```bash
npm install
```

2. **Initialize Prisma** (if using Prisma):
```bash
npx prisma init
```

3. **Create database schema**:
```bash
npx prisma migrate dev
```

4. **Run the example**:
```bash
npm run dev
# or
npm start
```

## Query Examples

All examples support the same QAST query syntax:

```bash
# Simple comparison
?filter=age gt 25

# AND operation
?filter=age gt 25 and active eq true

# OR operation
?filter=city eq "Paris" or city eq "Tokyo"

# Complex nested query
?filter=age gt 25 and (city eq "Paris" or city eq "Tokyo")

# IN operator
?filter=age in [25, 30, 35]

# Contains operator
?filter=name contains "John"
```

## Contributing

If you'd like to add more examples, please follow the structure of existing examples and include:
- A README with setup instructions
- Working code that demonstrates QAST usage
- Clear comments explaining the integration points

