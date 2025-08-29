import { Type, Static } from "@sinclair/typebox";
import { FastifySchema } from "fastify";

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const GenderEnum = {
  MALE: "male",
  FEMALE: "female",
  OTHER: "other",
  PREFER_NOT_TO_SAY: "prefer_not_to_say",
} as const;

export const IdentificationTypeEnum = {
  PASSPORT: "passport",
  DRIVERS_LICENSE: "drivers_license",
  NATIONAL_ID: "national_id",
  SOCIAL_SECURITY: "social_security",
  OTHER: "other",
} as const;



// ============================================================================
// BASE SCHEMAS
// ============================================================================

export const BasePatientSchema = Type.Object({
  userId: Type.String({ minLength: 1, maxLength: 100, description: "Unique user identifier" }),
  name: Type.String({ 
    minLength: 1, 
    maxLength: 100, 
    pattern: "^[a-zA-Z\\s\\-']+$",
    description: "Patient's full name (letters, spaces, hyphens, apostrophes only)" 
  }),
  email: Type.String({ 
    format: "email", 
    maxLength: 100,
    description: "Patient's email address" 
  }),
  phone: Type.String({ 
    minLength: 10, 
    maxLength: 20,
    pattern: "^[+]?[0-9\\s\\-\\(\\)]+$",
    description: "Patient's phone number" 
  }),
  birthDate: Type.String({ 
    format: "date",
    description: "Patient's date of birth (YYYY-MM-DD)" 
  }),
  gender: Type.Union([
    Type.Literal(GenderEnum.MALE),
    Type.Literal(GenderEnum.FEMALE),
    Type.Literal(GenderEnum.OTHER),
    Type.Literal(GenderEnum.PREFER_NOT_TO_SAY)
  ], { description: "Patient's gender identity" }),
  address: Type.String({ 
    maxLength: 500,
    description: "Patient's residential address" 
  }),
  occupation: Type.String({ 
    maxLength: 100,
    description: "Patient's occupation or profession" 
  }),
  emergencyContactName: Type.String({ 
    maxLength: 100,
    pattern: "^[a-zA-Z\\s\\-']+$",
    description: "Emergency contact person's name" 
  }),
  emergencyContactNumber: Type.String({ 
    minLength: 10, 
    maxLength: 20,
    pattern: "^[+]?[0-9\\s\\-\\(\\)]+$",
    description: "Emergency contact phone number" 
  }),
  primaryPhysician: Type.String({ 
    maxLength: 100,
    description: "Primary care physician's name" 
  }),
  insuranceProvider: Type.String({ 
    maxLength: 100,
    description: "Health insurance provider name" 
  }),
  insurancePolicyNumber: Type.String({ 
    maxLength: 50,
    pattern: "^[A-Z0-9\\-]+$",
    description: "Insurance policy number (alphanumeric and hyphens only)" 
  }),
  allergies: Type.Optional(Type.String({ 
    maxLength: 1000,
    description: "Known allergies and reactions" 
  })),
  currentMedication: Type.Optional(Type.String({ 
    maxLength: 1000,
    description: "Current medications and dosages" 
  })),
  familyMedicalHistory: Type.Optional(Type.String({ 
    maxLength: 2000,
    description: "Family medical history" 
  })),
  pastMedicalHistory: Type.Optional(Type.String({ 
    maxLength: 2000,
    description: "Past medical conditions and treatments" 
  })),
  identificationType: Type.Optional(Type.Union([
    Type.Literal(IdentificationTypeEnum.PASSPORT),
    Type.Literal(IdentificationTypeEnum.DRIVERS_LICENSE),
    Type.Literal(IdentificationTypeEnum.NATIONAL_ID),
    Type.Literal(IdentificationTypeEnum.SOCIAL_SECURITY),
    Type.Literal(IdentificationTypeEnum.OTHER)
  ], { description: "Type of identification document" })),
  identificationNumber: Type.Optional(Type.String({ 
    maxLength: 100,
    description: "Identification document number" 
  })),
  identificationDocument: Type.Optional(Type.String({ 
    maxLength: 500,
    format: "uri",
    description: "URL or file path to identification document" 
  })),
  privacyConsent: Type.Boolean({ description: "Patient's consent to privacy policy" }),
}, {
  $id: 'BasePatient',
  additionalProperties: false,
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const PatientResponseSchema = Type.Intersect([
  BasePatientSchema,
  Type.Object({
    id: Type.Integer({ minimum: 1, description: "Unique patient identifier" }),
    createdAt: Type.String({ format: "date-time", description: "Record creation timestamp" }),
    updatedAt: Type.String({ format: "date-time", description: "Record last update timestamp" }),
  })
], {
  $id: 'PatientResponse',
  additionalProperties: false,
});

export const PatientListResponseSchema = Type.Object({
  data: Type.Array(PatientResponseSchema),
  pagination: Type.Object({
    page: Type.Integer({ minimum: 1, description: "Current page number" }),
    pageSize: Type.Integer({ minimum: 1, maximum: 1000, description: "Items per page" }),
    total: Type.Integer({ minimum: 0, description: "Total number of records" }),
    totalPages: Type.Integer({ minimum: 0, description: "Total number of pages" }),
    hasNext: Type.Boolean({ description: "Whether there are more pages" }),
    hasPrev: Type.Boolean({ description: "Whether there are previous pages" }),
  }),
  meta: Type.Object({
    processingTime: Type.Number({ description: "Request processing time in milliseconds" }),
    filters: Type.Optional(Type.Object({
      search: Type.Optional(Type.String()),
      gender: Type.Optional(Type.String()),
      userId: Type.Optional(Type.String()),
      physician: Type.Optional(Type.String()),
      insuranceProvider: Type.Optional(Type.String()),
    })),
  }),
}, {
  $id: 'PatientListResponse',
  additionalProperties: false,
});

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

export const CreatePatientSchema = Type.Omit(BasePatientSchema, [], {
  $id: 'CreatePatient',
  additionalProperties: false,
});

export const UpdatePatientSchema = Type.Partial(Type.Omit(BasePatientSchema, ['userId']), {
  $id: 'UpdatePatient',
  additionalProperties: false,
});

export const BulkUpdatePatientSchema = Type.Object({
  ids: Type.Array(Type.Integer({ minimum: 1 }), { 
    minItems: 1, 
    maxItems: 100,
    description: "Array of patient IDs to update" 
  }),
  updates: UpdatePatientSchema,
}, {
  $id: 'BulkUpdatePatient',
  additionalProperties: false,
});

export const BulkDeletePatientSchema = Type.Object({
  ids: Type.Array(Type.Integer({ minimum: 1 }), { 
    minItems: 1, 
    maxItems: 100,
    description: "Array of patient IDs to delete" 
  }),
  reason: Type.Optional(Type.String({ 
    maxLength: 500,
    description: "Reason for bulk deletion" 
  })),
}, {
  $id: 'BulkDeletePatient',
  additionalProperties: false,
});

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const PatientQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ 
    minimum: 1, 
    default: 1,
    description: "Page number for pagination" 
  })),
  pageSize: Type.Optional(Type.Integer({ 
    minimum: 1, 
    maximum: 1000, 
    default: 20,
    description: "Number of items per page" 
  })),
  search: Type.Optional(Type.String({ 
    maxLength: 200,
    description: "Search term for name, email, or phone" 
  })),
  gender: Type.Optional(Type.Union([
    Type.Literal(GenderEnum.MALE),
    Type.Literal(GenderEnum.FEMALE),
    Type.Literal(GenderEnum.OTHER),
    Type.Literal(GenderEnum.PREFER_NOT_TO_SAY)
  ], { description: "Filter by gender" })),

  userId: Type.Optional(Type.String({ description: "Filter by user ID" })),
  physician: Type.Optional(Type.String({ 
    maxLength: 100,
    description: "Filter by primary physician" 
  })),
  insuranceProvider: Type.Optional(Type.String({ 
    maxLength: 100,
    description: "Filter by insurance provider" 
  })),
  birthDateFrom: Type.Optional(Type.String({ 
    format: "date",
    description: "Filter by birth date from (YYYY-MM-DD)" 
  })),
  birthDateTo: Type.Optional(Type.String({ 
    format: "date",
    description: "Filter by birth date to (YYYY-MM-DD)" 
  })),
  createdAtFrom: Type.Optional(Type.String({ 
    format: "date-time",
    description: "Filter by creation date from" 
  })),
  createdAtTo: Type.Optional(Type.String({ 
    format: "date-time",
    description: "Filter by creation date to" 
  })),
  sortBy: Type.Optional(Type.Union([
    Type.Literal("name"),
    Type.Literal("email"),
    Type.Literal("birthDate"),
    Type.Literal("createdAt"),
    Type.Literal("updatedAt")
  ], { default: "createdAt", description: "Field to sort by" })),
  sortOrder: Type.Optional(Type.Union([
    Type.Literal("asc"),
    Type.Literal("desc")
  ], { default: "desc", description: "Sort order" })),
}, {
  $id: 'PatientQuery',
  additionalProperties: false,
});

