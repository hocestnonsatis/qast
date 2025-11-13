import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { parseQuery, toPrismaFilter, ValidationError, ParseError } from 'qast';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middleware to parse query filters
app.use(express.json());

// QAST middleware for query parsing
function qastMiddleware(allowedFields: string[], allowedOperators: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.query.filter && typeof req.query.filter === 'string') {
        const ast = parseQuery(req.query.filter, {
          allowedFields,
          allowedOperators: allowedOperators as any,
          validate: true,
        });
        
        (req as any).qastFilter = toPrismaFilter(ast);
      }
      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ 
          error: 'Validation failed',
          message: error.message,
          field: (error as any).field,
          operator: (error as any).operator,
        });
      } else if (error instanceof ParseError) {
        res.status(400).json({ 
          error: 'Parse error',
          message: error.message,
        });
      } else {
        next(error);
      }
    }
  };
}

// Define allowed fields and operators
const allowedFields = ['id', 'name', 'email', 'age', 'active', 'city'];
const allowedOperators = ['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'in', 'contains'];

// Apply QAST middleware to all routes
app.use(qastMiddleware(allowedFields, allowedOperators));

// GET /users - Get all users with optional filtering
app.get('/users', async (req: Request, res: Response) => {
  try {
    const filter = (req as any).qastFilter || {};
    const users = await prisma.user.findMany(filter);
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// GET /users/:id - Get a single user
app.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Try: GET http://localhost:${PORT}/users?filter=age gt 25`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

