import { Tokenizer, Token, TokenType } from './tokenizer';
import { QastNode, ComparisonNode, Operator, QastRangeValue, QastValue } from '../types/ast';
import { ParseError, TokenizationError } from '../errors';

/**
 * Parser for QAST query strings
 * Grammar:
 *   expression -> term (("and" | "or") term)*
 *   term -> factor | "(" expression ")"
 *   factor -> IDENTIFIER OPERATOR VALUE
 */
export class Parser {
  private tokens: Token[];
  private position: number;
  private currentToken: Token;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.position = 0;
    this.currentToken = this.tokens[0];
  }

  /**
   * Advance to the next token
   */
  private advance(): void {
    this.position++;
    if (this.position < this.tokens.length) {
      this.currentToken = this.tokens[this.position];
    } else {
      this.currentToken = this.tokens[this.tokens.length - 1]; // Keep EOF
    }
  }

  /**
   * Expect a token of a specific type, throw error if not found
   */
  private expect(type: TokenType, errorMessage?: string): Token {
    if (this.currentToken.type !== type) {
      throw new ParseError(
        errorMessage ||
          `Expected ${type}, but got ${this.currentToken.type} at position ${this.currentToken.position}`
      );
    }
    const token = this.currentToken;
    this.advance();
    return token;
  }

  /**
   * Check if current token matches a type
   */
  private check(type: TokenType): boolean {
    return this.currentToken.type === type;
  }

  private checkLogical(value: string): boolean {
    return (
      this.currentToken.type === TokenType.LOGICAL_OP &&
      typeof this.currentToken.value === 'string' &&
      (this.currentToken.value as string).toLowerCase() === value.toLowerCase()
    );
  }

  /**
   * Parse a factor: IDENTIFIER OPERATOR VALUE
   */
  private parseFactor(): ComparisonNode {
    // Get field name (identifier)
    const fieldToken = this.expect(
      TokenType.IDENTIFIER,
      'Expected field name (identifier)'
    );
    const field = fieldToken.value as string;

    // Get operator
    const operatorToken = this.expect(
      TokenType.OPERATOR,
        'Expected operator (eq, ne, gt, lt, gte, lte, in, notIn, contains, startsWith, endsWith, between)'
    );
    const op = operatorToken.value as Operator;

    // Get value
    const valueToken = this.expect(TokenType.VALUE, 'Expected value');
    const value = valueToken.value;

    // Validate operator and value combination
    if (op === 'in' || op === 'notIn') {
      if (!Array.isArray(value)) {
        throw new ParseError(
          `Operator '${op}' requires an array value, got ${typeof value} at position ${valueToken.position}`
        );
      }
    }

    if (op === 'between') {
      if (!Array.isArray(value) || value.length !== 2) {
        throw new ParseError(
          `Operator 'between' requires an array with exactly two values`,
          valueToken.position
        );
      }
    }

    return {
      type: 'COMPARISON',
      field,
      op,
      value: this.normalizeValue(op, value),
    };
  }

  private normalizeValue(op: Operator, value: any): QastValue {
    if (op === 'between') {
      return [value[0] ?? null, value[1] ?? null] as QastRangeValue;
    }
    return value as QastValue;
  }

  /**
   * Parse a term: factor | "(" expression ")"
   */
  private parseTerm(): QastNode {
    if (this.check(TokenType.PAREN_OPEN)) {
      this.advance(); // Skip '('
      const expr = this.parseExpression();
      this.expect(TokenType.PAREN_CLOSE, 'Expected closing parenthesis )');
      return expr;
    } else {
      return this.parseFactor();
    }
  }

  private parseExpression(): QastNode {
    return this.parseOrExpression();
  }

  private parseOrExpression(): QastNode {
    let node = this.parseAndExpression();
    while (this.checkLogical('or')) {
      this.advance();
      const right = this.parseAndExpression();
      node = {
        type: 'OR',
        left: node,
        right,
      };
    }
    return node;
  }

  private parseAndExpression(): QastNode {
    let node = this.parseNotExpression();
    while (this.checkLogical('and')) {
      this.advance();
      const right = this.parseNotExpression();
      node = {
        type: 'AND',
        left: node,
        right,
      };
    }
    return node;
  }

  private parseNotExpression(): QastNode {
    if (this.checkLogical('not')) {
      this.advance();
      const child = this.parseNotExpression();
      return {
        type: 'NOT',
        child,
      };
    }
    return this.parseTerm();
  }

  /**
   * Parse the query and return the AST
   */
  public parse(): QastNode {
    if (this.tokens.length === 1 && this.tokens[0].type === TokenType.EOF) {
      throw new ParseError('Empty query string');
    }

    const ast = this.parseExpression();

    // Ensure we've consumed all tokens (except EOF)
    if (
      this.currentToken.type !== TokenType.EOF &&
      !this.check(TokenType.EOF)
    ) {
      throw new ParseError(
        `Unexpected token: ${this.currentToken.type} at position ${this.currentToken.position}. Expected end of query.`
      );
    }

    return ast;
  }
}

/**
 * Parse a query string into an AST
 */
export function parseQueryString(query: string): QastNode {
  try {
    const tokenizer = new Tokenizer(query);
    const tokens = tokenizer.tokenize();
    const parser = new Parser(tokens);
    return parser.parse();
  } catch (error) {
    if (error instanceof TokenizationError || error instanceof ParseError) {
      throw error;
    }
    throw new ParseError(`Failed to parse query: ${error instanceof Error ? error.message : String(error)}`);
  }
}

