import { QastNode, ComparisonNode, LogicalNode, WhitelistOptions, Operator } from '../types/ast';
import { ValidationError } from '../errors';
import { isComparisonNode, isLogicalNode } from '../types/ast';

/**
 * Validate an AST against whitelist options
 */
export function validateQuery(ast: QastNode, whitelist: WhitelistOptions): void {
  validateNode(ast, whitelist);
}

/**
 * Recursively validate a node
 */
function validateNode(node: QastNode, whitelist: WhitelistOptions): void {
  if (isComparisonNode(node)) {
    validateComparisonNode(node, whitelist);
  } else if (isLogicalNode(node)) {
    validateLogicalNode(node, whitelist);
  }
}

/**
 * Validate a comparison node
 */
function validateComparisonNode(node: ComparisonNode, whitelist: WhitelistOptions): void {
  // Validate field
  if (whitelist.allowedFields && whitelist.allowedFields.length > 0) {
    if (!whitelist.allowedFields.includes(node.field)) {
      throw new ValidationError(
        `Field '${node.field}' is not allowed. Allowed fields: ${whitelist.allowedFields.join(', ')}`,
        node.field
      );
    }
  }

  // Validate operator
  if (whitelist.allowedOperators && whitelist.allowedOperators.length > 0) {
    if (!whitelist.allowedOperators.includes(node.op)) {
      throw new ValidationError(
        `Operator '${node.op}' is not allowed. Allowed operators: ${whitelist.allowedOperators.join(', ')}`,
        node.field,
        node.op
      );
    }
  }

  // Validate operator-value combination
  if (node.op === 'in' && !Array.isArray(node.value)) {
    throw new ValidationError(
      `Operator 'in' requires an array value, got ${typeof node.value}`,
      node.field,
      node.op
    );
  }
}

/**
 * Validate a logical node
 */
function validateLogicalNode(node: LogicalNode, whitelist: WhitelistOptions): void {
  // Recursively validate left and right children
  validateNode(node.left, whitelist);
  validateNode(node.right, whitelist);
}

/**
 * Extract all fields used in an AST
 */
export function extractFields(ast: QastNode): string[] {
  const fields: string[] = [];
  extractFieldsRecursive(ast, fields);
  return [...new Set(fields)]; // Return unique fields
}

/**
 * Recursively extract fields from a node
 */
function extractFieldsRecursive(node: QastNode, fields: string[]): void {
  if (isComparisonNode(node)) {
    fields.push(node.field);
  } else if (isLogicalNode(node)) {
    extractFieldsRecursive(node.left, fields);
    extractFieldsRecursive(node.right, fields);
  }
}

/**
 * Extract all operators used in an AST
 */
export function extractOperators(ast: QastNode): Operator[] {
  const operators: Operator[] = [];
  extractOperatorsRecursive(ast, operators);
  return [...new Set(operators)]; // Return unique operators
}

/**
 * Recursively extract operators from a node
 */
function extractOperatorsRecursive(node: QastNode, operators: Operator[]): void {
  if (isComparisonNode(node)) {
    operators.push(node.op);
  } else if (isLogicalNode(node)) {
    extractOperatorsRecursive(node.left, operators);
    extractOperatorsRecursive(node.right, operators);
  }
}

