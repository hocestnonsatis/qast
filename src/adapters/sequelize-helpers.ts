import { SequelizeFilter } from './sequelize';

type OpInput = Record<string | symbol, any>;

export function finalizeSequelizeFilter(filter: SequelizeFilter, Op: OpInput): Record<string, any> {
  if (!Op) {
    throw new Error('Sequelize Op object is required to finalize the filter.');
  }

  return transformNode(filter);

  function transformNode(node: any): any {
    if (Array.isArray(node)) {
      return node.map(transformNode);
    }

    if (node && typeof node === 'object') {
      if (node.__qast_logical__ === 'and') {
        return {
          [getOp('and')]: node.conditions.map(transformNode),
        };
      }

      if (node.__qast_logical__ === 'or') {
        return {
          [getOp('or')]: node.conditions.map(transformNode),
        };
      }

      if (node.__qast_logical__ === 'not') {
        return {
          [getOp('not')]: transformNode(node.condition),
        };
      }

      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(node)) {
        result[key] = transformValue(value);
      }
      return result;
    }

    return node;
  }

  function transformValue(value: any): any {
    if (value && typeof value === 'object') {
      if (value.__qast_operator__) {
        const operand = value.value;
        switch (value.__qast_operator__) {
          case 'ne':
            return { [getOp('ne')]: operand };
          case 'gt':
            return { [getOp('gt')]: operand };
          case 'gte':
            return { [getOp('gte')]: operand };
          case 'lt':
            return { [getOp('lt')]: operand };
          case 'lte':
            return { [getOp('lte')]: operand };
          case 'in':
            return { [getOp('in')]: operand };
          case 'notIn':
            return { [getOp('notIn')]: operand };
          case 'contains':
            return { [getOp('like')]: `%${operand}%` };
          case 'startsWith':
            return { [getOp('like')]: `${operand}%` };
          case 'endsWith':
            return { [getOp('like')]: `%${operand}` };
          case 'between':
            return { [getOp('between')]: operand };
          default:
            return value;
        }
      } else if (value.__qast_logical__) {
        return transformNode(value);
      }
    }
    return value;
  }

  function getOp(key: string | symbol): symbol | string {
    const op = (Op as any)[key];
    if (!op) {
      throw new Error(`Sequelize Op.${String(key)} is required but was not provided.`);
    }
    return op;
  }
}
