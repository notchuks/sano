import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { PatientController } from "./patient.controller";
import { 
  CreatePatientSchema, 
  UpdatePatientSchema, 
  PatientQuerySchema,
  PatientListResponseSchema,
  BulkUpdatePatientSchema,
  BulkDeletePatientSchema,
  SuccessResponseSchema,
  BulkOperationResponseSchema,
  ValidationErrorSchema,
  NotFoundErrorSchema,
  ConflictErrorSchema,
  InternalServerErrorSchema
} from "./patient.schema";
import { Type } from "@sinclair/typebox";

// ============================================================================
// RESPONSE SCHEMAS FOR DOCUMENTATION
// ============================================================================

const ErrorResponseSchema = Type.Union([
  ValidationErrorSchema,
  NotFoundErrorSchema,
  ConflictErrorSchema,
  InternalServerErrorSchema,
]);

const StandardResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Optional(Type.Any()),
  timestamp: Type.String({ format: "date-time" }),
  requestId: Type.String(),
  meta: Type.Object({
    processingTime: Type.Number(),
    userId: Type.Optional(Type.String()),
    userRole: Type.Optional(Type.String()),
  }),
});

// ============================================================================
// ROUTE DEFINITIONS
// ============================================================================

export default async function patientRoutes(
  app: FastifyInstance, 
  options: FastifyPluginOptions
): Promise<void> {
  // ========================================================================
  // BASIC CRUD OPERATIONS
  // ========================================================================

  // Create new patient
  app.post("/", { 
    schema: { 
      body: CreatePatientSchema, 
      response: { 201: StandardResponseSchema } 
    } 
  }, PatientController.create as any);

  // Get all patients
  app.get("/", { 
    schema: { 
      response: { 200: StandardResponseSchema } 
    } 
  }, PatientController.getAll as any);

  // Get patient by ID
  app.get("/:id", { 
    schema: { 
      params: Type.Object({
        id: Type.Integer({ minimum: 1, description: "Patient ID" }),
      }),
      response: { 200: StandardResponseSchema } 
    } 
  }, PatientController.getById as any);

  // Update patient
  app.put("/:id", { 
    schema: { 
      params: Type.Object({
        id: Type.Integer({ minimum: 1, description: "Patient ID" }),
      }),
      body: UpdatePatientSchema, 
      response: { 200: StandardResponseSchema } 
    } 
  }, PatientController.update as any);

  // Delete patient
  app.delete("/:id", { 
    schema: { 
      params: Type.Object({
        id: Type.Integer({ minimum: 1, description: "Patient ID" }),
      }),
      response: { 204: Type.Null() } 
    } 
  }, PatientController.delete as any);

  // ========================================================================
  // SEARCH & QUERY OPERATIONS
  // ========================================================================

  // Search patients with filters
  app.get("/search", { 
    schema: { 
      querystring: PatientQuerySchema,
      response: { 200: StandardResponseSchema } 
    } 
  }, PatientController.search as any);

  // Get patient by user ID
  app.get("/user/:userId", { 
    schema: { 
      params: Type.Object({
        userId: Type.String({ description: "User ID" }),
      }),
      response: { 200: StandardResponseSchema } 
    } 
  }, PatientController.getByUserId as any);

  // Get patients by physician
  app.get("/physician/:physicianName", { 
    schema: { 
      params: Type.Object({
        physicianName: Type.String({ description: "Physician name" }),
      }),
      response: { 200: StandardResponseSchema } 
    } 
  }, PatientController.getByPhysician as any);

  // Get patients by insurance provider
  app.get("/insurance/:provider", { 
    schema: { 
      params: Type.Object({
        provider: Type.String({ description: "Insurance provider name" }),
      }),
      response: { 200: StandardResponseSchema } 
    } 
  }, PatientController.getByInsuranceProvider as any);

  // ========================================================================
  // BULK OPERATIONS
  // ========================================================================

  // Bulk update patients
  app.post("/bulk/update", { 
    schema: { 
      body: BulkUpdatePatientSchema,
      response: { 200: StandardResponseSchema } 
    } 
  }, PatientController.bulkUpdate as any);

  // Bulk delete patients
  app.post("/bulk/delete", { 
    schema: { 
      body: BulkDeletePatientSchema,
      response: { 200: StandardResponseSchema } 
    } 
  }, PatientController.bulkDelete as any);

  // ========================================================================
  // STATISTICS & ANALYTICS
  // ========================================================================

  // Get patient statistics
  app.get("/statistics", { 
    schema: { 
      response: { 200: StandardResponseSchema } 
    } 
  }, PatientController.getStatistics as any);

  // ========================================================================
  // HEALTH & MONITORING
  // ========================================================================

  // Health check
  app.get("/health", { 
    schema: { 
      response: { 200: StandardResponseSchema } 
    } 
  }, PatientController.healthCheck as any);

  // ========================================================================
  // GLOBAL HOOKS & MIDDLEWARE
  // ========================================================================

  // Request logging middleware
  app.addHook('onRequest', async (request) => {
    console.log(`[${new Date().toISOString()}] ${request.method} ${request.url} - IP: ${request.ip}`);
  });

  // Response logging middleware
  app.addHook('onResponse', async (request, reply) => {
    const responseTime = reply.elapsedTime;
    console.log(`[${new Date().toISOString()}] ${request.method} ${request.url} - ${reply.statusCode} - ${responseTime}ms`);
  });
}
