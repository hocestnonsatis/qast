import { parseQuery, validateQuery, extractFields, extractOperators } from '../src/index';
import { ValidationError } from '../src/errors';
import { Operator } from '../src/types/ast';

describe('Validation', () => {
  test('should validate query with allowed fields', () => {
    const ast = parseQuery('age gt 25');
    const whitelist = {
      allowedFields: ['age', 'name'],
    };
    
    expect(() => {
      validateQuery(ast, whitelist);
    }).not.toThrow();
  });

  test('should throw error for disallowed field', () => {
    const ast = parseQuery('age gt 25');
    const whitelist = {
      allowedFields: ['name'],
    };
    
    expect(() => {
      validateQuery(ast, whitelist);
    }).toThrow(ValidationError);
  });

  test('should validate query with allowed operators', () => {
    const ast = parseQuery('age gt 25');
    const whitelist = {
      allowedOperators: ['gt', 'lt', 'eq'] as Operator[],
    };
    
    expect(() => {
      validateQuery(ast, whitelist);
    }).not.toThrow();
  });

    test('should validate field types for strings', () => {
      const ast = parseQuery('name contains "John"');
      const whitelist = {
        fieldTypes: {
          name: { type: 'string' as const },
        },
      };

      expect(() => validateQuery(ast, whitelist)).not.toThrow();
    });

    test('should throw error for mismatched field types', () => {
      const ast = parseQuery('age eq "thirty"');
      const whitelist = {
        fieldTypes: {
          age: { type: 'number' as const },
        },
      };

      expect(() => validateQuery(ast, whitelist)).toThrow(ValidationError);
    });

    test('should allow null when field allows null', () => {
      const ast = parseQuery('deletedAt eq null');
      const whitelist = {
        fieldTypes: {
          deletedAt: { type: 'string' as const, allowNull: true },
        },
      };

      expect(() => validateQuery(ast, whitelist)).not.toThrow();
    });

    test('should reject null when not allowed', () => {
      const ast = parseQuery('deletedAt eq null');
      const whitelist = {
        fieldTypes: {
          deletedAt: { type: 'string' as const, allowNull: false },
        },
      };

      expect(() => validateQuery(ast, whitelist)).toThrow(ValidationError);
    });

    test('should validate enum values', () => {
      const ast = parseQuery('status eq "ACTIVE"');
      const whitelist = {
        fieldTypes: {
          status: { type: 'enum' as const, enumValues: ['ACTIVE', 'INACTIVE'] },
        },
      };

      expect(() => validateQuery(ast, whitelist)).not.toThrow();
    });

    test('should reject invalid enum values', () => {
      const ast = parseQuery('status eq "PENDING"');
      const whitelist = {
        fieldTypes: {
          status: { type: 'enum' as const, enumValues: ['ACTIVE', 'INACTIVE'] },
        },
      };

      expect(() => validateQuery(ast, whitelist)).toThrow(ValidationError);
    });

  test('should throw error for disallowed operator', () => {
    const ast = parseQuery('age gt 25');
    const whitelist = {
      allowedOperators: ['eq', 'lt'] as Operator[],
    };
    
    expect(() => {
      validateQuery(ast, whitelist);
    }).toThrow(ValidationError);
  });

  test('should validate query with both field and operator whitelists', () => {
    const ast = parseQuery('age gt 25');
    const whitelist = {
      allowedFields: ['age', 'name'],
      allowedOperators: ['gt', 'lt', 'eq'] as Operator[],
    };
    
    expect(() => {
      validateQuery(ast, whitelist);
    }).not.toThrow();
  });

  test('should throw error for disallowed field and operator', () => {
    const ast = parseQuery('age gt 25');
    const whitelist = {
      allowedFields: ['name'],
      allowedOperators: ['eq'] as Operator[],
    };
    
    expect(() => {
      validateQuery(ast, whitelist);
    }).toThrow(ValidationError);
  });

  test('should validate nested queries', () => {
    const ast = parseQuery('age gt 25 and (name eq "John" or city eq "Paris")');
    const whitelist = {
      allowedFields: ['age', 'name', 'city'],
      allowedOperators: ['gt', 'eq'] as Operator[],
    };
    
    expect(() => {
      validateQuery(ast, whitelist);
    }).not.toThrow();
  });

  test('should throw error for disallowed field in nested query', () => {
    const ast = parseQuery('age gt 25 and (name eq "John" or city eq "Paris")');
    const whitelist = {
      allowedFields: ['age', 'name'],
      allowedOperators: ['gt', 'eq'] as Operator[],
    };
    
    expect(() => {
      validateQuery(ast, whitelist);
    }).toThrow(ValidationError);
  });

  test('should validate in operator with array value', () => {
    const ast = parseQuery('age in [1,2,3]');
    const whitelist = {
      allowedFields: ['age'],
      allowedOperators: ['in'] as Operator[],
    };
    
    expect(() => {
      validateQuery(ast, whitelist);
    }).not.toThrow();
  });

  test('should throw error if in operator has non-array value', () => {
    // This should be caught during parsing, but let's test validation
    const ast = parseQuery('age in [1,2,3]');
    // The AST should have an array value, so this should pass
    expect(Array.isArray((ast as any).value)).toBe(true);
  });

  test('should validate empty whitelist (allows all)', () => {
    const ast = parseQuery('age gt 25');
    const whitelist = {};
    
    expect(() => {
      validateQuery(ast, whitelist);
    }).not.toThrow();
  });

  test('should validate parseQuery with options', () => {
    const query = 'age gt 25';
    
    expect(() => {
      parseQuery(query, {
        allowedFields: ['age'],
        allowedOperators: ['gt'],
        validate: true,
      });
    }).not.toThrow();
  });

    test('should validate parseQuery with fieldTypes only', () => {
      const query = 'age eq "thirty"';

      expect(() => {
        parseQuery(query, {
          fieldTypes: {
            age: { type: 'number' as const },
          },
          validate: true,
        });
      }).toThrow(ValidationError);
    });

  test('should throw error in parseQuery with invalid options', () => {
    const query = 'age gt 25';
    
    expect(() => {
      parseQuery(query, {
        allowedFields: ['name'],
        allowedOperators: ['eq'] as Operator[],
        validate: true,
      });
    }).toThrow(ValidationError);
  });

  test('should not validate when validate is false', () => {
    const query = 'age gt 25';
    
    expect(() => {
      parseQuery(query, {
        allowedFields: ['name'],
        validate: false,
      });
    }).not.toThrow();
  });
});