// ============================================================================
// ERROR SCHEMAS
// ============================================================================

export const ValidationErrorSchema = Type.Object({
  error: Type.Literal("Validation Error"),
  message: Type.String(),
  details: Type.Array(Type.Object({
    field: Type.String(),
    message: Type.String(),
    value: Type.Any(),
  })),
  timestamp: Type.String({ format: "date-time" }),
  requestId: Type.String(),
}, {
  $id: 'ValidationError',
  additionalProperties: false,
});

export const NotFoundErrorSchema = Type.Object({
  error: Type.Literal("Not Found"),
  message: Type.String(),
  resource: Type.String(),
  resourceId: Type.Union([Type.String(), Type.Number()]),
  timestamp: Type.String({ format: "date-time" }),
  requestId: Type.String(),
}, {
  $id: 'NotFoundError',
  additionalProperties: false,
});

export const ConflictErrorSchema = Type.Object({
  error: Type.Literal("Conflict"),
  message: Type.String(),
  resource: Type.String(),
  conflictField: Type.String(),
  conflictValue: Type.Any(),
  timestamp: Type.String({ format: "date-time" }),
  requestId: Type.String(),
}, {
  $id: 'ConflictError',
  additionalProperties: false,
});

export const InternalServerErrorSchema = Type.Object({
  error: Type.Literal("Internal Server Error"),
  message: Type.String(),
  timestamp: Type.String({ format: "date-time" }),
  requestId: Type.String(),
  code: Type.Optional(Type.String()),
}, {
  $id: 'InternalServerError',
  additionalProperties: false,
});

