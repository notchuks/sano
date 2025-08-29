import { FastifyRequest, FastifyReply, FastifyInstance } from "fastify";
import { PatientError, PATIENT_ERROR_CODES } from "./patient.errors";
import { PatientService } from "./patient.service";

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export interface AuthenticatedRequest extends FastifyRequest {
  authenticatedUser?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
    organizationId?: string;
  };
}

export interface RequestMetrics {
  startTime: number;
  endTime?: number;
  processingTime?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

export const authenticateUser = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      throw new PatientError(
        "Authorization header is required",
        401,
        PATIENT_ERROR_CODES.UNAUTHORIZED_ACCESS
      );
    }

    // Extract token from Bearer format
    const token = authHeader.replace(/^Bearer\s/, '');
    
    if (!token) {
      throw new PatientError(
        "Invalid authorization token format",
        401,
        PATIENT_ERROR_CODES.UNAUTHORIZED_ACCESS
      );
    }

    // In a real application, you would validate the JWT token here
    // For now, we'll simulate authentication
    const decodedUser = await validateJWTToken(token);
    
    // Attach user to request
    (request as AuthenticatedRequest).authenticatedUser = decodedUser;
    
  } catch (error) {
    if (error instanceof PatientError) {
      throw error;
    }
    throw new PatientError(
      "Authentication failed",
      401,
      PATIENT_ERROR_CODES.UNAUTHORIZED_ACCESS
    );
  }
};

// Mock JWT validation - replace with actual implementation
const validateJWTToken = async (token: string): Promise<any> => {
  // This is a placeholder - implement actual JWT validation
  // You might use libraries like jsonwebtoken, jose, or similar
  
  // For development/testing, you could use a simple token format
  if (token === 'dev-token') {
    return {
      id: 'dev-user-id',
      email: 'dev@example.com',
      role: 'admin',
      permissions: ['read', 'write', 'delete', 'bulk_operations'],
      organizationId: 'dev-org',
    };
  }
  
  throw new Error('Invalid token');
};

// ============================================================================
// AUTHORIZATION MIDDLEWARE
// ============================================================================

export const requirePermission = (requiredPermission: string) => {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authenticatedRequest = request as AuthenticatedRequest;
    
    if (!authenticatedRequest.user) {
      throw new PatientError(
        "User not authenticated",
        401,
        PATIENT_ERROR_CODES.UNAUTHORIZED_ACCESS
      );
    }

    const { permissions, role } = authenticatedRequest.authenticatedUser!;
    
    // Check if user has the required permission
    if (!permissions.includes(requiredPermission)) {
      throw new PatientError(
        `Insufficient permissions. Required: ${requiredPermission}`,
        403,
        PATIENT_ERROR_CODES.INSUFFICIENT_PERMISSIONS
      );
    }
  };
};

export const requireRole = (requiredRoles: string[]) => {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authenticatedRequest = request as AuthenticatedRequest;
    
    if (!authenticatedRequest.user) {
      throw new PatientError(
        "User not authenticated",
        401,
        PATIENT_ERROR_CODES.UNAUTHORIZED_ACCESS
      );
    }

    const { role } = authenticatedRequest.authenticatedUser!;
    
    if (!requiredRoles.includes(role)) {
      throw new PatientError(
        `Insufficient role. Required: ${requiredRoles.join(' or ')}`,
        403,
        PATIENT_ERROR_CODES.INSUFFICIENT_PERMISSIONS
      );
    }
  };
};

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

export const validatePatientOwnership = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;
  const { authenticatedUser } = authenticatedRequest;
  
  if (!authenticatedUser) {
    throw new PatientError(
      "User not authenticated",
      401,
      PATIENT_ERROR_CODES.UNAUTHORIZED_ACCESS
    );
  }

  // Admins and staff can access all patients
  if (['admin', 'doctor', 'nurse', 'receptionist'].includes(authenticatedUser.role)) {
    return;
  }

  // Patients can only access their own data
  if (authenticatedUser.role === 'patient') {
    const patientId = Number((request.params as any).id);
    if (isNaN(patientId)) {
      throw new PatientError(
        "Invalid patient ID",
        400,
        PATIENT_ERROR_CODES.INVALID_IDENTIFICATION
      );
    }

    try {
      const patient = await PatientService.getPatientById(patientId);
      if (patient.userId !== authenticatedUser.id) {
        throw new PatientError(
          "Access denied to this patient record",
          403,
          PATIENT_ERROR_CODES.INSUFFICIENT_PERMISSIONS
        );
      }
    } catch (error) {
      if (error instanceof PatientError) {
        throw error;
      }
      throw new PatientError(
        "Failed to validate patient ownership",
        500,
        PATIENT_ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }
};

// ============================================================================
// RATE LIMITING MIDDLEWARE
// ============================================================================

export const createRateLimiter = (max: number, timeWindow: string) => {
  const timeWindowMs = parseTimeWindow(timeWindow);
  const requests = new Map<string, { count: number; resetTime: number }>();

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const key = getRateLimitKey(request);
    const now = Date.now();
    
    const userRequests = requests.get(key);
    
    if (!userRequests || now > userRequests.resetTime) {
      // Reset or create new rate limit entry
      requests.set(key, { count: 1, resetTime: now + timeWindowMs });
      return;
    }
    
    if (userRequests.count >= max) {
      throw new PatientError(
        "Rate limit exceeded",
        429,
        PATIENT_ERROR_CODES.RATE_LIMIT_EXCEEDED
      );
    }
    
    userRequests.count++;
  };
};

const getRateLimitKey = (request: FastifyRequest): string => {
  const user = (request as AuthenticatedRequest).authenticatedUser;
  const ip = request.ip || request.socket.remoteAddress || 'unknown';
  
  if (user) {
    return `user:${user.id}`;
  }
  
  return `ip:${ip}`;
};

