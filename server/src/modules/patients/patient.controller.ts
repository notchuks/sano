import { FastifyRequest, FastifyReply } from "fastify";
import { PatientService } from "./patient.service";
import { 
  PatientError, 
  PatientNotFoundError, 
  PatientConflictError, 
  PatientValidationError,
  handlePatientError 
} from "./patient.errors";
import { 
  CreatePatient, 
  UpdatePatient, 
  PatientQuery 
} from "./patient.schema";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

interface AuthenticatedRequest extends Omit<FastifyRequest, 'user'> {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

interface RequestContext {
  requestId: string;
  userId?: string;
  userRole?: string;
  startTime: number;
  path: string;
  method: string;
  ip: string;
  userAgent: string;
}

// ============================================================================
// REQUEST CONTEXT MIDDLEWARE
// ============================================================================

const createRequestContext = (request: FastifyRequest | AuthenticatedRequest): RequestContext => {
  return {
    requestId: uuidv4(),
    userId: (request as AuthenticatedRequest).user?.id,
    userRole: (request as AuthenticatedRequest).user?.role,
    startTime: Date.now(),
    path: request.url,
    method: request.method,
    ip: request.ip || request.socket.remoteAddress || 'unknown',
    userAgent: request.headers['user-agent'] || 'unknown',
  };
};

// ============================================================================
// RESPONSE FORMATTERS
// ============================================================================

const formatSuccessResponse = <T>(
  data: T, 
  message: string, 
  context: RequestContext,
  statusCode: number = 200
) => {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
    requestId: context.requestId,
    meta: {
      processingTime: Date.now() - context.startTime,
      userId: context.userId,
      userRole: context.userRole,
    },
  };
};

const formatErrorResponse = (
  error: PatientError | Error,
  context: RequestContext,
  statusCode: number = 500
) => {
  return {
    success: false,
    error: error.name || "Error",
    message: error.message,
    code: (error as PatientError).code || "UNKNOWN_ERROR",
    timestamp: new Date().toISOString(),
    requestId: context.requestId,
    meta: {
      processingTime: Date.now() - context.startTime,
      userId: context.userId,
      userRole: context.userRole,
      path: context.path,
      method: context.method,
    },
  };
};

// ============================================================================
// AUTHORIZATION HELPERS
// ============================================================================

const checkPermission = (
  context: RequestContext, 
  requiredPermission: string
): boolean => {
  // In a real application, this would check against the user's permissions
  // For now, we'll implement basic role-based access control
  const userRole = context.userRole;
  
  if (!userRole) return false;
  
  const rolePermissions: Record<string, string[]> = {
    admin: ['read', 'write', 'delete', 'bulk_operations'],
    doctor: ['read', 'write'],
    nurse: ['read', 'write'],
    receptionist: ['read', 'write'],
    patient: ['read_own'],
  };
  
  return rolePermissions[userRole]?.includes(requiredPermission) || false;
};

