import { TokenizationError } from '../errors';

/**
 * Token types in the query language
 */
export enum TokenType {
  IDENTIFIER = 'IDENTIFIER',
  OPERATOR = 'OPERATOR',
  VALUE = 'VALUE',
  LOGICAL_OP = 'LOGICAL_OP',
  PAREN_OPEN = 'PAREN_OPEN',
  PAREN_CLOSE = 'PAREN_CLOSE',
  BRACKET_OPEN = 'BRACKET_OPEN',
  BRACKET_CLOSE = 'BRACKET_CLOSE',
  COMMA = 'COMMA',
  EOF = 'EOF',
}

/**
 * Token structure
 */
export interface Token {
  type: TokenType;
  value: string | number | boolean | string[] | number[];
  position: number;
}

/**
 * Supported operators
 */
const OPERATORS = ['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'in', 'contains'];

/**
 * Logical operators
 */
const LOGICAL_OPS = ['and', 'or'];

/**
 * Tokenizer for QAST query strings
 */
export class Tokenizer {
  private input: string;
  private position: number;
  private currentChar: string | null;

  constructor(input: string) {
    this.input = input;
    this.position = 0;
    this.currentChar = this.input.length > 0 ? this.input[0] : null;
  }

  /**
   * Advance to the next character
   */
  private advance(): void {
    this.position++;
    if (this.position >= this.input.length) {
      this.currentChar = null;
    } else {
      this.currentChar = this.input[this.position];
    }
  }

  /**
   * Skip whitespace characters
   */
  private skipWhitespace(): void {
    while (this.currentChar !== null && /\s/.test(this.currentChar)) {
      this.advance();
    }
  }


  /**
   * Peek at the next character without advancing
   */
  private peek(): string | null {
    if (this.position + 1 >= this.input.length) {
      return null;
    }
    return this.input[this.position + 1];
  }

  /**
   * Read an identifier (field name)
   */
  private readIdentifier(): string {
    const start = this.position;
    while (
      this.currentChar !== null &&
      (/\w/.test(this.currentChar) || this.currentChar === '_')
    ) {
      this.advance();
    }
    return this.input.substring(start, this.position);
  }

  /**
   * Read a string literal (single or double quotes)
   */
  private readString(): string {
    const quote = this.currentChar;
    this.advance(); // Skip opening quote
    const start = this.position;
    let escaped = false;
    const chars: string[] = [];

    while (this.currentChar !== null) {
      if (escaped) {
        if (this.currentChar === 'n') {
          chars.push('\n');
        } else if (this.currentChar === 't') {
          chars.push('\t');
        } else if (this.currentChar === 'r') {
          chars.push('\r');
        } else if (this.currentChar === '\\') {
          chars.push('\\');
        } else if (this.currentChar === quote) {
          chars.push(quote);
        } else {
          chars.push(this.currentChar);
        }
        escaped = false;
        this.advance();
      } else if (this.currentChar === '\\') {
        escaped = true;
        this.advance();
      } else if (this.currentChar === quote) {
        this.advance(); // Skip closing quote
        return chars.join('');
      } else {
        chars.push(this.currentChar);
        this.advance();
      }
    }

    throw new TokenizationError(
      `Unterminated string literal starting at position ${start - 1}`,
      start - 1,
      this.input
    );
  }

  /**
   * Read a number (integer or float, including negative numbers)
   */
  private readNumber(): number {
    const start = this.position;
    let hasDecimal = false;

    // Check for negative sign (parseFloat will handle it)
    if (this.currentChar === '-') {
      this.advance();
    }

    // Read digits and decimal point
    while (
      this.currentChar !== null &&
      (/\d/.test(this.currentChar) || this.currentChar === '.')
    ) {
      if (this.currentChar === '.') {
        if (hasDecimal) {
          break; // Already has decimal point
        }
        hasDecimal = true;
      }
      this.advance();
    }

    const numStr = this.input.substring(start, this.position);
    const num = parseFloat(numStr);
    if (isNaN(num)) {
      throw new TokenizationError(
        `Invalid number at position ${start}`,
        start,
        this.input
      );
    }
    return num;
  }

  /**
   * Read a boolean value
   */
  private readBoolean(): boolean {
    const start = this.position;
    const ident = this.readIdentifier().toLowerCase();
    if (ident === 'true') {
      return true;
    } else if (ident === 'false') {
      return false;
    } else {
      // Not a boolean, reset position
      this.position = start;
      throw new TokenizationError(
        `Expected boolean value at position ${start}`,
        start,
        this.input
      );
    }
  }

  /**
   * Read an array (for 'in' operator)
   */
  private readArray(): (string | number)[] {
    this.advance(); // Skip opening bracket
    const items: (string | number)[] = [];
    this.skipWhitespace();

    if (this.currentChar === ']') {
      this.advance(); // Empty array
      return items;
    }

    while (this.currentChar !== null) {
      this.skipWhitespace();
      if (this.currentChar === ']') {
        this.advance();
        break;
      }

      // Read value
      let value: string | number;
      if (this.currentChar === '"' || this.currentChar === "'") {
        value = this.readString();
      } else if (/\d/.test(this.currentChar)) {
        value = this.readNumber();
      } else {
        throw new TokenizationError(
          `Unexpected character in array: ${this.currentChar}`,
          this.position,
          this.input
        );
      }

      items.push(value);
      this.skipWhitespace();

      if (this.currentChar === ']') {
        this.advance();
        break;
      } else if (this.currentChar === ',') {
        this.advance();
        this.skipWhitespace();
      } else {
        throw new TokenizationError(
          `Expected ',' or ']' in array at position ${this.position}`,
          this.position,
          this.input
        );
      }
    }

    return items;
  }

  /**
   * Get the next token from the input
   */
  public nextToken(): Token {
    this.skipWhitespace();

    if (this.currentChar === null) {
      return {
        type: TokenType.EOF,
        value: '',
        position: this.position,
      };
    }

    const position = this.position;

    // Check for operators (must check before identifiers)
    const peekAhead = this.input.substring(this.position);
    for (const op of OPERATORS) {
      if (peekAhead.startsWith(op) && !/\w/.test(peekAhead[op.length] ?? '')) {
        this.position += op.length;
        this.currentChar = this.position < this.input.length ? this.input[this.position] : null;
        return {
          type: TokenType.OPERATOR,
          value: op,
          position,
        };
      }
    }

    // Check for logical operators
    for (const logicalOp of LOGICAL_OPS) {
      if (peekAhead.toLowerCase().startsWith(logicalOp) && !/\w/.test(peekAhead[logicalOp.length] ?? '')) {
        this.position += logicalOp.length;
        this.currentChar = this.position < this.input.length ? this.input[this.position] : null;
        return {
          type: TokenType.LOGICAL_OP,
          value: logicalOp.toLowerCase(),
          position,
        };
      }
    }

    // Handle different token types
    if (this.currentChar === '(') {
      this.advance();
      return {
        type: TokenType.PAREN_OPEN,
        value: '(',
        position,
      };
    }

    if (this.currentChar === ')') {
      this.advance();
      return {
        type: TokenType.PAREN_CLOSE,
        value: ')',
        position,
      };
    }

    if (this.currentChar === '[') {
      const arr = this.readArray();
      return {
        type: TokenType.VALUE,
        value: arr as string[] | number[],
        position,
      };
    }

    if (this.currentChar === ',') {
      this.advance();
      return {
        type: TokenType.COMMA,
        value: ',',
        position,
      };
    }

    if (this.currentChar === '"' || this.currentChar === "'") {
      const str = this.readString();
      return {
        type: TokenType.VALUE,
        value: str,
        position,
      };
    }

    // Check for negative numbers or positive numbers
    if (/\d/.test(this.currentChar) || (this.currentChar === '-' && /\d/.test(this.peek() ?? ''))) {
      const num = this.readNumber();
      return {
        type: TokenType.VALUE,
        value: num,
        position,
      };
    }

    // Check for boolean values
    if (this.currentChar === 't' || this.currentChar === 'T') {
      const peekAhead = this.input.substring(this.position, this.position + 4).toLowerCase();
      if (peekAhead === 'true' && !/\w/.test(this.input[this.position + 4] ?? '')) {
        const value = this.readBoolean();
        return {
          type: TokenType.VALUE,
          value,
          position,
        };
      }
    }

    if (this.currentChar === 'f' || this.currentChar === 'F') {
      const peekAhead = this.input.substring(this.position, this.position + 5).toLowerCase();
      if (peekAhead === 'false' && !/\w/.test(this.input[this.position + 5] ?? '')) {
        const value = this.readBoolean();
        return {
          type: TokenType.VALUE,
          value,
          position,
        };
      }
    }

    // Identifier (field name)
    if (/\w/.test(this.currentChar) || this.currentChar === '_') {
      const ident = this.readIdentifier();
      return {
        type: TokenType.IDENTIFIER,
        value: ident,
        position,
      };
    }

    throw new TokenizationError(
      `Unexpected character: ${this.currentChar}`,
      this.position,
      this.input
    );
  }

  /**
   * Tokenize the entire input string
   */
  public tokenize(): Token[] {
    const tokens: Token[] = [];
    let token = this.nextToken();
    while (token.type !== TokenType.EOF) {
      tokens.push(token);
      token = this.nextToken();
    }
    tokens.push(token); // Include EOF token
    return tokens;
  }
}

