# DiagramMagic Codebase Assessment

## Executive Summary

This assessment provides an honest evaluation of the DiagramMagic codebase, focusing on implementation quality, architectural decisions, and areas for improvement without considering new features.

**Overall Grade: B-**

The codebase demonstrates solid understanding of modern web development practices with TypeScript, React, and Express. The core functionality is well-implemented, but lacks production-readiness in security, scalability, and maintainability.

---

## ✅ Well-Implemented Parts

### Backend Architecture

#### Database Design
**Location**: [backend/src/database/schema.ts](backend/src/database/schema.ts)

**Strengths**:
- Clean, normalized schema with proper relationships
- Foreign keys with CASCADE deletes properly configured
- Kysely provides excellent type safety
- Appropriate indexes created for performance (migrations.ts:80-88)
- Per-diagram chat history is well-structured

**Example**:
```typescript
// Clean type-safe schema definition
export interface DiagramVersionsTable {
  id: Generated<number>;
  diagram_id: number;
  version: number;
  mermaid_code: string;
  created_at: Generated<string>;
}
```

#### Service Layer Pattern
**Location**: [backend/src/services/](backend/src/services/)

**Strengths**:
- Proper abstraction with `ImageToMermaidService` interface
- Clean separation between Gemini and OpenRouter implementations
- Services are independently testable (though no tests exist)
- ReactAgent encapsulates LLM interaction logic well

