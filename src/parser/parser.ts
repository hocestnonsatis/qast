import { Tokenizer, Token, TokenType } from './tokenizer';
import { QastNode, ComparisonNode, Operator } from '../types/ast';
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
      'Expected operator (eq, ne, gt, lt, gte, lte, in, contains)'
    );
    const op = operatorToken.value as Operator;

    // Get value
    const valueToken = this.expect(TokenType.VALUE, 'Expected value');
    const value = valueToken.value;

    // Validate operator and value combination
    if (op === 'in') {
      if (!Array.isArray(value)) {
        throw new ParseError(
          `Operator 'in' requires an array value, got ${typeof value} at position ${valueToken.position}`
        );
      }
    }

    return {
      type: 'COMPARISON',
      field,
      op,
      value: value as string | number | boolean | string[] | number[],
    };
  }

  /**
   * Parse a term: factor | "(" expression ")"
   */
  private parseTerm(): QastNode {
    if (this.check(TokenType.PAREN_OPEN)) {
      // Handle parentheses: "(" expression ")"
      this.advance(); // Skip '('
      const expr = this.parseExpression();
      this.expect(TokenType.PAREN_CLOSE, 'Expected closing parenthesis )');
      return expr;
    } else {
      // Handle factor
      return this.parseFactor();
    }
  }

  /**
   * Parse an expression: term (("and" | "or") term)*
   * Left-associative: a and b or c is parsed as (a and b) or c
   */
  private parseExpression(): QastNode {
    let left = this.parseTerm();

    // Process logical operators (left-associative)
    while (
      this.check(TokenType.LOGICAL_OP) &&
      this.currentToken.type !== TokenType.EOF
    ) {
      const logicalOpToken = this.currentToken;
      const logicalOp = (logicalOpToken.value as string).toUpperCase() as 'AND' | 'OR';
      this.advance(); // Skip logical operator

      const right = this.parseTerm();

      // Create logical node (left-associative)
      left = {
        type: logicalOp,
        left,
        right,
      };
    }

    return left;
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

