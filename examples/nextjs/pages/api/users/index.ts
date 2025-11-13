import type { NextApiRequest, NextApiResponse } from 'next';
import { parseQuery, toPrismaFilter, ValidationError, ParseError } from 'qast';
import { prisma } from '../../../lib/prisma';

// Define allowed fields and operators
const allowedFields = ['id', 'name', 'email', 'age', 'active', 'city'];
const allowedOperators = ['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'in', 'contains'];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse query filter if provided
    let filter: any = {};
    
    if (req.query.filter && typeof req.query.filter === 'string') {
      try {
        const ast = parseQuery(req.query.filter, {
          allowedFields,
          allowedOperators: allowedOperators as any,
          validate: true,
        });
        
        filter = toPrismaFilter(ast);
      } catch (error) {
        if (error instanceof ValidationError) {
          return res.status(400).json({
            error: 'Validation failed',
            message: error.message,
            field: (error as any).field,
            operator: (error as any).operator,
          });
        } else if (error instanceof ParseError) {
          return res.status(400).json({
            error: 'Parse error',
            message: error.message,
          });
        }
        throw error;
      }
    }

    // Query users with filter
    const users = await prisma.user.findMany(filter);

    return res.status(200).json(users);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}

