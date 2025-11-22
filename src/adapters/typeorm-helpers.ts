import { TypeORMFilter } from './typeorm';

export interface TypeOrmOperatorMap {
  Equal?: (value: any) => any;
  Not?: (value: any) => any;
  MoreThan?: (value: any) => any;
  MoreThanOrEqual?: (value: any) => any;
  LessThan?: (value: any) => any;
  LessThanOrEqual?: (value: any) => any;
  In?: (value: any[]) => any;
  Between?: (from: any, to: any) => any;
  Like?: (value: string) => any;
  ILike?: (value: string) => any;
}

export function finalizeTypeOrmFilter(
  filter: TypeORMFilter,
  operators: TypeOrmOperatorMap
): TypeORMFilter {
  return {
    where: transformCondition(filter.where),
  };

  function transformCondition(condition: any): any {
    if (Array.isArray(condition)) {
      return condition.map(transformCondition);
    }

    if (condition && typeof condition === 'object') {
      if (condition.__qast_not__) {
        return applyNot(condition.__qast_not__);
      }

      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(condition)) {
        result[key] = transformValue(value);
      }
      return result;
    }

    return condition;
  }

  function transformValue(value: any): any {
    if (Array.isArray(value)) {
      return value.map(transformCondition);
    }

    if (value && typeof value === 'object') {
      if (value.__qast_operator__) {
        return convertOperator(value.__qast_operator__, value.value);
      }

      if (value.__qast_not__) {
        return applyNot(value.__qast_not__);
      }

      return transformCondition(value);
    }

    return value;
  }

  function convertOperator(operator: string, operand: any): any {
    switch (operator) {
      case 'ne':
        return callOperator('Not', operand);
      case 'gt':
        return callOperator('MoreThan', operand);
      case 'gte':
        return callOperator('MoreThanOrEqual', operand);
      case 'lt':
        return callOperator('LessThan', operand);
      case 'lte':
        return callOperator('LessThanOrEqual', operand);
      case 'in':
        return callOperator('In', operand);
      case 'notIn':
        return callOperator('Not', callOperator('In', operand));
      case 'contains':
        return likeOperator(`%${operand}%`);
      case 'startsWith':
        return likeOperator(`${operand}%`);
      case 'endsWith':
        return likeOperator(`%${operand}`);
      case 'between':
        return callOperator('Between', operand[0], operand[1]);
      default:
        return operand;
    }
  }

  function likeOperator(value: string): any {
    if (operators.ILike) {
      return operators.ILike(value);
    }
    return callOperator('Like', value);
  }

  function applyNot(target: any): any {
    const transformed = transformCondition(target);

    if (Array.isArray(transformed)) {
      throw new Error('Cannot convert NOT over OR conditions using finalizeTypeOrmFilter.');
    }

    if (transformed && typeof transformed === 'object') {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(transformed)) {
        result[key] = callOperator('Not', value);
      }
      return result;
    }

    return callOperator('Not', transformed);
  }

  function callOperator(name: keyof TypeOrmOperatorMap, ...args: any[]): any {
    const operator = operators[name];
    if (!operator) {
      throw new Error(`TypeORM operator '${name}' is required to finalize this filter.`);
    }
    const executor = operator as (...opArgs: any[]) => any;
    return executor(...args);
  }
}
