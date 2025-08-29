# Patients Module - Enterprise-Grade Fastify Implementation

## 🚀 Overview

The Patients Module is a production-ready, enterprise-grade implementation for managing patient records in a healthcare system. Built with Fastify best practices, it provides comprehensive CRUD operations, advanced search capabilities, bulk operations, and robust error handling.

## ✨ Features

### Core Functionality
- **Complete CRUD Operations** - Create, Read, Update, Delete patients
- **Advanced Search & Filtering** - Multi-criteria search with pagination
- **Bulk Operations** - Update/delete multiple patients efficiently
- **Role-Based Access Control** - Granular permissions system
- **Optimistic Locking** - Prevent concurrent modification conflicts

### Enterprise Features
- **Comprehensive Error Handling** - Custom error classes with detailed responses
- **Request Validation** - TypeBox schemas with extensive validation rules
- **Rate Limiting** - Configurable rate limiting per endpoint type
- **Caching Support** - Redis-compatible caching interface
- **Performance Monitoring** - Request timing and resource usage tracking
- **Security Headers** - Comprehensive security headers and CORS support
- **Audit Logging** - Detailed request/response logging with user context

### Scalability Features
- **Connection Pooling** - Efficient database connection management
- **Batch Processing** - Large-scale operations with progress tracking
- **Pagination** - Configurable page sizes with metadata
- **Search Optimization** - Indexed search with multiple filter options
- **Bulk Operations** - Handle thousands of records efficiently

## 🏗️ Architecture

```
src/modules/patients/
├── patient.schema.ts      # TypeBox schemas and validation
├── patient.errors.ts      # Custom error classes and handlers
├── patient.service.ts     # Business logic and data access
├── patient.controller.ts  # Request/response handling
├── patient.route.ts       # API endpoint definitions
├── patient.middleware.ts  # Authentication, authorization, validation
├── index.ts              # Module registration and setup
└── README.md             # This documentation
```

## 📋 API Endpoints

### Basic CRUD Operations

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/patients` | Create new patient | `write` permission |
| `GET` | `/api/patients` | Get all patients | `read` permission |
| `GET` | `/api/patients/:id` | Get patient by ID | `read` permission |
| `PUT` | `/api/patients/:id` | Update patient | `write` permission |
| `DELETE` | `/api/patients/:id` | Delete patient | `delete` permission |

### Search & Query Operations

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/patients/search` | Advanced search with filters | `read` permission |
| `GET` | `/api/patients/user/:userId` | Get patient by user ID | `read` permission |
| `GET` | `/api/patients/physician/:name` | Get patients by physician | `read` permission |
| `GET` | `/api/patients/insurance/:provider` | Get patients by insurance | `read` permission |

### Bulk Operations

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/patients/bulk/update` | Bulk update patients | `bulk_operations` permission |
| `POST` | `/api/patients/bulk/delete` | Bulk delete patients | `bulk_operations` permission |

### Analytics & Monitoring

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/patients/statistics` | Get patient statistics | `read` permission |
| `GET` | `/api/patients/health` | Health check | None |

## 🔐 Authentication & Authorization

### User Roles

- **Admin** - Full access to all operations
- **Doctor** - Read/write access to patient records
- **Nurse** - Read/write access to patient records
- **Receptionist** - Read/write access to patient records
- **Patient** - Read-only access to own records

### Permissions

- `read` - View patient records
- `write` - Create/update patient records
- `delete` - Delete patient records
- `bulk_operations` - Perform bulk operations

### Authentication

```bash
# Include Bearer token in Authorization header
Authorization: Bearer <your-jwt-token>
```

## 📊 Request/Response Examples

### Create Patient

**Request:**
```bash
POST /api/patients
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user123",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+1-555-0123",
  "birthDate": "1990-01-01",
  "gender": "male",
  "address": "123 Main St, City, State 12345",
  "occupation": "Software Engineer",
  "emergencyContactName": "Jane Doe",
  "emergencyContactNumber": "+1-555-0124",
  "primaryPhysician": "Dr. Smith",
  "insuranceProvider": "Blue Cross",
  "insurancePolicyNumber": "BC123456789",
  "allergies": "Penicillin",
  "currentMedication": "None",
  "privacyConsent": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Patient created successfully",
  "data": {
    "id": 1,
    "userId": "user123",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1-555-0123",
    "birthDate": "1990-01-01",
    "gender": "male",
    "address": "123 Main St, City, State 12345",
    "occupation": "Software Engineer",
    "emergencyContactName": "Jane Doe",
    "emergencyContactNumber": "+1-555-0124",
    "primaryPhysician": "Dr. Smith",
    "insuranceProvider": "Blue Cross",
    "insurancePolicyNumber": "BC123456789",
    "allergies": "Penicillin",
    "currentMedication": "None",
    "privacyConsent": true,
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "version": 1
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "uuid-here",
  "meta": {
    "processingTime": 45,
    "userId": "admin123",
    "userRole": "admin"
  }
}
```

