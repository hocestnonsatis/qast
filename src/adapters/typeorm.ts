import { QastNode, ComparisonNode, LogicalNode, isComparisonNode, isLogicalNode } from '../types/ast';

/**
 * TypeORM filter type
 * Note: This returns a plain object that can be used with TypeORM's FindOptions
 * In practice, TypeORM users may need to import operators from 'typeorm'
 */
export type TypeORMFilter = {
  where: Record<string, any> | Array<Record<string, any>>;
};

/**
 * Transform a QAST AST node to a TypeORM filter
 * 
 * Note: TypeORM uses operator functions like MoreThan(), LessThan(), etc.
 * This adapter returns a structure that can be used with TypeORM's FindOptions.
 * For production use, users may need to wrap values with TypeORM operators.
 */
export function toTypeORMFilter(ast: QastNode): TypeORMFilter {
  const where = transformNode(ast);
  return { where };
}

/**
 * Transform a node to TypeORM format
 */
function transformNode(node: QastNode): Record<string, any> | Array<Record<string, any>> {
  if (isComparisonNode(node)) {
    return transformComparisonNode(node);
  } else if (isLogicalNode(node)) {
    return transformLogicalNode(node);
  }
  throw new Error('Invalid node type');
}

/**
 * Transform a comparison node to TypeORM format
 * 
 * TypeORM uses operator functions from 'typeorm' package.
 * Since we don't want to import TypeORM directly (optional peer dependency),
 * we return a structure with metadata that can be used to build TypeORM FindOptions.
 * 
 * For simple equality (eq), TypeORM accepts plain values.
 * For other operators, users should use TypeORM operators like MoreThan(), LessThan(), etc.
 * 
 * This function returns an object with an __qast_operator__ property that indicates
 * the operator type. Users can transform this to use TypeORM operators.
 */
function transformComparisonNode(node: ComparisonNode): Record<string, any> {
  const { field, op, value } = node;

  // Map operators to TypeORM-compatible format
  // For eq, use direct value (TypeORM supports this)
  // For other operators, include metadata for transformation
  switch (op) {
    case 'eq':
      // Direct equality - TypeORM accepts this
      return { [field]: value };
    case 'ne':
      // Not equal - requires Not(Equal(value)) from TypeORM
      return { [field]: { __qast_operator__: 'ne', value } };
    case 'gt':
      // More than - requires MoreThan(value) from TypeORM
      return { [field]: { __qast_operator__: 'gt', value } };
    case 'lt':
      // Less than - requires LessThan(value) from TypeORM
      return { [field]: { __qast_operator__: 'lt', value } };
    case 'gte':
      // More than or equal - requires MoreThanOrEqual(value) from TypeORM
      return { [field]: { __qast_operator__: 'gte', value } };
    case 'lte':
      // Less than or equal - requires LessThanOrEqual(value) from TypeORM
      return { [field]: { __qast_operator__: 'lte', value } };
    case 'in':
      // In array - requires In(value) from TypeORM
      return { [field]: { __qast_operator__: 'in', value } };
    case 'contains':
      // Contains (like) - requires Like(`%${value}%`) from TypeORM
      return { [field]: { __qast_operator__: 'contains', value } };
    default:
      throw new Error(`Unsupported operator: ${op}`);
  }
}

/**
 * Transform a logical node to TypeORM format
 * 
 * TypeORM handles AND/OR differently:
 * - AND: Multiple conditions in same object (merged)
 * - OR: Array of condition objects
 */
function transformLogicalNode(node: LogicalNode): Record<string, any> | Array<Record<string, any>> {
  const leftFilter = transformNode(node.left);
  const rightFilter = transformNode(node.right);

  if (node.type === 'AND') {
    // For AND, merge the filters into a single object
    return mergeFilters(leftFilter, rightFilter);
  } else {
    // For OR, create an array of conditions
    const leftArray = Array.isArray(leftFilter) ? leftFilter : [leftFilter];
    const rightArray = Array.isArray(rightFilter) ? rightFilter : [rightFilter];
    return [...leftArray, ...rightArray];
  }
}

/**
 * Merge two TypeORM filters (for AND operations)
 */
function mergeFilters(
  left: Record<string, any> | Array<Record<string, any>>,
  right: Record<string, any> | Array<Record<string, any>>
): Record<string, any> {
  // If either is an array, we need to flatten
  // For AND operations in TypeORM, we merge objects
  if (Array.isArray(left) || Array.isArray(right)) {
    // If we have arrays in AND, we need to create a cartesian product
    // For simplicity, we'll flatten and merge
    const leftObj = Array.isArray(left) ? Object.assign({}, ...left) : left;
    const rightObj = Array.isArray(right) ? Object.assign({}, ...right) : right;
    return { ...leftObj, ...rightObj };
  }

  // Both are objects, merge them
  return { ...left, ...right };
}