const checkOwnership = (
  context: RequestContext, 
  patientUserId: string
): boolean => {
  // Patients can only access their own data
  if (context.userRole === 'patient') {
    return context.userId === patientUserId;
  }
  
  // Staff can access all patient data
  return ['admin', 'doctor', 'nurse', 'receptionist'].includes(context.userRole || '');
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

const validatePagination = (page?: number, pageSize?: number): { page: number; pageSize: number } => {
  const validatedPage = Math.max(1, page || 1);
  const validatedPageSize = Math.min(Math.max(1, pageSize || 20), 1000);
  
  return { page: validatedPage, pageSize: validatedPageSize };
};

const sanitizeSearchQuery = (query: string): string => {
  // Basic SQL injection prevention
  return query.replace(/[;'"\\]/g, '');
};

// ============================================================================
// PATIENT CONTROLLER CLASS
// ============================================================================

export class PatientController {
  // ========================================================================
  // CRUD OPERATIONS
  // ========================================================================

  static async create(request: AuthenticatedRequest, reply: FastifyReply) {
    const context = createRequestContext(request);
    
    try {
      // Check permissions
      if (!checkPermission(context, 'write')) {
        reply.status(403).send(formatErrorResponse(
          new PatientError("Insufficient permissions to create patients", 403, "INSUFFICIENT_PERMISSIONS"),
          context
        ));
        return;
      }

      // Validate request body
      const patientData = request.body as CreatePatient;
      if (!patientData) {
        reply.status(400).send(formatErrorResponse(
          new PatientValidationError("Patient data is required"),
          context
        ));
        return;
      }

      // Create patient
      const patient = await PatientService.createPatient(patientData, context.requestId);
      
      reply.status(201).send(formatSuccessResponse(
        patient,
        "Patient created successfully",
        context,
        201
      ));
    } catch (error) {
      handlePatientError(error as Error, reply, context.requestId, context.path, context.method);
    }
  }

  static async getAll(request: AuthenticatedRequest, reply: FastifyReply) {
    const context = createRequestContext(request);
    
    try {
      // Check permissions
      if (!checkPermission(context, 'read')) {
        reply.status(403).send(formatErrorResponse(
          new PatientError("Insufficient permissions to read patients", 403, "INSUFFICIENT_PERMISSIONS"),
          context
        ));
        return;
      }

      // Get all patients
      const patients = await PatientService.getAllPatients(context.requestId);
      
      reply.send(formatSuccessResponse(
        patients,
        "Patients retrieved successfully",
        context
      ));
    } catch (error) {
      handlePatientError(error as Error, reply, context.requestId, context.path, context.method);
    }
  }

  static async getById(request: AuthenticatedRequest, reply: FastifyReply) {
    const context = createRequestContext(request);
    
    try {
      // Check permissions
      if (!checkPermission(context, 'read')) {
        reply.status(403).send(formatErrorResponse(
          new PatientError("Insufficient permissions to read patients", 403, "INSUFFICIENT_PERMISSIONS"),
          context
        ));
        return;
      }

      const id = Number((request.params as any)["id"]);
      if (isNaN(id)) {
        reply.status(400).send(formatErrorResponse(
          new PatientValidationError("Invalid patient ID"),
          context
        ));
        return;
      }

      // Get patient
      const patient = await PatientService.getPatientById(id, context.requestId);
      
      // Check ownership for patient role
      if (!checkOwnership(context, patient.userId)) {
        reply.status(400).send(formatErrorResponse(
          new PatientError("Access denied to this patient record", 403, "ACCESS_DENIED"),
          context
        ));
        return;
      }

      reply.send(formatSuccessResponse(
        patient,
        "Patient retrieved successfully",
        context
      ));
    } catch (error) {
      handlePatientError(error as Error, reply, context.requestId, context.path, context.method);
    }
  }

  static async getByUserId(request: AuthenticatedRequest, reply: FastifyReply) {
    const context = createRequestContext(request);
    
    try {
      // Check permissions
      if (!checkPermission(context, 'read')) {
        reply.status(403).send(formatErrorResponse(
          new PatientError("Insufficient permissions to read patients", 403, "INSUFFICIENT_PERMISSIONS"),
          context
        ));
        return;
      }

      const { userId } = request.params as { userId: string };
      if (!userId) {
        reply.status(400).send(formatErrorResponse(
          new PatientValidationError("User ID is required"),
          context
        ));
        return;
      }

      // Check ownership for patient role
      if (!checkOwnership(context, userId)) {
        reply.status(403).send(formatErrorResponse(
          new PatientError("Access denied to this patient record", 403, "ACCESS_DENIED"),
          context
        ));
        return;
      }

      // Get patient by user ID
      const patient = await PatientService.getPatientByUserId(userId, context.requestId);
      
      reply.send(formatSuccessResponse(
        patient,
        "Patient retrieved successfully",
        context
      ));
    } catch (error) {
      handlePatientError(error as Error, reply, context.requestId, context.path, context.method);
    }
  }

  static async update(request: AuthenticatedRequest, reply: FastifyReply) {
    const context = createRequestContext(request);
    
    try {
      // Check permissions
      if (!checkPermission(context, 'write')) {
        reply.status(403).send(formatErrorResponse(
          new PatientError("Insufficient permissions to update patients", 403, "INSUFFICIENT_PERMISSIONS"),
          context
        ));
        return;
      }

      const id = Number((request.params as any)["id"]);
      if (isNaN(id)) {
        reply.status(400).send(formatErrorResponse(
          new PatientValidationError("Invalid patient ID"),
          context
        ));
        return;
      }

      // Validate request body
      const updateData = request.body as UpdatePatient;
      if (!updateData || Object.keys(updateData).length === 0) {
        reply.status(400).send(formatErrorResponse(
          new PatientValidationError("Update data is required"),
          context
        ));
        return;
      }

      // Get current patient to check ownership
      const currentPatient = await PatientService.getPatientById(id, context.requestId);
      if (!checkOwnership(context, currentPatient.userId)) {
        reply.status(403).send(formatErrorResponse(
          new PatientError("Access denied to update this patient record", 403, "ACCESS_DENIED"),
          context
        ));
        return;
      }

      // Update patient
      const updatedPatient = await PatientService.updatePatient(id, updateData, context.requestId);
      
      reply.send(formatSuccessResponse(
        updatedPatient,
        "Patient updated successfully",
        context
      ));
    } catch (error) {
      handlePatientError(error as Error, reply, context.requestId, context.path, context.method);
    }
  }

  static async delete(request: AuthenticatedRequest, reply: FastifyReply) {
    const context = createRequestContext(request);
    
    try {
      // Check permissions
      if (!checkPermission(context, 'delete')) {
        reply.status(403).send(formatErrorResponse(
          new PatientError("Insufficient permissions to delete patients", 403, "INSUFFICIENT_PERMISSIONS"),
          context
        ));
        return;
      }

      const id = Number((request.params as any)["id"]);
      if (isNaN(id)) {
        reply.status(400).send(formatErrorResponse(
          new PatientValidationError("Invalid patient ID"),
          context
        ));
        return;
      }

      // Get current patient to check ownership
      const currentPatient = await PatientService.getPatientById(id, context.requestId);
      if (!checkOwnership(context, currentPatient.userId)) {
        reply.status(403).send(formatErrorResponse(
          new PatientError("Access denied to delete this patient record", 403, "ACCESS_DENIED"),
          context
        ));
        return;
      }

      // Delete patient
      await PatientService.deletePatient(id, context.requestId);
      
      reply.status(204).send();
    } catch (error) {
      handlePatientError(error as Error, reply, context.requestId, context.path, context.method);
    }
  }

  // ========================================================================
  // SEARCH & QUERY OPERATIONS
  // ========================================================================

  static async search(request: AuthenticatedRequest, reply: FastifyReply) {
    const context = createRequestContext(request);
    
    try {
      // Check permissions
      if (!checkPermission(context, 'read')) {
        reply.status(403).send(formatErrorResponse(
          new PatientError("Insufficient permissions to search patients", 403, "INSUFFICIENT_PERMISSIONS"),
          context
        ));
        return;
      }

      // Validate and sanitize query parameters
      const query = request.query as PatientQuery;
      
      // Sanitize search term
      if (query.search) {
        query.search = sanitizeSearchQuery(query.search);
      }

      // Validate pagination
      const { page, pageSize } = validatePagination(query.page, query.pageSize);
      query.page = page;
      query.pageSize = pageSize;

      // Search patients
      const result = await PatientService.searchPatients(query, context.requestId);
      
      reply.send(formatSuccessResponse(
        result,
        "Patient search completed successfully",
        context
      ));
    } catch (error) {
      handlePatientError(error as Error, reply, context.requestId, context.path, context.method);
    }
  }

  static async getByPhysician(request: AuthenticatedRequest, reply: FastifyReply) {
    const context = createRequestContext(request);
    
    try {
      // Check permissions
      if (!checkPermission(context, 'read')) {
        reply.status(403).send(formatErrorResponse(
          new PatientError("Insufficient permissions to read patients", 403, "INSUFFICIENT_PERMISSIONS"),
          context
        ));
        return;
      }

      const { physicianName } = request.params as { physicianName: string };
      if (!physicianName) {
        reply.status(400).send(formatErrorResponse(
          new PatientValidationError("Physician name is required"),
          context
        ));
        return;
      }

      // Sanitize physician name
      const sanitizedName = sanitizeSearchQuery(physicianName);

      // Get patients by physician
      const patients = await PatientService.getPatientsByPhysician(sanitizedName, context.requestId);
      
      reply.send(formatSuccessResponse(
        patients,
        "Patients retrieved successfully",
        context
      ));
    } catch (error) {
      handlePatientError(error as Error, reply, context.requestId, context.path, context.method);
    }
  }

  static async getByInsuranceProvider(request: AuthenticatedRequest, reply: FastifyReply) {
    const context = createRequestContext(request);
    
    try {
      // Check permissions
      if (!checkPermission(context, 'read')) {
        reply.status(403).send(formatErrorResponse(
          new PatientError("Insufficient permissions to read patients", 403, "INSUFFICIENT_PERMISSIONS"),
          context
        ));
        return;
      }

      const { provider } = request.params as { provider: string };
      if (!provider) {
        reply.status(400).send(formatErrorResponse(
          new PatientValidationError("Insurance provider is required"),
          context
        ));
        return;
      }

      // Sanitize provider name
      const sanitizedProvider = sanitizeSearchQuery(provider);

      // Get patients by insurance provider
      const patients = await PatientService.getPatientsByInsuranceProvider(sanitizedProvider, context.requestId);
      
      reply.send(formatSuccessResponse(
        patients,
        "Patients retrieved successfully",
        context
      ));
    } catch (error) {
      handlePatientError(error as Error, reply, context.requestId, context.path, context.method);
    }
  }

  // ========================================================================
  // BULK OPERATIONS
  // ========================================================================

  static async bulkUpdate(request: AuthenticatedRequest, reply: FastifyReply) {
    const context = createRequestContext(request);
    
    try {
      // Check permissions
      if (!checkPermission(context, 'bulk_operations')) {
        reply.status(403).send(formatErrorResponse(
          new PatientError("Insufficient permissions for bulk operations", 403, "INSUFFICIENT_PERMISSIONS"),
          context
        ));
        return;
      }

      // Validate request body
      const { ids, updates } = request.body as { ids: number[]; updates: UpdatePatient };
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        reply.status(400).send(formatErrorResponse(
          new PatientValidationError("Patient IDs array is required"),
          context
        ));
        return;
      }

      if (!updates || Object.keys(updates).length === 0) {
        reply.status(400).send(formatErrorResponse(
          new PatientValidationError("Update data is required"),
          context
        ));
        return;
      }

      // Validate IDs
      if (ids.some(id => !Number.isInteger(id) || id <= 0)) {
        reply.status(400).send(formatErrorResponse(
          new PatientValidationError("Invalid patient IDs provided"),
          context
        ));
        return;
      }

      // Perform bulk update
      const result = await PatientService.bulkUpdatePatients(ids, updates, context.requestId);
      
      reply.send(formatSuccessResponse(
        result,
        "Bulk update completed successfully",
        context
      ));
    } catch (error) {
      handlePatientError(error as Error, reply, context.requestId, context.path, context.method);
    }
  }

  static async bulkDelete(request: AuthenticatedRequest, reply: FastifyReply) {
    const context = createRequestContext(request);
    
    try {
      // Check permissions
      if (!checkPermission(context, 'bulk_operations')) {
        reply.status(403).send(formatErrorResponse(
          new PatientError("Insufficient permissions for bulk operations", 403, "INSUFFICIENT_PERMISSIONS"),
          context
        ));
        return;
      }

      // Validate request body
      const { ids, reason } = request.body as { ids: number[]; reason?: string };
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        reply.status(400).send(formatErrorResponse(
          new PatientValidationError("Patient IDs array is required"),
          context
        ));
        return;
      }

      // Validate IDs
      if (ids.some(id => !Number.isInteger(id) || id <= 0)) {
        reply.status(400).send(formatErrorResponse(
          new PatientValidationError("Invalid patient IDs provided"),
          context
        ));
        return;
      }

      // Perform bulk delete
      const result = await PatientService.bulkDeletePatients(ids, reason, context.requestId);
      
      reply.send(formatSuccessResponse(
        result,
        "Bulk deletion completed successfully",
        context
      ));
    } catch (error) {
      handlePatientError(error as Error, reply, context.requestId, context.path, context.method);
    }
  }

  // ========================================================================
  // STATISTICS & ANALYTICS
  // ========================================================================

  static async getStatistics(request: AuthenticatedRequest, reply: FastifyReply) {
    const context = createRequestContext(request);
    
    try {
      // Check permissions
      if (!checkPermission(context, 'read')) {
        reply.status(403).send(formatErrorResponse(
          new PatientError("Insufficient permissions to view statistics", 403, "INSUFFICIENT_PERMISSIONS"),
          context
        ));
        return;
      }

      // Get patient statistics
      const statistics = await PatientService.getPatientStatistics(context.requestId);
      
      reply.send(formatSuccessResponse(
        statistics,
        "Patient statistics retrieved successfully",
        context
      ));
    } catch (error) {
      handlePatientError(error as Error, reply, context.requestId, context.path, context.method);
    }
  }

  // ========================================================================
  // HEALTH CHECK
  // ========================================================================

  static async healthCheck(request: FastifyRequest, reply: FastifyReply) {
    const context = createRequestContext(request);
    
    try {
      // Simple health check by attempting to count patients
      await PatientService.getAllPatients(context.requestId);
      
      reply.send(formatSuccessResponse(
        { status: "healthy", timestamp: new Date().toISOString() },
        "Patient service is healthy",
        context
      ));
    } catch (error) {
      reply.status(503).send(formatErrorResponse(
        new PatientError("Patient service is unhealthy", 503, "SERVICE_UNAVAILABLE"),
        context
      ));
    }
  }
}
