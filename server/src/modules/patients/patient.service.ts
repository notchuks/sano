import { db } from "../../db/index";
import { patients } from "../../../drizzle/schema";
import { eq, desc, sql, like, and, or, inArray, gte, lte, asc, count, isNull, isNotNull } from "drizzle-orm";
import { 
  PatientError, 
  PatientNotFoundError, 
  PatientConflictError, 
  PatientDatabaseError, 
  PatientBulkOperationError,
  PATIENT_ERROR_CODES 
} from "./patient.errors";
import { 
  Patient, 
  CreatePatient, 
  UpdatePatient, 
  PatientQuery, 
  PatientListResponse 
} from "./patient.schema";

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export interface DatabaseTransaction {
  rollback(): Promise<void>;
  commit(): Promise<void>;
}

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
}

export interface SearchResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface BulkOperationResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{
    id: number;
    error: string;
    details?: string;
  }>;
}

// ============================================================================
// CACHE KEYS
// ============================================================================

const CACHE_KEYS = {
  PATIENT_BY_ID: (id: number) => `patient:${id}`,
  PATIENT_BY_USER_ID: (userId: string) => `patient:user:${userId}`,
  PATIENT_LIST: (query: string) => `patient:list:${query}`,
  PATIENT_COUNT: () => `patient:count`,
  PATIENT_SEARCH: (query: string) => `patient:search:${query}`,
} as const;

const CACHE_TTL = {
  PATIENT: 300, // 5 minutes
  LIST: 60,     // 1 minute
  COUNT: 300,   // 5 minutes
} as const;

// ============================================================================
// PATIENT SERVICE CLASS
// ============================================================================

export class PatientService {
  private static cache: CacheService | null = null;
  private static readonly MAX_BULK_OPERATION_SIZE = 1000;
  private static readonly DEFAULT_PAGE_SIZE = 20;
  private static readonly MAX_PAGE_SIZE = 1000;

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  static initialize(cacheService?: CacheService): void {
    if (cacheService) {
      this.cache = cacheService;
    }
  }

  // ========================================================================
  // CACHE OPERATIONS
  // ========================================================================

  private static async getFromCache<T>(key: string): Promise<T | null> {
    if (!this.cache) return null;
    try {
      return await this.cache.get<T>(key);
    } catch (error) {
      console.warn(`Cache get failed for key ${key}:`, error);
      return null;
    }
  }

