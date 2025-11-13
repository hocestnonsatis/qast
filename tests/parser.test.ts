import { parseQuery } from '../src/index';
import { Tokenizer } from '../src/parser/tokenizer';
import { ParseError, TokenizationError } from '../src/errors';
import { ComparisonNode, LogicalNode } from '../src/types/ast';

describe('Tokenizer', () => {
  test('should tokenize a simple comparison', () => {
    const tokenizer = new Tokenizer('age gt 25');
    const tokens = tokenizer.tokenize();
    
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens[0].type).toBe('IDENTIFIER');
    expect(tokens[0].value).toBe('age');
    expect(tokens[1].type).toBe('OPERATOR');
    expect(tokens[1].value).toBe('gt');
    expect(tokens[2].type).toBe('VALUE');
    expect(tokens[2].value).toBe(25);
  });

  test('should tokenize string values', () => {
    const tokenizer = new Tokenizer('name eq "John"');
    const tokens = tokenizer.tokenize();
    
    expect(tokens[1].type).toBe('OPERATOR');
    expect(tokens[2].type).toBe('VALUE');
    expect(tokens[2].value).toBe('John');
  });

  test('should tokenize single-quoted strings', () => {
    const tokenizer = new Tokenizer("name eq 'John'");
    const tokens = tokenizer.tokenize();
    
    expect(tokens[2].value).toBe('John');
  });

  test('should tokenize boolean values', () => {
    const tokenizer = new Tokenizer('active eq true');
    const tokens = tokenizer.tokenize();
    
    expect(tokens[2].type).toBe('VALUE');
    expect(tokens[2].value).toBe(true);
  });

  test('should tokenize arrays', () => {
    const tokenizer = new Tokenizer('age in [1,2,3]');
    const tokens = tokenizer.tokenize();
    
    expect(tokens[2].type).toBe('VALUE');
    expect(Array.isArray(tokens[2].value)).toBe(true);
    expect(tokens[2].value).toEqual([1, 2, 3]);
  });

  test('should tokenize string arrays', () => {
    const tokenizer = new Tokenizer('name in ["John","Jane"]');
    const tokens = tokenizer.tokenize();
    
    expect(tokens[2].type).toBe('VALUE');
    expect(Array.isArray(tokens[2].value)).toBe(true);
    expect(tokens[2].value).toEqual(['John', 'Jane']);
  });

  test('should tokenize logical operators', () => {
    const tokenizer = new Tokenizer('age gt 25 and name eq "John"');
    const tokens = tokenizer.tokenize();
    
    const logicalOp = tokens.find(t => t.type === 'LOGICAL_OP');
    expect(logicalOp).toBeDefined();
    expect(logicalOp?.value).toBe('and');
  });

  test('should tokenize parentheses', () => {
    const tokenizer = new Tokenizer('(age gt 25)');
    const tokens = tokenizer.tokenize();
    
    expect(tokens[0].type).toBe('PAREN_OPEN');
    expect(tokens[tokens.length - 2].type).toBe('PAREN_CLOSE');
  });

  test('should handle escaped characters in strings', () => {
    const tokenizer = new Tokenizer('name eq "John\\"s"');
    const tokens = tokenizer.tokenize();
    
    expect(tokens[2].value).toBe('John"s');
  });

  test('should throw error for unterminated string', () => {
    expect(() => {
      const tokenizer = new Tokenizer('name eq "John');
      tokenizer.tokenize();
    }).toThrow(TokenizationError);
  });

  test('should throw error for invalid character', () => {
    expect(() => {
      const tokenizer = new Tokenizer('age @ 25');
      tokenizer.tokenize();
    }).toThrow(TokenizationError);
  });
});

