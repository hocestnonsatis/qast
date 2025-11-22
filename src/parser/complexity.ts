import { QastNode, isComparisonNode, isLogicalNode, isNotNode } from '../types/ast';
import { QueryComplexityError } from '../errors';

interface ComplexityStats {
  depth: number;
  nodes: number;
  clauses: number;
}

export interface ComplexityLimits {
  maxDepth?: number;
  maxNodes?: number;
  maxClauses?: number;
}

export function enforceQueryComplexity(ast: QastNode, limits: ComplexityLimits): void {
  const stats = calculateStats(ast);

  if (limits.maxDepth !== undefined && stats.depth > limits.maxDepth) {
    throw new QueryComplexityError(
      `Query exceeds maximum depth of ${limits.maxDepth} (received depth ${stats.depth})`
    );
  }

  if (limits.maxNodes !== undefined && stats.nodes > limits.maxNodes) {
    throw new QueryComplexityError(
      `Query exceeds maximum node count of ${limits.maxNodes} (received ${stats.nodes})`
    );
  }

  if (limits.maxClauses !== undefined && stats.clauses > limits.maxClauses) {
    throw new QueryComplexityError(
      `Query exceeds maximum clause count of ${limits.maxClauses} (received ${stats.clauses})`
    );
  }
}

function calculateStats(node: QastNode): ComplexityStats {
  if (isComparisonNode(node)) {
    return {
      depth: 1,
      nodes: 1,
      clauses: 1,
    };
  }

  if (isNotNode(node)) {
    const childStats = calculateStats(node.child);
    return {
      depth: childStats.depth + 1,
      nodes: childStats.nodes + 1,
      clauses: childStats.clauses,
    };
  }

  if (isLogicalNode(node)) {
    const leftStats = calculateStats(node.left);
    const rightStats = calculateStats(node.right);
    return {
      depth: Math.max(leftStats.depth, rightStats.depth) + 1,
      nodes: leftStats.nodes + rightStats.nodes + 1,
      clauses: leftStats.clauses + rightStats.clauses,
    };
  }

  return {
    depth: 0,
    nodes: 0,
    clauses: 0,
  };
}
