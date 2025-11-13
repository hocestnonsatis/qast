/**
 * QAST - Query to AST to ORM
 * 
 * A library that parses human-readable query strings into ASTs
 * and transforms them into ORM-compatible filter objects.
 */

// Export parser
export { parseQueryString } from './parser/parser';
export { Tokenizer, Token, TokenType } from './parser/tokenizer';

// Export validators
export { validateQuery, extractFields, extractOperators } from './parser/validator';

// Export adapters
export { toPrismaFilter, PrismaFilter } from './adapters/prisma';
export { toTypeORMFilter, TypeORMFilter } from './adapters/typeorm';
export { toSequelizeFilter, SequelizeFilter } from './adapters/sequelize';

// Export types
export {
  QastNode,
  ComparisonNode,
  LogicalNode,
  LogicalOperator,
  Operator,
  QastValue,
  ParseOptions,
  WhitelistOptions,
  isComparisonNode,
  isLogicalNode,
} from './types/ast';

// Export errors
export {
  QastError,
  ParseError,
  ValidationError,
  TokenizationError,
} from './errors';

// Main parse function with options
import { parseQueryString } from './parser/parser';
import { validateQuery } from './parser/validator';
import { ParseOptions, QastNode, WhitelistOptions } from './types/ast';

/**
 * Parse a query string into an AST
 * 
 * @param query - The query string to parse (e.g., 'age gt 25 and name eq "John"')
 * @param options - Optional parsing options (whitelisting, validation)
 * @returns The parsed AST node
 * 
 * @example
 * ```ts
 * const ast = parseQuery('age gt 25 and name eq "John"');
 * ```
 * 
 * @example
 * ```ts
 * const ast = parseQuery('age gt 25', {
 *   allowedFields: ['age', 'name'],
 *   allowedOperators: ['gt', 'eq'],
 *   validate: true,
 * });
 * ```
 */
export function parseQuery(query: string, options?: ParseOptions): QastNode {
  const ast = parseQueryString(query);

  // Validate if options are provided and validation is enabled
  if (options && options.validate !== false) {
    const whitelist: WhitelistOptions = {
      allowedFields: options.allowedFields,
      allowedOperators: options.allowedOperators,
    };

    // Only validate if whitelists are provided
    if (whitelist.allowedFields || whitelist.allowedOperators) {
      validateQuery(ast, whitelist);
    }
  }

  return ast;
}

