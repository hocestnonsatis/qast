/**
 * Base error class for QAST library
 */
export class QastError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown during tokenization when an invalid token is encountered
 */
export class TokenizationError extends QastError {
  public readonly position: number;
  public readonly query: string;

  constructor(message: string, position: number, query: string) {
    super(`${message} at position ${position}`);
    this.position = position;
    this.query = query;
    this.name = 'TokenizationError';
  }

  /**
   * Get a snippet of the query around the error position
   */
  getSnippet(): string {
    const start = Math.max(0, this.position - 10);
    const end = Math.min(this.query.length, this.position + 10);
    const before = this.query.substring(start, this.position);
    const after = this.query.substring(this.position, end);
    return `${before}[ERROR]${after}`;
  }
}

/**
 * Error thrown during parsing when the query syntax is invalid
 */
export class ParseError extends QastError {
  public readonly position: number;
  public readonly query: string;

  constructor(message: string, position?: number, query?: string) {
    super(message);
    this.position = position ?? -1;
    this.query = query ?? '';
    this.name = 'ParseError';
  }
}

/**
 * Error thrown during validation when a field or operator is not allowed
 */
export class ValidationError extends QastError {
  public readonly field?: string;
  public readonly operator?: string;

  constructor(message: string, field?: string, operator?: string) {
    super(message);
    this.field = field;
    this.operator = operator;
    this.name = 'ValidationError';
  }
}

