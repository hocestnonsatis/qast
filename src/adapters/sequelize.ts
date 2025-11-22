import {
  QastNode,
  ComparisonNode,
  LogicalNode,
  isComparisonNode,
  isLogicalNode,
  isNotNode,
  QastRangeValue,
} from '../types/ast';

/**
 * Sequelize filter type
 * 
 * Note: Sequelize uses the Op object from 'sequelize' package for operators.
 * Since Sequelize is an optional peer dependency, we cannot import Op directly.
 * 
 * This adapter returns a structure that represents the query logic, but you need
 * to transform it to use Sequelize's Op operators.
 * 
 * For simple equality, Sequelize accepts plain values: { age: 25 }
 * For other operators, you need Op: { age: { [Op.gt]: 25 } }
 * For logical operations, you need Op.and/Op.or: { [Op.and]: [...] }
 */
export type SequelizeFilter = Record<string, any>;

/**
 * Transform a QAST AST node to a Sequelize filter
 * 
 * IMPORTANT: Sequelize uses the Op object from 'sequelize', not $ operators.
 * This adapter returns a structure with metadata that you need to transform.
 * 
 * Example usage:
 * ```ts
 * import { Op } from 'sequelize';
 * import { toSequelizeFilter } from 'qast';
 * 
 * const filter = toSequelizeFilter(ast);
 * // Returns a structure like:
 * // { age: { __qast_operator__: 'gt', value: 25 } }
 * // You need to transform it:
 * // { age: { [Op.gt]: 25 } }
 * ```
 * 
 * For simple equality (eq operator), you can use plain values directly.
 */
export function toSequelizeFilter(ast: QastNode): SequelizeFilter {
  return transformNode(ast);
}

/**
 * Transform a node to Sequelize format
 */
function transformNode(node: QastNode): Record<string, any> {
  if (isComparisonNode(node)) {
    return transformComparisonNode(node);
  } else if (isLogicalNode(node)) {
    return transformLogicalNode(node);
  } else if (isNotNode(node)) {
    return {
      __qast_logical__: 'not',
      condition: transformNode(node.child),
    };
  }
  throw new Error('Invalid node type');
}

/**
 * Transform a comparison node to Sequelize format
 * 
 * Sequelize uses Op operators from 'sequelize' package.
 * Since we cannot import Op (optional peer dependency), we return metadata
 * that users can transform to use Op operators.
 * 
 * For equality (eq), Sequelize accepts plain values, so we return them directly.
 * For other operators, we return metadata that indicates the operator type.
 */
function transformComparisonNode(node: ComparisonNode): Record<string, any> {
  const { field, op, value } = node;

  // For equality, Sequelize accepts plain values
  if (op === 'eq') {
    return { [field]: value };
  }

  // For other operators, return metadata that can be transformed to use Op
  // Users need to import Op from 'sequelize' and transform:
  // { __qast_operator__: 'gt', value: 25 } -> { [Op.gt]: 25 }
  switch (op) {
    case 'ne':
      return { [field]: { __qast_operator__: 'ne', value } };
    case 'gt':
      return { [field]: { __qast_operator__: 'gt', value } };
    case 'lt':
      return { [field]: { __qast_operator__: 'lt', value } };
    case 'gte':
      return { [field]: { __qast_operator__: 'gte', value } };
    case 'lte':
      return { [field]: { __qast_operator__: 'lte', value } };
    case 'in':
      return { [field]: { __qast_operator__: 'in', value } };
    case 'notIn':
      return { [field]: { __qast_operator__: 'notIn', value } };
    case 'contains':
      // Sequelize uses Op.like for contains with wildcards
      return { [field]: { __qast_operator__: 'contains', value } };
    case 'startsWith':
      return { [field]: { __qast_operator__: 'startsWith', value } };
    case 'endsWith':
      return { [field]: { __qast_operator__: 'endsWith', value } };
    case 'between':
      return { [field]: { __qast_operator__: 'between', value: value as QastRangeValue } };
    default:
      throw new Error(`Unsupported operator: ${op}`);
  }
}

/**
 * Transform a logical node to Sequelize format
 * 
 * Sequelize uses Op.and and Op.or for logical operations.
 * Since we cannot import Op, we return metadata that indicates the logical operation.
 * 
 * Users need to transform: { __qast_logical__: 'and', conditions: [...] } 
 * to: { [Op.and]: [...] }
 */
function transformLogicalNode(node: LogicalNode): Record<string, any> {
  const leftFilter = transformNode(node.left);
  const rightFilter = transformNode(node.right);

  // Handle nested logical operations
  // Check if either side already has logical operation metadata
  const leftLogical = (leftFilter as any).__qast_logical__;
  const rightLogical = (rightFilter as any).__qast_logical__;

  if (node.type === 'AND') {
    // For AND, combine conditions
    if (leftLogical === 'and' && rightLogical === 'and') {
      // Both have AND, merge their conditions
      const leftConditions = (leftFilter as any).conditions;
      const rightConditions = (rightFilter as any).conditions;
      return {
        __qast_logical__: 'and',
        conditions: [...leftConditions, ...rightConditions],
      };
    } else if (leftLogical === 'and') {
      // Left has AND, add right to it
      const leftConditions = (leftFilter as any).conditions;
      return {
        __qast_logical__: 'and',
        conditions: [...leftConditions, rightFilter],
      };
    } else if (rightLogical === 'and') {
      // Right has AND, add left to it
      const rightConditions = (rightFilter as any).conditions;
      return {
        __qast_logical__: 'and',
        conditions: [leftFilter, ...rightConditions],
      };
    } else {
      // Neither has AND, create new AND array
      return {
        __qast_logical__: 'and',
        conditions: [leftFilter, rightFilter],
      };
    }
  } else {
    // For OR, combine conditions
    if (leftLogical === 'or' && rightLogical === 'or') {
      // Both have OR, merge their conditions
      const leftConditions = (leftFilter as any).conditions;
      const rightConditions = (rightFilter as any).conditions;
      return {
        __qast_logical__: 'or',
        conditions: [...leftConditions, ...rightConditions],
      };
    } else if (leftLogical === 'or') {
      // Left has OR, add right to it
      const leftConditions = (leftFilter as any).conditions;
      return {
        __qast_logical__: 'or',
        conditions: [...leftConditions, rightFilter],
      };
    } else if (rightLogical === 'or') {
      // Right has OR, add left to it
      const rightConditions = (rightFilter as any).conditions;
      return {
        __qast_logical__: 'or',
        conditions: [leftFilter, ...rightConditions],
      };
    } else {
      // Neither has OR, create new OR array
      return {
        __qast_logical__: 'or',
        conditions: [leftFilter, rightFilter],
      };
    }
  }
}

