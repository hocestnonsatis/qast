import { QastNode, ComparisonNode, LogicalNode, isComparisonNode, isLogicalNode } from '../types/ast';

/**
 * Prisma filter type
 */
export type PrismaFilter = {
  where: Record<string, any>;
};

/**
 * Transform a QAST AST node to a Prisma filter
 */
export function toPrismaFilter(ast: QastNode): PrismaFilter {
  return {
    where: transformNode(ast),
  };
}

/**
 * Transform a node to Prisma format
 */
function transformNode(node: QastNode): Record<string, any> {
  if (isComparisonNode(node)) {
    return transformComparisonNode(node);
  } else if (isLogicalNode(node)) {
    return transformLogicalNode(node);
  }
  throw new Error('Invalid node type');
}

/**
 * Transform a comparison node to Prisma format
 */
function transformComparisonNode(node: ComparisonNode): Record<string, any> {
  const { field, op, value } = node;

  // Map operators to Prisma operators
  switch (op) {
    case 'eq':
      return { [field]: { equals: value } };
    case 'ne':
      return { [field]: { not: value } };
    case 'gt':
      return { [field]: { gt: value } };
    case 'lt':
      return { [field]: { lt: value } };
    case 'gte':
      return { [field]: { gte: value } };
    case 'lte':
      return { [field]: { lte: value } };
    case 'in':
      return { [field]: { in: value } };
    case 'contains':
      return { [field]: { contains: value } };
    default:
      throw new Error(`Unsupported operator: ${op}`);
  }
}

/**
 * Transform a logical node to Prisma format
 */
function transformLogicalNode(node: LogicalNode): Record<string, any> {
  const leftFilter = transformNode(node.left);
  const rightFilter = transformNode(node.right);

  if (node.type === 'AND') {
    // For AND, merge the filters
    return mergeFilters(leftFilter, rightFilter);
  } else {
    // For OR, create an OR array
    // If either side already has an OR, we need to flatten
    const leftOr = leftFilter.OR;
    const rightOr = rightFilter.OR;

    if (leftOr && rightOr) {
      // Both have OR arrays, combine them
      return {
        OR: [...leftOr, ...rightOr],
      };
    } else if (leftOr) {
      // Left has OR, add right to it
      return {
        OR: [...leftOr, rightFilter],
      };
    } else if (rightOr) {
      // Right has OR, add left to it
      return {
        OR: [leftFilter, ...rightOr],
      };
    } else {
      // Neither has OR, create new OR array
      return {
        OR: [leftFilter, rightFilter],
      };
    }
  }
}

/**
 * Merge two Prisma filters (for AND operations)
 */
function mergeFilters(left: Record<string, any>, right: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = { ...left };

  // Handle OR arrays - if both have OR, we need to combine them properly
  // For AND with OR, Prisma requires: { field: value, OR: [...] }
  if (left.OR || right.OR) {
    // If both sides have OR, we need to distribute
    // This is complex - for now, we'll merge non-OR fields and keep OR separate
    const leftOr = left.OR;
    const rightOr = right.OR;

    // Remove OR from both objects
    const leftWithoutOr = { ...left };
    const rightWithoutOr = { ...right };
    delete leftWithoutOr.OR;
    delete rightWithoutOr.OR;

    // Merge non-OR fields
    Object.assign(result, leftWithoutOr);
    Object.assign(result, rightWithoutOr);

    // Handle OR arrays - in Prisma, when ANDing with OR, we need to be careful
    if (leftOr && rightOr) {
      // This is complex - we'll create nested conditions
      // For simplicity, we'll merge all fields and combine ORs
      result.OR = [...(leftOr || []), ...(rightOr || [])];
    } else if (leftOr) {
      result.OR = leftOr;
    } else if (rightOr) {
      result.OR = rightOr;
    }
  } else {
    // Simple merge - combine all fields
    Object.assign(result, right);
  }

  return result;
}