#### Socket.IO Render Validation
**Location**: [backend/src/services/reactAgent.ts:118-138](backend/src/services/reactAgent.ts#L118)

**Strengths**:
- Innovative approach: validates Mermaid rendering client-side before accepting
- Proper promise management with timeout handling
- Up to 20 retry attempts with automatic fixing
- Clean async/await pattern

```typescript
// Clever validation loop
while (attempt < maxRetries) {
  const validationResult = await this.validateDiagramRender(cleanedDiagram);
  if (validationResult.success) {
    return { chatAnswer, mermaidDiagram: cleanedDiagram, success: true };
  }
  // Auto-fix and retry
}
```

#### Authentication System
**Location**: [backend/src/middleware/auth.ts](backend/src/middleware/auth.ts), [backend/src/utils/auth.ts](backend/src/utils/auth.ts)

**Strengths**:
- JWT implementation is solid
- Proper middleware separation (`authenticateToken` vs `optionalAuth`)
- bcrypt with 10 rounds for password hashing
- Token expiry set to 7 days
- Request type extensions properly declared

#### Controllers
**Location**: [backend/src/controllers/](backend/src/controllers/)

**Strengths**:
- Consistent CRUD patterns across all controllers
- Proper ownership verification on every operation
- Clean use of Kysely query builder
- Appropriate HTTP status codes
- User data properly isolated through JOIN conditions

**Example from diagramsController.ts:101-108**:
```typescript
// Proper ownership verification through JOIN
const diagram = await db
  .selectFrom('diagrams')
  .innerJoin('projects', 'projects.id', 'diagrams.project_id')
  .selectAll('diagrams')
  .where('diagrams.id', '=', diagramId)
  .where('projects.user_id', '=', req.user.userId)
  .executeTakeFirst();
```

#### Retry Logic
**Location**: [backend/src/services/geminiService.ts:17-142](backend/src/services/geminiService.ts#L17), [backend/src/services/openRouterService.ts:20-149](backend/src/services/openRouterService.ts#L20)

**Strengths**:
- 3 retry attempts with progressive delays (1s, 2s)
- Detailed logging for debugging
- Graceful error handling
- Proper cleanup of resources

### Frontend

#### Component Organization
**Location**: [frontend/src/components/](frontend/src/components/)

**Strengths**:
- Good separation of concerns
- Components have clear single responsibilities (except App.tsx)
- Props are properly typed
- Reusable components (Modal, ChatMessage, etc.)

#### Auth Context
**Location**: [frontend/src/contexts/AuthContext.tsx](frontend/src/contexts/AuthContext.tsx)

**Strengths**:
- Clean context pattern implementation
- localStorage persistence
- Proper loading states
- Token refresh on mount
- Type-safe context consumption

#### Type Safety
**Location**: [frontend/src/types/index.ts](frontend/src/types/index.ts), [backend/src/types/index.ts](backend/src/types/index.ts)

**Strengths**:
- Shared type definitions
- Proper TypeScript usage throughout
- Interfaces over types where appropriate

#### User Experience Features
**Strengths**:
- Loading states everywhere
- Error handling with user feedback
- Paste-to-upload for images (ChatPanel.tsx:40-53)
- Voice input with recording indicator
- Smooth scrolling in chat
- Skeleton states and animations

---

## ⚠️ Parts That Are "Bad" or Problematic

### Security Issues

#### 1. JWT Secret Fallback
**Location**: [backend/src/utils/auth.ts:4](backend/src/utils/auth.ts#L4)

**Problem**:
```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
```

**Why it's bad**:
- Hardcoded fallback secret means tokens can be forged if JWT_SECRET is not set
- Should fail fast rather than fall back to insecure default
- Production deployment without JWT_SECRET would be catastrophic

**Impact**: Critical security vulnerability

#### 2. No Rate Limiting
**Location**: All API endpoints

**Problem**:
- No rate limiting middleware
- Endpoints can be hammered indefinitely
- LLM API costs could spiral out of control
- Brute force attacks on login endpoint possible

**Impact**: High - financial and security risk

#### 3. Wide-Open CORS
**Location**: [backend/src/index.ts:80](backend/src/index.ts#L80)

**Problem**:
```typescript
app.use(cors());
```

**Why it's bad**:
- Accepts requests from any origin
- No credentials configuration
- Should restrict to known frontend domains

**Impact**: Medium - CSRF vulnerability

#### 4. File Upload Validation
**Location**: [backend/src/index.ts:68-76](backend/src/index.ts#L68)

**Problem**:
- Only validates file extension, not content
- No magic byte checking
- Could upload malicious files with wrong extension
- 10MB limit but no quota per user

**Why it's bad**:
```typescript
const ext = path.extname(file.originalname).toLowerCase();
// Easily bypassed: malware.exe renamed to malware.jpg
```

**Impact**: Medium - malicious file uploads possible

#### 5. No Password Strength Validation
**Location**: [backend/src/controllers/authController.ts:6-52](backend/src/controllers/authController.ts#L6)

**Problem**:
- Accepts any password length
- No complexity requirements
- Users could set password "1"

**Impact**: Medium - weak passwords allowed

### Code Quality Issues

#### 1. Massive App.tsx Component
**Location**: [frontend/src/App.tsx](frontend/src/App.tsx) (528 lines)

**Problems**:
- 500+ lines with multiple concerns
- State management, business logic, UI all mixed
- Handles projects, diagrams, versions, auth, modals, chat
- Difficult to test, maintain, or reason about
- Multiple useEffects with complex dependencies

**Should be split into**:
- Custom hooks: `useProject`, `useDiagram`, `useVersionHistory`, `useModals`
- Smaller presentational components
- Separate business logic from UI

**Impact**: High - maintenance nightmare, hard to debug

#### 2. Hardcoded URLs
**Location**: [frontend/src/components/ChatPanel.tsx:86](frontend/src/components/ChatPanel.tsx#L86)

**Problem**:
```typescript
const response = await fetch('http://localhost:3001/api/transcribe', {
```

**Why it's bad**:
- Won't work in production
- Duplicates URL configuration
- Should use environment variable or API service

**Impact**: Low - but unprofessional

#### 3. Callback Hell in Modals
**Location**: [frontend/src/App.tsx:291-332](frontend/src/App.tsx#L291)

**Problem**:
```typescript
setPromptModal({
  onConfirm: async (projectName) => {
    setPromptModal({
      onConfirm: async (diagramName) => {
        // Nested 3 levels deep
```

**Why it's bad**:
- Hard to read and maintain
- Error handling becomes complex
- Difficult to test
- Should use async/await or state machine

**Impact**: Medium - maintenance burden

#### 4. Duplicated JSON Parsing
**Location**: [backend/src/services/geminiService.ts:69-119](backend/src/services/geminiService.ts#L69), [backend/src/services/openRouterService.ts:76-126](backend/src/services/openRouterService.ts#L76)

**Problem**:
- Identical 50-line JSON extraction logic in two files
- Three parsing methods tried sequentially
- Code duplication = maintenance burden

**Should be**:
```typescript
// utils/jsonParser.ts
export function extractJSON(text: string): any {
  // Single implementation, used by both services
}
```

**Impact**: Medium - DRY violation

#### 5. Inconsistent Error Handling
**Problems throughout codebase**:
- Sometimes returns error objects: `{ error: 'message' }`
- Sometimes throws exceptions
- Sometimes logs and continues silently
- No consistent error structure
- Generic messages like "Failed to create user"

**Example variations**:
```typescript
// Pattern 1: Return error response
return res.status(500).json({ error: 'Failed to create user' });

// Pattern 2: Throw and catch
throw new Error('Failed to parse response');

// Pattern 3: Log and continue
console.error('Failed to save chat messages:', dbError);
// Don't fail the request if database save fails
```

**Impact**: Medium - debugging difficulty

### Database Issues

#### 1. No Connection Pooling
**Location**: [backend/src/database/connection.ts](backend/src/database/connection.ts)

**Problem**:
- Single better-sqlite3 connection
- Won't scale beyond single process
- No connection retry logic
- If database locks, requests fail

**Why it's bad**:
- Can't use multiple workers
- Can't deploy to serverless
- Limited to single-threaded performance

**Impact**: High - scalability blocker

#### 2. Basic Migration System
**Location**: [backend/src/database/migrations.ts](backend/src/database/migrations.ts)

**Problems**:
- No rollback capability
- No version tracking
- All migrations run on every startup (uses IF NOT EXISTS)
- No migration history table
- Can't track which migrations ran

**Compare to proper migrations**:
```typescript
// Current: All-or-nothing
db.exec(`CREATE TABLE IF NOT EXISTS users (...)`);

// Should be:
// migrations/001_create_users.ts
// migrations/002_add_diagram_id.ts
// With up/down functions and tracking table
```

**Impact**: Medium - makes schema changes risky

#### 3. Manual Timestamp Updates
**Location**: Scattered throughout controllers

**Problem**:
```typescript
updated_at: new Date().toISOString()
```

**Why it's bad**:
- Manual updates are error-prone
- Easy to forget
- Clock skew between servers
- Should use database triggers or default values

**Impact**: Low - but inelegant

#### 4. No Soft Deletes
**Location**: All delete operations

**Problem**:
- All deletes are `DELETE FROM`
- No recovery possible
- No audit trail
- Can't restore accidentally deleted data

**Impact**: Medium - data loss risk

### Architecture Problems

#### 1. Unmanaged File Storage
**Location**: [backend/src/index.ts:52-77](backend/src/index.ts#L52)

**Problems**:
- Files saved to local `uploads/` directory
- No cleanup strategy
- Files accumulate forever
- No deduplication
- Path traversal risk if filename not sanitized
- Doesn't work with multiple servers

**Impact**: High - disk fills up, security risk

#### 2. No Logging Infrastructure
**Location**: Throughout codebase

**Problem**:
```typescript
console.log('Client connected:', socket.id);
console.error('Error generating diagram:', error);
```

**Why it's bad**:
- No log levels
- No structured logging
- Can't search or aggregate
- No production log management
- Can't disable debug logs in prod

**Should use**: Winston, Pino, or similar

**Impact**: Medium - operational blindness

#### 3. Weak Environment Validation
**Location**: [backend/src/index.ts:28-31](backend/src/index.ts#L28)

**Problem**:
```typescript
if (!process.env.CEREBRAS_API_KEY) {
  console.error('Error: CEREBRAS_API_KEY is not set');
  process.exit(1);
}
```

**Why it's bad**:
- Only checks existence, not format
- No validation of API key structure
- Port number not validated
- JWT_SECRET not validated (has unsafe fallback)

**Should use**: Zod schema validation for all env vars

**Impact**: Medium - fails at runtime instead of startup

#### 4. Socket.IO Race Conditions
**Location**: [backend/src/services/reactAgent.ts:118-147](backend/src/services/reactAgent.ts#L118)

**Problem**:
- Assumes one client per request
- Multiple requests could interfere
- requestId map is shared across all requests
- No cleanup of stale promises

**Scenario**:
```
Request A: Sends validation request, gets requestId-1
Request B: Sends validation request, gets requestId-1 (collision)
Client: Responds with requestId-1
Both requests receive same response
```

**Impact**: Low - unlikely but possible

---

## 🔧 Room for Improvement (Not "Bad", Just Better)

### Code Organization

#### 1. Extract App.tsx Logic

**Current state**: 528-line mega-component

**Recommended refactoring**:

```typescript
// hooks/useProject.ts
export function useProject() {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isScratchMode, setIsScratchMode] = useState(true);

  const selectProject = async (project: Project | null) => {
    // All project selection logic here
  };

  return { currentProject, isScratchMode, selectProject };
}

// hooks/useDiagram.ts
export function useDiagram(projectId?: number) {
  // Diagram state and operations
}

// hooks/useModals.ts
export function useModals() {
  // Modal state management with better API
}

// Then App.tsx becomes:
function App() {
  const project = useProject();
  const diagram = useDiagram(project.currentProject?.id);
  const modals = useModals();

  // Simplified render logic
}
```

**Benefit**: Testability, reusability, readability

#### 2. Shared Constants

**Problem**: Magic values scattered throughout

**Examples**:
- `chatHistory.slice(-5)` - why 5?
- `maxRetries = 20` - why 20?
- `setTimeout(5000)` - why 5 seconds?
- File size limit `10 * 1024 * 1024` - should be named constant

**Recommended**:
```typescript
// shared/constants.ts
export const CONFIG = {
  CHAT_HISTORY_LIMIT: 5,
  MAX_RENDER_RETRIES: 20,
  RENDER_VALIDATION_TIMEOUT: 5000,
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  JWT_EXPIRY: '7d',
  PASSWORD_SALT_ROUNDS: 10,
} as const;
```

#### 3. Service Configuration Cleanup

**Location**: [backend/src/index.ts:36-50](backend/src/index.ts#L36)

**Current**:
```typescript
const imageService = process.env.IMAGE_SERVICE as 'gemini' | 'openrouter' | undefined;
const speechService = process.env.SPEECH_SERVICE as 'gemini' | undefined;

if (!geminiApiKey && !openRouterApiKey) {
  console.warn('Warning: Neither GEMINI_API_KEY nor OPENROUTER_API_KEY is set...');
} else {
  console.log(`Image service configured: ${imageService || (geminiApiKey ? 'gemini' : 'openrouter')}`);
}
```

**Recommended**:
```typescript
// config/services.ts
export class ServiceConfig {
  static getImageService(): ImageToMermaidService {
    // Clean service selection logic
  }

  static getSpeechService(): SpeechService | null {
    // Clean speech service logic
  }
}
```

### Error Handling

#### 1. Standardize Error Responses

**Current**: Inconsistent formats

**Recommended**:
```typescript
// types/errors.ts
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}

// middleware/errorHandler.ts
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
  }
}

// Usage
throw new AppError('USER_NOT_FOUND', 'User does not exist', 404);
```

#### 2. Add Error Tracking

**Recommended**: Integrate Sentry or similar

```typescript
// utils/errorTracking.ts
export function captureException(error: Error, context?: any) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, { extra: context });
  } else {
    console.error(error, context);
  }
}
```

#### 3. Handle Silent Failures

**Location**: [backend/src/controllers/diagramController.ts:57-60](backend/src/controllers/diagramController.ts#L57)

**Current**:
```typescript
} catch (dbError) {
  console.error('Failed to save chat messages:', dbError);
  // Don't fail the request if database save fails
}
```

**Problem**: User doesn't know their chat wasn't saved

**Recommended**: At minimum, log to error tracking and include warning in response

### Performance

#### 1. Paginate Chat History

**Location**: [backend/src/controllers/diagramsController.ts:151-157](backend/src/controllers/diagramsController.ts#L151)

**Current**:
```typescript
const messages = await db
  .selectFrom('chat_messages')
  .selectAll()
  .where('diagram_id', '=', diagramId)
  .orderBy('created_at', 'asc')
  .execute();
```

**Problem**: Loads entire chat history, could be thousands of messages

**Recommended**:
```typescript
const messages = await db
  .selectFrom('chat_messages')
  .selectAll()
  .where('diagram_id', '=', diagramId)
  .orderBy('created_at', 'desc')
  .limit(limit)
  .offset(offset)
  .execute();
```

#### 2. Add Caching

**Opportunities**:
- Cache diagram versions (rarely change)
- Cache project lists (invalidate on change)
- Cache LLM responses for common queries

**Recommended**: Redis or in-memory cache

```typescript
// services/cache.ts
export class CacheService {
  async getDiagramVersion(id: number): Promise<DiagramVersion | null> {
    const cached = await redis.get(`diagram_version:${id}`);
    if (cached) return JSON.parse(cached);

    const version = await db.selectFrom('diagram_versions')...;
    await redis.set(`diagram_version:${id}`, JSON.stringify(version), 'EX', 3600);
    return version;
  }
}
```

#### 3. Stream File Uploads

**Location**: [backend/src/index.ts:63](backend/src/index.ts#L63)

**Current**: Entire file loaded to memory with multer

**Recommended**: Stream processing for large files

```typescript
// Use busboy or formidable for streaming
// Process file chunks as they arrive
```

#### 4. Optimize React Re-renders

**Problem**: App.tsx likely causes excessive re-renders

**Recommended**:
```typescript
// Use React.memo for expensive components
export const MermaidDiagram = React.memo(({ diagram }) => {
  // Only re-renders when diagram changes
});

// Use useMemo for expensive computations
const sortedVersions = useMemo(
  () => versions.sort((a, b) => b.version - a.version),
  [versions]
);

// Use useCallback for event handlers passed to children
const handleSelect = useCallback((diagram: Diagram) => {
  // Handler logic
}, [dependencies]);
```

### Type Safety

#### 1. Fix `any` Types

**Location**: [backend/src/controllers/diagramController.ts:14](backend/src/controllers/diagramController.ts#L14)

**Current**:
```typescript
setupSocketListeners(socket: any) {
  this.agent.setupSocketListeners(socket);
}
```

**Recommended**:
```typescript
import { Socket } from 'socket.io';

setupSocketListeners(socket: Socket) {
  this.agent.setupSocketListeners(socket);
}
```

#### 2. Reduce Optional Chaining Overuse

**Problem**: Hides potential bugs

**Example**:
```typescript
const user = response.data?.user?.profile?.name;
// If any step is undefined, fails silently
```

**Recommended**: Validate and handle explicitly

```typescript
if (!response.data?.user) {
  throw new Error('Invalid response: missing user data');
}
const user = response.data.user;
```

#### 3. Add Input Validation

**Problem**: Zod is installed but unused

**Recommended**:
```typescript
// schemas/project.ts
import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

// In controller
async create(req: Request, res: Response) {
  const validated = createProjectSchema.parse(req.body);
  // Use validated data
}
```

### Testing

#### Missing Test Infrastructure

**Current state**: Zero tests

**Recommended setup**:

```typescript
// Backend tests with Jest
// backend/__tests__/controllers/authController.test.ts
describe('AuthController', () => {
  it('should create user with valid credentials', async () => {
    // Test
  });

  it('should reject weak passwords', async () => {
    // Test
  });
});

// Frontend tests with Vitest + React Testing Library
// frontend/src/components/__tests__/ChatPanel.test.tsx
describe('ChatPanel', () => {
  it('should send message on submit', () => {
    // Test
  });
});

// E2E tests with Playwright
// e2e/auth.spec.ts
test('user can sign up and create project', async ({ page }) => {
  // Test full flow
});
```

**Priority**: High - no tests = no confidence in changes

### Documentation

#### 1. Add JSDoc Comments

**Current**: No function documentation

**Recommended**:
```typescript
/**
 * Converts an image to a Mermaid diagram using AI
 *
 * @param imagePath - Absolute path to the uploaded image file
 * @param mimeType - MIME type of the image (e.g., 'image/png')
 * @returns Object containing the diagram code and description
 * @throws {Error} If conversion fails after all retries
 *
 * @example
 * const result = await service.convertImageToDiagram('/tmp/diagram.png', 'image/png');
 * console.log(result.diagram); // Mermaid code
 */
async convertImageToDiagram(imagePath: string, mimeType: string): Promise<{ diagram: string; description: string }>
```

#### 2. Add API Documentation

**Recommended**: Swagger/OpenAPI

```typescript
// swagger.yaml or use decorators
/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Create a new project
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 */
```

#### 3. Document Magic Numbers

**Examples**:
```typescript
// Why 5? Document it!
chatHistory.slice(-5) // Last 5 messages to fit in LLM context window

// Why 20? Document it!
const maxRetries = 20; // Sufficient for most rendering issues without excessive delay
```

---

## 📊 Overall Assessment

### Summary Score: B- (78/100)

**Breakdown**:
- **Architecture**: B (80/100) - Good patterns, but scalability concerns
- **Security**: D (60/100) - Critical issues need immediate attention
- **Code Quality**: C+ (75/100) - Generally clean but needs refactoring
- **Type Safety**: B (80/100) - Good TypeScript usage, minor improvements needed
- **Testing**: F (0/100) - No tests at all
- **Documentation**: D (50/100) - Minimal documentation
- **Performance**: C (70/100) - Works but not optimized
- **Maintainability**: C+ (75/100) - App.tsx is a problem, rest is okay

### What Works Well

The core product is **functional and well-designed**:
- Reactive agent with render validation is innovative and effective
- Project/diagram/version architecture makes sense
- UI is clean and responsive
- Database schema is well-normalized
- Service abstractions are clean

### What Needs Immediate Attention

**Security hardening is critical**:
1. Fix JWT_SECRET fallback
2. Add rate limiting
3. Restrict CORS
4. Validate file content
5. Add password strength requirements

**Code organization**:
1. Refactor App.tsx (highest priority)
2. Add proper error handling
3. Extract duplicated code

### What Prevents Production Readiness

1. **Security vulnerabilities** - Can't deploy safely
2. **No tests** - Can't refactor or deploy with confidence
3. **No logging** - Can't debug production issues
4. **File storage** - Won't scale, no cleanup
5. **Database scalability** - Single SQLite connection
6. **No monitoring** - No visibility into production health

### Technical Debt Level: Medium-High

The codebase shows **good engineering fundamentals** but has accumulated debt in:
- Security practices
- Testing discipline
- Production operations
- Performance optimization

### Recommendation

**For personal/demo use**: Ship it as-is, it works fine

**For production use**: Address security issues first, then add:
1. Rate limiting
2. Proper logging
3. Error tracking
4. Basic test coverage
5. File cleanup strategy
6. Environment validation

**For scale**: Additionally need:
1. PostgreSQL migration
2. S3/blob storage
3. Redis caching
4. Load balancing
5. Comprehensive test suite

### Positive Notes

Despite the issues listed, this codebase demonstrates:
- Strong TypeScript knowledge
- Understanding of React patterns
- Good API design
- Creative problem-solving (render validation loop)
- Clean, readable code (except App.tsx)
- Proper use of modern tools

The issues are **fixable** and mostly involve adding missing infrastructure rather than rewriting bad code. The foundation is solid.

---

## Appendix: Quick Wins

If you have limited time, these changes provide the most value:

### 1-Hour Fixes
1. Remove JWT_SECRET fallback, fail fast
2. Extract JSON parsing to utility function
3. Add environment variable validation with Zod
4. Fix hardcoded localhost URL

### 4-Hour Fixes
1. Add rate limiting (express-rate-limit)
2. Configure proper CORS
3. Add structured logging (Winston)
4. Extract 3-4 hooks from App.tsx

### 1-Day Fixes
1. Add basic test suite (20-30 tests)
2. Refactor App.tsx completely
3. Add Sentry error tracking
4. Implement file cleanup job
5. Add password validation

---

**Assessment Date**: October 3, 2025
**Lines of Code**: ~6,000 (excluding node_modules)
**Key Technologies**: TypeScript, React, Express, Socket.IO, Kysely, SQLite