const parseTimeWindow = (timeWindow: string): number => {
  const match = timeWindow.match(/^(\d+)\s*(second|minute|hour|day)s?$/i);
  if (!match) {
    throw new Error(`Invalid time window format: ${timeWindow}`);
  }
  
  const [, amount, unit] = match;
  const multipliers: Record<string, number> = {
    second: 1000,
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
  };
  
  return parseInt(amount) * multipliers[unit.toLowerCase()];
};

// ============================================================================
// PERFORMANCE MONITORING MIDDLEWARE
// ============================================================================

export const performanceMonitor = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();
  const startCpu = process.cpuUsage();
  
  // Store metrics in request for later use
  (request as any).metrics = {
    startTime,
    startMemory,
    startCpu,
  };
};

// ============================================================================
// REQUEST VALIDATION MIDDLEWARE
// ============================================================================

export const validateRequestId = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const id = Number((request.params as any).id);
  
  if (isNaN(id) || id <= 0) {
    throw new PatientError(
      "Invalid patient ID",
      400,
      PATIENT_ERROR_CODES.INVALID_IDENTIFICATION
    );
  }
};

export const validatePagination = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const { page, pageSize } = request.query as any;
  
  if (page !== undefined && (isNaN(page) || page < 1)) {
    throw new PatientError(
      "Invalid page number",
      400,
      PATIENT_ERROR_CODES.INVALID_IDENTIFICATION
    );
  }
  
  if (pageSize !== undefined && (isNaN(pageSize) || pageSize < 1 || pageSize > 1000)) {
    throw new PatientError(
      "Invalid page size",
      400,
      PATIENT_ERROR_CODES.INVALID_IDENTIFICATION
    );
  }
};

// ============================================================================
// CACHE CONTROL MIDDLEWARE
// ============================================================================

export const cacheControl = (maxAge: number, staleWhileRevalidate?: number) => {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    let cacheHeader = `public, max-age=${maxAge}`;
    
    if (staleWhileRevalidate) {
      cacheHeader += `, stale-while-revalidate=${staleWhileRevalidate}`;
    }
    
    reply.header('Cache-Control', cacheHeader);
    reply.header('ETag', `W/"${maxAge}"`);
  };
};

export const noCache = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  reply.header('Pragma', 'no-cache');
  reply.header('Expires', '0');
};

// ============================================================================
// LOGGING MIDDLEWARE
// ============================================================================

export const requestLogger = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const user = (request as AuthenticatedRequest).authenticatedUser;
  const timestamp = new Date().toISOString();
  
  console.log(`[${timestamp}] ${request.method} ${request.url}`, {
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    userId: user?.id,
    userRole: user?.role,
    organizationId: user?.organizationId,
  });
};

export const responseLogger = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const user = (request as AuthenticatedRequest).authenticatedUser;
  const timestamp = new Date().toISOString();
  const responseTime = reply.elapsedTime;
  
  console.log(`[${timestamp}] ${request.method} ${request.url} - ${reply.statusCode}`, {
    responseTime: `${responseTime}ms`,
    userId: user?.id,
    userRole: user?.role,
  });
};

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

export const errorHandler = async (
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const user = (request as AuthenticatedRequest).authenticatedUser;
  const timestamp = new Date().toISOString();
  
  // Log error with context
  console.error(`[${timestamp}] Error in patient module:`, {
    error: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
    ip: request.ip,
    userId: user?.id,
    userRole: user?.role,
  });
  
  // Send appropriate error response
  if (error instanceof PatientError) {
    reply.status(error.statusCode).send({
      success: false,
      error: error.name,
      message: error.message,
      code: error.code,
      timestamp,
      requestId: request.id,
    });
  } else {
    reply.status(500).send({
      success: false,
      error: "Internal Server Error",
      message: "An unexpected error occurred",
      timestamp,
      requestId: request.id,
    });
  }
};

// ============================================================================
// MIDDLEWARE COMPOSITION
// ============================================================================

export const createPatientMiddleware = (fastify: FastifyInstance) => {
  // Register global middleware
  fastify.addHook('onRequest', performanceMonitor);
  fastify.addHook('onRequest', requestLogger);
  fastify.addHook('onResponse', responseLogger);
  
  // Add performance monitoring hooks at instance level
  fastify.addHook('onResponse', async (request, reply) => {
    const metrics = (request as any).metrics;
    if (metrics) {
      const endTime = Date.now();
      const endMemory = process.memoryUsage();
      const endCpu = process.cpuUsage();
      
      metrics.endTime = endTime;
      metrics.processingTime = endTime - metrics.startTime;
      metrics.memoryUsage = {
        rss: endMemory.rss - metrics.startMemory.rss,
        heapUsed: endMemory.heapUsed - metrics.startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - metrics.startMemory.heapTotal,
        external: endMemory.external - metrics.startMemory.external,
      };
      metrics.cpuUsage = {
        user: endCpu.user - metrics.startCpu.user,
        system: endCpu.system - metrics.startCpu.system,
      };
      
      // Log performance metrics
      console.log(`[${new Date().toISOString()}] Performance metrics:`, {
        url: request.url,
        method: request.method,
        processingTime: metrics.processingTime,
        memoryDelta: metrics.memoryUsage,
        cpuDelta: metrics.cpuUsage,
      });
    }
  });
  
  fastify.setErrorHandler(errorHandler);
  
  return {
    authenticate: authenticateUser,
    requirePermission,
    requireRole,
    validateOwnership: validatePatientOwnership,
    validateId: validateRequestId,
    validatePagination,
    rateLimit: createRateLimiter,
    cacheControl,
    noCache,
  };
};