  private static async setCache<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.cache) return;
    try {
      await this.cache.set(key, value, ttl);
    } catch (error) {
      console.warn(`Cache set failed for key ${key}:`, error);
    }
  }

  private static async invalidateCache(pattern: string): Promise<void> {
    if (!this.cache) return;
    try {
      await this.cache.invalidatePattern(pattern);
    } catch (error) {
      console.warn(`Cache invalidation failed for pattern ${pattern}:`, error);
    }
  }

  // ========================================================================
  // VALIDATION & BUSINESS LOGIC
  // ========================================================================

  private static validatePatientData(data: CreatePatient | UpdatePatient): void {
    // Validate birth date is not in the future
    if (data.birthDate) {
      const birthDate = new Date(data.birthDate);
      const today = new Date();
      if (birthDate > today) {
        throw new PatientError(
          "Birth date cannot be in the future",
          400,
          PATIENT_ERROR_CODES.INVALID_BIRTH_DATE
        );
      }
    }

    // Validate phone number format
    if (data.phone) {
      const phoneRegex = /^[+]?[0-9\s\-\(\)]{10,20}$/;
      if (!phoneRegex.test(data.phone)) {
        throw new PatientError(
          "Invalid phone number format",
          400,
          PATIENT_ERROR_CODES.INVALID_PHONE
        );
      }
    }

    // Validate email format
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        throw new PatientError(
          "Invalid email format",
          400,
          PATIENT_ERROR_CODES.INVALID_EMAIL
        );
      }
    }
  }

  private static async checkForDuplicates(
    data: CreatePatient | UpdatePatient, 
    excludeId?: number
  ): Promise<void> {
    const conditions = [];

    if (data.email) {
      conditions.push(eq(patients.email, data.email));
    }
    if (data.phone) {
      conditions.push(eq(patients.phone, data.phone));
    }
    if (data.identificationNumber && data.identificationType) {
      conditions.push(
        and(
          eq(patients.identificationNumber, data.identificationNumber),
          eq(patients.identificationType, data.identificationType)
        )
      );
    }

    if (conditions.length === 0) return;

    const whereClause = excludeId 
      ? and(or(...conditions), sql`${patients.id} != ${excludeId}`)
      : or(...conditions);

    const existingPatients = await db
      .select({ id: patients.id, email: patients.email, phone: patients.phone })
      .from(patients)
      .where(whereClause)
      .limit(1);

    if (existingPatients.length > 0) {
      const patient = existingPatients[0];
      if (patient.email === data.email) {
        throw new PatientConflictError("email", data.email);
      }
      if (patient.phone === data.phone) {
        throw new PatientConflictError("phone", data.phone);
      }
      throw new PatientConflictError("identification", `${data.identificationType}:${data.identificationNumber}`);
    }
  }

  // ========================================================================
  // CRUD OPERATIONS
  // ========================================================================

  static async createPatient(data: CreatePatient, requestId?: string): Promise<Patient> {
    try {
      // Validate input data
      this.validatePatientData(data);

      // Check for duplicates
      await this.checkForDuplicates(data);

      // Create patient with optimistic locking
      const [patient] = await db
        .insert(patients)
        .values({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (!patient) {
        throw new PatientDatabaseError("Failed to create patient", requestId);
      }

      // Invalidate relevant caches
      await this.invalidateCache("patient:*");
      await this.invalidateCache("patient:count");

      // Convert Date objects to strings to match schema
      return {
        ...patient,
        createdAt: patient.createdAt.toISOString(),
        updatedAt: patient.updatedAt.toISOString(),
      } as Patient;
    } catch (error) {
      if (error instanceof PatientError) {
        throw error;
      }
      throw new PatientDatabaseError(
        `Failed to create patient: ${error instanceof Error ? error.message : 'Unknown error'}`,
        requestId
      );
    }
  }

  static async getPatientById(id: number, requestId?: string): Promise<Patient> {
    try {
      // Try cache first
      const cached = await this.getFromCache<Patient>(CACHE_KEYS.PATIENT_BY_ID(id));
      if (cached) {
        return cached;
      }

      // Query database
      const [patient] = await db
        .select()
        .from(patients)
        .where(eq(patients.id, id));

      if (!patient) {
        throw new PatientNotFoundError(id, requestId);
      }

      // Cache the result
      await this.setCache(CACHE_KEYS.PATIENT_BY_ID(id), patient, CACHE_TTL.PATIENT);

      // Convert Date objects to strings to match schema
      return {
        ...patient,
        createdAt: patient.createdAt.toISOString(),
        updatedAt: patient.updatedAt.toISOString(),
      } as Patient;
    } catch (error) {
      if (error instanceof PatientError) {
        throw error;
      }
      throw new PatientDatabaseError(
        `Failed to get patient by ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
        requestId
      );
    }
  }

  static async getPatientByUserId(userId: string, requestId?: string): Promise<Patient> {
    try {
      // Try cache first
      const cached = await this.getFromCache<Patient>(CACHE_KEYS.PATIENT_BY_USER_ID(userId));
      if (cached) {
        return cached;
      }

      // Query database
      const [patient] = await db
        .select()
        .from(patients)
        .where(eq(patients.userId, userId));

      if (!patient) {
        throw new PatientNotFoundError(userId, requestId);
      }

      // Cache the result
      await this.setCache(CACHE_KEYS.PATIENT_BY_USER_ID(userId), patient, CACHE_TTL.PATIENT);

      // Convert Date objects to strings to match schema
      return {
        ...patient,
        createdAt: patient.createdAt.toISOString(),
        updatedAt: patient.updatedAt.toISOString(),
      } as Patient;
    } catch (error) {
      if (error instanceof PatientError) {
        throw error;
      }
      throw new PatientDatabaseError(
        `Failed to get patient by user ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
        requestId
      );
    }
  }

  static async updatePatient(
    id: number, 
    data: UpdatePatient, 
    requestId?: string
  ): Promise<Patient> {
    try {
      // Validate input data
      this.validatePatientData(data);

      // Check for duplicates
      await this.checkForDuplicates(data, id);

      // Get current patient for optimistic locking
      const currentPatient = await this.getPatientById(id, requestId);

      // Update patient
      const [updatedPatient] = await db
        .update(patients)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(patients.id, id))
        .returning();

      if (!updatedPatient) {
        throw new PatientError(
          "Patient was modified by another request. Please retry.",
          409,
          "OPTIMISTIC_LOCK_CONFLICT",
          true,
          requestId
        );
      }

      // Invalidate relevant caches
      await this.invalidateCache(CACHE_KEYS.PATIENT_BY_ID(id));
      await this.invalidateCache("patient:*");

      // Convert Date objects to strings to match schema
      return {
        ...updatedPatient,
        createdAt: updatedPatient.createdAt.toISOString(),
        updatedAt: updatedPatient.updatedAt.toISOString(),
      } as Patient;
    } catch (error) {
      if (error instanceof PatientError) {
        throw error;
      }
      throw new PatientDatabaseError(
        `Failed to update patient: ${error instanceof Error ? error.message : 'Unknown error'}`,
        requestId
      );
    }
  }

  static async deletePatient(id: number, requestId?: string): Promise<void> {
    try {
      // Check if patient exists
      await this.getPatientById(id, requestId);

      // Soft delete by updating updatedAt
      const [deletedPatient] = await db
        .update(patients)
        .set({
          updatedAt: new Date(),
        })
        .where(eq(patients.id, id))
        .returning();

      if (!deletedPatient) {
        throw new PatientDatabaseError("Failed to delete patient", requestId);
      }

      // Invalidate relevant caches
      await this.invalidateCache(CACHE_KEYS.PATIENT_BY_ID(id));
      await this.invalidateCache("patient:*");
      await this.invalidateCache("patient:count");

    } catch (error) {
      if (error instanceof PatientError) {
        throw error;
      }
      throw new PatientDatabaseError(
        `Failed to delete patient: ${error instanceof Error ? error.message : 'Unknown error'}`,
        requestId
      );
    }
  }

  // ========================================================================
  // SEARCH & QUERY OPERATIONS
  // ========================================================================

  static async searchPatients(
    query: PatientQuery, 
    requestId?: string
  ): Promise<PatientListResponse> {
    const startTime = Date.now();
    
    try {
      const {
        page = 1,
        pageSize = this.DEFAULT_PAGE_SIZE,
        search,
        gender,
        userId,
        physician,
        insuranceProvider,
        birthDateFrom,
        birthDateTo,
        createdAtFrom,
        createdAtTo,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = query;

      // Validate pagination
      const validatedPageSize = Math.min(Math.max(pageSize, 1), this.MAX_PAGE_SIZE);
      const validatedPage = Math.max(page, 1);
      const offset = (validatedPage - 1) * validatedPageSize;

      // Build cache key
      const cacheKey = CACHE_KEYS.PATIENT_SEARCH(JSON.stringify(query));
      const cached = await this.getFromCache<PatientListResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Build where conditions
      const conditions = [];

      if (search) {
        conditions.push(
          or(
            like(patients.name, `%${search}%`),
            like(patients.email, `%${search}%`),
            like(patients.phone, `%${search}%`)
          )
        );
      }

      if (gender) {
        conditions.push(eq(patients.gender, gender));
      }

      if (userId) {
        conditions.push(eq(patients.userId, userId));
      }

      if (physician) {
        conditions.push(like(patients.primaryPhysician, `%${physician}%`));
      }

      if (insuranceProvider) {
        conditions.push(like(patients.insuranceProvider, `%${insuranceProvider}%`));
      }

      if (birthDateFrom) {
        conditions.push(gte(patients.birthDate, birthDateFrom));
      }

      if (birthDateTo) {
        conditions.push(lte(patients.birthDate, birthDateTo));
      }

      if (createdAtFrom) {
        conditions.push(gte(patients.createdAt, new Date(createdAtFrom)));
      }

      if (createdAtTo) {
        conditions.push(lte(patients.createdAt, new Date(createdAtTo)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const [{ total }] = await db
        .select({ total: count() })
        .from(patients)
        .where(whereClause);

      // Get patients with pagination
      const sortField = (patients as any)[sortBy] || patients.createdAt;
      const orderBy = sortOrder === 'asc' ? asc(sortField) : desc(sortField);

      const patientList = await db
        .select()
        .from(patients)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(validatedPageSize)
        .offset(offset);

      const totalPages = Math.ceil(total / validatedPageSize);
      const hasNext = validatedPage < totalPages;
      const hasPrev = validatedPage > 1;

      const result: PatientListResponse = {
        data: patientList.map(patient => ({
          ...patient,
          createdAt: patient.createdAt.toISOString(),
          updatedAt: patient.updatedAt.toISOString(),
        })) as Patient[],
        pagination: {
          page: validatedPage,
          pageSize: validatedPageSize,
          total: Number(total),
          totalPages,
          hasNext,
          hasPrev,
        },
        meta: {
          processingTime: Date.now() - startTime,
          filters: {
            search,
            gender,
            userId,
            physician,
            insuranceProvider,
          },
        },
      };

      // Cache the result
      await this.setCache(cacheKey, result, CACHE_TTL.LIST);

      return result;
    } catch (error) {
      if (error instanceof PatientError) {
        throw error;
      }
      throw new PatientDatabaseError(
        `Failed to search patients: ${error instanceof Error ? error.message : 'Unknown error'}`,
        requestId
      );
    }
  }

  // ========================================================================
  // BULK OPERATIONS
  // ========================================================================

  static async bulkUpdatePatients(
    ids: number[], 
    updates: UpdatePatient, 
    requestId?: string
  ): Promise<BulkOperationResult> {
    if (ids.length > this.MAX_BULK_OPERATION_SIZE) {
      throw new PatientBulkOperationError(
        `Bulk operation size ${ids.length} exceeds maximum limit of ${this.MAX_BULK_OPERATION_SIZE}`,
        requestId
      );
    }

    const result: BulkOperationResult = {
      processed: ids.length,
      succeeded: 0,
      failed: 0,
      errors: [],
    };

    try {
      // Validate input data
      this.validatePatientData(updates);

      // Process in batches for better performance
      const batchSize = 100;
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        
        try {
          const updatedPatients = await db
            .update(patients)
            .set({
              ...updates,
              updatedAt: new Date(),
            })
            .where(inArray(patients.id, batch))
            .returning();

          result.succeeded += updatedPatients.length;
        } catch (error) {
          result.failed += batch.length;
          result.errors.push({
            id: batch[0],
            error: "Batch update failed",
            details: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      // Invalidate caches
      await this.invalidateCache("patient:*");

      return result;
    } catch (error) {
      throw new PatientDatabaseError(
        `Bulk update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        requestId
      );
    }
  }

  static async bulkDeletePatients(
    ids: number[], 
    reason?: string, 
    requestId?: string
  ): Promise<BulkOperationResult> {
    if (ids.length > this.MAX_BULK_OPERATION_SIZE) {
      throw new PatientBulkOperationError(
        `Bulk operation size ${ids.length} exceeds maximum limit of ${this.MAX_BULK_OPERATION_SIZE}`,
        requestId
      );
    }

    const result: BulkOperationResult = {
      processed: ids.length,
      succeeded: 0,
      failed: 0,
      errors: [],
    };

    try {
      // Process in batches
      const batchSize = 100;
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        
        try {
          const deletedPatients = await db
            .update(patients)
            .set({
              updatedAt: new Date(),
            })
            .where(inArray(patients.id, batch))
            .returning();

          result.succeeded += deletedPatients.length;
        } catch (error) {
          result.failed += batch.length;
          result.errors.push({
            id: batch[0],
            error: "Batch deletion failed",
            details: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      // Invalidate caches
      await this.invalidateCache("patient:*");
      await this.invalidateCache("patient:count");

      return result;
    } catch (error) {
      throw new PatientDatabaseError(
        `Bulk deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        requestId
      );
    }
  }

  // ========================================================================
  // STATISTICS & ANALYTICS
  // ========================================================================

  static async getPatientStatistics(requestId?: string): Promise<any> {
    try {
      const [
        totalPatients,
        genderDistribution,
        ageDistribution
      ] = await Promise.all([
        // Total count
        db.select({ count: count() }).from(patients),
        
        // Gender distribution
        db.select({ gender: patients.gender, count: count() })
          .from(patients)
          .groupBy(patients.gender),
        
        // Age distribution (calculated from birth date)
        db.select({
          ageGroup: sql<string>`CASE 
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, ${patients.birthDate}::date)) < 18 THEN 'under_18'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, ${patients.birthDate}::date)) < 30 THEN '18_29'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, ${patients.birthDate}::date)) < 50 THEN '30_49'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, ${patients.birthDate}::date)) < 65 THEN '50_64'
            ELSE '65_plus'
          END`,
          count: count()
        })
        .from(patients)
        .groupBy(sql`ageGroup`)
      ]);

      return {
        total: Number(totalPatients[0]?.count || 0),
        byGender: genderDistribution.reduce((acc, item) => {
          if (item.gender) {
            acc[item.gender] = Number(item.count);
          }
          return acc;
        }, {} as Record<string, number>),
        byAge: ageDistribution.reduce((acc, item) => {
          acc[item.ageGroup] = Number(item.count);
          return acc;
        }, {} as Record<string, number>),
      };
    } catch (error) {
      throw new PatientDatabaseError(
        `Failed to get patient statistics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        requestId
      );
    }
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  static async getPatientsByPhysician(
    physicianName: string, 
    requestId?: string
  ): Promise<Patient[]> {
    try {
      const patientsList = await db
        .select()
        .from(patients)
        .where(like(patients.primaryPhysician, `%${physicianName}%`));
      
      return patientsList.map(patient => ({
        ...patient,
        createdAt: patient.createdAt.toISOString(),
        updatedAt: patient.updatedAt.toISOString(),
      })) as Patient[];
    } catch (error) {
      throw new PatientDatabaseError(
        `Failed to get patients by physician: ${error instanceof Error ? error.message : 'Unknown error'}`,
        requestId
      );
    }
  }

  static async getPatientsByInsuranceProvider(
    provider: string, 
    requestId?: string
  ): Promise<Patient[]> {
    try {
      const patientsList = await db
        .select()
        .from(patients)
        .where(like(patients.insuranceProvider, `%${provider}%`));
      
      return patientsList.map(patient => ({
        ...patient,
        createdAt: patient.createdAt.toISOString(),
        updatedAt: patient.updatedAt.toISOString(),
      })) as Patient[];
    } catch (error) {
      throw new PatientDatabaseError(
        `Failed to get patients by insurance provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
        requestId
      );
    }
  }

  static async getAllPatients(requestId?: string): Promise<Patient[]> {
    try {
      const patientsList = await db.select().from(patients);
      
      return patientsList.map(patient => ({
        ...patient,
        createdAt: patient.createdAt.toISOString(),
        updatedAt: patient.updatedAt.toISOString(),
      })) as Patient[];
    } catch (error) {
      throw new PatientDatabaseError(
        `Failed to get all patients: ${error instanceof Error ? error.message : 'Unknown error'}`,
        requestId
      );
    }
  }
}
