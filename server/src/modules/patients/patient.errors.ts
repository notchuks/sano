import { FastifyReply } from "fastify";
import { ZodError } from "zod";

// ============================================================================
// CUSTOM ERROR CLASSES
// ============================================================================

export class PatientError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly requestId?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "PATIENT_ERROR",
    isOperational: boolean = true,
    requestId?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    this.requestId = requestId;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class PatientNotFoundError extends PatientError {
  constructor(resourceId: string | number, requestId?: string) {
    super(
      `Patient with ID ${resourceId} not found`,
      404,
      "PATIENT_NOT_FOUND",
      true,
      requestId
    );
  }
}

export class PatientConflictError extends PatientError {
  constructor(field: string, value: any, requestId?: string) {
    super(
      `Patient with ${field} '${value}' already exists`,
      409,
      "PATIENT_CONFLICT",
      true,
      requestId
    );
  }
}

export class PatientValidationError extends PatientError {
  constructor(message: string, requestId?: string) {
    super(
      message,
      400,
      "PATIENT_VALIDATION_ERROR",
      true,
      requestId
    );
  }
}

export class PatientDatabaseError extends PatientError {
  constructor(message: string, requestId?: string) {
    super(
      message,
      500,
      "PATIENT_DATABASE_ERROR",
      false,
      requestId
    );
  }
}

export class PatientBulkOperationError extends PatientError {
  constructor(message: string, requestId?: string) {
    super(
      message,
      400,
      "PATIENT_BULK_OPERATION_ERROR",
      true,
      requestId
    );
  }
}

// ============================================================================
// ERROR RESPONSE BUILDERS
// ============================================================================

export interface ErrorResponse {
  error: string;
  message: string;
  code: string;
  timestamp: string;
  requestId?: string;
  details?: any;
  path?: string;
  method?: string;
}

export const buildErrorResponse = (
  error: PatientError | Error,
  requestId?: string,
  path?: string,
  method?: string
): ErrorResponse => {
  const baseResponse: ErrorResponse = {
    error: error.name || "Error",
    message: error.message,
    code: (error as PatientError).code || "UNKNOWN_ERROR",
    timestamp: new Date().toISOString(),
    requestId,
    path,
    method,
  };

  if (error instanceof PatientError) {
    return {
      ...baseResponse,
      code: error.code,
      details: {
        statusCode: error.statusCode,
        isOperational: error.isOperational,
      },
    };
  }

  return baseResponse;
};

export const buildValidationErrorResponse = (
  zodError: ZodError,
  requestId?: string,
  path?: string,
  method?: string
): ErrorResponse => {
  return {
    error: "Validation Error",
    message: "Request validation failed",
    code: "VALIDATION_ERROR",
    timestamp: new Date().toISOString(),
    requestId,
    path,
    method,
    details: {
      fields: zodError.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        received: err.input,
      })),
    },
  };
};

// ============================================================================
// ERROR HANDLER MIDDLEWARE
// ============================================================================

export const handlePatientError = (
  error: Error,
  reply: FastifyReply,
  requestId?: string,
  path?: string,
  method?: string
): void => {
  let statusCode = 500;
  let errorResponse: ErrorResponse;

  if (error instanceof PatientError) {
    statusCode = error.statusCode;
    errorResponse = buildErrorResponse(error, requestId, path, method);
  } else if (error instanceof ZodError) {
    statusCode = 400;
    errorResponse = buildValidationErrorResponse(error, requestId, path, method);
  } else {
    // Handle unexpected errors
    errorResponse = buildErrorResponse(error, requestId, path, method);
  }

  // Log error for debugging (in production, use proper logging service)
  console.error(`[${new Date().toISOString()}] ${error.name}: ${error.message}`, {
    statusCode,
    requestId,
    path,
    method,
    stack: error.stack,
  });

  reply.status(statusCode).send(errorResponse);
};