// ============================================================================
// SUCCESS SCHEMAS
// ============================================================================

export const SuccessResponseSchema = Type.Object({
  success: Type.Literal(true),
  message: Type.String(),
  data: Type.Optional(Type.Any()),
  timestamp: Type.String({ format: "date-time" }),
  requestId: Type.String(),
}, {
  $id: 'SuccessResponse',
  additionalProperties: false,
});

export const BulkOperationResponseSchema = Type.Object({
  success: Type.Literal(true),
  message: Type.String(),
  processed: Type.Integer({ minimum: 0 }),
  succeeded: Type.Integer({ minimum: 0 }),
  failed: Type.Integer({ minimum: 0 }),
  errors: Type.Optional(Type.Array(Type.Object({
    id: Type.Union([Type.String(), Type.Number()]),
    error: Type.String(),
    details: Type.Optional(Type.String()),
  }))),
  timestamp: Type.String({ format: "date-time" }),
  requestId: Type.String(),
}, {
  $id: 'BulkOperationResponse',
  additionalProperties: false,
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Patient = Static<typeof PatientResponseSchema>;
export type CreatePatient = Static<typeof CreatePatientSchema>;
export type UpdatePatient = Static<typeof UpdatePatientSchema>;
export type PatientQuery = Static<typeof PatientQuerySchema>;
export type PatientListResponse = Static<typeof PatientListResponseSchema>;

// ============================================================================
// SCHEMA REGISTRY
// ============================================================================

export const PatientSchemas = {
  PatientResponse: PatientResponseSchema,
  PatientListResponse: PatientListResponseSchema,
  CreatePatient: CreatePatientSchema,
  UpdatePatient: UpdatePatientSchema,
  BulkUpdatePatient: BulkUpdatePatientSchema,
  BulkDeletePatient: BulkDeletePatientSchema,
  PatientQuery: PatientQuerySchema,
  ValidationError: ValidationErrorSchema,
  NotFoundError: NotFoundErrorSchema,
  ConflictError: ConflictErrorSchema,
  InternalServerError: InternalServerErrorSchema,
  SuccessResponse: SuccessResponseSchema,
  BulkOperationResponse: BulkOperationResponseSchema,
};
