// Consistent Error Handling Utility for Annapurna Foundation v2.0

export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly isOperational: boolean;

  constructor(message: string, code = "INTERNAL_ERROR", status = 500, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthError extends AppError {
  constructor(message: string, code = "AUTH_ERROR") {
    super(message, code, 401);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, code = "DB_ERROR") {
    super(message, code, 500);
  }
}

export class ValidationError extends AppError {
  public readonly errors?: Record<string, string[]>;

  constructor(message: string, errors?: Record<string, string[]>) {
    super(message, "VALIDATION_ERROR", 400);
    this.errors = errors;
  }
}

export class PaymentError extends AppError {
  constructor(message: string, code = "PAYMENT_ERROR") {
    super(message, code, 400);
  }
}

// Global logger helper
export const logger = {
  info: (message: string, context?: any) => {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`, context || "");
  },
  warn: (message: string, context?: any) => {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, context || "");
  },
  error: (message: string, error?: any, context?: any) => {
    const errorDetails = error instanceof Error ? { message: error.message, stack: error.stack } : error;
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, { error: errorDetails, ...context });
  }
};