// ============================================================================
// ERROR CODES CONSTANTS
// ============================================================================

export const PATIENT_ERROR_CODES = {
  // Validation errors
  INVALID_EMAIL: "INVALID_EMAIL",
  INVALID_PHONE: "INVALID_PHONE",
  INVALID_BIRTH_DATE: "INVALID_BIRTH_DATE",
  INVALID_IDENTIFICATION: "INVALID_IDENTIFICATION",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
  
  // Business logic errors
  DUPLICATE_EMAIL: "DUPLICATE_EMAIL",
  DUPLICATE_PHONE: "DUPLICATE_PHONE",
  DUPLICATE_IDENTIFICATION: "DUPLICATE_IDENTIFICATION",
  INVALID_STATUS_TRANSITION: "INVALID_STATUS_TRANSITION",
  
  // Database errors
  DATABASE_CONNECTION_ERROR: "DATABASE_CONNECTION_ERROR",
  DATABASE_QUERY_ERROR: "DATABASE_QUERY_ERROR",
  DATABASE_TRANSACTION_ERROR: "DATABASE_TRANSACTION_ERROR",
  
  // Bulk operation errors
  BULK_OPERATION_LIMIT_EXCEEDED: "BULK_OPERATION_LIMIT_EXCEEDED",
  BULK_OPERATION_PARTIAL_FAILURE: "BULK_OPERATION_PARTIAL_FAILURE",
  
  // Authorization errors
  UNAUTHORIZED_ACCESS: "UNAUTHORIZED_ACCESS",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
  
  // Rate limiting errors
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  
  // System errors
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
} as const;

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const PATIENT_ERROR_MESSAGES = {
  [PATIENT_ERROR_CODES.INVALID_EMAIL]: "Invalid email format provided",
  [PATIENT_ERROR_CODES.INVALID_PHONE]: "Invalid phone number format provided",
  [PATIENT_ERROR_CODES.INVALID_BIRTH_DATE]: "Invalid birth date provided",
  [PATIENT_ERROR_CODES.INVALID_IDENTIFICATION]: "Invalid identification information provided",
  [PATIENT_ERROR_CODES.MISSING_REQUIRED_FIELD]: "Required field is missing",
  [PATIENT_ERROR_CODES.DUPLICATE_EMAIL]: "Patient with this email already exists",
  [PATIENT_ERROR_CODES.DUPLICATE_PHONE]: "Patient with this phone number already exists",
  [PATIENT_ERROR_CODES.DUPLICATE_IDENTIFICATION]: "Patient with this identification already exists",
  [PATIENT_ERROR_CODES.INVALID_STATUS_TRANSITION]: "Invalid status transition requested",
  [PATIENT_ERROR_CODES.DATABASE_CONNECTION_ERROR]: "Database connection failed",
  [PATIENT_ERROR_CODES.DATABASE_QUERY_ERROR]: "Database query failed",
  [PATIENT_ERROR_CODES.DATABASE_TRANSACTION_ERROR]: "Database transaction failed",
  [PATIENT_ERROR_CODES.BULK_OPERATION_LIMIT_EXCEEDED]: "Bulk operation limit exceeded",
  [PATIENT_ERROR_CODES.BULK_OPERATION_PARTIAL_FAILURE]: "Bulk operation partially failed",
  [PATIENT_ERROR_CODES.UNAUTHORIZED_ACCESS]: "Unauthorized access to patient data",
  [PATIENT_ERROR_CODES.INSUFFICIENT_PERMISSIONS]: "Insufficient permissions for this operation",
  [PATIENT_ERROR_CODES.RATE_LIMIT_EXCEEDED]: "Rate limit exceeded",
  [PATIENT_ERROR_CODES.INTERNAL_SERVER_ERROR]: "Internal server error occurred",
  [PATIENT_ERROR_CODES.SERVICE_UNAVAILABLE]: "Service temporarily unavailable",
} as const;