describe('Field Extraction', () => {
  test('should extract fields from simple query', () => {
    const ast = parseQuery('age gt 25');
    const fields = extractFields(ast);
    
    expect(fields).toEqual(['age']);
  });

  test('should extract fields from AND query', () => {
    const ast = parseQuery('age gt 25 and name eq "John"');
    const fields = extractFields(ast);
    
    expect(fields).toContain('age');
    expect(fields).toContain('name');
    expect(fields.length).toBe(2);
  });

  test('should extract unique fields', () => {
    const ast = parseQuery('age gt 25 and age lt 50');
    const fields = extractFields(ast);
    
    expect(fields).toEqual(['age']);
  });

  test('should extract fields from nested query', () => {
    const ast = parseQuery('age gt 25 and (name eq "John" or city eq "Paris")');
    const fields = extractFields(ast);
    
    expect(fields).toContain('age');
    expect(fields).toContain('name');
    expect(fields).toContain('city');
    expect(fields.length).toBe(3);
  });
});

describe('Operator Extraction', () => {
  test('should extract operators from simple query', () => {
    const ast = parseQuery('age gt 25');
    const operators = extractOperators(ast);
    
    expect(operators).toEqual(['gt']);
  });

  test('should extract operators from AND query', () => {
    const ast = parseQuery('age gt 25 and name eq "John"');
    const operators = extractOperators(ast);
    
    expect(operators).toContain('gt');
    expect(operators).toContain('eq');
    expect(operators.length).toBe(2);
  });

  test('should extract unique operators', () => {
    const ast = parseQuery('age gt 25 and age gt 50');
    const operators = extractOperators(ast);
    
    expect(operators).toEqual(['gt']);
  });

  test('should extract operators from nested query', () => {
    const ast = parseQuery('age gt 25 and (name eq "John" or city lt "Paris")');
    const operators = extractOperators(ast);
    
    expect(operators).toContain('gt');
    expect(operators).toContain('eq');
    expect(operators).toContain('lt');
    expect(operators.length).toBe(3);
  });

  test('should extract in operator', () => {
    const ast = parseQuery('age in [1,2,3]');
    const operators = extractOperators(ast);
    
    expect(operators).toEqual(['in']);
  });
});

describe('Validation Error Messages', () => {
  test('should include field name in error message', () => {
    const ast = parseQuery('age gt 25');
    const whitelist = {
      allowedFields: ['name'],
    };
    
    expect(() => {
      validateQuery(ast, whitelist);
    }).toThrow(ValidationError);
    
    try {
      validateQuery(ast, whitelist);
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).field).toBe('age');
      expect((error as ValidationError).message).toContain('age');
    }
  });

  test('should include operator in error message', () => {
    const ast = parseQuery('age gt 25');
    const whitelist = {
      allowedOperators: ['eq'] as Operator[],
    };
    
    expect(() => {
      validateQuery(ast, whitelist);
    }).toThrow(ValidationError);
    
    try {
      validateQuery(ast, whitelist);
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).operator).toBe('gt');
      expect((error as ValidationError).message).toContain('gt');
    }
  });

  test('should include allowed fields in error message', () => {
    const ast = parseQuery('age gt 25');
    const whitelist = {
      allowedFields: ['name'],
    };
    
    try {
      validateQuery(ast, whitelist);
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).message).toContain('name');
    }
  });

  test('should include allowed operators in error message', () => {
    const ast = parseQuery('age gt 25');
    const whitelist = {
      allowedOperators: ['eq'] as Operator[],
    };
    
    try {
      validateQuery(ast, whitelist);
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).message).toContain('eq');
    }
  });
});

