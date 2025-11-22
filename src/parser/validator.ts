import {
  QastNode,
  ComparisonNode,
  LogicalNode,
  WhitelistOptions,
  Operator,
  FieldTypeDefinition,
  QastValue,
  QastRangeValue,
} from '../types/ast';
import { ValidationError } from '../errors';
import { isComparisonNode, isLogicalNode, isNotNode } from '../types/ast';

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
  } else if (isNotNode(node)) {
    validateNode(node.child, whitelist);
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

  if (node.op === 'notIn' && !Array.isArray(node.value)) {
    throw new ValidationError(
      `Operator 'notIn' requires an array value, got ${typeof node.value}`,
      node.field,
      node.op
    );
  }

  if (node.op === 'between') {
    if (
      !Array.isArray(node.value) ||
      node.value.length !== 2
    ) {
      throw new ValidationError(
        `Operator 'between' requires exactly two values`,
        node.field,
        node.op
      );
    }
  }

  // Validate field type definitions if provided
  if (whitelist.fieldTypes && node.field in whitelist.fieldTypes) {
    const definition = whitelist.fieldTypes[node.field] as FieldTypeDefinition;
    validateFieldType(node, definition);
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

function validateFieldType(node: ComparisonNode, definition: FieldTypeDefinition): void {
  const { value } = node;

  if (definition.validator && !definition.validator(value)) {
    throw new ValidationError(
      `Field '${node.field}' failed custom validation`,
      node.field
    );
  }

  switch (node.op) {
    case 'in':
    case 'notIn':
      ensureArrayValues(node, definition, value);
      break;
    case 'between':
      ensureBetweenValues(node, definition, value as QastRangeValue);
      break;
    case 'contains':
    case 'startsWith':
    case 'endsWith':
      ensureStringOperation(node);
      ensurePrimitiveValue(node, definition, value);
      break;
    default:
      ensurePrimitiveValue(node, definition, value);
      break;
  }
}

function ensureArrayValues(
  node: ComparisonNode,
  definition: FieldTypeDefinition,
  value: QastValue
): void {
  if (!Array.isArray(value)) {
    throw new ValidationError(
      `Field '${node.field}' expects an array for operator '${node.op}'`,
      node.field,
      node.op
    );
  }

  value.forEach((item) => {
    ensurePrimitiveType(node, definition, item);
  });
}

function ensureBetweenValues(
  node: ComparisonNode,
  definition: FieldTypeDefinition,
  value: QastRangeValue
): void {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new ValidationError(
      `Field '${node.field}' expects exactly two values for 'between'`,
      node.field,
      node.op
    );
  }

  value.forEach((item) => {
    ensurePrimitiveType(node, definition, item);
  });
}

function ensureStringOperation(node: ComparisonNode): void {
  if (typeof node.value !== 'string') {
    throw new ValidationError(
      `Operator '${node.op}' requires a string value`,
      node.field,
      node.op
    );
  }
}

function ensurePrimitiveValue(
  node: ComparisonNode,
  definition: FieldTypeDefinition,
  value: QastValue
): void {
  if (Array.isArray(value)) {
    if (!definition.acceptsArrays) {
      throw new ValidationError(
        `Field '${node.field}' does not accept array values`,
        node.field,
        node.op
      );
    }
    value.forEach((item) => ensurePrimitiveType(node, definition, item));
    return;
  }

  ensurePrimitiveType(node, definition, value);
}

function ensurePrimitiveType(
  node: ComparisonNode,
  definition: FieldTypeDefinition,
  value: QastValue
): void {
  if (value === null) {
    if (definition.allowNull) {
      return;
    }
    throw new ValidationError(
      `Field '${node.field}' does not allow null values`,
      node.field,
      node.op
    );
  }

  switch (definition.type) {
    case 'string':
      if (typeof value !== 'string') {
        throwTypeError(node, 'string');
      }
      break;
    case 'number':
      if (typeof value !== 'number' || Number.isNaN(value)) {
        throwTypeError(node, 'number');
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') {
        throwTypeError(node, 'boolean');
      }
      break;
    case 'date':
    case 'datetime':
      if (!isParsableDate(value)) {
        throwTypeError(node, 'ISO date string');
      }
      break;
    case 'uuid':
      if (typeof value !== 'string' || !isUuid(value)) {
        throwTypeError(node, 'UUID string');
      }
      break;
    case 'enum':
      if (
        (typeof value !== 'string' && typeof value !== 'number') ||
        !definition.enumValues?.includes(value as string | number)
      ) {
        throw new ValidationError(
          `Field '${node.field}' must be one of: ${(definition.enumValues || []).join(', ')}`,
          node.field,
          node.op
        );
      }
      break;
    case 'json':
      if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
        throwTypeError(node, 'JSON primitive');
      }
      break;
    default:
      break;
  }
}

function throwTypeError(node: ComparisonNode, expected: string): never {
  throw new ValidationError(
    `Field '${node.field}' expects ${expected} values`,
    node.field,
    node.op
  );
}

function isParsableDate(value: QastValue): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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
  } else if (isNotNode(node)) {
    extractFieldsRecursive(node.child, fields);
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
  } else if (isNotNode(node)) {
    extractOperatorsRecursive(node.child, operators);
  }
}

