import { QastNode, ComparisonNode, isComparisonNode, isLogicalNode, isNotNode, QastRangeValue } from '../types/ast';

export interface SqlFilter {
  text: string;
  params: any[];
}

export type DrizzleFilter = SqlFilter;

export function toSqlFilter(ast: QastNode): SqlFilter {
  return new SqlFilterBuilder().build(ast);
}

export function toDrizzleFilter(ast: QastNode): DrizzleFilter {
  return toSqlFilter(ast);
}

class SqlFilterBuilder {
  private params: any[] = [];

  build(ast: QastNode): SqlFilter {
    const text = this.transformNode(ast);
    return {
      text,
      params: this.params,
    };
  }

  private transformNode(node: QastNode): string {
    if (isComparisonNode(node)) {
      return this.transformComparison(node);
    }

    if (isLogicalNode(node)) {
      const left = this.transformNode(node.left);
      const right = this.transformNode(node.right);
      const operator = node.type === 'AND' ? 'AND' : 'OR';
      return `(${left} ${operator} ${right})`;
    }

    if (isNotNode(node)) {
      const clause = this.transformNode(node.child);
      return `(NOT (${clause}))`;
    }

    throw new Error('Invalid node type');
  }

  private transformComparison(node: ComparisonNode): string {
    const column = quoteIdentifier(node.field);
    const value = node.value;

    switch (node.op) {
      case 'eq':
        return this.eqClause(column, value);
      case 'ne':
        return this.neClause(column, value);
      case 'gt':
        return `${column} > ${this.placeholder(value)}`;
      case 'gte':
        return `${column} >= ${this.placeholder(value)}`;
      case 'lt':
        return `${column} < ${this.placeholder(value)}`;
      case 'lte':
        return `${column} <= ${this.placeholder(value)}`;
      case 'in':
        return this.listClause(column, value as any[], false);
      case 'notIn':
        return this.listClause(column, value as any[], true);
      case 'contains':
        return `${column} LIKE ${this.placeholder(`%${value}%`)}`;
      case 'startsWith':
        return `${column} LIKE ${this.placeholder(`${value}%`)}`;
      case 'endsWith':
        return `${column} LIKE ${this.placeholder(`%${value}`)}`;
      case 'between':
        return this.betweenClause(column, value as QastRangeValue);
      default:
        throw new Error(`Unsupported operator: ${node.op}`);
    }
  }

  private eqClause(column: string, value: any): string {
    if (value === null) {
      return `${column} IS NULL`;
    }
    return `${column} = ${this.placeholder(value)}`;
  }

  private neClause(column: string, value: any): string {
    if (value === null) {
      return `${column} IS NOT NULL`;
    }
    return `${column} <> ${this.placeholder(value)}`;
  }

  private listClause(column: string, values: any[], negate: boolean): string {
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error(`Operator '${negate ? 'notIn' : 'in'}' requires at least one value.`);
    }
    const placeholders = values.map((v) => this.placeholder(v)).join(', ');
    const operator = negate ? 'NOT IN' : 'IN';
    return `${column} ${operator} (${placeholders})`;
  }

  private betweenClause(column: string, range: QastRangeValue): string {
    const [start, end] = range;
    const hasStart = start !== null && start !== undefined;
    const hasEnd = end !== null && end !== undefined;

    if (hasStart && hasEnd) {
      return `${column} BETWEEN ${this.placeholder(start)} AND ${this.placeholder(end)}`;
    }

    if (hasStart) {
      return `${column} >= ${this.placeholder(start)}`;
    }

    if (hasEnd) {
      return `${column} <= ${this.placeholder(end)}`;
    }

    return '1 = 1';
  }

  private placeholder(value: any): string {
    this.params.push(value);
    return `$${this.params.length}`;
  }
}

function quoteIdentifier(field: string): string {
  return field
    .split('.')
    .map((segment) => `"${segment.replace(/"/g, '""')}"`)
    .join('.');
}