describe('Parser', () => {
  test('should parse a simple comparison', () => {
    const ast = parseQuery('age gt 25');
    
    expect(ast.type).toBe('COMPARISON');
    const comparison = ast as ComparisonNode;
    expect(comparison.field).toBe('age');
    expect(comparison.op).toBe('gt');
    expect(comparison.value).toBe(25);
  });

  test('should parse string comparison', () => {
    const ast = parseQuery('name eq "John"');
    
    expect(ast.type).toBe('COMPARISON');
    const comparison = ast as ComparisonNode;
    expect(comparison.field).toBe('name');
    expect(comparison.op).toBe('eq');
    expect(comparison.value).toBe('John');
  });

  test('should parse boolean comparison', () => {
    const ast = parseQuery('active eq true');
    
    expect(ast.type).toBe('COMPARISON');
    const comparison = ast as ComparisonNode;
    expect(comparison.value).toBe(true);
  });

  test('should parse AND operation', () => {
    const ast = parseQuery('age gt 25 and name eq "John"');
    
    expect(ast.type).toBe('AND');
    const logical = ast as LogicalNode;
    expect(logical.left.type).toBe('COMPARISON');
    expect(logical.right.type).toBe('COMPARISON');
  });

  test('should parse OR operation', () => {
    const ast = parseQuery('age gt 25 or name eq "John"');
    
    expect(ast.type).toBe('OR');
    const logical = ast as LogicalNode;
    expect(logical.left.type).toBe('COMPARISON');
    expect(logical.right.type).toBe('COMPARISON');
  });

  test('should parse nested parentheses', () => {
    const ast = parseQuery('age gt 25 and (name eq "John" or city eq "Paris")');
    
    expect(ast.type).toBe('AND');
    const logical = ast as LogicalNode;
    expect(logical.left.type).toBe('COMPARISON');
    expect(logical.right.type).toBe('OR');
    
    const rightLogical = logical.right as LogicalNode;
    expect(rightLogical.left.type).toBe('COMPARISON');
    expect(rightLogical.right.type).toBe('COMPARISON');
  });

  test('should parse multiple logical operations (left-associative)', () => {
    const ast = parseQuery('age gt 25 and name eq "John" or city eq "Paris"');
    
    // Should be parsed as: (age gt 25 and name eq "John") or city eq "Paris"
    expect(ast.type).toBe('OR');
    const orNode = ast as LogicalNode;
    expect(orNode.left.type).toBe('AND');
    expect(orNode.right.type).toBe('COMPARISON');
  });

  test('should parse all operators', () => {
    const operators = ['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'in', 'contains'];
    
    for (const op of operators) {
      if (op === 'in') {
        const ast = parseQuery(`age ${op} [1,2,3]`);
        expect((ast as ComparisonNode).op).toBe(op);
      } else if (op === 'contains') {
        const ast = parseQuery(`name ${op} "John"`);
        expect((ast as ComparisonNode).op).toBe(op);
      } else {
        const ast = parseQuery(`age ${op} 25`);
        expect((ast as ComparisonNode).op).toBe(op);
      }
    }
  });

  test('should parse array values for in operator', () => {
    const ast = parseQuery('age in [1,2,3]');
    
    expect(ast.type).toBe('COMPARISON');
    const comparison = ast as ComparisonNode;
    expect(comparison.op).toBe('in');
    expect(Array.isArray(comparison.value)).toBe(true);
    expect(comparison.value).toEqual([1, 2, 3]);
  });

  test('should parse string arrays', () => {
    const ast = parseQuery('name in ["John","Jane","Bob"]');
    
    expect(ast.type).toBe('COMPARISON');
    const comparison = ast as ComparisonNode;
    expect(Array.isArray(comparison.value)).toBe(true);
    expect(comparison.value).toEqual(['John', 'Jane', 'Bob']);
  });

  test('should throw error for empty query', () => {
    expect(() => {
      parseQuery('');
    }).toThrow(ParseError);
  });

  test('should throw error for invalid syntax', () => {
    expect(() => {
      parseQuery('age gt');
    }).toThrow(ParseError);
  });

  test('should throw error for missing closing parenthesis', () => {
    expect(() => {
      parseQuery('(age gt 25');
    }).toThrow(ParseError);
  });

  test('should allow gt operator with array (parser accepts it)', () => {
    // The parser doesn't validate operator-value compatibility
    // That's done by the validator
    expect(() => {
      parseQuery('age gt [1,2,3]');
    }).not.toThrow();
  });

  test('should parse complex nested query', () => {
    const query = 'age gt 25 and (name eq "John" or city eq "Paris") and active eq true';
    const ast = parseQuery(query);
    
    expect(ast.type).toBe('AND');
    const root = ast as LogicalNode;
    // The query is parsed left-associatively as: (age gt 25 and (name eq "John" or city eq "Paris")) and active eq true
    expect(root.left.type).toBe('AND');
    expect(root.right.type).toBe('COMPARISON');
  });

  test('should parse field names with underscores', () => {
    const ast = parseQuery('user_id eq 123');
    
    expect(ast.type).toBe('COMPARISON');
    const comparison = ast as ComparisonNode;
    expect(comparison.field).toBe('user_id');
  });

  test('should parse float numbers', () => {
    const ast = parseQuery('price gt 25.99');
    
    expect(ast.type).toBe('COMPARISON');
    const comparison = ast as ComparisonNode;
    expect(comparison.value).toBe(25.99);
  });

  test('should parse negative numbers', () => {
    const ast = parseQuery('temperature lt -10');
    
    expect(ast.type).toBe('COMPARISON');
    const comparison = ast as ComparisonNode;
    expect(comparison.value).toBe(-10);
  });
});

describe('Parser - Edge Cases', () => {
  test('should handle whitespace correctly', () => {
    const ast = parseQuery('  age  gt  25  ');
    
    expect(ast.type).toBe('COMPARISON');
    const comparison = ast as ComparisonNode;
    expect(comparison.field).toBe('age');
    expect(comparison.value).toBe(25);
  });

  test('should handle multiple levels of nesting', () => {
    const query = '(age gt 25 and (name eq "John" or (city eq "Paris" and country eq "France")))';
    const ast = parseQuery(query);
    
    expect(ast.type).toBe('AND');
  });

  test('should handle empty array', () => {
    const ast = parseQuery('age in []');
    
    expect(ast.type).toBe('COMPARISON');
    const comparison = ast as ComparisonNode;
    expect(Array.isArray(comparison.value)).toBe(true);
    expect(comparison.value).toEqual([]);
  });
});

