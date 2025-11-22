/**
 * Supported comparison operators
 */
export type Operator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'in'
  | 'notIn'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'between';

/**
 * Supported value types in comparisons
 */
export type QastPrimitive = string | number | boolean | null;
export type QastArrayValue = QastPrimitive[];
export type QastRangeValue = [QastPrimitive, QastPrimitive];
export type QastValue = QastPrimitive | QastArrayValue | QastRangeValue;

/**
 * Logical operator type
 */
export type LogicalOperator = 'AND' | 'OR';

export interface NotNode {
  type: 'NOT';
  child: QastNode;
}

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
export type QastNode = LogicalNode | ComparisonNode | NotNode;

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

export function isNotNode(node: QastNode): node is NotNode {
  return node.type === 'NOT';
}

export type FieldPrimitiveType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'enum'
  | 'uuid'
  | 'json';

export interface FieldTypeDefinition {
  type: FieldPrimitiveType;
  allowNull?: boolean;
  acceptsArrays?: boolean;
  enumValues?: Array<string | number>;
  elementType?: FieldPrimitiveType;
  validator?: (value: QastValue) => boolean;
}

export type FieldTypeMap = Record<string, FieldTypeDefinition>;

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

  /**
   * Field type definitions (forwarded to validator when validate=true)
   */
  fieldTypes?: FieldTypeMap;

  /**
   * Maximum allowed AST depth (to limit nested expressions)
   */
  maxDepth?: number;

  /**
   * Maximum allowed number of nodes (comparisons + logical operators)
   */
  maxNodes?: number;

  /**
   * Maximum allowed number of comparison clauses
   */
  maxClauses?: number;
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

  /**
   * Field type definitions for value validation
   */
  fieldTypes?: FieldTypeMap;
}

