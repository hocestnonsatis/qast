import {
  QastNode,
  ComparisonNode,
  LogicalNode,
  isComparisonNode,
  isLogicalNode,
  isNotNode,
  QastRangeValue,
} from '../types/ast';

export type MongoFilter = Record<string, any>;

export function toMongoFilter(ast: QastNode): MongoFilter {
  return transformNode(ast);
}

function transformNode(node: QastNode): MongoFilter {
  if (isComparisonNode(node)) {
    return transformComparison(node);
  }

  if (isLogicalNode(node)) {
    return transformLogical(node);
  }

  if (isNotNode(node)) {
    return {
      $nor: [transformNode(node.child)],
    };
  }

  throw new Error('Invalid node type');
}

function transformComparison(node: ComparisonNode): MongoFilter {
  const { field, op, value } = node;

  switch (op) {
    case 'eq':
      return { [field]: value };
    case 'ne':
      return { [field]: { $ne: value } };
    case 'gt':
      return { [field]: { $gt: value } };
    case 'gte':
      return { [field]: { $gte: value } };
    case 'lt':
      return { [field]: { $lt: value } };
    case 'lte':
      return { [field]: { $lte: value } };
    case 'in':
      return { [field]: { $in: value } };
    case 'notIn':
      return { [field]: { $nin: value } };
    case 'contains':
      return { [field]: buildRegex(value as string, 'contains') };
    case 'startsWith':
      return { [field]: buildRegex(value as string, 'startsWith') };
    case 'endsWith':
      return { [field]: buildRegex(value as string, 'endsWith') };
    case 'between': {
      const [start, end] = value as QastRangeValue;
      const range: Record<string, any> = {};
      if (start !== null && start !== undefined) {
        range.$gte = start;
      }
      if (end !== null && end !== undefined) {
        range.$lte = end;
      }
      return { [field]: range };
    }
    default:
      throw new Error(`Unsupported operator: ${op}`);
  }
}

function transformLogical(node: LogicalNode): MongoFilter {
  const operator = node.type === 'AND' ? '$and' : '$or';
  const left = transformNode(node.left);
  const right = transformNode(node.right);

  const conditions = flattenLogical(operator, [left, right]);

  return {
    [operator]: conditions,
  };
}

function flattenLogical(operator: '$and' | '$or', nodes: MongoFilter[]): MongoFilter[] {
  const flattened: MongoFilter[] = [];
  nodes.forEach((node) => {
    if (node[operator]) {
      flattened.push(...node[operator]);
    } else {
      flattened.push(node);
    }
  });
  return flattened;
}

function buildRegex(value: string, mode: 'contains' | 'startsWith' | 'endsWith') {
  let pattern = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  if (mode === 'contains') {
    pattern = `.*${pattern}.*`;
  } else if (mode === 'startsWith') {
    pattern = `^${pattern}.*`;
  } else if (mode === 'endsWith') {
    pattern = `.*${pattern}$`;
  }

  return { $regex: pattern, $options: 'i' };
}
