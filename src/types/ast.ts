/**
 * Supported comparison operators
 */
export type Operator = 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';

/**
 * Supported value types in comparisons
 */
export type QastValue = string | number | boolean | string[] | number[];

/**
 * Logical operator type
 */
export type LogicalOperator = 'AND' | 'OR';

/**
 * Comparison node representing a field comparison operation
 */
export interface ComparisonNode {
  type: 'COMPARISON';
  field: string;
  op: Operator;
  value: QastValue;
}

/**
 * Logical node representing a logical operation (AND/OR) between two nodes
 */
export interface LogicalNode {
  type: LogicalOperator;
  left: QastNode;
  right: QastNode;
}

/**
 * Root AST node type - can be either a comparison or a logical operation
 */
export type QastNode = LogicalNode | ComparisonNode;

/**
 * Type guard to check if a node is a ComparisonNode
 */
export function isComparisonNode(node: QastNode): node is ComparisonNode {
  return node.type === 'COMPARISON';
}

/**
 * Type guard to check if a node is a LogicalNode
 */
export function isLogicalNode(node: QastNode): node is LogicalNode {
  return node.type === 'AND' || node.type === 'OR';
}

/**
 * Options for parsing queries
 */
export interface ParseOptions {
  /**
   * List of allowed field names. If provided, only these fields can be used in queries.
   */
  allowedFields?: string[];

  /**
   * List of allowed operators. If provided, only these operators can be used in queries.
   */
  allowedOperators?: Operator[];

  /**
   * Whether to validate the query against whitelists after parsing
   */
  validate?: boolean;
}

/**
 * Options for query validation
 */
export interface WhitelistOptions {
  /**
   * List of allowed field names
   */
  allowedFields?: string[];

  /**
   * List of allowed operators
   */
  allowedOperators?: Operator[];
}