### Search Patients

**Request:**
```bash
GET /api/patients/search?search=john&gender=male&page=1&pageSize=20&sortBy=name&sortOrder=asc
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Patient search completed successfully",
  "data": {
    "data": [
      {
        "id": 1,
        "name": "John Doe",
        "email": "john.doe@example.com",
        // ... other patient fields
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    },
    "meta": {
      "processingTime": 23,
      "filters": {
        "search": "john",
        "gender": "male"
      }
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "uuid-here",
  "meta": {
    "processingTime": 23,
    "userId": "admin123",
    "userRole": "admin"
  }
}
```

### Bulk Update

**Request:**
```bash
POST /api/patients/bulk/update
Authorization: Bearer <token>
Content-Type: application/json

{
  "ids": [1, 2, 3],
  "updates": {
    "status": "inactive",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk update completed successfully",
  "data": {
    "processed": 3,
    "succeeded": 3,
    "failed": 0,
    "errors": []
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "uuid-here",
  "meta": {
    "processingTime": 156,
    "userId": "admin123",
    "userRole": "admin"
  }
}
```

## ⚙️ Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/healthcare

# Redis (for caching)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

### Rate Limiting Configuration

```typescript
const RATE_LIMIT_CONFIG = {
  general: { max: 100, timeWindow: '1 minute' },
  search: { max: 30, timeWindow: '1 minute' },
  bulk: { max: 10, timeWindow: '1 minute' },
  statistics: { max: 20, timeWindow: '1 minute' },
};
```

### Cache Configuration

```typescript
const CACHE_TTL = {
  PATIENT: 300,    // 5 minutes
  LIST: 60,        // 1 minute
  COUNT: 300,      // 5 minutes
};
```

## 🚦 Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "PatientNotFoundError",
  "message": "Patient with ID 999 not found",
  "code": "PATIENT_NOT_FOUND",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "uuid-here",
  "meta": {
    "processingTime": 12,
    "userId": "user123",
    "userRole": "doctor"
  }
}
```

### Common Error Codes

- `PATIENT_NOT_FOUND` - Patient record doesn't exist
- `PATIENT_CONFLICT` - Duplicate patient data
- `VALIDATION_ERROR` - Invalid request data
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `OPTIMISTIC_LOCK_CONFLICT` - Concurrent modification detected

## 📈 Performance & Monitoring

### Metrics Collected

- Request processing time
- Memory usage delta
- CPU usage delta
- Database query performance
- Cache hit/miss rates
- Error rates by endpoint

### Performance Optimization

- **Database Indexing** - Optimized indexes for search queries
- **Connection Pooling** - Efficient database connection management
- **Query Optimization** - Optimized SQL queries with proper joins
- **Caching Strategy** - Multi-level caching for frequently accessed data
- **Batch Processing** - Efficient bulk operations with progress tracking

## 🔒 Security Features

### Security Headers

```typescript
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};
```

### Data Validation

- Input sanitization
- SQL injection prevention
- XSS protection
- Rate limiting
- Request size limits

### Access Control

- Role-based access control (RBAC)
- Permission-based authorization
- Patient data ownership validation
- Audit logging for all operations

## 🧪 Testing

### Unit Tests

```bash
# Run unit tests
npm run test:unit

# Run tests with coverage
npm run test:coverage
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration

# Run tests against test database
npm run test:db
```

### Load Testing

```bash
# Run load tests
npm run test:load

# Run stress tests
npm run test:stress
```

## 🚀 Deployment

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### Health Checks

```bash
# Health check endpoint
GET /api/patients/health

# Response
{
  "success": true,
  "message": "Patient service is healthy",
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Monitoring

- Application metrics via Prometheus
- Health checks for load balancers
- Error tracking with Sentry
- Performance monitoring with New Relic
- Log aggregation with ELK stack

## 📚 Best Practices

### Code Organization

- Separation of concerns (Controller, Service, Repository)
- Dependency injection for testability
- Consistent error handling patterns
- Comprehensive input validation
- Proper logging and monitoring

### Performance

- Use appropriate database indexes
- Implement caching strategies
- Optimize database queries
- Use connection pooling
- Implement rate limiting

### Security

- Validate all inputs
- Implement proper authentication
- Use role-based access control
- Log security events
- Regular security audits

### Error Handling

- Use custom error classes
- Provide meaningful error messages
- Log errors with context
- Return appropriate HTTP status codes
- Implement retry mechanisms

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Contact the development team
- Check the documentation
- Review the API specification

---

**Built with ❤️ using Fastify and TypeScript**
